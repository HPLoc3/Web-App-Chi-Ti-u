import { prisma } from '../../lib/prisma';
import { Transaction, Wallet, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

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
        orderBy: { date: 'desc' },
        skip,
        take,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const userId = (where.userId as string) || 'dev-user';
        return devFallbackStore.getUserTransactions(userId);
      }
      throw error;
    }
  }

  static async count(where: Prisma.TransactionWhereInput): Promise<number> {
    try {
      return await prisma.transaction.count({ where });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
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
      if (DevFallbackStore.isConnectionError(error)) {
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
      if (DevFallbackStore.isConnectionError(error)) {
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
    balanceChange: Prisma.Decimal
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const updatedWallet = await tx.wallet.update({
          where: { id: walletId },
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
      if (DevFallbackStore.isConnectionError(error)) {
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

  static async createBulk(items: Prisma.TransactionCreateManyInput[]): Promise<number> {
    try {
      const result = await prisma.transaction.createMany({
        data: items,
      });
      return result.count;
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        items.forEach((item) => devFallbackStore.createTransaction(item));
        return items.length;
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
        if (oldWalletId === newWalletId) {
          // Same wallet: compute net adjustment in one atomic update
          const netAdjustment = oldBalanceAdjustment.add(newBalanceAdjustment);
          if (!netAdjustment.isZero()) {
            await tx.wallet.update({
              where: { id: oldWalletId },
              data: { balance: { increment: netAdjustment } },
            });
          }
        } else {
          // Different wallets: update in alphabetical ID order to prevent deadlock
          const [firstId, secondId] = [oldWalletId, newWalletId].sort();
          const firstDelta = firstId === oldWalletId ? oldBalanceAdjustment : newBalanceAdjustment;
          const secondDelta = secondId === oldWalletId ? oldBalanceAdjustment : newBalanceAdjustment;

          await tx.wallet.update({
            where: { id: firstId },
            data: { balance: { increment: firstDelta } },
          });

          await tx.wallet.update({
            where: { id: secondId },
            data: { balance: { increment: secondDelta } },
          });
        }

        const updatedTransaction = await tx.transaction.update({
          where: { id: transactionId },
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
          where: { id: newWalletId },
        });

        return { updatedTransaction, updatedWallet };
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
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

  static async deleteWithWalletAdjustment(
    transactionId: string,
    walletId: string,
    revertChange: Prisma.Decimal
  ): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: revertChange } },
        });

        await tx.transaction.delete({
          where: { id: transactionId },
        });
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const tx = devFallbackStore.transactions.get(transactionId);
        if (tx) {
          const w = devFallbackStore.wallets.get(walletId);
          if (w) {
            w.balance = w.balance.add(revertChange);
            devFallbackStore.wallets.set(w.id, w);
          }
          devFallbackStore.transactions.delete(transactionId);
        }
        return;
      }
      throw error;
    }
  }

  static async deleteMany(ids: string[], userId: string): Promise<number> {
    try {
      return await prisma.$transaction(async (tx) => {
        // 1. Fetch transactions to calculate balance revert per wallet
        const txsToDelete = await tx.transaction.findMany({
          where: { id: { in: ids }, userId },
          select: { id: true, amount: true, type: true, walletId: true },
        });

        if (txsToDelete.length === 0) return 0;

        // 2. Group revert adjustments by walletId
        const walletRevertMap = new Map<string, Prisma.Decimal>();
        for (const item of txsToDelete) {
          const itemAmt = item.amount as Prisma.Decimal;
          const revertDelta = item.type === 'INCOME' ? itemAmt.negated() : itemAmt;
          const currentTotal = walletRevertMap.get(item.walletId) || new Prisma.Decimal(0);
          walletRevertMap.set(item.walletId, currentTotal.add(revertDelta));
        }

        // 3. Atomically update every affected wallet
        for (const [wId, delta] of walletRevertMap.entries()) {
          if (!delta.isZero()) {
            await tx.wallet.update({
              where: { id: wId },
              data: { balance: { increment: delta } },
            });
          }
        }

        // 4. Delete the transactions
        const result = await tx.transaction.deleteMany({
          where: { id: { in: ids }, userId },
        });

        return result.count;
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        let count = 0;
        for (const id of ids) {
          const tx = devFallbackStore.transactions.get(id);
          if (tx && tx.userId === userId) {
            const revertDelta = tx.type === 'INCOME' ? tx.amount.negated() : tx.amount;
            const w = devFallbackStore.wallets.get(tx.walletId);
            if (w) {
              w.balance = w.balance.add(revertDelta);
              devFallbackStore.wallets.set(w.id, w);
            }
            devFallbackStore.transactions.delete(id);
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
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const wallets = devFallbackStore.getUserWallets(userId);
        return wallets[0] || null;
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
          userId,
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createWallet({ name: 'Ví Chính', isDefault: true, user: { connect: { id: userId } } });
      }
      throw error;
    }
  }
}

