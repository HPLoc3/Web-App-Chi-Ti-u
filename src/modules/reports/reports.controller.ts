import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError } from '../../utils/httpError';

export class ReportsController {
  static async getSummaryReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const report = await ReportsService.getSummaryReport(userId, req.query as any);
      sendSuccess(res, 200, report);
    } catch (error: any) {
      sendHttpError(res, error, 'REPORT_ERROR', req.id);
    }
  }

  static async getFinancialInsights(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const result = await ReportsService.getFinancialInsights(userId);
      sendSuccess(res, 200, result);
    } catch (error: any) {
      sendHttpError(res, error, 'INSIGHTS_ERROR', req.id);
    }
  }
}
