import { z } from 'zod';

export const createTransactionSchema = z.object({
  amount: z
    .coerce
    .number({
      message: 'Số tiền phải là một giá trị số hợp lệ',
    })
    .positive('Số tiền giao dịch phải lớn hơn 0')
    .max(100_000_000_000, 'Số tiền giao dịch không được vượt quá 100 tỷ VNĐ'),
  type: z.enum(['INCOME', 'EXPENSE'], {
    message: 'Loại giao dịch phải là INCOME hoặc EXPENSE',
  }),
  categoryId: z
    .string({
      message: 'Vui lòng cung cấp danh mục giao dịch',
    })
    .trim()
    .min(1, 'Danh mục không được để trống')
    .max(100, 'Mã danh mục quá dài'),
  walletId: z
    .string()
    .trim()
    .max(100, 'Mã ví không hợp lệ')
    .optional(),
  note: z
    .string()
    .trim()
    .max(500, 'Ghi chú không được vượt quá 500 ký tự')
    .optional()
    .default(''),
  date: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/, 'Định dạng ngày không hợp lệ (YYYY-MM-DD)')
    .optional(),
});

export const updateTransactionSchema = z.object({
  amount: z
    .coerce
    .number()
    .positive('Số tiền giao dịch phải lớn hơn 0')
    .max(100_000_000_000, 'Số tiền giao dịch không được vượt quá 100 tỷ VNĐ')
    .optional(),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().trim().min(1).max(100).optional(),
  walletId: z.string().trim().max(100).optional(),
  note: z.string().trim().max(500).optional(),
  date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}(T.*)?$/).optional(),
});

export const getTransactionsQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
  walletId: z.string().trim().max(100).optional(),
  categoryId: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
});

export const getSummaryReportQuerySchema = z.object({
  month: z.coerce.number().int().min(1).max(12).optional(),
  year: z.coerce.number().int().min(2000).max(2100).optional(),
});

export const transactionIdParamSchema = z.object({
  id: z.string().trim().min(1, 'ID giao dịch không được để trống').max(100),
});
