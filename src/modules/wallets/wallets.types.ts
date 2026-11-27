import { Prisma } from '@prisma/client';

export type WalletType = 'cash' | 'bank' | 'credit' | 'ewallet';

export interface WalletDTO {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isDefault?: boolean;
  type: WalletType;
  userId: string;
  /** Chỉ có ở danh sách ví */
  transactionCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletInput {
  name: string;
  balance?: number;
  currency?: string;
  isDefault?: boolean;
  type?: WalletType;
}

export interface UpdateWalletInput {
  name?: string;
  balance?: number;
  currency?: string;
  isDefault?: boolean;
  type?: WalletType;
}
