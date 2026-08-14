import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../middleware/auth.middleware';

/**
 * Helper gắn HttpOnly Cookies (Access Token + Refresh Token)
 */
const setAuthCookies = (res: Response, req: Request, tokens: { accessToken: string; refreshToken: string }) => {
  // 1. Access Token Cookie (15 phút)
  res.cookie('accessToken', tokens.accessToken, getAccessTokenCookieOptions(req));
  // Đồng thời đặt 'token' để hỗ trợ tương thích ngược liền mạch cho các client cũ
  res.cookie('token', tokens.accessToken, getAccessTokenCookieOptions(req));

  // 2. Refresh Token Cookie (30 ngày)
  res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions(req));
};

/**
 * Helper xóa toàn bộ Auth Cookies
 */
const clearAuthCookies = (res: Response, req: Request) => {
  const clearOpts = getClearCookieOptions(req);
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('token', clearOpts);
};

/**
 * POST /api/v1/auth/register
 * Đăng ký tài khoản mới bằng Email & Mật khẩu
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;
    const { user, tokens } = await AuthService.register(name, email, password);

    setAuthCookies(res, req, tokens);

    res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công.',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    console.error('Lỗi đăng ký:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Đăng ký thất bại. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/v1/auth/login
 * Đăng nhập bằng Email & Mật khẩu
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const { user, tokens } = await AuthService.login(email, password);

    setAuthCookies(res, req, tokens);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công.',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    console.warn('Lỗi đăng nhập:', error.message);
    res.status(401).json({
      success: false,
      message: error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.',
    });
  }
};

/**
 * POST /api/v1/auth/google
 * Đăng nhập / Đăng ký bằng Google OAuth 2.0
 */
export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { user, tokens } = await AuthService.googleAuth(req.body);

    setAuthCookies(res, req, tokens);

    res.status(200).json({
      success: true,
      message: 'Đăng nhập Google thành công.',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    console.error('Lỗi Google Auth:', error.message);
    res.status(400).json({
      success: false,
      message: error.message || 'Xác thực Google thất bại. Vui lòng thử lại.',
    });
  }
};

/**
 * POST /api/v1/auth/refresh
 * Làm mới Access Token bằng Refresh Token (Token Rotation)
 */
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

    if (!rawRefreshToken) {
      clearAuthCookies(res, req);
      res.status(401).json({
        success: false,
        code: 'MISSING_REFRESH_TOKEN',
        message: 'Thiếu Refresh Token. Vui lòng đăng nhập lại.',
      });
      return;
    }

    const { user, tokens } = await AuthService.refreshTokens(rawRefreshToken);

    setAuthCookies(res, req, tokens);

    res.status(200).json({
      success: true,
      message: 'Làm mới phiên đăng nhập thành công.',
      user,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    });
  } catch (error: any) {
    clearAuthCookies(res, req);
    res.status(401).json({
      success: false,
      code: 'INVALID_REFRESH_TOKEN',
      message: error.message || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    });
  }
};

/**
 * GET /api/v1/auth/me
 * Lấy thông tin tài khoản người dùng hiện tại
 */
export const getMe = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Chưa đăng nhập.' });
      return;
    }

    const user = await AuthService.getMe(req.user.id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error: any) {
    res.status(404).json({
      success: false,
      message: error.message || 'Không tìm thấy tài khoản người dùng.',
    });
  }
};

/**
 * POST /api/v1/auth/logout
 * Đăng xuất người dùng, thu hồi Refresh Token và xóa toàn bộ Auth Cookies
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const userId = req.user?.id;

    await AuthService.logout(rawRefreshToken, userId);
  } catch (error) {
    console.warn('Lỗi khi thu hồi token đăng xuất:', error);
  } finally {
    clearAuthCookies(res, req);
    res.status(200).json({
      success: true,
      message: 'Đã đăng xuất thành công.',
    });
  }
};

/**
 * POST /api/v1/auth/logout-all
 * Đăng xuất khỏi tất cả các thiết bị
 */
export const logoutAll = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (userId) {
      await AuthService.logoutAllDevices(userId);
    }
  } catch (error) {
    console.warn('Lỗi khi thu hồi tất cả các phiên đăng xuất:', error);
  } finally {
    clearAuthCookies(res, req);
    res.status(200).json({
      success: true,
      message: 'Đã đăng xuất thành công khỏi tất cả các thiết bị.',
    });
  }
};

/**
 * POST /api/v1/auth/forgot-password
 * Yêu cầu đặt lại mật khẩu (Không làm lộ email có tồn tại hay không)
 */
export const forgotPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    const result = await AuthService.forgotPassword(email);

    res.status(200).json(result);
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: 'Đã xảy ra lỗi khi xử lý yêu cầu đặt lại mật khẩu.',
    });
  }
};

/**
 * POST /api/v1/auth/reset-password
 * Thực hiện đặt lại mật khẩu mới với Token
 */
export const resetPassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token, password } = req.body;
    await AuthService.resetPassword(token, password);

    // Xóa cookies để buộc user đăng nhập lại bằng mật khẩu mới
    clearAuthCookies(res, req);

    res.status(200).json({
      success: true,
      message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: error.message || 'Đặt lại mật khẩu thất bại. Mã token không hợp lệ hoặc đã hết hạn.',
    });
  }
};
