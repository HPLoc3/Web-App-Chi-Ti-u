import { Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../middleware/errorHandler.middleware';
import { sendError } from './response';
import { Logger } from './logger';

export interface HttpError {
  status: number;
  code: string;
  message: string;
  details?: unknown;
}

const GENERIC_MESSAGE = 'Đã xảy ra lỗi máy chủ. Vui lòng thử lại sau.';

const PRISMA_ERRORS: Record<string, HttpError> = {
  P2002: { status: 409, code: 'CONFLICT', message: 'Dữ liệu đã tồn tại trong hệ thống.' },
  P2003: { status: 409, code: 'INVALID_FOREIGN_KEY', message: 'Dữ liệu đang được tham chiếu hoặc liên kết không hợp lệ.' },
  P2025: { status: 404, code: 'NOT_FOUND', message: 'Bản ghi không tồn tại hoặc không tìm thấy.' },
  P2020: { status: 400, code: 'VALUE_OUT_OF_RANGE', message: 'Giá trị vượt quá giới hạn cho phép.' },
};

const isDatabaseUnavailable = (error: any): boolean =>
  error?.name === 'PrismaClientInitializationError' ||
  (typeof error?.code === 'string' && /^P1\d{3}$/.test(error.code));

/** Chuyển mọi lỗi thành phản hồi an toàn: không bao giờ lộ message của lỗi không kiểm soát. */
export function toHttpError(error: any, defaultCode: string): HttpError {
  if (error instanceof AppError) {
    return { status: error.statusCode, code: error.code, message: error.message };
  }

  if (error instanceof ZodError) {
    const issues = error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return {
      status: 400,
      code: 'VALIDATION_ERROR',
      message: issues[0]?.message || 'Dữ liệu không hợp lệ',
      details: issues,
    };
  }

  if (isDatabaseUnavailable(error)) {
    return {
      status: 503,
      code: 'DATABASE_UNAVAILABLE',
      message: 'Không thể kết nối đến máy chủ cơ sở dữ liệu. Vui lòng thử lại sau.',
    };
  }

  if (typeof error?.code === 'string' && Object.prototype.hasOwnProperty.call(PRISMA_ERRORS, error.code)) {
    return PRISMA_ERRORS[error.code];
  }

  // Tràn số Decimal khi cộng dồn: Postgres 22003 đến dưới dạng lỗi Prisma không có mã
  if (error?.name === 'PrismaClientUnknownRequestError' && String(error.message).includes('numeric field overflow')) {
    return PRISMA_ERRORS.P2020;
  }

  // Lỗi nghiệp vụ ném bằng Error kèm statusCode 4xx: giữ status và message
  const status = error?.statusCode;
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return { status, code: error.code || defaultCode, message: error.message };
  }

  return { status: 500, code: defaultCode, message: GENERIC_MESSAGE };
}

export function sendHttpError(res: Response, error: unknown, defaultCode: string, requestId?: string): void {
  const mapped = toHttpError(error, defaultCode);
  if (mapped.status >= 500) {
    Logger.error(`Request error [${defaultCode}]:`, error as Error, requestId);
  }
  sendError(res, mapped.status, mapped.code, mapped.message, mapped.details, requestId);
}
