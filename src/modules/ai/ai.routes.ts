import { Router } from 'express';
import { AiController } from './ai.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { authMiddleware } from '../../middleware/auth.middleware';
import { aiAssistantSchema } from './ai.schema';
import { aiRateLimiter } from '../../middleware/rateLimiter.middleware';

const router = Router();

// POST /api/v1/ai/assistant - AI Financial Copilot (Protected: Anonymous users are blocked)
router.post(
  '/assistant',
  aiRateLimiter,
  authMiddleware,
  validateRequest(aiAssistantSchema, 'body'),
  AiController.assistant
);

// GET /api/v1/ai/quota - Check AI daily quota
router.get(
  '/quota',
  authMiddleware,
  AiController.getQuota
);

// GET /api/v1/ai/logs - Check user's AI request logs
router.get(
  '/logs',
  authMiddleware,
  AiController.getLogs
);

export default router;
