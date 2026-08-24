import { prisma } from '../../lib/prisma';
import { Prisma, Wallet } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class SyncRepository {
  static async findDefaultWallet(userId: string): Promise<Wallet | null> {
    try {
      return await prisma.wallet.findFirst({
        where: { userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserWallets(userId)[0] || null;
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
        return devFallbackStore.createWallet({
          name: 'Ví Chính',
          isDefault: true,
          user: { connect: { id: userId } },
        });
      }
      throw error;
    }
  }

  static async upsertBudget(userId: string, income?: number, budgetTemplate?: string, categoryLimits?: Record<string, number>) {
    try {
      return await prisma.budget.upsert({
        where: { userId },
        update: {
          income: income !== undefined ? new Prisma.Decimal(Math.max(Number(income) || 0, 0)) : undefined,
          budgetTemplate: budgetTemplate || undefined,
          categoryLimits: categoryLimits ? JSON.stringify(categoryLimits) : undefined,
        },
        create: {
          income: new Prisma.Decimal(Math.max(Number(income) || 25000000, 0)),
          budgetTemplate: budgetTemplate || '50_30_20',
          categoryLimits: categoryLimits ? JSON.stringify(categoryLimits) : '{}',
          userId,
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.upsertBudget(userId, income, budgetTemplate, categoryLimits);
      }
      throw error;
    }
  }

  static async createTransaction(data: Prisma.TransactionCreateInput) {
    try {
      return await prisma.transaction.create({ data });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createTransaction(data);
      }
      throw error;
    }
  }

  static async createTransactionsWithWalletAdjustment(
    walletId: string,
    transactions: Prisma.TransactionCreateManyInput[],
    netAdjustment: Prisma.Decimal
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: netAdjustment } },
        });

        return await tx.transaction.createMany({
          data: transactions,
        });
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const w = devFallbackStore.wallets.get(walletId);
        if (w) {
          w.balance = w.balance.add(netAdjustment);
          devFallbackStore.wallets.set(walletId, w);
        }
        for (const t of transactions) {
          devFallbackStore.createTransaction({
            amount: t.amount,
            type: t.type,
            note: t.note,
            date: t.date,
            wallet: { connect: { id: t.walletId } },
            category: { connect: { id: t.categoryId } },
            user: { connect: { id: t.userId } },
          });
        }
        return { count: transactions.length };
      }
      throw error;
    }
  }

  static async createGoal(data: Prisma.GoalCreateInput) {
    try {
      return await prisma.goal.create({ data });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createGoal(data);
      }
      throw error;
    }
  }

  static async createRecurring(data: Prisma.RecurringTransactionCreateInput) {
    try {
      return await prisma.recurringTransaction.create({ data });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createRecurring(data);
      }
      throw error;
    }
  }
}
