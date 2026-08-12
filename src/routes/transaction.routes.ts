import { Router } from 'express';
import {
  getTransactions,
  createTransaction,
  getSummaryReport,
} from '../controllers/transaction.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();

// Áp dụng authMiddleware cho tất cả các route giao dịch & báo cáo
router.use(authMiddleware);

// GET /api/transactions - Lấy danh sách giao dịch (có lọc theo month/year)
router.get('/', getTransactions);

// POST /api/transactions - Tạo giao dịch mới & tự động cập nhật số dư ví
router.post('/', createTransaction);

// GET /api/reports/summary - Trả về tổng thu, tổng chi và tổng số dư
router.get('/summary', getSummaryReport);

export default router;
