import { z } from 'zod';

export const passwordPolicy = z
  .string({
    message: 'Mật khẩu là bắt buộc',
  })
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(128, 'Mật khẩu không được vượt quá 128 ký tự')
  .refine((val) => /[A-Za-z]/.test(val) && /[0-9]/.test(val), {
    message: 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số',
  });

export const registerSchema = z.object({
  name: z
    .string({
      message: 'Họ và tên là bắt buộc',
    })
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ và tên không được vượt quá 100 ký tự'),
  email: z
    .string({
      message: 'Email là bắt buộc',
    })
    .trim()
    .toLowerCase()
    .email('Định dạng email không hợp lệ')
    .max(255, 'Email quá dài'),
  password: passwordPolicy,
});

export const loginSchema = z.object({
  email: z
    .string({
      message: 'Email là bắt buộc',
    })
    .trim()
    .toLowerCase()
    .email('Định dạng email không hợp lệ'),
  password: z
    .string({
      message: 'Mật khẩu là bắt buộc',
    })
    .min(1, 'Vui lòng nhập mật khẩu')
    .max(128, 'Mật khẩu quá dài'),
});

export const googleAuthSchema = z
  .object({
    idToken: z.string().trim().max(4096).optional(),
    credential: z.string().trim().max(4096).optional(),
    token: z.string().trim().max(4096).optional(),
    accessToken: z.string().trim().max(4096).optional(),
    access_token: z.string().trim().max(4096).optional(),
  })
  .refine(
    (data) => !!(data.idToken || data.credential || data.token || data.accessToken || data.access_token),
    {
      message: 'Thiếu Google Token (idToken hoặc accessToken)',
    }
  );

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      message: 'Email là bắt buộc',
    })
    .trim()
    .toLowerCase()
    .email('Định dạng email không hợp lệ')
    .max(255, 'Email quá dài'),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({
      message: 'Token đặt lại mật khẩu là bắt buộc',
    })
    .trim()
    .min(10, 'Mã token đặt lại mật khẩu không hợp lệ')
    .max(256, 'Mã token không hợp lệ'),
  password: passwordPolicy,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().trim().max(256).optional(),
});
