import { Router } from 'express';
import { BudgetsController } from './budgets.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { updateBudgetSchema } from './budgets.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/budgets
router.get('/', BudgetsController.getBudget);

// PUT /api/v1/budgets
router.put(
  '/',
  validateRequest(updateBudgetSchema, 'body'),
  BudgetsController.updateBudget
);

export default router;
