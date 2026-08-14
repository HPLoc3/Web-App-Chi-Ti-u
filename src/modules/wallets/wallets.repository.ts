import { prisma } from '../../lib/prisma';
import { Wallet, Prisma } from '@prisma/client';

export class WalletsRepository {
  static async findByUserId(userId: string): Promise<Wallet[]> {
    return prisma.wallet.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Wallet | null> {
    return prisma.wallet.findFirst({
      where: { id, userId },
    });
  }

  static async create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    return prisma.wallet.create({
      data,
    });
  }

  static async update(id: string, data: Prisma.WalletUpdateInput): Promise<Wallet> {
    return prisma.wallet.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.wallet.delete({
      where: { id },
    });
  }

  static async clearDefaults(userId: string): Promise<void> {
    await prisma.wallet.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });
  }
}
