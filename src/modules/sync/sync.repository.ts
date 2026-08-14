import { prisma } from '../../lib/prisma';
import { Prisma, Wallet } from '@prisma/client';

export class SyncRepository {
  static async findDefaultWallet(userId: string): Promise<Wallet | null> {
    return prisma.wallet.findFirst({
      where: { userId },
    });
  }

  static async createDefaultWallet(userId: string): Promise<Wallet> {
    return prisma.wallet.create({
      data: {
        name: 'Ví Chính',
        balance: new Prisma.Decimal(0),
        currency: 'VND',
        isDefault: true,
        userId,
      },
    });
  }

  static async upsertBudget(userId: string, income?: number, budgetTemplate?: string, categoryLimits?: Record<string, number>) {
    return prisma.budget.upsert({
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
  }

  static async createTransaction(data: Prisma.TransactionCreateInput) {
    return prisma.transaction.create({ data });
  }

  static async createGoal(data: Prisma.GoalCreateInput) {
    return prisma.goal.create({ data });
  }

  static async createRecurring(data: Prisma.RecurringTransactionCreateInput) {
    return prisma.recurringTransaction.create({ data });
  }
}
