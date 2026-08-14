import { Router } from 'express';
import { syncClientState } from '../controllers/sync.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

router.use(authMiddleware);

router.post('/client-state', syncClientState);

export default router;
