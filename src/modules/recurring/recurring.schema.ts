import { z } from 'zod';
import { zMoney } from '../../utils/moneySchema';
import { isValidYmd } from '../../utils/recurringSchedule';

const dayOfMonth = z.number().int().min(1).max(31);
const frequency = z.enum(['weekly', 'monthly', 'yearly'], { message: 'Tần suất không hợp lệ.' });
const startDate = z
  .string()
  .refine((v) => isValidYmd(v) && v >= '2000-01-01' && v <= '2100-12-31', 'Ngày bắt đầu không hợp lệ.');

export const createRecurringSchema = z.object({
  amount: zMoney,
  categoryId: z.string().optional(),
  dayOfMonth: dayOfMonth.optional(),
  frequency: frequency.optional(),
  startDate: startDate.optional(),
  note: z.string().max(500).optional().default(''),
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  isActive: z.boolean().optional().default(true),
});

export const updateRecurringSchema = z.object({
  amount: zMoney.optional(),
  categoryId: z.string().optional(),
  dayOfMonth: dayOfMonth.optional(),
  frequency: frequency.optional(),
  startDate: startDate.optional(),
  note: z.string().max(500).optional(),
  type: z.enum(['EXPENSE', 'INCOME']).optional(),
  isActive: z.boolean().optional(),
});
