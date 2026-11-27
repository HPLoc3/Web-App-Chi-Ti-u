import { z } from 'zod';
import { zMoney, zMoneyNonNegative } from '../../utils/moneySchema';

export const createGoalSchema = z.object({
  name: z.string({ message: 'Tên mục tiêu là bắt buộc' }).trim().min(1, 'Tên mục tiêu không được để trống').max(100),
  target: zMoney.optional(),
  targetAmount: zMoney.optional(),
  current: zMoneyNonNegative.optional().default(0),
  currentAmount: zMoneyNonNegative.optional().default(0),
  deadline: z.string().optional(),
  color: z.string().optional().default('#F59E0B'),
  icon: z.string().optional().default('PiggyBank'),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  target: zMoney.optional(),
  targetAmount: zMoney.optional(),
  current: zMoneyNonNegative.optional(),
  currentAmount: zMoneyNonNegative.optional(),
  deadline: z.string().optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
