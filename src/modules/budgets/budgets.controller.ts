import { Request, Response } from 'express';
import { BudgetsService } from './budgets.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError } from '../../utils/httpError';

export class BudgetsController {
  static async getBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const budget = await BudgetsService.getBudget(userId);
      sendSuccess(res, 200, budget, undefined, { budget });
    } catch (error: any) {
      sendHttpError(res, error, 'BUDGET_ERROR', req.id);
    }
  }

  static async updateBudget(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const budget = await BudgetsService.updateBudget(userId, req.body);
      sendSuccess(res, 200, budget, undefined, { budget, message: 'Cập nhật ngân sách thành công.' });
    } catch (error: any) {
      sendHttpError(res, error, 'UPDATE_BUDGET_ERROR', req.id);
    }
  }
}
