import { prisma } from '../../lib/prisma';
import { RecurringTransaction, Prisma, Wallet } from '@prisma/client';
import { devFallbackStore, DevFallbackStore, DEFAULT_SYSTEM_CATEGORIES } from '../../lib/devFallbackStore';

export class RecurringRepository {
  static async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    try {
      return await prisma.recurringTransaction.findMany({
        where: { userId },
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { dayOfMonth: 'asc' },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserRecurring(userId);
      }
      throw error;
    }
  }

  static async findActiveByUserId(userId: string): Promise<RecurringTransaction[]> {
    try {
      return await prisma.recurringTransaction.findMany({
        where: { userId, isActive: true },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserRecurring(userId).filter((r) => r.isActive);
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<RecurringTransaction | null> {
    try {
      return await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.recurring.get(id) || null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.RecurringTransactionCreateInput): Promise<RecurringTransaction> {
    try {
      return await prisma.recurringTransaction.create({
        data,
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const id = `dev-rec-${Date.now()}`;
        const catId = (data.category as any)?.connect?.id || 'hoa_don';
        const cat = devFallbackStore.categories.get(catId) || DEFAULT_SYSTEM_CATEGORIES[0];
        const r: RecurringTransaction = {
          id,
          amount: new Prisma.Decimal(data.amount?.toString() || '0'),
          type: data.type || 'EXPENSE',
          note: data.note,
          dayOfMonth: data.dayOfMonth,
          isActive: data.isActive !== undefined ? data.isActive : true,
          lastRunAt: null,
          categoryId: catId,
          userId: (data.user as any)?.connect?.id || 'dev-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devFallbackStore.recurring.set(id, r);
        return { ...r, category: cat } as any;
      }
      throw error;
    }
  }

  static async update(id: string, data: Prisma.RecurringTransactionUpdateInput): Promise<RecurringTransaction> {
    try {
      return await prisma.recurringTransaction.update({
        where: { id },
        data,
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const r = devFallbackStore.recurring.get(id);
        if (r) {
          if (data.amount) r.amount = new Prisma.Decimal(data.amount.toString());
          if (data.note) r.note = String(data.note);
          if (data.dayOfMonth) r.dayOfMonth = Number(data.dayOfMonth);
          if (data.isActive !== undefined) r.isActive = Boolean(data.isActive);
          r.updatedAt = new Date();
          devFallbackStore.recurring.set(id, r);
          const cat = devFallbackStore.categories.get(r.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
          return { ...r, category: cat } as any;
        }
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.recurringTransaction.delete({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.recurring.delete(id);
        return;
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
        return devFallbackStore.createWallet({ name: 'Ví Chính', isDefault: true, user: { connect: { id: userId } } });
      }
      throw error;
    }
  }

  static async findMonthTransactions(userId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.transaction.findMany({
        where: {
          userId,
          date: { gte: startDate, lte: endDate },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserTransactions(userId).filter((t) => {
          const d = new Date(t.date);
          return d >= startDate && d <= endDate;
        });
      }
      throw error;
    }
  }

  static async createTransactionWithWalletUpdate(
    data: Prisma.TransactionCreateInput,
    walletId: string,
    balanceChange: Prisma.Decimal
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        const wallet = await tx.wallet.update({
          where: { id: walletId },
          data: { balance: { increment: balanceChange } },
        });

        const transaction = await tx.transaction.create({
          data,
          include: {
            category: { select: { id: true, name: true, icon: true, color: true } },
            wallet: { select: { id: true, name: true, balance: true, currency: true } },
          },
        });

        return { transaction, wallet };
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const tx = devFallbackStore.createTransaction(data);
        const w = devFallbackStore.wallets.get(walletId);
        return { transaction: tx, wallet: w };
      }
      throw error;
    }
  }
}

