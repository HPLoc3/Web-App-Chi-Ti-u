import { Router } from 'express';
import { getSummaryReport, getFinancialInsights } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateRequest } from '../middleware/validate.middleware';
import { getSummaryReportQuerySchema } from '../validators/transaction.validator';

const router = Router();

router.use(authMiddleware);

router.get('/summary', validateRequest(getSummaryReportQuerySchema, 'query'), getSummaryReport);
router.get('/insights', getFinancialInsights);

export default router;
