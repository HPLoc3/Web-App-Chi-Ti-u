import { Request, Response } from 'express';
import { CategoriesService } from './categories.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError } from '../../utils/httpError';

export class CategoriesController {
  static async getCategories(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      const categories = await CategoriesService.getCategories(userId);
      sendSuccess(res, 200, categories, undefined, { count: categories.length });
    } catch (error: any) {
      sendHttpError(res, error, 'CATEGORY_ERROR', req.id);
    }
  }

  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const category = await CategoriesService.createCategory(userId, req.body);
      sendSuccess(res, 201, category, undefined, { message: 'Tạo danh mục mới thành công.' });
    } catch (error: any) {
      sendHttpError(res, error, 'CREATE_CATEGORY_ERROR', req.id);
    }
  }

  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await CategoriesService.deleteCategory(req.params.id, userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Đã xóa danh mục thành công.' });
    } catch (error: any) {
      sendHttpError(res, error, 'DELETE_CATEGORY_ERROR', req.id);
    }
  }
}
