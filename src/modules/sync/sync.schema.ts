import { z } from 'zod';

export const syncClientStateSchema = z.object({
  expenses: z.array(z.any()).optional().default([]),
  goals: z.array(z.any()).optional().default([]),
  recurringExpenses: z.array(z.any()).optional().default([]),
  income: z.number().optional(),
  budgetTemplate: z.string().optional(),
  categoryLimits: z.record(z.string(), z.number()).optional(),
});
