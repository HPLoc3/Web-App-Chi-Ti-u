import { prisma } from '../../lib/prisma';
import { RecurringTransaction, Prisma, Wallet } from '@prisma/client';

export class RecurringRepository {
  static async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    return prisma.recurringTransaction.findMany({
      where: { userId },
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
      orderBy: { dayOfMonth: 'asc' },
    });
  }

  static async findActiveByUserId(userId: string): Promise<RecurringTransaction[]> {
    return prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
    });
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<RecurringTransaction | null> {
    return prisma.recurringTransaction.findFirst({
      where: { id, userId },
    });
  }

  static async create(data: Prisma.RecurringTransactionCreateInput): Promise<RecurringTransaction> {
    return prisma.recurringTransaction.create({
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });
  }

  static async update(id: string, data: Prisma.RecurringTransactionUpdateInput): Promise<RecurringTransaction> {
    return prisma.recurringTransaction.update({
      where: { id },
      data,
      include: {
        category: {
          select: { id: true, name: true, icon: true, color: true },
        },
      },
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.recurringTransaction.delete({
      where: { id },
    });
  }

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

  static async findMonthTransactions(userId: string, startDate: Date, endDate: Date) {
    return prisma.transaction.findMany({
      where: {
        userId,
        date: { gte: startDate, lte: endDate },
      },
    });
  }

  static async createTransaction(data: Prisma.TransactionCreateInput) {
    return prisma.transaction.create({ data });
  }
}
