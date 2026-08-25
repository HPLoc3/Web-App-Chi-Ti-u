import { Request, Response } from 'express';
import { TransactionsService } from './transactions.service';
import { sendSuccess, sendError } from '../../utils/response';
import { AppError } from '../../middleware/errorHandler.middleware';
import { ZodError } from 'zod';
import { Logger } from '../../utils/logger';

function handleTransactionError(res: Response, error: any, defaultCode: string, requestId?: string): void {
  Logger.error(`TransactionsController error [${defaultCode}]:`, error, requestId);

  // 1. AppError (Explicitly thrown business errors)
  if (error instanceof AppError) {
    sendError(res, error.statusCode, error.code, error.message, undefined, requestId);
    return;
  }

  // 2. Zod validation errors
  if (error instanceof ZodError) {
    const errorList = error.issues || (error as any).errors || [];
    const issues = errorList.map((issue: any) => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : '',
      message: issue.message,
    }));
    sendError(res, 400, 'VALIDATION_ERROR', issues[0]?.message || 'Dữ liệu không hợp lệ', issues, requestId);
    return;
  }

  // 3. Prisma database errors
  if (error?.code === 'P2002') {
    sendError(res, 409, 'CONFLICT', 'Dữ liệu đã tồn tại trong hệ thống.', undefined, requestId);
    return;
  }
  if (error?.code === 'P2025') {
    sendError(res, 404, 'NOT_FOUND', 'Bản ghi, ví hoặc danh mục không tồn tại.', undefined, requestId);
    return;
  }
  if (error?.code === 'P2003') {
    sendError(res, 400, 'INVALID_FOREIGN_KEY', 'Ràng buộc danh mục hoặc ví không hợp lệ.', undefined, requestId);
    return;
  }
  if (['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(error?.code) || error?.name === 'PrismaClientInitializationError') {
    sendError(res, 503, 'DATABASE_UNAVAILABLE', 'Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng thử lại sau.', undefined, requestId);
    return;
  }

  const statusCode = typeof error?.statusCode === 'number' ? error.statusCode : 500;
  const code = error?.code || defaultCode;
  const message = error?.message || 'Lỗi xử lý giao dịch. Vui lòng thử lại sau.';
  sendError(res, statusCode, code, message, undefined, requestId);
}

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
      handleTransactionError(res, error, 'TRANSACTION_ERROR', req.id);
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
      handleTransactionError(res, error, 'TRANSACTION_ERROR', req.id);
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
      handleTransactionError(res, error, 'CREATE_TRANSACTION_ERROR', req.id);
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
      handleTransactionError(res, error, 'BULK_CREATE_ERROR', req.id);
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
      handleTransactionError(res, error, 'UPDATE_TRANSACTION_ERROR', req.id);
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
      handleTransactionError(res, error, 'DELETE_TRANSACTION_ERROR', req.id);
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
      handleTransactionError(res, error, 'BULK_DELETE_ERROR', req.id);
    }
  }
}

