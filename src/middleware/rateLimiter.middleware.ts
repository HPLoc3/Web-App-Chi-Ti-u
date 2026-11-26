import rateLimit, { Options } from 'express-rate-limit';
import { PgRateLimitStore } from './pgRateLimitStore';

/**
 * Chọn nơi lưu bộ đếm:
 * - Mặc định: PostgreSQL (đúng khi chạy nhiều instance / serverless như Vercel).
 * - Môi trường test, hoặc RATE_LIMIT_STORE=memory: bộ nhớ trong tiến trình.
 * Nếu DB lỗi, limiter cho request đi qua (fail-open) thay vì làm sập API.
 */
const useMemoryStore = (): boolean =>
  process.env.NODE_ENV === 'test' || process.env.VITEST === 'true' || process.env.RATE_LIMIT_STORE === 'memory';

const createDbBackedLimiter = (prefix: string, options: Partial<Options>) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    ...options,
    ...(useMemoryStore() ? {} : { store: new PgRateLimitStore(prefix), passOnStoreError: true }),
  });

/**
 * Rate limiter chung cho toàn bộ API routes (/api/*)
 * Giới hạn 300 requests / 15 phút mỗi IP.
 * Cố ý dùng bộ nhớ trong tiến trình để không tốn 1 truy vấn DB cho mọi request;
 * đây chỉ là lớp chặn thô, các endpoint nhạy cảm bên dưới dùng bộ đếm trong DB.
 */
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Bạn đã gửi quá nhiều yêu cầu đến máy chủ. Vui lòng thử lại sau vài phút.',
  },
});

/**
 * Rate limiter cho endpoint đăng nhập (Login & Google Auth)
 * Giới hạn tối đa 15 lần thử trong 15 phút chống brute-force mật khẩu
 */
export const loginRateLimiter = createDbBackedLimiter('login', {
  windowMs: 15 * 60 * 1000,
  max: 15,
  message: {
    success: false,
    code: 'TOO_MANY_LOGIN_ATTEMPTS',
    message: 'Bạn đã gửi quá nhiều yêu cầu đăng nhập. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho đăng ký tài khoản mới (Register)
 * Giới hạn tối đa 10 tài khoản / 1 giờ mỗi IP chống bot tạo tài khoản rác
 */
export const registerRateLimiter = createDbBackedLimiter('register', {
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    code: 'TOO_MANY_REGISTRATIONS',
    message: 'Bạn đã tạo quá nhiều tài khoản trong thời gian ngắn. Vui lòng thử lại sau 1 giờ.',
  },
});

/**
 * Rate limiter cho endpoint quên mật khẩu / đặt lại mật khẩu
 * Giới hạn tối đa 5 lần yêu cầu trong 15 phút để chống spam email / dò token
 */
export const forgotPasswordRateLimiter = createDbBackedLimiter('forgot', {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    code: 'TOO_MANY_PASSWORD_RESETS',
    message: 'Bạn đã thực hiện quá nhiều yêu cầu đặt lại mật khẩu. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho AI Financial Assistant Endpoint
 * Giới hạn tối đa 30 requests / 15 phút để chống lạm dụng quota và cạn kiệt tài nguyên API
 */
export const aiRateLimiter = createDbBackedLimiter('ai', {
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: {
    success: false,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    message: 'Bạn đã sử dụng hết số lượt truy vấn AI cho phép trong phiên này. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho các endpoint Auth khác (Refresh token)
 */
export const generalAuthRateLimiter = createDbBackedLimiter('auth', {
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.',
  },
});

export const authRateLimiter = generalAuthRateLimiter;
