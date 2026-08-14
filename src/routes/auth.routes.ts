import { Router } from 'express';
import {
  register,
  login,
  googleAuth,
  refreshToken,
  logout,
  logoutAll,
  getMe,
  forgotPassword,
  resetPassword,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  loginRateLimiter,
  registerRateLimiter,
  forgotPasswordRateLimiter,
  generalAuthRateLimiter,
} from '../middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

// POST /api/v1/auth/register - Đăng ký tài khoản mới bằng Email & Mật khẩu
router.post(
  '/register',
  registerRateLimiter,
  validateRequest(registerSchema, 'body'),
  register
);

// POST /api/v1/auth/login - Đăng nhập bằng Email & Mật khẩu
router.post(
  '/login',
  loginRateLimiter,
  validateRequest(loginSchema, 'body'),
  login
);

// POST /api/v1/auth/google - Đăng nhập / Đăng ký Google OAuth 2.0
router.post(
  '/google',
  loginRateLimiter,
  validateRequest(googleAuthSchema, 'body'),
  googleAuth
);

// POST /api/v1/auth/refresh - Làm mới Access Token (Token Rotation)
router.post(
  '/refresh',
  generalAuthRateLimiter,
  refreshToken
);

// POST /api/v1/auth/forgot-password - Yêu cầu đặt lại mật khẩu
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validateRequest(forgotPasswordSchema, 'body'),
  forgotPassword
);

// POST /api/v1/auth/reset-password - Thực hiện đặt lại mật khẩu với Token
router.post(
  '/reset-password',
  forgotPasswordRateLimiter,
  validateRequest(resetPasswordSchema, 'body'),
  resetPassword
);

// GET /api/v1/auth/me - Lấy thông tin tài khoản hiện tại
router.get(
  '/me',
  authMiddleware,
  getMe
);

// POST /api/v1/auth/logout - Đăng xuất người dùng & xóa Cookie
router.post(
  '/logout',
  logout
);

// POST /api/v1/auth/logout-all - Đăng xuất khỏi tất cả các thiết bị
router.post(
  '/logout-all',
  authMiddleware,
  logoutAll
);

export default router;
