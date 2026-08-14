import rateLimit from 'express-rate-limit';

/**
 * Rate limiter chung cho toàn bộ API routes (/api/*)
 * Giới hạn 300 requests / 15 phút mỗi IP
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
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
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
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
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
export const forgotPasswordRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
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
export const aiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'AI_RATE_LIMIT_EXCEEDED',
    message: 'Bạn đã sử dụng hết số lượt truy vấn AI cho phép trong phiên này. Vui lòng thử lại sau 15 phút.',
  },
});

/**
 * Rate limiter cho các endpoint Auth khác (Refresh token)
 */
export const generalAuthRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 'TOO_MANY_REQUESTS',
    message: 'Quá nhiều yêu cầu xác thực. Vui lòng thử lại sau.',
  },
});

export const authRateLimiter = generalAuthRateLimiter;
