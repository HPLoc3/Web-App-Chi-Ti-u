import { prisma } from '../../lib/prisma';
import { devFallbackStore, DevFallbackStore, DEFAULT_SYSTEM_CATEGORIES } from '../../lib/devFallbackStore';
import { Prisma } from '@prisma/client';

export class ReportsRepository {
  static async findUserBudget(userId: string) {
    try {
      return await prisma.budget.findUnique({
        where: { userId },
        include: { budgetLimits: true },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.findBudgetByUserId(userId);
      }
      throw error;
    }
  }

  static async aggregateIncome(userId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'INCOME',
          date: { gte: startDate, lte: endDate },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const txs = devFallbackStore.getUserTransactions(userId).filter((t) => {
          const d = new Date(t.date);
          return t.type === 'INCOME' && d >= startDate && d <= endDate;
        });
        const total = txs.reduce((acc, t) => acc.add(t.amount), new Prisma.Decimal(0));
        return { _sum: { amount: total } };
      }
      throw error;
    }
  }

  static async aggregateExpense(userId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.transaction.aggregate({
        _sum: { amount: true },
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const txs = devFallbackStore.getUserTransactions(userId).filter((t) => {
          const d = new Date(t.date);
          return t.type === 'EXPENSE' && d >= startDate && d <= endDate;
        });
        const total = txs.reduce((acc, t) => acc.add(t.amount), new Prisma.Decimal(0));
        return { _sum: { amount: total } };
      }
      throw error;
    }
  }

  static async aggregateWallets(userId: string) {
    try {
      return await prisma.wallet.aggregate({
        _sum: { balance: true },
        where: { userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const wallets = devFallbackStore.getUserWallets(userId);
        const total = wallets.reduce((acc, w) => acc.add(w.balance), new Prisma.Decimal(0));
        return { _sum: { balance: total } };
      }
      throw error;
    }
  }

  static async groupCategoryExpenses(userId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.transaction.groupBy({
        by: ['categoryId'],
        _sum: { amount: true },
        _count: { id: true },
        where: {
          userId,
          type: 'EXPENSE',
          date: { gte: startDate, lte: endDate },
        },
        orderBy: {
          _sum: { amount: 'desc' },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const map = new Map<string, { sum: Prisma.Decimal; count: number }>();
        const txs = devFallbackStore.getUserTransactions(userId).filter((t) => {
          const d = new Date(t.date);
          return t.type === 'EXPENSE' && d >= startDate && d <= endDate;
        });
        for (const t of txs) {
          const cur = map.get(t.categoryId) || { sum: new Prisma.Decimal(0), count: 0 };
          cur.sum = cur.sum.add(t.amount);
          cur.count += 1;
          map.set(t.categoryId, cur);
        }
        const result: any[] = [];
        for (const [categoryId, val] of map.entries()) {
          result.push({
            categoryId,
            _sum: { amount: val.sum },
            _count: { id: val.count },
          });
        }
        return result.sort((a, b) => b._sum.amount.comparedTo(a._sum.amount));
      }
      throw error;
    }
  }

  static async findCategoriesByIds(categoryIds: string[], userId: string) {
    try {
      return await prisma.category.findMany({
        where: {
          id: { in: categoryIds },
          OR: [{ userId: null }, { userId }],
        },
        select: { id: true, name: true, icon: true, color: true },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return categoryIds
          .map((id) => devFallbackStore.categories.get(id))
          .filter(Boolean)
          .map((c) => ({ id: c!.id, name: c!.name, icon: c!.icon, color: c!.color }));
      }
      throw error;
    }
  }

  static async findPeriodTransactions(userId: string, startDate: Date, endDate: Date) {
    try {
      return await prisma.transaction.findMany({
        where: { userId, date: { gte: startDate, lte: endDate } },
        include: { category: true },
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

  static async findUserGoals(userId: string) {
    try {
      return await prisma.goal.findMany({
        where: { userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserGoals(userId);
      }
      throw error;
    }
  }

  static async findActiveRecurring(userId: string) {
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
}
