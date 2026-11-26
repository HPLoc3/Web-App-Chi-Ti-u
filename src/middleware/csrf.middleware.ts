import { Request, Response, NextFunction } from 'express';

/** Trả về URL đã parse, hoặc null nếu chuỗi không hợp lệ hoặc không có origin thực (vd "null") */
const parseOrigin = (value: string): URL | null => {
  try {
    const url = new URL(value);
    return url.origin === 'null' ? null : url;
  } catch {
    return null;
  }
};

/** Đọc lại process.env theo từng request */
const getAllowedOrigins = (): Set<string> => {
  const configured = [...(process.env.ALLOWED_ORIGINS || '').split(','), process.env.APP_URL || ''];
  const origins = new Set<string>();
  for (const value of configured) {
    const url = parseOrigin(value.trim());
    if (url) origins.add(url.origin);
  }
  return origins;
};

const isOriginAllowed = (source: string, host: string | undefined): boolean => {
  const url = parseOrigin(source);
  if (!url) return false;
  if (getAllowedOrigins().has(url.origin)) return true;
  if (host && url.host === host) return true;
  return (
    process.env.NODE_ENV !== 'production' &&
    (url.hostname === 'localhost' || url.hostname === '127.0.0.1')
  );
};

/**
 * CSRF Protection Middleware
 * Kiểm tra tính hợp lệ của Header Origin & Referer đối với các yêu cầu thay đổi trạng thái (POST, PUT, PATCH, DELETE)
 * Phải được mount tại "/api" (xem server.ts).
 */
export const csrfProtectionMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  // Bỏ qua các HTTP Safe Methods (GET, HEAD, OPTIONS)
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  const source = req.headers.origin || req.headers.referer;

  // Nếu không có Origin/Referer (ví dụ: same-origin script nội bộ), cho phép tiếp tục
  if (!source) {
    return next();
  }

  if (isOriginAllowed(source, req.headers.host)) {
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
