import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * Kiểm tra tính hợp lệ của Header Origin & Referer đối với các yêu cầu thay đổi trạng thái (POST, PUT, PATCH, DELETE)
 */
export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Bỏ qua các HTTP Safe Methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Chỉ áp dụng cho các API endpoint (/api/*)
  if (!req.path.startsWith('/api')) {
    return next();
  }

  let requestOrigin = req.headers.origin as string | undefined;
  if (!requestOrigin && req.headers.referer) {
    try {
      requestOrigin = new URL(req.headers.referer).origin;
    } catch {
      // Bỏ qua lỗi parse URL
    }
  }

  const host = req.headers.host;

  // Nếu không có Origin/Referer (ví dụ: same-origin script nội bộ), cho phép tiếp tục
  if (!requestOrigin) {
    return next();
  }

  // Danh sách Origin được phép từ cấu hình môi trường
  const allowedOriginsStr = process.env.ALLOWED_ORIGINS || '';
  const allowedList = allowedOriginsStr
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  const isSameHost = host ? requestOrigin.includes(host) : false;
  const isExplicitlyAllowed = allowedList.some(
    (allowed) => requestOrigin!.startsWith(allowed) || allowed === '*'
  );
  const isDevOrPreview =
    process.env.NODE_ENV !== 'production' ||
    requestOrigin.includes('run.app') ||
    requestOrigin.includes('localhost');

  if (isSameHost || isExplicitlyAllowed || isDevOrPreview) {
    return next();
  }

  res.status(403).json({
    success: false,
    error: {
      code: 'CSRF_ORIGIN_DENIED',
      message: 'Yêu cầu bị từ chối do vi phạm chính sách bảo mật nguồn gốc CSRF.',
    },
  });
};
