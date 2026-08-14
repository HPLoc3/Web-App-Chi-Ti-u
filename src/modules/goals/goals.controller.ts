import { Request, Response } from 'express';
import { GoalsService } from './goals.service';
import { sendSuccess, sendError } from '../../utils/response';

export class GoalsController {
  static async getGoals(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const goals = await GoalsService.getGoals(userId);
      sendSuccess(res, 200, goals, undefined, { count: goals.length });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'GOAL_ERROR', error.message, undefined, req.id);
    }
  }

  static async createGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const goal = await GoalsService.createGoal(userId, req.body);
      sendSuccess(res, 201, goal, undefined, { message: 'Tạo mục tiêu tiết kiệm thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'CREATE_GOAL_ERROR', error.message, undefined, req.id);
    }
  }

  static async updateGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const goal = await GoalsService.updateGoal(req.params.id, userId, req.body);
      sendSuccess(res, 200, goal, undefined, { message: 'Cập nhật mục tiêu thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'UPDATE_GOAL_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteGoal(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await GoalsService.deleteGoal(req.params.id, userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Đã xóa mục tiêu thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'DELETE_GOAL_ERROR', error.message, undefined, req.id);
    }
  }
}
