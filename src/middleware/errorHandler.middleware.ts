import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Logger } from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Not Found Middleware cho các API routes chưa được định nghĩa
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  const code = 'NOT_FOUND';
  const message = `Không tìm thấy tài nguyên API tại đường dẫn: ${req.method} ${req.originalUrl}`;
  res.status(404).json({
    success: false,
    error: {
      code,
      message,
    },
    code,
    message,
    requestId: req.id,
  });
};

/**
 * Centralized Error Handler Middleware
 * Ngăn chặn rò rỉ stack trace, Prisma internals hoặc SQL errors trong môi trường production
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const isProduction = process.env.NODE_ENV === 'production';
  const requestId = req.id || 'N/A';

  // 1. Log error an toàn qua Logger
  Logger.error(`Unhandled Error on ${req.method} ${req.originalUrl}:`, err, requestId);

  // 2. Xử lý lỗi Zod Validation
  if (err instanceof ZodError) {
    const errorList = err.issues || (err as any).errors || [];
    const issues = errorList.map((issue: any) => ({
      field: Array.isArray(issue.path) ? issue.path.join('.') : '',
      message: issue.message,
    }));
    const message = issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ';

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message,
        details: issues,
      },
      code: 'VALIDATION_ERROR',
      message,
      errors: issues,
      requestId,
    });
    return;
  }

  // 3. Xử lý AppError (Lỗi chủ động throw có kiểm soát)
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
      },
      code: err.code,
      message: err.message,
      requestId,
    });
    return;
  }

  // 4. Xử lý JWT errors
  if (err.name === 'JsonWebTokenError') {
    const code = 'INVALID_TOKEN';
    const message = 'Mã xác thực không hợp lệ. Vui lòng đăng nhập lại.';
    res.status(401).json({
      success: false,
      error: { code, message },
      code,
      message,
      requestId,
    });
    return;
  }

  if (err.name === 'TokenExpiredError') {
    const code = 'TOKEN_EXPIRED';
    const message = 'Phiên đăng nhập đã hết hạn. Vui lòng làm mới phiên.';
    res.status(401).json({
      success: false,
      error: { code, message },
      code,
      message,
      requestId,
    });
    return;
  }

  // 5. Xử lý Prisma Database Errors
  const isPrismaError =
    (err.code && typeof err.code === 'string' && err.code.startsWith('P')) ||
    err.name === 'PrismaClientInitializationError' ||
    err.name === 'PrismaClientKnownRequestError' ||
    err.name === 'PrismaClientUnknownRequestError' ||
    err.name === 'PrismaClientRustPanicError' ||
    err.name === 'PrismaClientValidationError';

  if (isPrismaError) {
    let clientMessage = 'Lỗi thao tác cơ sở dữ liệu.';
    let statusCode = 400;

    if (err.name === 'PrismaClientInitializationError' || ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1017'].includes(err.code)) {
      clientMessage = 'Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng kiểm tra lại cấu hình kết nối mạng hoặc thử lại sau.';
      statusCode = 503;
    } else if (err.code === 'P2002') {
      clientMessage = 'Dữ liệu đã tồn tại trong hệ thống (vi phạm ràng buộc duy nhất).';
      statusCode = 409;
    } else if (err.code === 'P2025') {
      clientMessage = 'Bản ghi không tồn tại hoặc không tìm thấy.';
      statusCode = 404;
    } else if (err.code === 'P2003') {
      clientMessage = 'Ràng buộc khóa ngoại không hợp lệ.';
      statusCode = 400;
    } else if (err.name === 'PrismaClientValidationError') {
      clientMessage = 'Dữ liệu truy vấn cơ sở dữ liệu không hợp lệ.';
      statusCode = 400;
    }

    res.status(statusCode).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: clientMessage,
        ...(isProduction ? {} : { details: err.message }),
      },
      code: 'DATABASE_ERROR',
      message: clientMessage,
      requestId,
      ...(isProduction ? {} : { details: err.message }),
    });
    return;
  }

  // 6. Lỗi Payload quá lớn (413 Payload Too Large)
  if (err.type === 'entity.too.large' || err.status === 413) {
    const code = 'PAYLOAD_TOO_LARGE';
    const message = 'Kích thước dữ liệu gửi lên vượt quá giới hạn cho phép.';
    res.status(413).json({
      success: false,
      error: { code, message },
      code,
      message,
      requestId,
    });
    return;
  }

  // 7. Lỗi JSON syntax sai định dạng
  if (err instanceof SyntaxError && 'body' in err) {
    const code = 'INVALID_JSON';
    const message = 'Định dạng JSON gửi lên không hợp lệ.';
    res.status(400).json({
      success: false,
      error: { code, message },
      code,
      message,
      requestId,
    });
    return;
  }

  // 8. Lỗi 500 Internal Server Error chung
  const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 500;
  const safeMessage = isProduction ? 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng thử lại sau.' : (err.message || 'Lỗi hệ thống');

  res.status(statusCode).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: safeMessage,
      ...(isProduction ? {} : { details: err.stack }),
    },
    code: 'INTERNAL_SERVER_ERROR',
    message: safeMessage,
    requestId,
    ...(isProduction ? {} : { stack: err.stack }),
  });
};
