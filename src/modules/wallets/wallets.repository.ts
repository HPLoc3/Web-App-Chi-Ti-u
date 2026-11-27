import { prisma } from '../../lib/prisma';
import { Wallet, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';
import { lockUserRow } from '../../lib/lockUser';
import { AppError } from '../../middleware/errorHandler.middleware';

const walletNotFound = () =>
  new AppError('Không tìm thấy ví hoặc bạn không có quyền truy cập.', 404, 'NOT_FOUND');

const onlyWallet = () => new AppError('Không thể xóa ví duy nhất của bạn.', 400, 'CANNOT_DELETE_ONLY_WALLET');

const walletHasTransactions = (count?: number) =>
  new AppError(
    count === undefined ? 'Ví còn giao dịch nên không xóa được.' : `Ví còn ${count} giao dịch nên không xóa được.`,
    409,
    'WALLET_HAS_TRANSACTIONS'
  );

const defaultRequired = () =>
  new AppError(
    'Cần có một ví mặc định. Hãy đặt ví khác làm mặc định trước.',
    400,
    'DEFAULT_WALLET_REQUIRED'
  );

const clearDefaultsIn = (tx: Prisma.TransactionClient, userId: string) =>
  tx.wallet.updateMany({ where: { userId, isDefault: true }, data: { isDefault: false } });

export class WalletsRepository {
  static async findByUserId(userId: string): Promise<Array<Wallet & { _count?: { transactions: number } }>> {
    try {
      return await prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
        // Chỉ đếm giao dịch của chính người dùng
        include: { _count: { select: { transactions: { where: { userId } } } } },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const mine = Array.from(devFallbackStore.transactions.values()).filter((t) => t.userId === userId);
        return devFallbackStore.getUserWallets(userId).map((w) => ({
          ...w,
          _count: { transactions: mine.filter((t) => t.walletId === w.id).length },
        }));
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Wallet | null> {
    try {
      return await prisma.wallet.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const w = devFallbackStore.wallets.get(id);
        return w && w.userId === userId ? w : null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    const ownerId = data.user?.connect?.id;
    try {
      if (data.isDefault && ownerId) {
        // Bỏ cờ mặc định cũ và tạo ví mới phải cùng thành công hoặc cùng thất bại
        return await prisma.$transaction(async (tx) => {
          await lockUserRow(tx, ownerId);
          await clearDefaultsIn(tx, ownerId);
          return tx.wallet.create({ data });
        });
      }
      return await prisma.wallet.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        if (data.isDefault && ownerId) {
          for (const w of devFallbackStore.wallets.values()) {
            if (w.userId === ownerId) w.isDefault = false;
          }
        }
        return devFallbackStore.createWallet(data);
      }
      throw error;
    }
  }

  static async update(id: string, userId: string, data: Prisma.WalletUpdateInput): Promise<Wallet> {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        const current = await tx.wallet.findFirst({ where: { id, userId } });
        if (!current) {
          throw walletNotFound();
        }

        if (data.isDefault === false && current.isDefault) {
          const otherDefaults = await tx.wallet.count({
            where: { userId, isDefault: true, id: { not: id } },
          });
          if (otherDefaults === 0) {
            throw defaultRequired();
          }
        }
        if (data.isDefault === true) {
          await clearDefaultsIn(tx, userId);
        }

        return tx.wallet.update({ where: { id, userId }, data });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const w = devFallbackStore.wallets.get(id);
        if (w && w.userId === userId) {
          const mine = Array.from(devFallbackStore.wallets.values()).filter((x) => x.userId === userId);
          if (data.isDefault === false && w.isDefault && !mine.some((x) => x.id !== id && x.isDefault)) {
            throw defaultRequired();
          }
          if (data.isDefault === true) {
            mine.forEach((x) => (x.isDefault = false));
          }
          if (data.name) w.name = String(data.name);
          if (data.balance !== undefined) w.balance = new Prisma.Decimal(String(data.balance));
          if (data.isDefault !== undefined) w.isDefault = Boolean(data.isDefault);
          if (data.type) w.type = String(data.type);
          devFallbackStore.wallets.set(id, w);
          return w;
        }
        throw walletNotFound();
      }
      throw error;
    }
  }

  /** Xóa ví trống; ví còn giao dịch bị chặn. Trả về ví đã xóa. */
  static async delete(id: string, userId: string): Promise<Wallet> {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        const wallet = await tx.wallet.findFirst({ where: { id, userId } });
        if (!wallet) {
          throw walletNotFound();
        }
        if ((await tx.wallet.count({ where: { userId } })) <= 1) {
          throw onlyWallet();
        }
        const txCount = await tx.transaction.count({ where: { walletId: id } });
        if (txCount > 0) {
          throw walletHasTransactions(txCount);
        }

        const deleted = await tx.wallet.deleteMany({ where: { id, userId } });
        if (deleted.count !== 1) {
          throw walletNotFound();
        }

        if (wallet.isDefault) {
          const oldest = await tx.wallet.findFirst({ where: { userId }, orderBy: { createdAt: 'asc' } });
          if (oldest) {
            await tx.wallet.update({ where: { id: oldest.id, userId }, data: { isDefault: true } });
          }
        }
        return wallet;
      });
    } catch (error: any) {
      // Giao dịch được thêm giữa lúc đếm và lúc xóa: khóa ngoại RESTRICT chặn lại
      if (error?.code === 'P2003') {
        throw walletHasTransactions();
      }
      if (DevFallbackStore.shouldFallback(error)) {
        const wallet = devFallbackStore.wallets.get(id);
        if (!wallet || wallet.userId !== userId) throw walletNotFound();
        const others = Array.from(devFallbackStore.wallets.values()).filter(
          (w) => w.userId === userId && w.id !== id
        );
        if (others.length === 0) throw onlyWallet();
        const txCount = Array.from(devFallbackStore.transactions.values()).filter((t) => t.walletId === id).length;
        if (txCount > 0) throw walletHasTransactions(txCount);
        devFallbackStore.wallets.delete(id);
        if (wallet.isDefault) {
          others.sort((x, y) => x.createdAt.getTime() - y.createdAt.getTime())[0].isDefault = true;
        }
        return wallet;
      }
      throw error;
    }
  }

  static async transfer(
    userId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: Prisma.Decimal
  ): Promise<{ fromWallet: Wallet; toWallet: Wallet }> {
    try {
      return await prisma.$transaction(async (tx) => {
        const fromW = await tx.wallet.findFirst({
          where: { id: fromWalletId, userId },
        });
        if (!fromW) {
          throw new Error('FROM_WALLET_NOT_FOUND');
        }

        const toW = await tx.wallet.findFirst({
          where: { id: toWalletId, userId },
        });
        if (!toW) {
          throw new Error('TO_WALLET_NOT_FOUND');
        }

        // Lock in sorted ID order to prevent deadlock
        const [firstId, secondId] = [fromWalletId, toWalletId].sort();
        const firstDelta = firstId === fromWalletId ? amount.negated() : amount;
        const secondDelta = secondId === fromWalletId ? amount.negated() : amount;

        const updatedFirst = await tx.wallet.update({
          where: { id: firstId },
          data: { balance: { increment: firstDelta } },
        });

        const updatedSecond = await tx.wallet.update({
          where: { id: secondId },
          data: { balance: { increment: secondDelta } },
        });

        return {
          fromWallet: fromWalletId === firstId ? updatedFirst : updatedSecond,
          toWallet: toWalletId === firstId ? updatedFirst : updatedSecond,
        };
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const fromW = devFallbackStore.wallets.get(fromWalletId);
        const toW = devFallbackStore.wallets.get(toWalletId);
        if (!fromW || fromW.userId !== userId) throw new Error('FROM_WALLET_NOT_FOUND');
        if (!toW || toW.userId !== userId) throw new Error('TO_WALLET_NOT_FOUND');

        fromW.balance = fromW.balance.sub(amount);
        toW.balance = toW.balance.add(amount);
        devFallbackStore.wallets.set(fromWalletId, fromW);
        devFallbackStore.wallets.set(toWalletId, toW);
        return { fromWallet: fromW, toWallet: toW };
      }
      throw error;
    }
  }
}

