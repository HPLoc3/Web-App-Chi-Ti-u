import { Router } from 'express';
import { aiFinancialAssistant } from '../controllers/ai.controller';
import { validateRequest } from '../middleware/validate.middleware';
import { aiRateLimiter } from '../middleware/rateLimiter.middleware';
import { optionalAuthMiddleware } from '../middleware/auth.middleware';
import { aiAssistantSchema } from '../validators/ai.validator';

const router = Router();

// POST /api/ai/assistant - AI Trợ lý tài chính (Bảo vệ bởi Rate Limiter + Zod Schema + Auth context)
router.post(
  '/assistant',
  optionalAuthMiddleware,
  aiRateLimiter,
  validateRequest(aiAssistantSchema, 'body'),
  aiFinancialAssistant
);

export default router;
