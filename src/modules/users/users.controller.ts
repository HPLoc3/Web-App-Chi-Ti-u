import { Request, Response } from 'express';
import { UsersService } from './users.service';
import { sendSuccess, sendError } from '../../utils/response';

export class UsersController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const user = await UsersService.getProfile(userId);
      sendSuccess(res, 200, user, undefined, { user });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'USER_ERROR', error.message, undefined, req.id);
    }
  }

  static async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const updated = await UsersService.updateProfile(userId, req.body);
      sendSuccess(res, 200, updated, undefined, { user: updated, message: 'Cập nhật thông tin thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'UPDATE_ERROR', error.message, undefined, req.id);
    }
  }

  static async changePassword(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await UsersService.changePassword(userId, req.body);
      sendSuccess(res, 200, undefined, undefined, { message: 'Đổi mật khẩu thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'CHANGE_PASSWORD_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await UsersService.deleteAccount(userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Tài khoản đã được xóa thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'DELETE_ERROR', error.message, undefined, req.id);
    }
  }
}
