import { Router } from 'express';
import { SyncController } from './sync.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { syncClientStateSchema } from './sync.schema';

const router = Router();

router.use(authMiddleware);

// POST /api/v1/sync/client-state
router.post(
  '/client-state',
  validateRequest(syncClientStateSchema, 'body'),
  SyncController.syncClientState
);

export default router;
