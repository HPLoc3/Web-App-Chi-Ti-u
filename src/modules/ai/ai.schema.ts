import { z } from 'zod';

export const aiAssistantSchema = z.object({
  message: z.string({ message: 'Nội dung tin nhắn là bắt buộc' }).trim().min(1, 'Tin nhắn không được để trống'),
  context: z.object({
    currentDate: z.string().optional(),
    expenses: z.array(z.any()).optional(),
    goals: z.array(z.any()).optional(),
    categoryLimits: z.record(z.string(), z.number()).optional(),
    income: z.number().optional(),
    recurringExpenses: z.array(z.any()).max(500, 'Tối đa 500 khoản định kỳ').optional(),
  }).optional(),
});
