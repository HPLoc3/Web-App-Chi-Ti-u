// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';

// Prisma giả CÓ TRẠNG THÁI: chạy đúng đường Prisma của repository (không spy repository, không dùng kho mẫu)
const db = vi.hoisted(() => {
  const state = { tokens: [] as any[], sessions: [] as any[], seq: 0 };
  const users = ['u1', 'u2'].map((id) => ({ id, email: `${id}@t.test`, name: id, provider: 'local' }));
  const matches = (row: any, where: any) => Object.entries(where).every(([k, v]) => (row[k] ?? null) === v);
  const table = (key: 'tokens' | 'sessions') => ({
    findUnique: async ({ where }: any) => {
      const row = state[key].find((r) => matches(r, where));
      return row ? { ...row } : null;
    },
    create: async ({ data }: any) => {
      const row = { id: `row-${++state.seq}`, revokedAt: null, createdAt: new Date(), ...data };
      state[key].push(row);
      return { ...row };
    },
    updateMany: async ({ where, data }: any) => {
      const rows = state[key].filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }: any) => {
      const before = state[key].length;
      state[key] = state[key].filter((r) => !matches(r, where));
      return { count: before - state[key].length };
    },
  });
  const client: any = {
    $queryRaw: async () => [],
    user: { findUnique: async ({ where }: any) => users.find((u) => matches(u, where)) ?? null },
    refreshToken: table('tokens'),
    session: table('sessions'),
  };
  client.$transaction = async (arg: any) => (typeof arg === 'function' ? arg(client) : Promise.all(arg));
  return { state, client };
});
vi.mock('../../../src/lib/prisma', () => ({ prisma: db.client, default: db.client }));

import app from '../../../server';
import { AuthService, REFRESH_REUSE_GRACE_MS } from '../../../src/modules/auth/auth.service';

const refresh = (token: string) => request(app).post('/api/v1/auth/refresh').send({ refreshToken: token });
const login = async (userId: string) =>
  (await AuthService.generateTokens({ id: userId, email: `${userId}@t.test` })).refreshToken;
const rowsOf = (userId: string) => ({
  tokens: db.state.tokens.filter((t) => t.userId === userId).length,
  sessions: db.state.sessions.filter((s) => s.userId === userId).length,
});
const advance = (ms: number) => vi.setSystemTime(new Date(Date.now() + ms));

beforeEach(() => {
  db.state.tokens = [];
  db.state.sessions = [];
  vi.useFakeTimers({ toFake: ['Date'] });
});
afterEach(() => {
  vi.useRealTimers();
});

describe('Dùng lại refresh token đã bị thu hồi do xoay vòng', () => {
  const setup = async () => {
    const stolen = await login('u1');
    const otherDevice = await login('u1');
    const otherUser = await login('u2');
    const first = await refresh(stolen);
    expect(first.status).toBe(200);
    return { stolen, rotated: first.body.refreshToken as string, otherDevice, otherUser };
  };

  it.each([
    ['ngay sau hạn ân hạn', REFRESH_REUSE_GRACE_MS + 1000],
    ['nhiều ngày sau', 7 * 86_400_000],
    ['sau cả khi token cũ hết hạn', 31 * 86_400_000],
  ])('%s: 401 và thu hồi toàn bộ phiên của đúng user đó', async (_name, delay) => {
    const t = await setup();
    advance(delay);

    const reuse = await refresh(t.stolen);
    expect(reuse.status).toBe(401);
    expect(reuse.body.error.code).toBe('INVALID_REFRESH_TOKEN');
    expect(rowsOf('u1')).toEqual({ tokens: 0, sessions: 0 });
    expect(rowsOf('u2')).toEqual({ tokens: 1, sessions: 1 });
    expect((await refresh(t.rotated)).status).toBe(401);
    expect((await refresh(t.otherDevice)).status).toBe(401);
    // User khác không bị đụng (token 30 ngày: quá hạn thì tự 401 vì hết hạn)
    expect((await refresh(t.otherUser)).status).toBe(delay > 30 * 86_400_000 ? 401 : 200);
  });

  it('logout bằng token cũ không xóa dấu vết: dùng lại sau đó vẫn thu hồi toàn bộ', async () => {
    const t = await setup();
    await request(app).post('/api/v1/auth/logout').send({ refreshToken: t.stolen });
    advance(REFRESH_REUSE_GRACE_MS + 1000);
    expect((await refresh(t.stolen)).status).toBe(401);
    expect(rowsOf('u1')).toEqual({ tokens: 0, sessions: 0 });
  });

  it('trong hạn ân hạn: 409, không thu hồi phiên nào', async () => {
    const t = await setup();
    advance(REFRESH_REUSE_GRACE_MS - 1000);
    expect((await refresh(t.stolen)).status).toBe(409);
    expect((await refresh(t.rotated)).status).toBe(200);
    expect((await refresh(t.otherDevice)).status).toBe(200);
  });
});
