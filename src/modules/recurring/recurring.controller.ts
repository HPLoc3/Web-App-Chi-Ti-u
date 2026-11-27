import { Request, Response } from 'express';
import { RecurringService } from './recurring.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError } from '../../utils/httpError';

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
      sendHttpError(res, error, 'RECURRING_ERROR', req.id);
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
      sendHttpError(res, error, 'CREATE_RECURRING_ERROR', req.id);
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
      sendHttpError(res, error, 'UPDATE_RECURRING_ERROR', req.id);
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
      sendHttpError(res, error, 'DELETE_RECURRING_ERROR', req.id);
    }
  }

  static async syncRecurringTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const result = await RecurringService.syncRecurringTransactions(userId);
      sendSuccess(res, 200, undefined, undefined, {
        message: `Đã đồng bộ thành công ${result.syncedCount} giao dịch định kỳ.`,
        ...result,
      });
    } catch (error: any) {
      sendHttpError(res, error, 'SYNC_RECURRING_ERROR', req.id);
    }
  }
}
