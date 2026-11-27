import { Router } from 'express';
import { TransactionsController } from './transactions.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import {
  getTransactionsQuerySchema,
  createTransactionSchema,
  updateTransactionSchema,
  bulkCreateTransactionSchema,
  bulkDeleteTransactionSchema,
} from './transactions.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/transactions
router.get(
  '/',
  validateRequest(getTransactionsQuerySchema, 'query'),
  TransactionsController.getTransactions
);

// POST /api/v1/transactions/bulk (các route /bulk phải khai báo trước /:id)
router.post(
  '/bulk',
  validateRequest(bulkCreateTransactionSchema, 'body'),
  TransactionsController.createBulkTransactions
);

// DELETE /api/v1/transactions/bulk
router.delete(
  '/bulk',
  validateRequest(bulkDeleteTransactionSchema, 'body'),
  TransactionsController.deleteBulkTransactions
);

// GET /api/v1/transactions/:id
router.get('/:id', TransactionsController.getTransactionById);

// POST /api/v1/transactions
router.post(
  '/',
  validateRequest(createTransactionSchema, 'body'),
  TransactionsController.createTransaction
);

// PUT /api/v1/transactions/:id
router.put(
  '/:id',
  validateRequest(updateTransactionSchema, 'body'),
  TransactionsController.updateTransaction
);

// DELETE /api/v1/transactions/:id
router.delete('/:id', TransactionsController.deleteTransaction);

export default router;
