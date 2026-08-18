import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import {
  getAccessTokenCookieOptions,
  getRefreshTokenCookieOptions,
  getClearCookieOptions,
} from '../../middleware/auth.middleware';

const setAuthCookies = (res: Response, req: Request, tokens: { accessToken: string; refreshToken: string }) => {
  res.cookie('accessToken', tokens.accessToken, getAccessTokenCookieOptions(req));
  res.cookie('token', tokens.accessToken, getAccessTokenCookieOptions(req));
  res.cookie('refreshToken', tokens.refreshToken, getRefreshTokenCookieOptions(req));
};

const clearAuthCookies = (res: Response, req: Request) => {
  const clearOpts = getClearCookieOptions(req);
  res.clearCookie('accessToken', clearOpts);
  res.clearCookie('refreshToken', clearOpts);
  res.clearCookie('token', clearOpts);
};

export class AuthController {
  static async register(req: Request, res: Response): Promise<void> {
    try {
      const { name, email, password } = req.body;
      const { user, tokens } = await AuthService.register(name, email, password);

      setAuthCookies(res, req, tokens);

      sendSuccess(
        res,
        201,
        user,
        undefined,
        {
          message: 'Đăng ký tài khoản thành công.',
          user,
        }
      );
    } catch (error: any) {
      sendError(res, 400, 'REGISTER_FAILED', error.message || 'Đăng ký thất bại.', undefined, req.id);
    }
  }

  static async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;
      const { user, tokens } = await AuthService.login(email, password);

      setAuthCookies(res, req, tokens);

      sendSuccess(
        res,
        200,
        user,
        undefined,
        {
          message: 'Đăng nhập thành công.',
          user,
        }
      );
    } catch (error: any) {
      sendError(res, 401, 'INVALID_CREDENTIALS', error.message || 'Đăng nhập thất bại.', undefined, req.id);
    }
  }

  static async googleAuth(req: Request, res: Response): Promise<void> {
    try {
      const { user, tokens } = await AuthService.googleAuth(req.body);

      setAuthCookies(res, req, tokens);

      sendSuccess(
        res,
        200,
        user,
        undefined,
        {
          message: 'Đăng nhập Google thành công.',
          user,
        }
      );
    } catch (error: any) {
      sendError(res, 400, 'GOOGLE_AUTH_FAILED', error.message || 'Xác thực Google thất bại.', undefined, req.id);
    }
  }

  static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

      if (!rawRefreshToken) {
        clearAuthCookies(res, req);
        sendError(res, 401, 'MISSING_REFRESH_TOKEN', 'Thiếu Refresh Token. Vui lòng đăng nhập lại.', undefined, req.id);
        return;
      }

      const { user, tokens } = await AuthService.refreshTokens(rawRefreshToken);

      setAuthCookies(res, req, tokens);

      sendSuccess(
        res,
        200,
        user,
        undefined,
        {
          message: 'Làm mới phiên đăng nhập thành công.',
          user,
        }
      );
    } catch (error: any) {
      clearAuthCookies(res, req);
      sendError(res, 401, 'INVALID_REFRESH_TOKEN', error.message || 'Phiên đăng nhập đã hết hạn.', undefined, req.id);
    }
  }

  static async getMe(req: Request, res: Response): Promise<void> {
    try {
      if (!req.user) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.', undefined, req.id);
        return;
      }

      const user = await AuthService.getMe(req.user.id);

      sendSuccess(
        res,
        200,
        user,
        undefined,
        { user }
      );
    } catch (error: any) {
      sendError(res, 404, 'USER_NOT_FOUND', error.message || 'Không tìm thấy tài khoản.', undefined, req.id);
    }
  }

  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const userId = req.user?.id;

      await AuthService.logout(rawRefreshToken, userId);
    } catch (error) {
      // Ignored
    } finally {
      clearAuthCookies(res, req);
      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đã đăng xuất thành công.',
      });
    }
  }

  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (userId) {
        await AuthService.logoutAllDevices(userId);
      }
    } catch (error) {
      // Ignored
    } finally {
      clearAuthCookies(res, req);
      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đã đăng xuất thành công khỏi tất cả các thiết bị.',
      });
    }
  }

  static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      const result = await AuthService.forgotPassword(email);
      sendSuccess(res, 200, undefined, undefined, result);
    } catch (error: any) {
      sendError(res, 500, 'FORGOT_PASSWORD_ERROR', 'Đã xảy ra lỗi khi xử lý yêu cầu đặt lại mật khẩu.', undefined, req.id);
    }
  }

  static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { token, password } = req.body;
      await AuthService.resetPassword(token, password);

      clearAuthCookies(res, req);

      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại bằng mật khẩu mới.',
      });
    } catch (error: any) {
      sendError(res, 400, 'RESET_PASSWORD_FAILED', error.message || 'Đặt lại mật khẩu thất bại.', undefined, req.id);
    }
  }
}
