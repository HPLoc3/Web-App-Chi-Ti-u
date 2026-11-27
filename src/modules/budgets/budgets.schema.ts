import { z } from 'zod';
import { zMoneyNonNegative } from '../../utils/moneySchema';

export const updateBudgetSchema = z.object({
  income: zMoneyNonNegative.optional(),
  budgetTemplate: z.string().optional(),
  categoryLimits: z.record(z.string(), zMoneyNonNegative).optional(),
  needsPercent: z.number().min(0).max(100).optional(),
  wantsPercent: z.number().min(0).max(100).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
});
