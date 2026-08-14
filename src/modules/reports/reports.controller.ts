import { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { sendSuccess, sendError } from '../../utils/response';

export class ReportsController {
  static async getSummaryReport(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const report = await ReportsService.getSummaryReport(userId, req.query as any);
      sendSuccess(res, 200, undefined, undefined, report);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'REPORT_ERROR', error.message, undefined, req.id);
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
      sendSuccess(res, 200, undefined, undefined, result);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'INSIGHTS_ERROR', error.message, undefined, req.id);
    }
  }
}
