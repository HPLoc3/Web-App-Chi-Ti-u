import { Response } from 'express';

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  [key: string]: any;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  meta?: PaginationMeta | Record<string, any>;
  error?: ApiError;
  [key: string]: any;
}

export const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  data?: T,
  meta?: PaginationMeta | Record<string, any>,
  extraFields?: Record<string, any>
): void => {
  const responsePayload: ApiResponse<T> = {
    success: true,
    ...(data !== undefined ? { data } : {}),
    ...(meta ? { meta } : {}),
    ...(extraFields || {}),
  };
  res.status(statusCode).json(responsePayload);
};

export const sendError = (
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: any,
  requestId?: string
): void => {
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
    message, // Backwards compatibility
    code,    // Backwards compatibility
    ...(requestId ? { requestId } : {}),
  });
};
