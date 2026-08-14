import { Request, Response } from 'express';
import { WalletsService } from './wallets.service';
import { sendSuccess, sendError } from '../../utils/response';

export class WalletsController {
  static async getWallets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const wallets = await WalletsService.getWallets(userId);
      sendSuccess(res, 200, wallets, undefined, { wallets });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'WALLET_ERROR', error.message, undefined, req.id);
    }
  }

  static async getWalletById(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const wallet = await WalletsService.getWalletById(req.params.id, userId);
      sendSuccess(res, 200, wallet, undefined, { wallet });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'WALLET_ERROR', error.message, undefined, req.id);
    }
  }

  static async createWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const wallet = await WalletsService.createWallet(userId, req.body);
      sendSuccess(res, 201, wallet, undefined, { wallet, message: 'Tạo ví mới thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'CREATE_WALLET_ERROR', error.message, undefined, req.id);
    }
  }

  static async updateWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const wallet = await WalletsService.updateWallet(req.params.id, userId, req.body);
      sendSuccess(res, 200, wallet, undefined, { wallet, message: 'Cập nhật ví thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'UPDATE_WALLET_ERROR', error.message, undefined, req.id);
    }
  }

  static async deleteWallet(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      await WalletsService.deleteWallet(req.params.id, userId);
      sendSuccess(res, 200, undefined, undefined, { message: 'Xóa ví thành công.' });
    } catch (error: any) {
      sendError(res, error.statusCode || 500, error.code || 'DELETE_WALLET_ERROR', error.message, undefined, req.id);
    }
  }
}
