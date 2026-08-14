import { Router } from 'express';
import { AiController } from './ai.controller';
import { validateRequest } from '../../middleware/validate.middleware';
import { aiAssistantSchema } from './ai.schema';

const router = Router();

// POST /api/v1/ai/assistant
router.post(
  '/assistant',
  validateRequest(aiAssistantSchema, 'body'),
  AiController.assistant
);

export default router;
