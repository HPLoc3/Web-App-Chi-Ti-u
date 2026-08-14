import { Router } from 'express';
import {
  getRecurring,
  createRecurring,
  updateRecurring,
  deleteRecurring,
  syncRecurringTransactions,
} from '../controllers/recurring.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getRecurring);
router.post('/', createRecurring);
router.post('/sync', syncRecurringTransactions);
router.put('/:id', updateRecurring);
router.delete('/:id', deleteRecurring);

export default router;
