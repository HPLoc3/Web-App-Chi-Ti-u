import { prisma } from '../../lib/prisma';
import { Transaction, Wallet, Prisma } from '@prisma/client';

export class TransactionsRepository {
  static async findMany(
    where: Prisma.TransactionWhereInput,
    skip: number,
    take: number
  ): Promise<Transaction[]> {
    return prisma.transaction.findMany({
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
  }

  static async count(where: Prisma.TransactionWhereInput): Promise<number> {
    return prisma.transaction.count({ where });
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Transaction | null> {
    return prisma.transaction.findFirst({
      where: { id, userId },
      include: { wallet: true },
    });
  }

  static async createWithWalletUpdate(
    transactionData: Prisma.TransactionCreateInput,
    walletId: string,
    balanceChange: Prisma.Decimal
  ) {
    return prisma.$transaction(async (tx) => {
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
  }

  static async createBulk(items: Prisma.TransactionCreateManyInput[]): Promise<number> {
    const result = await prisma.transaction.createMany({
      data: items,
    });
    return result.count;
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
    return prisma.$transaction(async (tx) => {
      // Revert old wallet
      await tx.wallet.update({
        where: { id: oldWalletId },
        data: { balance: { increment: oldBalanceAdjustment } },
      });

      // Apply to new wallet
      const updatedWallet = await tx.wallet.update({
        where: { id: newWalletId },
        data: { balance: { increment: newBalanceAdjustment } },
      });

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

      return { updatedTransaction, updatedWallet };
    });
  }

  static async deleteWithWalletAdjustment(
    transactionId: string,
    walletId: string,
    revertChange: Prisma.Decimal
  ): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await tx.wallet.update({
        where: { id: walletId },
        data: { balance: { increment: revertChange } },
      });

      await tx.transaction.delete({
        where: { id: transactionId },
      });
    });
  }

  static async deleteMany(ids: string[], userId: string): Promise<number> {
    const result = await prisma.transaction.deleteMany({
      where: { id: { in: ids }, userId },
    });
    return result.count;
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
}
