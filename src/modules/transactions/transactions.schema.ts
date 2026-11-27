import { z } from 'zod';
import { zMoney } from '../../utils/moneySchema';

export const PAGE_SIZE_MAX = 500;

export const getTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().positive().optional().default(1),
    pageSize: z.coerce.number().int().positive().max(PAGE_SIZE_MAX).optional().default(20),
    type: z.enum(['EXPENSE', 'INCOME']).optional(),
    categoryId: z.string().optional(),
    walletId: z.string().optional(),
    // Tháng/năm theo lịch Asia/Ho_Chi_Minh
    month: z.coerce.number().int().min(1).max(12).optional(),
    year: z.coerce.number().int().min(1970).max(2100).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    search: z.string().optional(),
  })
  .refine((q) => q.month === undefined || q.year !== undefined, {
    message: 'Lọc theo tháng phải kèm năm.',
    path: ['year'],
  });

export const createTransactionSchema = z.object({
  amount: zMoney,
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  note: z.string().max(500).optional().default(''),
  date: z.string().optional(),
});

export const updateTransactionSchema = z.object({
  amount: zMoney.optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  categoryId: z.string().optional(),
  walletId: z.string().optional(),
  note: z.string().max(500).optional(),
  date: z.string().optional(),
});

export const BULK_MAX_ITEMS = 500;

export const bulkCreateTransactionSchema = z.object({
  items: z
    .array(createTransactionSchema, { message: 'Danh sách giao dịch không hợp lệ.' })
    .min(1, 'Danh sách giao dịch không được để trống.')
    .max(BULK_MAX_ITEMS, `Mỗi lần chỉ nhập tối đa ${BULK_MAX_ITEMS} giao dịch.`),
});

export const bulkDeleteTransactionSchema = z.object({
  ids: z
    .array(z.string().min(1), { message: 'Danh sách ID không hợp lệ.' })
    .min(1, 'Danh sách ID không được để trống.')
    .max(BULK_MAX_ITEMS, `Mỗi lần chỉ xóa tối đa ${BULK_MAX_ITEMS} giao dịch.`),
});
