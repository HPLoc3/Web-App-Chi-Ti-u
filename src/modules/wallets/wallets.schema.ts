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
