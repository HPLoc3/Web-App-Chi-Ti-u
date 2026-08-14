import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string({ message: 'Tên danh mục là bắt buộc' }).trim().min(1, 'Tên danh mục không được để trống').max(100),
  type: z.enum(['EXPENSE', 'INCOME']).optional().default('EXPENSE'),
  icon: z.string().optional().default('Tag'),
  color: z.string().optional().default('#0F766E'),
});
