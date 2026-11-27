import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError, toHttpError } from '../../utils/httpError';
import { setAuthCookies, clearAuthCookies } from './auth.cookies';

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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }
      );
    } catch (error: any) {
      sendHttpError(res, error, 'REGISTER_FAILED', req.id);
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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }
      );
    } catch (error: any) {
      sendHttpError(res, error, 'INVALID_CREDENTIALS', req.id);
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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }
      );
    } catch (error: any) {
      sendHttpError(res, error, 'GOOGLE_AUTH_FAILED', req.id);
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
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        }
      );
    } catch (error: any) {
      // Chỉ xóa cookie khi phiên thực sự không hợp lệ; 409 (đang refresh) và lỗi DB phải giữ cookie
      if (toHttpError(error, 'REFRESH_ERROR').status === 401) {
        clearAuthCookies(res, req);
      }
      sendHttpError(res, error, 'REFRESH_ERROR', req.id);
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
      sendHttpError(res, error, 'USER_NOT_FOUND', req.id);
    }
  }

  /** Đăng xuất thiết bị hiện tại: luôn xóa cookie phía client, nhưng báo đúng nếu server chưa thu hồi được */
  static async logout(req: Request, res: Response): Promise<void> {
    try {
      const rawRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const userId = req.user?.id;

      await AuthService.logout(rawRefreshToken, userId);

      clearAuthCookies(res, req);
      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đã đăng xuất thành công.',
      });
    } catch (error: any) {
      clearAuthCookies(res, req);
      sendHttpError(res, error, 'LOGOUT_FAILED', req.id);
    }
  }

  /** Đăng xuất mọi thiết bị: thất bại thì giữ cookie để người dùng thử lại */
  static async logoutAll(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa đăng nhập.', undefined, req.id);
        return;
      }

      await AuthService.logoutAllDevices(userId);

      clearAuthCookies(res, req);
      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đã đăng xuất thành công khỏi tất cả các thiết bị.',
      });
    } catch (error: any) {
      sendHttpError(res, error, 'LOGOUT_ALL_FAILED', req.id);
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
      sendHttpError(res, error, 'RESET_PASSWORD_FAILED', req.id);
    }
  }
}
