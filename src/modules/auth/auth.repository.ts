import { prisma } from '../../lib/prisma';
import { User, RefreshToken, Session, PasswordResetToken, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';
import { lockUserRow } from '../../lib/lockUser';

export class AuthRepository {
  static async findUserByEmail(email: string): Promise<User | null> {
    try {
      return await prisma.user.findUnique({
        where: { email },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.findUserByEmail(email);
      }
      throw error;
    }
  }

  static async findUserById(id: string): Promise<User | null> {
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

  static async createUser(data: Prisma.UserCreateInput): Promise<User> {
    try {
      return await prisma.user.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.createUser(data);
      }
      throw error;
    }
  }

  static async updateUserPassword(userId: string, passwordHash: string): Promise<User> {
    try {
      return await prisma.user.update({
        where: { id: userId },
        data: { password: passwordHash },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.updateUserPassword(userId, passwordHash);
      }
      throw error;
    }
  }

  static async createTokensAndSession(
    userId: string,
    hashedRefreshToken: string,
    expiresAt: Date,
    userAgent?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.refreshToken.create({
          data: {
            token: hashedRefreshToken,
            userId,
            expiresAt,
          },
        }),
        prisma.session.create({
          data: {
            sessionToken: hashedRefreshToken,
            userId,
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
            expiresAt,
          },
        }),
      ]);
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.createTokensAndSession(userId, hashedRefreshToken, expiresAt, userAgent, ipAddress);
        return;
      }
      throw error;
    }
  }

  static async findRefreshToken(hashedToken: string): Promise<RefreshToken | null> {
    try {
      return await prisma.refreshToken.findUnique({
        where: { token: hashedToken },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.findRefreshToken(hashedToken);
      }
      throw error;
    }
  }

  /**
   * Xoay vòng refresh token nguyên tử: chỉ một request giành được token cũ.
   * Trả false nếu token đã được xoay vòng hoặc đã bị xóa (đăng xuất, đổi mật khẩu).
   *
   * Quy ước: `revokedAt` CHỈ được gán ở đây. Mọi thu hồi chủ động đều xóa hẳn dòng, nên
   * token có `revokedAt` bị dùng lại nghĩa là token đã xoay vòng bị dùng lại.
   */
  static async rotateRefreshToken(params: {
    oldTokenId: string;
    userId: string;
    newHashedToken: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
  }): Promise<boolean> {
    const { oldTokenId, userId, newHashedToken, expiresAt, userAgent, ipAddress } = params;
    try {
      return await prisma.$transaction(async (tx) => {
        // Khóa user để đổi mật khẩu/đăng xuất mọi nơi không bỏ sót token đang được cấp
        await lockUserRow(tx, userId);

        const claimed = await tx.refreshToken.updateMany({
          where: { id: oldTokenId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        if (claimed.count !== 1) {
          return false;
        }

        await tx.refreshToken.create({
          data: { token: newHashedToken, userId, expiresAt },
        });
        await tx.session.create({
          data: {
            sessionToken: newHashedToken,
            userId,
            userAgent: userAgent || null,
            ipAddress: ipAddress || null,
            expiresAt,
          },
        });
        return true;
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        if (!devFallbackStore.claimRefreshToken(oldTokenId)) return false;
        devFallbackStore.createTokensAndSession(userId, newHashedToken, expiresAt, userAgent, ipAddress);
        return true;
      }
      throw error;
    }
  }

  static async revokeRefreshTokenByHash(hashedToken: string): Promise<void> {
    try {
      // Chỉ xóa token còn sống: dòng đã xoay vòng được giữ để còn phát hiện dùng lại
      await prisma.refreshToken.deleteMany({
        where: { token: hashedToken, revokedAt: null },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.revokeRefreshTokenByHash(hashedToken);
        return;
      }
      throw error;
    }
  }

  static async revokeAllUserTokensAndSessions(userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        // Xóa hẳn: thiết bị cũ gọi refresh chỉ nhận 401, không đá phiên đăng nhập sau đó
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.session.deleteMany({
          where: { userId },
        });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.revokeAllUserTokensAndSessions(userId);
        return;
      }
      throw error;
    }
  }

  /**
   * Đặt lại mật khẩu trong một transaction. Trả false nếu mã đã bị dùng/hết hạn.
   */
  static async resetPasswordWithToken(resetTokenId: string, userId: string, passwordHash: string): Promise<boolean> {
    try {
      return await prisma.$transaction(async (tx) => {
        const now = new Date();
        const claimed = await tx.passwordResetToken.updateMany({
          where: { id: resetTokenId, usedAt: null, expiresAt: { gt: now } },
          data: { usedAt: now },
        });
        if (claimed.count !== 1) {
          return false;
        }

        // Cập nhật user trước để giữ khóa dòng trước khi thu hồi phiên
        await tx.user.update({ where: { id: userId }, data: { password: passwordHash } });
        await tx.refreshToken.deleteMany({ where: { userId } });
        await tx.session.deleteMany({ where: { userId } });
        await tx.passwordResetToken.updateMany({ where: { userId, usedAt: null }, data: { usedAt: now } });
        return true;
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.updateUserPassword(userId, passwordHash);
        devFallbackStore.revokeAllUserTokensAndSessions(userId);
        return true;
      }
      throw error;
    }
  }

  static async deleteSessionByToken(hashedToken: string): Promise<void> {
    try {
      await prisma.session.deleteMany({
        where: { sessionToken: hashedToken },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return;
      }
      throw error;
    }
  }

  static async createResetToken(userId: string, hashedToken: string, expiresAt: Date): Promise<PasswordResetToken> {
    try {
      return await prisma.passwordResetToken.create({
        data: {
          token: hashedToken,
          userId,
          expiresAt,
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return {
          id: `dev-rst-${Date.now()}`,
          token: hashedToken,
          userId,
          expiresAt,
          usedAt: null,
          createdAt: new Date(),
        };
      }
      throw error;
    }
  }

  static async findValidResetToken(hashedToken: string): Promise<PasswordResetToken | null> {
    try {
      return await prisma.passwordResetToken.findFirst({
        where: {
          token: hashedToken,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return null;
      }
      throw error;
    }
  }
}
