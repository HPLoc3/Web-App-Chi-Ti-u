import { z } from 'zod';

export const aiAssistantSchema = z.object({
  message: z
    .string({
      message: 'Tin nhắn không được để trống',
    })
    .trim()
    .min(1, 'Nội dung tin nhắn không được để trống')
    .max(1000, 'Nội dung tin nhắn không được vượt quá 1000 ký tự'),
  context: z
    .object({
      currentDate: z.string().trim().max(30).optional(),
      income: z.number().nonnegative().max(100_000_000_000).optional(),
      expenses: z.array(z.any()).max(100).optional(),
      goals: z.array(z.any()).max(50).optional(),
      categoryLimits: z.record(z.string(), z.number()).optional(),
    })
    .optional(),
});
