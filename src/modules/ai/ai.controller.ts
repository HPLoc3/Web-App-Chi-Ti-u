import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { AiQuotaManager } from './ai.quota';
import { AiLogger } from './ai.logger';
import { sendSuccess, sendError } from '../../utils/response';

export class AiController {
  /**
   * Process financial copilot message with intent detection, deterministic facts & structured actions
   */
  static async assistant(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(
          res,
          401,
          'UNAUTHORIZED',
          'Vui lòng đăng nhập để sử dụng Gemini Financial Copilot. Tài khoản ẩn danh không được phép gọi trực tiếp Gemini API.',
          undefined,
          req.id
        );
        return;
      }

      const result = await AiService.processMessage(req.body, userId, req.id);

      if (!result.success) {
        res.status(200).json({
          success: false,
          fallbackToRule: result.fallbackToRule,
          reason: result.reason,
        });
        return;
      }

      sendSuccess(res, 200, result.data);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'AI_ERROR', error.message, undefined, req.id);
    }
  }

  /**
   * Get current user's AI Copilot daily quota status
   */
  static async getQuota(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để xem thông tin hạn mức AI.', undefined, req.id);
        return;
      }

      const quota = AiQuotaManager.getQuota(userId);
      sendSuccess(res, 200, quota);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'AI_QUOTA_ERROR', error.message, undefined, req.id);
    }
  }

  /**
   * Get user's AI Copilot request audit logs
   */
  static async getLogs(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Vui lòng đăng nhập để xem lịch sử AI logs.', undefined, req.id);
        return;
      }

      const logs = AiLogger.getLogs(userId, 20);
      sendSuccess(res, 200, logs);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'AI_LOGS_ERROR', error.message, undefined, req.id);
    }
  }
}
