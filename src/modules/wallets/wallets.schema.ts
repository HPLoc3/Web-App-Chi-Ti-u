import { z } from 'zod';
import { zMoney, zMoneySigned } from '../../utils/moneySchema';

export const walletTypeSchema = z.enum(['cash', 'bank', 'credit', 'ewallet']);

export const createWalletSchema = z.object({
  name: z.string({ message: 'Tên ví là bắt buộc' }).trim().min(1, 'Tên ví không được để trống').max(100),
  balance: zMoneySigned.optional().default(0),
  currency: z.string().optional().default('VND'),
  isDefault: z.boolean().optional().default(false),
  type: walletTypeSchema.optional().default('cash'),
});

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1, 'Tên ví không được để trống').max(100).optional(),
  balance: zMoneySigned.optional(),
  currency: z.string().optional(),
  isDefault: z.boolean().optional(),
  type: walletTypeSchema.optional(),
});

export const transferWalletSchema = z.object({
  fromWalletId: z.string({ message: 'Ví nguồn là bắt buộc' }).min(1, 'Ví nguồn không được để trống'),
  toWalletId: z.string({ message: 'Ví đích là bắt buộc' }).min(1, 'Ví đích không được để trống'),
  amount: zMoney,
  note: z.string().max(500).optional(),
});

