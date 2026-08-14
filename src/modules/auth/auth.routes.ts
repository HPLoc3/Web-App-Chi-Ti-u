import { Router } from 'express';
import { AuthController } from './auth.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  registerRateLimiter,
  loginRateLimiter,
  forgotPasswordRateLimiter,
  authRateLimiter,
} from '../../middleware/rateLimiter.middleware';
import {
  registerSchema,
  loginSchema,
  googleAuthSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  refreshTokenSchema,
} from './auth.schema';

const router = Router();

// POST /api/v1/auth/register
router.post(
  '/register',
  registerRateLimiter,
  validateRequest(registerSchema, 'body'),
  AuthController.register
);

// POST /api/v1/auth/login
router.post(
  '/login',
  loginRateLimiter,
  validateRequest(loginSchema, 'body'),
  AuthController.login
);

// POST /api/v1/auth/google
router.post(
  '/google',
  loginRateLimiter,
  validateRequest(googleAuthSchema, 'body'),
  AuthController.googleAuth
);

// POST /api/v1/auth/refresh
router.post(
  '/refresh',
  validateRequest(refreshTokenSchema, 'body'),
  AuthController.refreshToken
);

// GET /api/v1/auth/me
router.get(
  '/me',
  authMiddleware,
  AuthController.getMe
);

// POST /api/v1/auth/forgot-password
router.post(
  '/forgot-password',
  forgotPasswordRateLimiter,
  validateRequest(forgotPasswordSchema, 'body'),
  AuthController.forgotPassword
);

// POST /api/v1/auth/reset-password
router.post(
  '/reset-password',
  authRateLimiter,
  validateRequest(resetPasswordSchema, 'body'),
  AuthController.resetPassword
);

// POST /api/v1/auth/logout
router.post(
  '/logout',
  AuthController.logout
);

// POST /api/v1/auth/logout-all
router.post(
  '/logout-all',
  authMiddleware,
  AuthController.logoutAll
);

export default router;
