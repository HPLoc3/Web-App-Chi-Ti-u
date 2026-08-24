import { z } from 'zod';

export const createWalletSchema = z.object({
  name: z.string({ message: 'Tên ví là bắt buộc' }).trim().min(1, 'Tên ví không được để trống').max(100),
  balance: z.number().optional().default(0),
  currency: z.string().optional().default('VND'),
  isDefault: z.boolean().optional().default(false),
});

export const updateWalletSchema = z.object({
  name: z.string().trim().min(1, 'Tên ví không được để trống').max(100).optional(),
  balance: z.number().optional(),
  currency: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const transferWalletSchema = z.object({
  fromWalletId: z.string({ message: 'Ví nguồn là bắt buộc' }).min(1, 'Ví nguồn không được để trống'),
  toWalletId: z.string({ message: 'Ví đích là bắt buộc' }).min(1, 'Ví đích không được để trống'),
  amount: z.number({ message: 'Số tiền là bắt buộc' }).positive('Số tiền chuyển phải lớn hơn 0'),
  note: z.string().max(500).optional(),
});

