import { Request, Response } from 'express';
import { RecurringService } from './recurring.service';
import { sendSuccess, sendError } from '../../utils/response';

export class RecurringController {
  static async getRecurring(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const items = await RecurringService.getRecurring(userId);
      sendSuccess(res, 200, items, undefined, { count: items.length });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'RECURRING_ERROR', error.message, undefined, req.id);
    }
  }

  static async createRecurring(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const item = await RecurringService.createRecurring(userId, req.body);
      sendSuccess(res, 201, item, undefined, { message: 'Tạo khoản định kỳ thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'CREATE_RECURRING_ERROR', error.message, undefined, req.id);
    }
  }

  static async updateRecurring(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const item = await RecurringService.updateRecurring(req.params.id, userId, req.body);
      sendSuccess(res, 200, item, undefined, { message: 'Cập nhật khoản định kỳ thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'UPDATE_RECURRING_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteRecurring(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await RecurringService.deleteRecurring(req.params.id, userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Đã xóa khoản định kỳ.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'DELETE_RECURRING_ERROR', error.message, undefined, req.id);
    }
  }

  static async syncRecurringTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const syncedCount = await RecurringService.syncRecurringTransactions(userId);
      sendSuccess(res, 200, undefined, undefined, {
        message: `Đã đồng bộ thành công ${syncedCount} giao dịch định kỳ.`,
        syncedCount,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'SYNC_RECURRING_ERROR', error.message, undefined, req.id);
    }
  }
}
