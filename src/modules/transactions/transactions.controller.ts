import { Request, Response } from 'express';
import { TransactionsService } from './transactions.service';
import { sendSuccess, sendError } from '../../utils/response';

export class TransactionsController {
  static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const { transactions, meta } = await TransactionsService.getTransactions(userId, req.query as any);
      sendSuccess(res, 200, transactions, meta, {
        count: transactions.length,
        total: meta.total,
        page: meta.page,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'TRANSACTION_ERROR', error.message, undefined, req.id);
    }
  }

  static async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const transaction = await TransactionsService.getTransactionById(req.params.id, userId);
      sendSuccess(res, 200, transaction);
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'TRANSACTION_ERROR', error.message, undefined, req.id);
    }
  }

  static async createTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const result = await TransactionsService.createTransaction(userId, req.body);
      sendSuccess(res, 201, result.transaction, undefined, {
        message: 'Tạo giao dịch thành công.',
        wallet: result.wallet,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'CREATE_TRANSACTION_ERROR', error.message, undefined, req.id);
    }
  }

  static async createBulkTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const created = await TransactionsService.createBulkTransactions(userId, req.body.items);
      sendSuccess(res, 201, created, undefined, {
        message: `Đã nhập thành công ${created.length} giao dịch.`,
        count: created.length,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'BULK_CREATE_ERROR', error.message, undefined, req.id);
    }
  }

  static async updateTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const result = await TransactionsService.updateTransaction(req.params.id, userId, req.body);
      sendSuccess(res, 200, result.transaction, undefined, {
        message: 'Cập nhật giao dịch thành công.',
        wallet: result.wallet,
      });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'UPDATE_TRANSACTION_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteTransaction(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await TransactionsService.deleteTransaction(req.params.id, userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Đã xóa giao dịch thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'DELETE_TRANSACTION_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteBulkTransactions(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const count = await TransactionsService.deleteBulkTransactions(req.body.ids, userId);
      sendSuccess(res, 200, undefined, undefined, { message: `Đã xóa thành công ${count} giao dịch.` });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'BULK_DELETE_ERROR', error.message, undefined, req.id);
    }
  }
}
