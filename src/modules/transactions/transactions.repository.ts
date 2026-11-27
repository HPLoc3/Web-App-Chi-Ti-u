import { prisma } from '../../lib/prisma';
import { Transaction, Wallet, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';
import { lockUserRow } from '../../lib/lockUser';
import { AppError } from '../../middleware/errorHandler.middleware';

type DeletedRow = { amount: Prisma.Decimal; type: string; walletId: string };

/** Số tiền cần cộng lại vào ví khi xóa giao dịch */
const revertDeltaOf = (row: { amount: Prisma.Decimal; type: string }): Prisma.Decimal =>
  row.type === 'INCOME' ? row.amount.negated() : row.amount;

export class TransactionsRepository {
  static async findMany(
    where: Prisma.TransactionWhereInput,
    skip: number,
    take: number
  ): Promise<Transaction[]> {
    try {
      return await prisma.transaction.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true, type: true, icon: true, color: true },
          },
          wallet: {
            select: { id: true, name: true, balance: true, currency: true },
          },
        },
        // Khóa phụ để phân trang ổn định khi trùng ngày
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take,
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const userId = (where.userId as string) || 'dev-user';
        return devFallbackStore.getUserTransactions(userId).slice(skip, skip + take);
      }
      throw error;
    }
  }

  static async count(where: Prisma.TransactionWhereInput): Promise<number> {
    try {
      return await prisma.transaction.count({ where });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const userId = (where.userId as string) || 'dev-user';
        return devFallbackStore.getUserTransactions(userId).length;
      }
      throw error;
    }
  }

  static async findById(id: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findUnique({
        where: { id },
        include: {
          category: {
            select: { id: true, name: true, type: true, icon: true, color: true },
          },
          wallet: {
            select: { id: true, name: true, balance: true, currency: true },
          },
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.transactions.get(id) || null;
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Transaction | null> {
    try {
      return await prisma.transaction.findFirst({
        where: { id, userId },
        include: { wallet: true },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const tx = devFallbackStore.transactions.get(id);
        if (tx && tx.userId === userId) {
          const wallet = devFallbackStore.wallets.get(tx.walletId);
          return { ...tx, wallet } as any;
        }
        return null;
      }
      throw error;
    }
  }

  static async createWithWalletUpdate(
    transactionData: Prisma.TransactionCreateInput,
    walletId: string,
    balanceChange: Prisma.Decimal,
    userId: string
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
          where: { id: walletId, userId },
          data: { balance: { increment: balanceChange } },
        });

        const newTransaction = await tx.transaction.create({
          data: transactionData,
          include: {
            category: {
              select: { id: true, name: true, type: true, icon: true, color: true },
            },
            wallet: {
              select: { id: true, name: true, balance: true, currency: true },
            },
          },
        });

        return { transaction: newTransaction, wallet: updatedWallet };
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const created = devFallbackStore.createTransaction({
          amount: transactionData.amount,
          type: transactionData.type,
          note: transactionData.note,
          date: transactionData.date,
          walletId,
          categoryId: (transactionData.category as any)?.connect?.id || 'an_uong',
          userId: (transactionData.user as any)?.connect?.id || 'dev-user',
        });
        const wallet = devFallbackStore.wallets.get(walletId);
        return { transaction: created, wallet };
      }
      throw error;
    }
  }

  /**
   * Ghi cả lô trong một transaction. Mọi walletId phải thuộc userId, nếu không thì không ghi gì.
   */
  static async createBulkWithWalletUpdate(
    userId: string,
    items: Prisma.TransactionCreateManyInput[],
    walletAdjustments: Map<string, Prisma.Decimal>
  ): Promise<any[]> {
    const walletNotFound = () =>
      new AppError('Ví thanh toán không tồn tại hoặc bạn không có quyền sử dụng.', 404, 'WALLET_NOT_FOUND');
    // Cập nhật theo thứ tự ID để tránh deadlock
    const walletIds = Array.from(walletAdjustments.keys()).sort();

    try {
      return await prisma.$transaction(async (tx) => {
        const owned = await tx.wallet.findMany({
          where: { id: { in: walletIds }, userId },
          select: { id: true },
        });
        if (owned.length !== walletIds.length) {
          throw walletNotFound();
        }

        for (const walletId of walletIds) {
          const result = await tx.wallet.updateMany({
            where: { id: walletId, userId },
            data: { balance: { increment: walletAdjustments.get(walletId)! } },
          });
          if (result.count !== 1) {
            throw walletNotFound();
          }
        }

        return tx.transaction.createManyAndReturn({
          data: items,
          include: {
            category: {
              select: { id: true, name: true, type: true, icon: true, color: true },
            },
            wallet: {
              select: { id: true, name: true, balance: true, currency: true },
            },
          },
        });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        if (walletIds.some((id) => devFallbackStore.wallets.get(id)?.userId !== userId)) {
          throw walletNotFound();
        }
        // createTransaction của kho mẫu tự cập nhật số dư
        return items.map((item) => devFallbackStore.createTransaction(item));
      }
      throw error;
    }
  }

  static async updateWithWalletAdjustment(
    transactionId: string,
    userId: string,
    oldWalletId: string,
    oldBalanceAdjustment: Prisma.Decimal,
    newWalletId: string,
    newBalanceAdjustment: Prisma.Decimal,
    updateData: Prisma.TransactionUpdateInput
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);

        if (oldWalletId === newWalletId) {
          // Same wallet: compute net adjustment in one atomic update
          const netAdjustment = oldBalanceAdjustment.add(newBalanceAdjustment);
          if (!netAdjustment.isZero()) {
            await tx.wallet.update({
              where: { id: oldWalletId, userId },
              data: { balance: { increment: netAdjustment } },
            });
          }
        } else {
          // Different wallets: update in alphabetical ID order to prevent deadlock
          const [firstId, secondId] = [oldWalletId, newWalletId].sort();
          const firstDelta = firstId === oldWalletId ? oldBalanceAdjustment : newBalanceAdjustment;
          const secondDelta = secondId === oldWalletId ? oldBalanceAdjustment : newBalanceAdjustment;

          await tx.wallet.update({
            where: { id: firstId, userId },
            data: { balance: { increment: firstDelta } },
          });

          await tx.wallet.update({
            where: { id: secondId, userId },
            data: { balance: { increment: secondDelta } },
          });
        }

        const updatedTransaction = await tx.transaction.update({
          where: { id: transactionId, userId },
          data: updateData,
          include: {
            category: {
              select: { id: true, name: true, type: true, icon: true, color: true },
            },
            wallet: {
              select: { id: true, name: true, balance: true, currency: true },
            },
          },
        });

        const updatedWallet = await tx.wallet.findUnique({
          where: { id: newWalletId, userId },
        });

        return { updatedTransaction, updatedWallet };
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const tx = devFallbackStore.transactions.get(transactionId);
        if (tx) {
          if (updateData.amount) tx.amount = new Prisma.Decimal(updateData.amount.toString());
          if (updateData.type) tx.type = updateData.type as any;
          if (updateData.note !== undefined) tx.note = updateData.note as any;
          if (updateData.date) tx.date = new Date(updateData.date as any);
          if (newWalletId !== oldWalletId) {
            const oldW = devFallbackStore.wallets.get(oldWalletId);
            if (oldW) {
              oldW.balance = oldW.balance.add(oldBalanceAdjustment);
              devFallbackStore.wallets.set(oldW.id, oldW);
            }
            const newW = devFallbackStore.wallets.get(newWalletId);
            if (newW) {
              newW.balance = newW.balance.add(newBalanceAdjustment);
              devFallbackStore.wallets.set(newW.id, newW);
            }
            tx.walletId = newWalletId;
          } else {
            const w = devFallbackStore.wallets.get(oldWalletId);
            if (w) {
              w.balance = w.balance.add(oldBalanceAdjustment).add(newBalanceAdjustment);
              devFallbackStore.wallets.set(w.id, w);
            }
          }
          devFallbackStore.transactions.set(transactionId, tx);
        }
        const updatedWallet = devFallbackStore.wallets.get(newWalletId);
        return { updatedTransaction: tx, updatedWallet };
      }
      throw error;
    }
  }

  /**
   * Xóa trước, rồi hoàn số dư theo chính dòng vừa xóa. Request đồng thời thứ hai nhận P2025
   * nên không hoàn lần nữa, và số tiền hoàn không lấy từ bản đọc cũ.
   */
  static async deleteWithWalletAdjustment(transactionId: string, userId: string): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);

        const deleted = await tx.transaction.delete({
          where: { id: transactionId, userId },
        });

        await tx.wallet.update({
          where: { id: deleted.walletId, userId },
          data: { balance: { increment: revertDeltaOf(deleted) } },
        });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const tx = devFallbackStore.transactions.get(transactionId);
        if (tx && tx.userId === userId) {
          devFallbackStore.transactions.delete(transactionId);
          const w = devFallbackStore.wallets.get(tx.walletId);
          if (w) {
            w.balance = w.balance.add(revertDeltaOf(tx));
          }
        }
        return;
      }
      throw error;
    }
  }

  static async deleteMany(ids: string[], userId: string): Promise<number> {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);

        // DELETE ... RETURNING: chỉ nhận về những dòng chính transaction này xóa được
        const deleted = await tx.$queryRaw<DeletedRow[]>`
          DELETE FROM "Transaction"
          WHERE "userId" = ${userId} AND "id" IN (${Prisma.join(ids)})
          RETURNING "amount", "type", "walletId"`;

        const walletRevertMap = new Map<string, Prisma.Decimal>();
        for (const row of deleted) {
          const currentTotal = walletRevertMap.get(row.walletId) || new Prisma.Decimal(0);
          walletRevertMap.set(row.walletId, currentTotal.add(revertDeltaOf(row)));
        }

        // Cập nhật theo thứ tự ID để tránh deadlock
        for (const walletId of Array.from(walletRevertMap.keys()).sort()) {
          const delta = walletRevertMap.get(walletId)!;
          if (!delta.isZero()) {
            await tx.wallet.update({
              where: { id: walletId, userId },
              data: { balance: { increment: delta } },
            });
          }
        }

        return deleted.length;
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        let count = 0;
        for (const id of ids) {
          const tx = devFallbackStore.transactions.get(id);
          if (tx && tx.userId === userId) {
            devFallbackStore.transactions.delete(id);
            const w = devFallbackStore.wallets.get(tx.walletId);
            if (w) {
              w.balance = w.balance.add(revertDeltaOf(tx));
            }
            count++;
          }
        }
        return count;
      }
      throw error;
    }
  }

  static async findDefaultWallet(userId: string): Promise<Wallet | null> {
    try {
      return await prisma.wallet.findFirst({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const wallets = devFallbackStore.getUserWallets(userId);
        return wallets.find((w) => w.isDefault) || wallets[0] || null;
      }
      throw error;
    }
  }

  static async createDefaultWallet(userId: string): Promise<Wallet> {
    try {
      return await prisma.wallet.create({
        data: {
          name: 'Ví Chính',
          balance: new Prisma.Decimal(0),
          currency: 'VND',
          isDefault: true,
          type: 'cash',
          userId,
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.createWallet({ name: 'Ví Chính', isDefault: true, user: { connect: { id: userId } } });
      }
      throw error;
    }
  }
}

