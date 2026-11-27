// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';

// Prisma giả CÓ TRẠNG THÁI: chạy đúng đường Prisma của repository (không spy repository, không dùng kho mẫu)
const db = vi.hoisted(() => {
  const state = {
    users: [] as any[],
    tokens: [] as any[],
    sessions: [] as any[],
    resets: [] as any[],
    seq: 0,
    failRevoke: false,
  };
  const matches = (row: any, where: any) => Object.entries(where).every(([k, v]) => (row[k] ?? null) === v);
  const table = (key: 'users' | 'tokens' | 'sessions' | 'resets') => ({
    findUnique: async ({ where }: any) => {
      const row = state[key].find((r) => matches(r, where));
      return row ? { ...row } : null;
    },
    findUniqueOrThrow: async ({ where }: any) => {
      const row = state[key].find((r) => matches(r, where));
      if (!row) throw new Error('not found');
      return { ...row };
    },
    create: async ({ data }: any) => {
      const row = { id: `row-${++state.seq}`, revokedAt: null, createdAt: new Date(), ...data };
      state[key].push(row);
      return { ...row };
    },
    update: async ({ where, data }: any) => {
      const row = state[key].find((r) => matches(r, where));
      Object.assign(row, data);
      return { ...row };
    },
    updateMany: async ({ where, data }: any) => {
      const rows = state[key].filter((r) => matches(r, where));
      rows.forEach((r) => Object.assign(r, data));
      return { count: rows.length };
    },
    deleteMany: async ({ where }: any) => {
      if (key === 'sessions' && state.failRevoke) throw new Error('revoke failed');
      const before = state[key].length;
      state[key] = state[key].filter((r) => !matches(r, where)) as any;
      return { count: before - state[key].length };
    },
  });
  const client: any = {
    $queryRaw: async () => [],
    user: table('users'),
    refreshToken: table('tokens'),
    session: table('sessions'),
    passwordResetToken: table('resets'),
  };
  // Transaction lỗi thì hoàn tác toàn bộ
  client.$transaction = async (arg: any) => {
    const snapshot = structuredClone({
      users: state.users,
      tokens: state.tokens,
      sessions: state.sessions,
      resets: state.resets,
    });
    try {
      return typeof arg === 'function' ? await arg(client) : await Promise.all(arg);
    } catch (error) {
      Object.assign(state, snapshot);
      throw error;
    }
  };
  return { state, client };
});
vi.mock('../../../src/lib/prisma', () => ({ prisma: db.client, default: db.client }));

const gemini = vi.hoisted(() => ({ generate: vi.fn(async () => ({ text: '{}' })) }));
vi.mock('@google/genai', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@google/genai')>()),
  GoogleGenAI: class {
    models = { generateContent: gemini.generate };
  },
}));

import app from '../../../server';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { AiService, MAX_FACTS_PROMPT_CHARS } from '../../../src/modules/ai/ai.service';
import { AiQuotaManager } from '../../../src/modules/ai/ai.quota';
import aiRoutes from '../../../src/modules/ai/ai.routes';
import { aiAssistantSchema, AI_MESSAGE_MAX } from '../../../src/modules/ai/ai.schema';
import { aiRateLimiter } from '../../../src/middleware/rateLimiter.middleware';

const EMAIL = 'victim@example.com';
const ATTACKER_PASSWORD = 'AttackerPass1';

