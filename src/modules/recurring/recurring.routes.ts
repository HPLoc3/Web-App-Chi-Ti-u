import { Router } from 'express';
import { RecurringController } from './recurring.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createRecurringSchema, updateRecurringSchema } from './recurring.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/recurring
router.get('/', RecurringController.getRecurring);

// POST /api/v1/recurring
router.post(
  '/',
  validateRequest(createRecurringSchema, 'body'),
  RecurringController.createRecurring
);

// POST /api/v1/recurring/sync
router.post('/sync', RecurringController.syncRecurringTransactions);

// PUT /api/v1/recurring/:id
router.put(
  '/:id',
  validateRequest(updateRecurringSchema, 'body'),
  RecurringController.updateRecurring
);

// DELETE /api/v1/recurring/:id
router.delete('/:id', RecurringController.deleteRecurring);

export default router;
