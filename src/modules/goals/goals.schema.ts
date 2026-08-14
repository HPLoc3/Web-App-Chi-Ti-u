import { z } from 'zod';

export const createGoalSchema = z.object({
  name: z.string({ message: 'Tên mục tiêu là bắt buộc' }).trim().min(1, 'Tên mục tiêu không được để trống').max(100),
  target: z.number().positive('Số tiền mục tiêu phải lớn hơn 0').optional(),
  targetAmount: z.number().positive('Số tiền mục tiêu phải lớn hơn 0').optional(),
  current: z.number().min(0).optional().default(0),
  currentAmount: z.number().min(0).optional().default(0),
  deadline: z.string().optional(),
  color: z.string().optional().default('#F59E0B'),
  icon: z.string().optional().default('PiggyBank'),
});

export const updateGoalSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  target: z.number().positive().optional(),
  targetAmount: z.number().positive().optional(),
  current: z.number().min(0).optional(),
  currentAmount: z.number().min(0).optional(),
  deadline: z.string().optional().nullable(),
  color: z.string().optional(),
  icon: z.string().optional(),
});
