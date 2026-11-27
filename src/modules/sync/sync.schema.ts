import { z } from 'zod';
import { zMoneyNonNegative, zMoneySigned } from '../../utils/moneySchema';

const optionalText = z.string().nullish();

// looseObject: giữ nguyên trường thừa để sync.service tự chọn, không bị zod cắt mất.
// Khoản chi/định kỳ dùng zMoneySigned vì service bỏ qua (không từ chối) số <= 0.
const syncExpenseSchema = z.looseObject({
  amount: zMoneySigned,
  categoryId: optionalText,
  note: optionalText,
  date: optionalText,
});

const syncGoalSchema = z.looseObject({
  name: optionalText,
  target: zMoneyNonNegative.optional(),
  targetAmount: zMoneyNonNegative.optional(),
  current: zMoneyNonNegative.optional(),
  currentAmount: zMoneyNonNegative.optional(),
  deadline: optionalText,
  color: optionalText,
});

const syncRecurringSchema = z.looseObject({
  amount: zMoneySigned,
  categoryId: optionalText,
  note: optionalText,
  dayOfMonth: z.union([z.number(), z.string()]).optional(),
  // service tự chuẩn hóa tần suất và bỏ qua ngày sai định dạng
  frequency: optionalText,
  startDate: optionalText,
  nextPaymentDate: optionalText,
  isActive: z.boolean().optional(),
});

export const syncClientStateSchema = z.object({
  expenses: z.array(syncExpenseSchema).optional().default([]),
  goals: z.array(syncGoalSchema).optional().default([]),
  recurringExpenses: z.array(syncRecurringSchema).optional().default([]),
  income: zMoneyNonNegative.optional(),
  budgetTemplate: z.string().optional(),
  categoryLimits: z.record(z.string(), zMoneyNonNegative).optional(),
});
