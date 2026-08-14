import { Router } from 'express';
import { getBudget, updateBudget } from '../controllers/budget.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.get('/', getBudget);
router.put('/', updateBudget);

export default router;
