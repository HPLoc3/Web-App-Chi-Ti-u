import { prisma } from '../../lib/prisma';

export class ReportsRepository {
  static async findUserBudget(userId: string) {
    return prisma.budget.findUnique({
      where: { userId },
      include: { budgetLimits: true },
    });
  }

  static async aggregateIncome(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startDate, lte: endDate },
      },
    });
  }

  static async aggregateExpense(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
    });
  }

  static async aggregateWallets(userId: string) {
    return prisma.wallet.aggregate({
      _sum: { balance: true },
      where: { userId },
    });
  }

  static async groupCategoryExpenses(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.groupBy({
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
  }

  static async findCategoriesByIds(categoryIds: string[], userId: string) {
    return prisma.category.findMany({
      where: {
        id: { in: categoryIds },
        OR: [{ userId: null }, { userId }],
      },
      select: { id: true, name: true, icon: true, color: true },
    });
  }

  static async findPeriodTransactions(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.findMany({
      where: { userId, date: { gte: startDate, lte: endDate } },
      include: { category: true },
    });
  }

  static async findUserGoals(userId: string) {
    return prisma.goal.findMany({
      where: { userId },
    });
  }

  static async findActiveRecurring(userId: string) {
    return prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
    });
  }
}
