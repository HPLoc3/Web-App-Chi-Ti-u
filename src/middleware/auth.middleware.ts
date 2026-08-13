import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const getJwtSecret = (): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('FATAL SECURITY ERROR: Biến môi trường JWT_SECRET chưa được cấu hình.');
  }
  return secret;
};

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const jwtSecret = getJwtSecret();

    // Ưu tiên đọc JWT Token từ HttpOnly Cookie
    const cookieToken = req.cookies?.token;

    // Dự phòng đọc từ Authorization Bearer Header
    const headerToken =
      req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;

    const token = cookieToken || headerToken;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Không tìm thấy xác thực. Vui lòng đăng nhập.',
      });
      return;
    }

    let decoded: AuthenticatedUser;
    try {
      decoded = jwt.verify(token, jwtSecret) as AuthenticatedUser;
    } catch (verifyErr: any) {
      if (verifyErr.name === 'TokenExpiredError') {
        res.status(401).json({
          success: false,
          message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
        });
        return;
      }
      res.status(401).json({
        success: false,
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
      message: error.message || 'Lỗi xác thực người dùng.',
    });
  }
};

