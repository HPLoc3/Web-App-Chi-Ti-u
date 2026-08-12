import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'hophuloc_expense_jwt_secret_key_2026';

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
    const headerToken =
      req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
        ? req.headers.authorization.split(' ')[1]
        : undefined;
    const cookieToken = req.cookies?.token;

    const candidateTokens = [headerToken, cookieToken].filter(Boolean) as string[];

    if (candidateTokens.length === 0) {
      res.status(401).json({
        success: false,
        message: 'Không tìm thấy xác thực. Vui lòng đăng nhập.',
      });
      return;
    }

    let decoded: AuthenticatedUser | null = null;
    let lastError: any = null;

    for (const token of candidateTokens) {
      try {
        decoded = jwt.verify(token, JWT_SECRET) as AuthenticatedUser;
        if (decoded) break;
      } catch (err) {
        lastError = err;
      }
    }

    if (!decoded) {
      res.status(401).json({
        success: false,
        message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
      });
      return;
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
    });
  }
};

export { JWT_SECRET };
