import { Request, Response, NextFunction } from 'express';

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

/**
 * Hàm đệ quy loại bỏ các thuộc tính nguy hiểm phòng chống Prototype Pollution
 */
const cleanObject = (obj: any): any => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(cleanObject);
  }

  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    if (FORBIDDEN_KEYS.has(key)) {
      continue; // Bỏ qua thuộc tính nguy hiểm
    }
    clean[key] = cleanObject(obj[key]);
  }

  return clean;
};

/**
 * Middleware ngăn chặn Prototype Pollution trên req.body, req.query, req.params
 */
export const sanitizeInputMiddleware = (req: Request, _res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanObject(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanObject(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanObject(req.params);
  }
  next();
};
