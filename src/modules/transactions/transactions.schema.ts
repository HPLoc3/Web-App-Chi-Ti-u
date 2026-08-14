import { z } from 'zod';

export const getTransactionsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional().default(1),
  pageSize: z.coerce.number().int().positive().max(100).optional().default(20),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

export const createTransactionSchema = z.object({
  amount: z.number({ message: 'Số tiền là bắt buộc' }).positive('Số tiền phải lớn hơn 0'),
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  note: z.string().max(500).optional().default(''),
  date: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  amount: z.number().positive('Số tiền phải lớn hơn 0').optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
});
