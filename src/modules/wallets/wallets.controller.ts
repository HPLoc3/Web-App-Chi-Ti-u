import { Request, Response } from 'express';
import { WalletsService } from './wallets.service';
import { sendSuccess, sendError } from '../../utils/response';
import { sendHttpError } from '../../utils/httpError';

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
      sendHttpError(res, error, 'WALLET_ERROR', req.id);
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
      sendHttpError(res, error, 'WALLET_ERROR', req.id);
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
      sendHttpError(res, error, 'CREATE_WALLET_ERROR', req.id);
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
      sendHttpError(res, error, 'UPDATE_WALLET_ERROR', req.id);
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
      sendHttpError(res, error, 'DELETE_WALLET_ERROR', req.id);
    }
  }

  static async transferWallets(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        sendError(res, 401, 'UNAUTHORIZED', 'Chưa xác thực người dùng.', undefined, req.id);
        return;
      }

      const { fromWalletId, toWalletId, amount, note } = req.body;
      const result = await WalletsService.transferBetweenWallets(userId, fromWalletId, toWalletId, amount, note);
      sendSuccess(res, 200, result, undefined, {
        message: 'Chuyển tiền giữa các ví thành công.',
        fromWallet: result.fromWallet,
        toWallet: result.toWallet,
      });
    } catch (error: any) {
      sendHttpError(res, error, 'TRANSFER_ERROR', req.id);
    }
  }
}
