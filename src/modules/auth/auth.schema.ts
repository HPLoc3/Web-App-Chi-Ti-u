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
      message: 'Họ tên là bắt buộc',
    })
    .trim()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(100, 'Họ tên quá dài'),
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
    .min(1, 'Mật khẩu không được để trống'),
});

export const googleAuthSchema = z.object({
  credential: z.string().optional(),
  idToken: z.string().optional(),
  token: z.string().optional(),
  accessToken: z.string().optional(),
  access_token: z.string().optional(),
  email: z.string().email().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
  googleId: z.string().optional(),
});

export const forgotPasswordSchema = z.object({
  email: z
    .string({
      message: 'Email là bắt buộc',
    })
    .trim()
    .toLowerCase()
    .email('Định dạng email không hợp lệ'),
});

export const resetPasswordSchema = z.object({
  token: z
    .string({
      message: 'Mã token là bắt buộc',
    })
    .trim()
    .min(10, 'Mã token đặt lại mật khẩu không hợp lệ')
    .max(256, 'Mã token không hợp lệ'),
  password: passwordPolicy,
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().optional(),
});
