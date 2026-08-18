import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET || process.env.JWT_ACCESS_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('FATAL SECURITY ERROR: Biến môi trường JWT_SECRET chưa được cấu hình.');
  }
  return secret;
};

export const getRefreshTokenSecret = (): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('FATAL SECURITY ERROR: Biến môi trường JWT_REFRESH_SECRET chưa được cấu hình.');
  }
  return secret;
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Cookie options cho Access Token (15 phút)
 */
export const getAccessTokenCookieOptions = (req?: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || (req ? req.secure || req.headers['x-forwarded-proto'] === 'https' : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 phút
  };
};

/**
 * Cookie options cho Refresh Token (30 ngày)
 */
export const getRefreshTokenCookieOptions = (req?: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || (req ? req.secure || req.headers['x-forwarded-proto'] === 'https' : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    path: '/',
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 ngày
  };
};

/**
 * Cookie options để xóa Cookie khi đăng xuất
 */
export const getClearCookieOptions = (req?: Request) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const isSecure = isProduction || (req ? req.secure || req.headers['x-forwarded-proto'] === 'https' : false);

  return {
    httpOnly: true,
    secure: isSecure,
    sameSite: isSecure ? ('none' as const) : ('lax' as const),
    path: '/',
  };
};

/**
 * Middleware xác thực Access Token cho các route được bảo vệ
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const jwtSecret = getJwtSecret();

    // 1. Đọc Access Token từ Cookie 'accessToken' hoặc 'token' (tương thích ngược)
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;

    // 2. Dự phòng đọc từ Authorization Bearer Header
    const headerToken =
      req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;

    const token = cookieToken || headerToken;

    if (!token) {
      res.status(401).json({
        success: false,
        code: 'UNAUTHORIZED',
        message: 'Không tìm thấy xác thực. Vui lòng đăng nhập.',
      });
      return;
    }

    let decoded: any;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (verifyErr: any) {
      if (verifyErr.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng làm mới token hoặc đăng nhập lại.',
        });
        return;
      }
      res.status(401).json({
        success: false,
        code: 'INVALID_TOKEN',
        message: 'Token xác thực không hợp lệ. Vui lòng đăng nhập lại.',
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error: any) {
    res.status(401).json({
      success: false,
      code: 'AUTH_ERROR',
      message: error.message || 'Lỗi xác thực người dùng.',
    });
  }
};

/**
 * Optional Auth Middleware: Gán req.user nếu có token hợp lệ, ngược lại cho qua mà không báo lỗi 401
 */
export const optionalAuthMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const jwtSecret = getJwtSecret();
    const cookieToken = req.cookies?.accessToken || req.cookies?.token;
    const headerToken =
      req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;

    const token = cookieToken || headerToken;
    if (token) {
      const decoded: any = jwt.verify(token, jwtSecret);
      if (decoded && decoded.id) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
        };
      }
    }
  } catch (error) {
    // Ignore invalid/expired token in optional mode
  }
  next();
};

