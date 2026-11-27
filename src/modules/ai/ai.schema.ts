import { z } from 'zod';

export const AI_MESSAGE_MAX = 2000;

export const aiAssistantSchema = z.object({
  message: z
    .string({ message: 'Nội dung tin nhắn là bắt buộc' })
    .trim()
    .min(1, 'Tin nhắn không được để trống')
    .max(AI_MESSAGE_MAX, `Tin nhắn tối đa ${AI_MESSAGE_MAX} ký tự`),
  context: z.object({
    currentDate: z.string().max(40).optional(),
    expenses: z.array(z.any()).max(5000, 'Tối đa 5000 giao dịch').optional(),
    goals: z.array(z.any()).max(100, 'Tối đa 100 mục tiêu').optional(),
    categoryLimits: z
      .record(z.string().max(64), z.number())
      .refine((v) => Object.keys(v).length <= 100, 'Tối đa 100 hạn mức danh mục')
      .optional(),
    income: z.number().optional(),
    recurringExpenses: z.array(z.any()).max(500, 'Tối đa 500 khoản định kỳ').optional(),
  }).optional(),
});
