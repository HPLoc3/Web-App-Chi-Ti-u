import { z } from 'zod';

export const updateBudgetSchema = z.object({
  income: z.number().min(0, 'Thu nhập không thể âm').optional(),
  budgetTemplate: z.string().optional(),
  categoryLimits: z.record(z.string(), z.number()).optional(),
  needsPercent: z.number().min(0).max(100).optional(),
  wantsPercent: z.number().min(0).max(100).optional(),
  savingsPercent: z.number().min(0).max(100).optional(),
});
