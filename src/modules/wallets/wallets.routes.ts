import { Router } from 'express';
import { WalletsController } from './wallets.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createWalletSchema, updateWalletSchema } from './wallets.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/wallets
router.get('/', WalletsController.getWallets);

// GET /api/v1/wallets/:id
router.get('/:id', WalletsController.getWalletById);

// POST /api/v1/wallets
router.post(
  '/',
  validateRequest(createWalletSchema, 'body'),
  WalletsController.createWallet
);

// PUT /api/v1/wallets/:id
router.put(
  '/:id',
  validateRequest(updateWalletSchema, 'body'),
  WalletsController.updateWallet
);

// DELETE /api/v1/wallets/:id
router.delete('/:id', WalletsController.deleteWallet);

export default router;
