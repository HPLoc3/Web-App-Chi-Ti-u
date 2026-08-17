import { Router, Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { Logger } from '../../utils/logger';

const router = Router();

// Server state flag to support graceful draining on SIGTERM/SIGINT
let isDraining = false;
const startTime = Date.now();

export function setDraining(draining: boolean) {
  isDraining = draining;
}

export function getDrainingStatus(): boolean {
  return isDraining;
}

/**
 * Basic Health Check
 * Trả về trạng thái hoạt động cơ bản mà không tiết lộ thông tin nhạy cảm về hệ thống nội bộ
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    status: isDraining ? 'draining' : 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor((Date.now() - startTime) / 1000),
  });
});

/**
 * Liveness Probe (Kubernetes / Docker / Cloud Run)
 * Xác định xem tiến trình Express có đang sống và phản hồi các HTTP request hay không
 */
router.get('/live', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Readiness Probe (Kubernetes / Docker / Load Balancer)
 * Xác định xem ứng dụng có sẵn sàng nhận lưu lượng truy cập hay không
 * - Kiểm tra kết nối tới cơ sở dữ liệu PostgreSQL
 * - Nếu đang trong quá trình graceful shutdown (isDraining = true) -> Trả về 503 để Load Balancer ngừng định tuyến traffic
 * - BẢO MẬT: Tuyệt đối không để lộ IP, Port, Username, Database Name hay Stack Trace
 */
router.get('/ready', async (_req: Request, res: Response) => {
  if (isDraining) {
    return res.status(503).json({
      status: 'unavailable',
      message: 'Server is shutting down',
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // Lightweight database ping (1 second timeout)
    const dbPromise = prisma.$queryRaw`SELECT 1`;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Database ping timeout')), 2000)
    );

    await Promise.race([dbPromise, timeoutPromise]);

    return res.status(200).json({
      status: 'ready',
      database: 'connected',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - startTime) / 1000),
    });
  } catch (error) {
    Logger.error('Readiness probe failed - Database unreachable:', error);
    return res.status(503).json({
      status: 'unavailable',
      database: 'disconnected',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
