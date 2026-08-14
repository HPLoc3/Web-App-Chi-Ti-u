import { z } from 'zod';
import { passwordPolicy } from '../auth/auth.schema';

export const updateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên phải có ít nhất 2 ký tự').max(100).optional(),
  avatar: z.string().url('URL ảnh đại diện không hợp lệ').optional().nullable(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Mật khẩu hiện tại không được để trống'),
  newPassword: passwordPolicy,
});
