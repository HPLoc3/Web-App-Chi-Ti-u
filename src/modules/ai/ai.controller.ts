import { Request, Response } from 'express';
import { AiService } from './ai.service';
import { sendSuccess, sendError } from '../../utils/response';

export class AiController {
  static async assistant(req: Request, res: Response): Promise<void> {
    try {
      const result = await AiService.processMessage(req.body, req.id);
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
}
