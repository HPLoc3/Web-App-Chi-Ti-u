import { Router } from 'express';
import { TransactionsController } from './transactions.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  getTransactionsQuerySchema,
  createTransactionSchema,
  updateTransactionSchema,
} from './transactions.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/transactions
router.get(
  '/',
  validateRequest(getTransactionsQuerySchema, 'query'),
  TransactionsController.getTransactions
);

// GET /api/v1/transactions/:id
router.get('/:id', TransactionsController.getTransactionById);

// POST /api/v1/transactions
router.post(
  '/',
  validateRequest(createTransactionSchema, 'body'),
  TransactionsController.createTransaction
);

// POST /api/v1/transactions/bulk
router.post('/bulk', TransactionsController.createBulkTransactions);

// PUT /api/v1/transactions/:id
router.put(
  '/:id',
  validateRequest(updateTransactionSchema, 'body'),
  TransactionsController.updateTransaction
);

// DELETE /api/v1/transactions/:id
router.delete('/:id', TransactionsController.deleteTransaction);

// DELETE /api/v1/transactions/bulk
router.delete('/bulk', TransactionsController.deleteBulkTransactions);

export default router;
