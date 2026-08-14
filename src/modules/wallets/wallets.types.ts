import { Prisma } from '@prisma/client';

export interface WalletDTO {
  id: string;
  name: string;
  balance: number;
  currency: string;
  isDefault?: boolean;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWalletInput {
  name: string;
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}

export interface UpdateWalletInput {
  name?: string;
  balance?: number;
  currency?: string;
  isDefault?: boolean;
}
