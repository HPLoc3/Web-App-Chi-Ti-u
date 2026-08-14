import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  createBulkTransactions,
  updateTransaction,
  deleteTransaction,
  deleteBulkTransactions,
} from '../controllers/transaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import {
  createTransactionSchema,
  updateTransactionSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
} from '../validators/transaction.validator';

const router = Router();

// Tất cả endpoints đều bảo vệ bởi authMiddleware
router.use(authMiddleware);

router.get('/', validateRequest(getTransactionsQuerySchema, 'query'), getTransactions);
router.post('/', validateRequest(createTransactionSchema, 'body'), createTransaction);
router.post('/bulk', createBulkTransactions);
router.put(
  '/:id',
  validateRequest(transactionIdParamSchema, 'params'),
  validateRequest(updateTransactionSchema, 'body'),
  updateTransaction
);
router.delete('/bulk', deleteBulkTransactions);
router.delete('/:id', validateRequest(transactionIdParamSchema, 'params'), deleteTransaction);

export default router;
