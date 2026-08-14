import { Router } from 'express';
import { ReportsController } from './reports.controller';
import { authMiddleware } from '../../middleware/auth.middleware';
import { validateRequest } from '../../middleware/validate.middleware';
import { summaryReportQuerySchema } from './reports.schema';

const router = Router();

router.use(authMiddleware);

// GET /api/v1/reports/summary
router.get(
  '/summary',
  validateRequest(summaryReportQuerySchema, 'query'),
  ReportsController.getSummaryReport
);

// GET /api/v1/reports/insights
router.get('/insights', ReportsController.getFinancialInsights);

export default router;
