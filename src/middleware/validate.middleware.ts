import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export type ValidationTarget = 'body' | 'query' | 'params';

export const validateRequest = (schema: ZodSchema, target: ValidationTarget = 'body') => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const dataToValidate = req[target];
      const parsed = await schema.parseAsync(dataToValidate);
      req[target] = parsed;
      next();
    } catch (error: any) {
      if (error instanceof ZodError) {
        const errorList = error.issues || (error as any).errors || [];
        const issues = errorList.map((err: any) => ({
          field: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        }));

        res.status(400).json({
          success: false,
          code: 'VALIDATION_ERROR',
          message: issues[0]?.message || 'Dữ liệu đầu vào không hợp lệ',
          errors: issues,
          requestId: req.id,
        });
        return;
      }

      res.status(400).json({
        success: false,
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu đầu vào không hợp lệ',
        requestId: req.id,
      });
    }
  };
};