const seedUser = async (provider: 'local' | 'google') => {
  const password = provider === 'local' ? await bcrypt.hash(ATTACKER_PASSWORD, 4) : null;
  db.state.users.push({
    id: 'u1',
    email: EMAIL,
    name: 'Victim',
    avatar: null,
    password,
    provider,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
};
const user = () => db.state.users[0];
const origClientId = process.env.GOOGLE_CLIENT_ID;

beforeEach(() => {
  vi.restoreAllMocks();
  Object.assign(db.state, { users: [], tokens: [], sessions: [], resets: [], failRevoke: false });
  process.env.GOOGLE_CLIENT_ID = 'my-client-id';
  vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation((async () => ({
    getPayload: () => ({ email: EMAIL, email_verified: true, name: 'Victim' }),
  })) as any);
});
afterEach(() => {
  if (origClientId === undefined) delete process.env.GOOGLE_CLIENT_ID;
  else process.env.GOOGLE_CLIENT_ID = origClientId;
});

const googleLogin = () => request(app).post('/api/v1/auth/google').send({ idToken: 'good' });

describe('L1: đăng ký trước bằng email người khác rồi chờ họ đăng nhập Google', () => {
  it('chủ email đăng nhập Google thì mật khẩu, phiên và mã đặt lại của người đăng ký trước mất hiệu lực', async () => {
    await seedUser('local');
    const attacker = await AuthService.login(EMAIL, ATTACKER_PASSWORD);
    db.state.resets.push({ id: 'r1', userId: 'u1', token: 'h', usedAt: null });
    const attackerRows = db.state.tokens.map((t) => t.token);

    const res = await googleLogin();

    expect(res.status).toBe(200);
    expect(user()).toMatchObject({ password: null, provider: 'google' });
    expect(db.state.resets[0].usedAt).toBeInstanceOf(Date);
    // Chỉ còn đúng phiên mới của chủ email
    expect(db.state.tokens).toHaveLength(1);
    expect(db.state.sessions).toHaveLength(1);
    expect(attackerRows).not.toContain(db.state.tokens[0].token);

    await expect(AuthService.login(EMAIL, ATTACKER_PASSWORD)).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(AuthService.refreshTokens(attacker.tokens.refreshToken)).rejects.toMatchObject({
      code: 'INVALID_REFRESH_TOKEN',
    });
    // Access token cũ còn sống tối đa 15 phút nhưng không đặt lại được mật khẩu
    const change = await request(app)
      .post('/api/v1/users/change-password')
      .set('Authorization', `Bearer ${attacker.tokens.accessToken}`)
      .send({ currentPassword: ATTACKER_PASSWORD, newPassword: 'NewPass456' });
    expect(change.body.error.code).toBe('SOCIAL_ACCOUNT');
    expect(user().password).toBeNull();
  });

  it('tài khoản đã là Google thì các thiết bị khác vẫn giữ phiên', async () => {
    await seedUser('google');
    await googleLogin();
    await googleLogin();

    expect(db.state.tokens).toHaveLength(2);
    expect(db.state.sessions).toHaveLength(2);
  });

  it('thu hồi thất bại thì không cấp phiên và không đổi gì nửa chừng', async () => {
    await seedUser('local');
    const hash = user().password;
    db.state.failRevoke = true;

    const res = await googleLogin();

    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(res.body.accessToken).toBeUndefined();
    expect(user()).toMatchObject({ password: hash, provider: 'local' });
    expect(db.state.tokens).toHaveLength(0);
  });

  it('đăng nhập bằng mật khẩu đang chạy dở không được cấp phiên sau khi mật khẩu bị bỏ', async () => {
    await seedUser('local');
    const staleHash = user().password;
    await googleLogin();
    const before = db.state.tokens.length;

    await expect(
      AuthService.generateTokens({ id: 'u1', email: EMAIL }, undefined, staleHash)
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(db.state.tokens).toHaveLength(before);
  });

  it('đổi mật khẩu đang chạy dở không ghi lại được mật khẩu', async () => {
    await seedUser('local');
    const staleHash = user().password;
    await googleLogin();

    await expect(UsersRepository.changePassword('u1', 'new-hash', staleHash)).resolves.toBe(false);
    expect(user().password).toBeNull();
    expect(db.state.tokens).toHaveLength(1);
  });

  it('đăng nhập mật khẩu bình thường vẫn được cấp phiên', async () => {
    await seedUser('local');

    const res = await request(app).post('/api/v1/auth/login').send({ email: EMAIL, password: ATTACKER_PASSWORD });

    expect(res.status).toBe(200);
    expect(db.state.tokens).toHaveLength(1);
  });
});

describe('L3: giới hạn trợ lý AI', () => {
  it('route /assistant có aiRateLimiter đứng trước xử lý', () => {
    const layer = (aiRoutes as any).stack.find((l: any) => l.route?.path === '/assistant');
    const handlers = layer.route.stack.map((s: any) => s.handle);

    expect(handlers[0]).toBe(aiRateLimiter);
  });

  it('chặn tin nhắn và dữ liệu ngữ cảnh quá lớn, vẫn nhận mức bình thường', () => {
    const ok = (body: unknown) => aiAssistantSchema.safeParse(body).success;
    const limits = (n: number) => Object.fromEntries(Array.from({ length: n }, (_, i) => [`c${i}`, 1]));

    expect(ok({ message: 'a'.repeat(AI_MESSAGE_MAX) })).toBe(true);
    expect(ok({ message: 'a'.repeat(AI_MESSAGE_MAX + 1) })).toBe(false);
    expect(ok({ message: 'a', context: { expenses: Array(5000).fill({}), goals: Array(100).fill({}) } })).toBe(true);
    expect(ok({ message: 'a', context: { expenses: Array(5001).fill({}) } })).toBe(false);
    expect(ok({ message: 'a', context: { goals: Array(101).fill({}) } })).toBe(false);
    expect(ok({ message: 'a', context: { categoryLimits: limits(100) } })).toBe(true);
    expect(ok({ message: 'a', context: { categoryLimits: limits(101) } })).toBe(false);
    expect(ok({ message: 'a', context: { categoryLimits: { ['k'.repeat(65)]: 1 } } })).toBe(false);
  });

  const origKey = process.env.GEMINI_API_KEY;
  afterEach(() => {
    if (origKey === undefined) delete process.env.GEMINI_API_KEY;
    else process.env.GEMINI_API_KEY = origKey;
  });
  const ask = (goalName: string) => {
    process.env.GEMINI_API_KEY = 'test-key';
    gemini.generate.mockClear();
    vi.spyOn(AiQuotaManager, 'checkAndConsumeQuota').mockResolvedValue({
      allowed: true,
      quota: { used: 1, limit: 50, remaining: 49, resetAt: new Date().toISOString() },
    } as any);
    return AiService.processMessage(
      { message: 'Phân tích chi tiêu giúp tôi', context: { goals: [{ name: goalName, target: 10, current: 0 }] } },
      'u1'
    );
  };

  it('ngữ cảnh bình thường vẫn gọi Gemini', async () => {
    await ask('Du lịch');
    expect(gemini.generate).toHaveBeenCalled();
  });

  it('bảng số liệu quá lớn thì không gửi sang Gemini, trả lời bằng bộ quy tắc', async () => {
    const result = await ask('x'.repeat(MAX_FACTS_PROMPT_CHARS));

    expect(gemini.generate).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
  });
});
