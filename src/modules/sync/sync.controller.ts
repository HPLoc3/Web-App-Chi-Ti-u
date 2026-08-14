import { Request, Response } from 'express';
import { SyncService } from './sync.service';
import { sendSuccess, sendError } from '../../utils/response';

export class SyncController {
  static async syncClientState(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const stats = await SyncService.syncClientState(userId, req.body);
      sendSuccess(res, 200, undefined, undefined, {
        message: 'Đồng bộ dữ liệu lên PostgreSQL thành công.',
        stats,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'SYNC_ERROR', error.message, undefined, req.id);
    }
  }
}
