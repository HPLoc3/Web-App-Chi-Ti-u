import { Prisma } from '@prisma/client';
import { WalletsRepository } from './wallets.repository';
import { WalletDTO, CreateWalletInput, UpdateWalletInput } from './wallets.types';
import { AppError } from '../../middleware/errorHandler.middleware';

export class WalletsService {
  private static formatWallet(w: any): WalletDTO {
    return {
      id: w.id,
      name: w.name,
      balance: w.balance ? Number(w.balance) : 0,
      currency: w.currency,
      isDefault: w.isDefault,
      userId: w.userId,
      createdAt: w.createdAt,
      updatedAt: w.updatedAt,
    };
  }

  static async getWallets(userId: string): Promise<WalletDTO[]> {
    let wallets = await WalletsRepository.findByUserId(userId);
    if (wallets.length === 0) {
      // Auto-create default wallet
      const defaultWallet = await WalletsRepository.create({
        name: 'Ví Tiền Mặt',
        balance: new Prisma.Decimal(0),
        currency: 'VND',
        isDefault: true,
        user: { connect: { id: userId } },
      });
      wallets = [defaultWallet];
    }
    return wallets.map(this.formatWallet);
  }

  static async getWalletById(id: string, userId: string): Promise<WalletDTO> {
    const wallet = await WalletsRepository.findByIdAndUserId(id, userId);
    if (!wallet) {
      throw new AppError('Không tìm thấy ví hoặc bạn không có quyền truy cập.', 404, 'NOT_FOUND');
    }
    return this.formatWallet(wallet);
  }

  static async createWallet(userId: string, input: CreateWalletInput): Promise<WalletDTO> {
    if (input.isDefault) {
      await WalletsRepository.clearDefaults(userId);
    }

    const wallet = await WalletsRepository.create({
      name: input.name,
      balance: new Prisma.Decimal(input.balance || 0),
      currency: input.currency || 'VND',
      isDefault: input.isDefault || false,
      user: { connect: { id: userId } },
    });

    return this.formatWallet(wallet);
  }

  static async updateWallet(id: string, userId: string, input: UpdateWalletInput): Promise<WalletDTO> {
    const existing = await WalletsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Không tìm thấy ví hoặc bạn không có quyền truy cập.', 404, 'NOT_FOUND');
    }

    if (input.isDefault) {
      await WalletsRepository.clearDefaults(userId);
    }

    const updated = await WalletsRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.balance !== undefined ? { balance: new Prisma.Decimal(input.balance) } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    });

    return this.formatWallet(updated);
  }

  static async deleteWallet(id: string, userId: string): Promise<void> {
    const existing = await WalletsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Không tìm thấy ví hoặc bạn không có quyền truy cập.', 404, 'NOT_FOUND');
    }

    const allWallets = await WalletsRepository.findByUserId(userId);
    if (allWallets.length <= 1) {
      throw new AppError('Không thể xóa ví duy nhất của bạn.', 400, 'CANNOT_DELETE_ONLY_WALLET');
    }

    await WalletsRepository.delete(id);
  }
}
