import { Prisma } from '@prisma/client';
import { WalletsRepository } from './wallets.repository';
import { WalletDTO, CreateWalletInput, UpdateWalletInput } from './wallets.types';
import { AppError } from '../../middleware/errorHandler.middleware';
import { FinancialMath } from '../../utils/financialMath';
import { FinancialAuditLogger } from '../../utils/financialAudit';

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

    const initialBalance = FinancialMath.toDecimal(input.balance);

    const wallet = await WalletsRepository.create({
      name: input.name,
      balance: initialBalance,
      currency: input.currency || 'VND',
      isDefault: input.isDefault || false,
      user: { connect: { id: userId } },
    });

    FinancialAuditLogger.log({
      userId,
      action: 'WALLET_CREATE',
      entity: 'Wallet',
      entityId: wallet.id,
      amount: initialBalance,
      metadata: { name: wallet.name, isDefault: wallet.isDefault },
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

    const newBalance = input.balance !== undefined ? FinancialMath.toDecimal(input.balance) : undefined;

    const updated = await WalletsRepository.update(id, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(newBalance !== undefined ? { balance: newBalance } : {}),
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.isDefault !== undefined ? { isDefault: input.isDefault } : {}),
    });

    FinancialAuditLogger.log({
      userId,
      action: 'WALLET_UPDATE',
      entity: 'Wallet',
      entityId: id,
      previousBalance: existing.balance,
      newBalance: updated.balance,
      metadata: { name: updated.name },
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

    FinancialAuditLogger.log({
      userId,
      action: 'WALLET_DELETE',
      entity: 'Wallet',
      entityId: id,
      previousBalance: existing.balance,
    });
  }

  static async transferBetweenWallets(
    userId: string,
    fromWalletId: string,
    toWalletId: string,
    amount: number | string | Prisma.Decimal,
    note?: string
  ): Promise<{ fromWallet: WalletDTO; toWallet: WalletDTO }> {
    if (fromWalletId === toWalletId) {
      throw new AppError('Ví nguồn và ví đích không được trùng nhau.', 400, 'SAME_WALLET_TRANSFER');
    }

    const decAmount = FinancialMath.toDecimal(amount);
    if (decAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền chuyển phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
    }

    try {
      const result = await WalletsRepository.transfer(userId, fromWalletId, toWalletId, decAmount);

      FinancialAuditLogger.log({
        userId,
        action: 'WALLET_TRANSFER',
        entity: 'Wallet',
        entityId: fromWalletId,
        targetWalletId: toWalletId,
        amount: decAmount,
        metadata: { note: note || '' },
      });

      return {
        fromWallet: this.formatWallet(result.fromWallet),
        toWallet: this.formatWallet(result.toWallet),
      };
    } catch (error: any) {
      if (error.message === 'FROM_WALLET_NOT_FOUND' || error.message === 'TO_WALLET_NOT_FOUND') {
        throw new AppError('Không tìm thấy ví nguồn hoặc ví đích hợp lệ.', 404, 'WALLET_NOT_FOUND');
      }
      throw error;
    }
  }
}
