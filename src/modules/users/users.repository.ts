import { prisma } from '../../lib/prisma';
import { User } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';
import { lockUserRow } from '../../lib/lockUser';

export class UsersRepository {
  static async findById(id: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.findUserById(id);
      }
      throw error;
    }
  }

  static async update(id: string, data: Partial<Pick<User, 'name' | 'avatar' | 'password'>>): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.updateUser(id, data);
      }
      throw error;
    }
  }

  /** Đổi mật khẩu và thu hồi mọi phiên, mã đặt lại mật khẩu trong cùng một transaction */
  static async changePassword(userId: string, passwordHash: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        const now = new Date();
        // Cập nhật user trước để giữ khóa dòng, chặn refresh token đang được xoay vòng
        await tx.user.update({ where: { id: userId }, data: { password: passwordHash } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        await tx.passwordResetToken.updateMany({
          where: { userId, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.updateUserPassword(userId, passwordHash);
        devFallbackStore.revokeAllUserTokensAndSessions(userId);
        return;
      }
      throw error;
    }
  }

  /** Xóa tài khoản theo thứ tự an toàn với các khóa ngoại RESTRICT (ví, danh mục) */
  static async delete(id: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        // Khóa User trước như đồng bộ định kỳ/ví (User -> bản ghi con) để không deadlock
        await lockUserRow(tx, id);
        await tx.transaction.deleteMany({ where: { userId: id } });
        await tx.recurringTransaction.deleteMany({ where: { userId: id } });
        await tx.budgetLimit.deleteMany({ where: { budget: { userId: id } } });
        await tx.budget.deleteMany({ where: { userId: id } });
        await tx.goal.deleteMany({ where: { userId: id } });
        await tx.wallet.deleteMany({ where: { userId: id } });
        await tx.category.deleteMany({ where: { userId: id } });
        await tx.user.delete({ where: { id } });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.deleteUser(id);
        return;
      }
      throw error;
    }
  }
}
