import { describe, it, expect, vi, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import app from '../../../server';
import { prisma } from '../../../src/lib/prisma';
import { DevFallbackStore } from '../../../src/lib/devFallbackStore';
import { USER_A, generateTestToken } from '../../helpers/authHelper';

const RAW = "Can't reach database server at `db-internal:5432`";
const dbDown = () => Object.assign(new Error(RAW), { code: 'P1001' });
const FALLBACK_USER = { id: 'dev-test-user-001', email: 'test@example.com', name: 'x' };

function breakDatabase() {
  vi.spyOn(prisma.user, 'findUnique').mockRejectedValue(dbDown());
  vi.spyOn(prisma.wallet, 'findMany').mockRejectedValue(dbDown());
  vi.spyOn(prisma, '$transaction').mockRejectedValue(dbDown());
}

function expectSafe503(res: request.Response) {
  expect(res.status).toBe(503);
  expect(res.body.success).toBe(false);
  expect(res.body.accessToken).toBeUndefined();
  const body = JSON.stringify(res.body);
  expect(body).not.toContain('db-internal');
  expect(body).not.toContain("Can't reach");
  expect(body).not.toContain('Ví Tiền Mặt');
  expect(body).not.toContain('Tài Khoản Ngân Hàng');
}

describe.each([
  ['production + DEV_FALLBACK_STORE=true', 'production', 'true'],
  ['test không có cờ', 'test', undefined],
])('Kho dữ liệu mẫu bị tắt: %s', (_name, nodeEnv, flag) => {
  const origEnv = process.env.NODE_ENV;
  const origFlag = process.env.DEV_FALLBACK_STORE;

  const apply = () => {
    process.env.NODE_ENV = nodeEnv;
    if (flag === undefined) delete process.env.DEV_FALLBACK_STORE;
    else process.env.DEV_FALLBACK_STORE = flag;
  };

  afterEach(() => {
    process.env.NODE_ENV = origEnv;
    process.env.DEV_FALLBACK_STORE = origFlag;
    vi.restoreAllMocks();
  });

  it('isEnabled và shouldFallback đều false', () => {
    apply();
    expect(DevFallbackStore.isEnabled()).toBe(false);
    expect(DevFallbackStore.shouldFallback(dbDown())).toBe(false);
  });

  it('login tài khoản mẫu -> 503, không có accessToken', async () => {
    apply();
    breakDatabase();
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@example.com', password: 'Test@123456' });
    expectSafe503(res);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('GET /wallets -> 503, không lộ dữ liệu mẫu hay lỗi Prisma', async () => {
    apply();
    breakDatabase();
    const res = await request(app)
      .get('/api/v1/wallets')
      .set('Authorization', `Bearer ${generateTestToken(FALLBACK_USER)}`);
    expectSafe503(res);
  });

  it('refresh khi DB chết -> 503 và không xóa cookie', async () => {
    apply();
    vi.spyOn(prisma.refreshToken, 'findUnique').mockRejectedValue(dbDown());
    const res = await request(app).post('/api/v1/auth/refresh').send({ refreshToken: 'abc' });
    expectSafe503(res);
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('đăng nhập không nuốt lỗi lưu refresh token', async () => {
    apply();
    vi.spyOn(prisma.user, 'findUnique').mockResolvedValue({
      ...USER_A, password: await bcrypt.hash('Password123!', 4), avatar: null,
      provider: 'local', createdAt: new Date(), updatedAt: new Date(),
    } as any);
    vi.spyOn(prisma, '$transaction').mockRejectedValue(dbDown());
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: USER_A.email, password: 'Password123!' });
    expectSafe503(res);
  });
});
