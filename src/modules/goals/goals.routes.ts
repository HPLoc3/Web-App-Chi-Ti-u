import { Router } from 'express';
import { GoalsController } from './goals.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { createGoalSchema, updateGoalSchema } from './goals.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/goals
router.get('/', GoalsController.getGoals);

// POST /api/v1/goals
router.post(
  '/',
  validateRequest(createGoalSchema, 'body'),
  GoalsController.createGoal
);

// PUT /api/v1/goals/:id
router.put(
  '/:id',
  validateRequest(updateGoalSchema, 'body'),
  GoalsController.updateGoal
);

// DELETE /api/v1/goals/:id
router.delete('/:id', GoalsController.deleteGoal);

export default router;
