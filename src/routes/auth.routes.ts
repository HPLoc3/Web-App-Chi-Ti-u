import { Router } from 'express';
import { googleAuth, register, login, forgotPassword, getMe, logout } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// POST /api/auth/register - Đăng ký tài khoản mới bằng Email & Mật khẩu
router.post('/register', register);

// POST /api/auth/login - Đăng nhập bằng Email & Mật khẩu
router.post('/login', login);

// POST /api/auth/forgot-password - Yêu cầu khôi phục mật khẩu
router.post('/forgot-password', forgotPassword);

// POST /api/auth/google - Đăng nhập Google OAuth 2.0
router.post('/google', googleAuth);

// GET /api/auth/me - Lấy thông tin tài khoản hiện tại
router.get('/me', authMiddleware, getMe);

// POST /api/auth/logout - Đăng xuất & xóa Cookie
router.post('/logout', logout);

export default router;
