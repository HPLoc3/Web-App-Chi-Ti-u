import { prisma } from '../../lib/prisma';
import { Wallet, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class WalletsRepository {
  static async findByUserId(userId: string): Promise<Wallet[]> {
    try {
      return await prisma.wallet.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserWallets(userId);
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Wallet | null> {
    try {
      return await prisma.wallet.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.wallets.get(id) || null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.WalletCreateInput): Promise<Wallet> {
    try {
      return await prisma.wallet.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.createWallet(data);
      }
      throw error;
    }
  }

  static async update(id: string, data: Prisma.WalletUpdateInput): Promise<Wallet> {
    try {
      return await prisma.wallet.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const w = devFallbackStore.wallets.get(id);
        if (w) {
          if (data.name) w.name = String(data.name);
          if (data.balance) w.balance = new Prisma.Decimal(data.balance.toString());
          if (data.isDefault !== undefined) w.isDefault = Boolean(data.isDefault);
          devFallbackStore.wallets.set(id, w);
          return w;
        }
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.wallet.delete({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.wallets.delete(id);
        return;
      }
      throw error;
    }
  }

  static async clearDefaults(userId: string): Promise<void> {
    try {
      await prisma.wallet.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        for (const w of devFallbackStore.wallets.values()) {
          if (w.userId === userId) {
            w.isDefault = false;
            devFallbackStore.wallets.set(w.id, w);
          }
        }
        return;
      }
      throw error;
    }
  }
}

