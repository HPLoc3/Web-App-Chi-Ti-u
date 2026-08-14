import { Request, Response, NextFunction } from 'express';

/**
 * Middleware gắn các HTTP Security Headers tiêu chuẩn bảo vệ OWASP
 */
export const securityHeadersMiddleware = (_req: Request, res: Response, next: NextFunction): void => {
  // Ngăn MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Bật bộ lọc XSS trên các trình duyệt cũ
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Điều hướng chính sách Referrer để tránh rò rỉ URL nhạy cảm
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Vô hiệu hóa DNS prefetch
  res.setHeader('X-DNS-Prefetch-Control', 'off');

  // Ngăn IE thực thi downloads trong ngữ cảnh site
  res.setHeader('X-Download-Options', 'noopen');

  // Hạn chế các tính năng phần cứng nhạy cảm (Permissions Policy)
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');

  // HSTS & CSP trong môi trường production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://apis.google.com; " +
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
      "font-src 'self' https://fonts.gstatic.com data:; " +
      "img-src 'self' data: https: blob:; " +
      "connect-src 'self' https://accounts.google.com https://www.googleapis.com https://generativelanguage.googleapis.com; " +
      "frame-src 'self' https://accounts.google.com; " +
      "object-src 'none'; " +
      "base-uri 'self';"
    );
  }

  next();
};
