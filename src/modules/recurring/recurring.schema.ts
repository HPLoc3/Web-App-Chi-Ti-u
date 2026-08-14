import { z } from 'zod';

export const createRecurringSchema = z.object({
  amount: z.number({ message: 'Số tiền là bắt buộc' }).positive('Số tiền phải lớn hơn 0'),
  categoryId: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional().default(1),
  note: z.string().max(500).optional().default(''),
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringSchema = z.object({
  amount: z.number().positive().optional(),
  categoryId: z.string().optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional(),
  note: z.string().max(500).optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  isActive: z.boolean().optional(),
});
