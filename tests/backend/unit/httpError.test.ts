import { describe, it, expect } from 'vitest';
import { toHttpError } from '../../../src/utils/httpError';
import { AppError } from '../../../src/middleware/errorHandler.middleware';

const prismaErr = (code: string | undefined, name = 'PrismaClientKnownRequestError') =>
  Object.assign(new Error('SECRET internal prisma detail'), { code, name });

describe('toHttpError', () => {
  it('giữ nguyên AppError', () => {
    expect(toHttpError(new AppError('Sai rồi', 409, 'X'), 'D')).toMatchObject({ status: 409, code: 'X', message: 'Sai rồi' });
  });

  it('giữ status và message của lỗi nghiệp vụ Error kèm statusCode 4xx', () => {
    const e = Object.assign(new Error('Không hợp lệ'), { statusCode: 422 });
    expect(toHttpError(e, 'D')).toMatchObject({ status: 422, code: 'D', message: 'Không hợp lệ' });
  });

  it.each([
    ['P1001', 'PrismaClientKnownRequestError', 503],
    ['P1017', 'PrismaClientKnownRequestError', 503],
    [undefined, 'PrismaClientInitializationError', 503],
    ['P2002', 'PrismaClientKnownRequestError', 409],
    ['P2003', 'PrismaClientKnownRequestError', 409],
    ['P2025', 'PrismaClientKnownRequestError', 404],
    ['P2020', 'PrismaClientKnownRequestError', 400],
    ['P2010', 'PrismaClientKnownRequestError', 500],
  ])('Prisma %s (%s) -> %i, không lộ chi tiết', (code, name, status) => {
    const out = toHttpError(prismaErr(code, name), 'D');
    expect(out.status).toBe(status);
    expect(out.message).not.toContain('SECRET');
  });

  it('tràn số Decimal của Postgres (Prisma không gán mã P2020) -> 400', () => {
    const e = Object.assign(new Error('PostgresError { code: "22003", message: "numeric field overflow" }'), {
      name: 'PrismaClientUnknownRequestError',
    });
    expect(toHttpError(e, 'D')).toMatchObject({ status: 400, code: 'VALUE_OUT_OF_RANGE' });
  });

  it('lỗi lạ -> 500 thông điệp chung', () => {
    const out = toHttpError(new Error('SECRET stack'), 'D');
    expect(out).toMatchObject({ status: 500, code: 'D' });
    expect(out.message).not.toContain('SECRET');
    expect(toHttpError(Object.assign(new Error('SECRET'), { statusCode: 500 }), 'D').message).not.toContain('SECRET');
  });
});
