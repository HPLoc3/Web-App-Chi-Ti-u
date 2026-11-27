import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import app from '../../../server';
import { prisma } from '../../../src/lib/prisma';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { UsersRepository } from '../../../src/modules/users/users.repository';
import { USER_A, generateTestToken } from '../../helpers/authHelper';

const auth = { Authorization: `Bearer ${generateTestToken(USER_A)}` };
const userRow = (extra: Record<string, unknown> = {}) => ({
  id: USER_A.id,
  email: USER_A.email,
  name: USER_A.name,
  avatar: 'https://example.com/a.png',
  password: null as string | null,
  provider: 'local',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...extra,
});
const cookiesOf = (res: request.Response): string[] => ([] as string[]).concat((res.headers['set-cookie'] as any) || []);

function fakeTx() {
  const calls: string[] = [];
  const op = (name: string, value: any = { count: 1 }) =>
    vi.fn(async (_args?: any) => {
      calls.push(name);
      return value;
    });
  const tx = {
    $queryRaw: vi.fn(async () => {
      calls.push('lockUser');
      return [];
    }),
    user: { update: op('user.update', {}), delete: op('user.delete', {}) },
    refreshToken: {
      updateMany: op('refreshToken.updateMany'),
      deleteMany: op('refreshToken.deleteMany'),
      create: op('refreshToken.create', {}),
    },
    session: { deleteMany: op('session.deleteMany'), create: op('session.create', {}) },
    passwordResetToken: { updateMany: op('passwordResetToken.updateMany') },
    transaction: { deleteMany: op('transaction.deleteMany') },
    recurringTransaction: { deleteMany: op('recurringTransaction.deleteMany') },
    budgetLimit: { deleteMany: op('budgetLimit.deleteMany') },
    budget: { deleteMany: op('budget.deleteMany') },
    goal: { deleteMany: op('goal.deleteMany') },
    wallet: { deleteMany: op('wallet.deleteMany') },
    category: { deleteMany: op('category.deleteMany') },
  };
  return { tx, calls };
}
const useTx = (tx: unknown) =>
  vi.spyOn(prisma, '$transaction').mockImplementation((async (cb: any) => cb(tx)) as any);

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Đổi mật khẩu', () => {
  const body = { currentPassword: 'OldPass123', newPassword: 'NewPass456' };

  it('thu hồi mọi phiên trong một transaction rồi cấp token mới cho thiết bị hiện tại', async () => {
    const hash = await bcrypt.hash('OldPass123', 4);
    vi.spyOn(UsersRepository, 'findById').mockResolvedValue(userRow({ password: hash }) as any);
    const { tx, calls } = fakeTx();
    useTx(tx);
    const issued = vi.spyOn(AuthRepository, 'createTokensAndSession').mockImplementation(async () => {
      calls.push('issue');
    });

    const res = await request(app).post('/api/v1/users/change-password').set(auth).send(body);

    expect(res.status).toBe(200);
    expect(calls).toEqual([
      'user.update',
      'refreshToken.deleteMany',
      'session.deleteMany',
      'passwordResetToken.updateMany',
      'issue',
    ]);
    // Xóa hẳn (kể cả token đã xoay vòng) để thiết bị cũ gọi refresh không kích hoạt revokeAll
    expect((tx.refreshToken.deleteMany.mock.calls[0][0] as any).where).toEqual({ userId: USER_A.id });
    expect((tx.passwordResetToken.updateMany.mock.calls[0][0] as any).where).toMatchObject({ userId: USER_A.id, usedAt: null });
    expect(issued).toHaveBeenCalledTimes(1);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(res.body.user.email).toBe(USER_A.email);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('password');
    const cookies = cookiesOf(res).join(';');
    expect(cookies).toContain('accessToken=');
    expect(cookies).toContain('refreshToken=');
  });

  it('sai mật khẩu hiện tại -> 400 INVALID_PASSWORD, không thu hồi gì', async () => {
    const hash = await bcrypt.hash('Different123', 4);
    vi.spyOn(UsersRepository, 'findById').mockResolvedValue(userRow({ password: hash }) as any);
    const trx = vi.spyOn(prisma, '$transaction');
    const res = await request(app).post('/api/v1/users/change-password').set(auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_PASSWORD');
    expect(trx).not.toHaveBeenCalled();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('tài khoản Google -> 400 SOCIAL_ACCOUNT', async () => {
    vi.spyOn(UsersRepository, 'findById').mockResolvedValue(userRow({ provider: 'google' }) as any);
    const res = await request(app).post('/api/v1/users/change-password').set(auth).send(body);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('SOCIAL_ACCOUNT');
  });

  it('route có authRateLimiter', async () => {
    const res = await request(app).post('/api/v1/users/change-password').set(auth).send({});
    expect(res.headers['ratelimit-limit']).toBe('60');
  });
});

describe('Google login', () => {
  const origId = process.env.GOOGLE_CLIENT_ID;
  const origViteId = process.env.VITE_GOOGLE_CLIENT_ID;
  let fetchSpy: any;
  let find: any;

  beforeEach(() => {
    process.env.GOOGLE_CLIENT_ID = 'my-client-id';
    fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ email: 'real@gmail.com', email_verified: true, name: 'Real', picture: 'https://x/p.png' }),
    } as any);
    find = vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(userRow({ email: 'real@gmail.com' }) as any);
    vi.spyOn(AuthRepository, 'createTokensAndSession').mockResolvedValue(undefined);
    vi.spyOn(prisma.user, 'update').mockResolvedValue(userRow({ email: 'real@gmail.com' }) as any);
  });
  afterEach(() => {
    if (origId === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = origId;
    if (origViteId !== undefined) process.env.VITE_GOOGLE_CLIENT_ID = origViteId;
  });

  const post = (b: object) => request(app).post('/api/v1/auth/google').send(b);
  const tokenInfo = (extra: Record<string, unknown> = {}) =>
    vi.spyOn(OAuth2Client.prototype, 'getTokenInfo').mockResolvedValue({
      aud: 'my-client-id', email: 'real@gmail.com', email_verified: true, scopes: [], expiry_date: Date.now() + 1000, ...extra,
    } as any);
  const idToken = (payload: Record<string, unknown>) =>
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation((async () => ({ getPayload: () => payload })) as any);
  const rejected = (res: request.Response) => {
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('GOOGLE_AUTH_FAILED');
    expect(res.body.accessToken).toBeUndefined();
    expect(find).not.toHaveBeenCalled();
  };

  it('idToken bị verify từ chối -> không gọi fetch tokeninfo', async () => {
    vi.spyOn(OAuth2Client.prototype, 'verifyIdToken').mockImplementation((async () => {
      throw new Error('Wrong recipient');
    }) as any);
    rejected(await post({ idToken: 'forged' }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('thiếu client id -> 503 GOOGLE_NOT_CONFIGURED', async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.VITE_GOOGLE_CLIENT_ID;
    const res = await post({ accessToken: 'abc' });
    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('GOOGLE_NOT_CONFIGURED');
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('access token cấp cho app khác (aud khác) -> từ chối, không gọi userinfo', async () => {
    tokenInfo({ aud: 'attacker-client-id' });
    rejected(await post({ accessToken: 'abc' }));
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('azp khác client id -> từ chối', async () => {
    tokenInfo({ azp: 'attacker-client-id' });
    rejected(await post({ accessToken: 'abc' }));
  });

  it.each([undefined, false, 'false'])('access token email_verified=%s -> từ chối', async (value) => {
    tokenInfo({ email_verified: value });
    rejected(await post({ accessToken: 'abc' }));
  });

  it.each([undefined, false])('idToken email_verified=%s -> từ chối', async (value) => {
    idToken({ email: 'real@gmail.com', email_verified: value });
    rejected(await post({ idToken: 'x' }));
  });

  it('userinfo trả email khác tokeninfo -> từ chối', async () => {
    tokenInfo({ email: 'other@gmail.com' });
    rejected(await post({ accessToken: 'abc' }));
  });

  it('idToken hợp lệ; email giả trong body vô tác dụng, field thừa không gây 400', async () => {
    const verify = idToken({ email: 'real@gmail.com', email_verified: true });
    const res = await post({ idToken: 'good', email: 'victim@gmail.com', name: 'V', picture: 'p', googleId: '1' });
    expect(res.status).toBe(200);
    expect(verify).toHaveBeenCalledWith({ idToken: 'good', audience: 'my-client-id' });
    expect(find.mock.calls).toEqual([['real@gmail.com']]);
    expect(typeof res.body.accessToken).toBe('string');
  });

  it('access token hợp lệ (email_verified dạng chuỗi "true")', async () => {
    tokenInfo({ email_verified: 'true', azp: 'my-client-id' });
    const res = await post({ accessToken: 'good', email: 'victim@gmail.com' });
    expect(res.status).toBe(200);
    expect(find.mock.calls).toEqual([['real@gmail.com']]);
  });
});

describe('/auth/me, logout', () => {
  it('/auth/me không trả password ở data lẫn user', async () => {
    vi.spyOn(AuthRepository, 'findUserById').mockResolvedValue(userRow({ password: 'HASH-SECRET' }) as any);
    const res = await request(app).get('/api/v1/auth/me').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty('password');
    expect(res.body.user).not.toHaveProperty('password');
    expect(JSON.stringify(res.body)).not.toContain('HASH-SECRET');
  });

  it('logout xóa hẳn refresh token còn sống theo hash (giữ dòng đã xoay vòng để phát hiện dùng lại)', async () => {
    const revoke = vi.spyOn(prisma.refreshToken, 'deleteMany').mockResolvedValue({ count: 1 });
    vi.spyOn(prisma.session, 'deleteMany').mockResolvedValue({ count: 1 });
    const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'raw-token' });
    expect(res.status).toBe(200);
    expect(revoke).toHaveBeenCalledWith({
      where: { token: AuthService.hashToken('raw-token'), revokedAt: null },
    });
  });

  const dbDown = () => Object.assign(new Error('Server has closed the connection. db-internal'), { code: 'P1017' });
  const clearedCookies = (res: request.Response) => cookiesOf(res).join(';');

  it('logout thu hồi thất bại -> 503, vẫn xóa cookie phía client', async () => {
    vi.spyOn(AuthService, 'logout').mockRejectedValue(dbDown());
    const res = await request(app).post('/api/v1/auth/logout').send({ refreshToken: 'raw' });
    expect(res.status).toBe(503);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('db-internal');
    expect(clearedCookies(res)).toContain('refreshToken=;');
  });

  it.each([
    ['DB chết', dbDown, 503],
    ['lỗi lạ', () => new Error('db-internal boom'), 500],
  ])('logout-all thất bại (%s) -> mã lỗi thật, KHÔNG xóa cookie', async (_n, makeError, status) => {
    vi.spyOn(AuthService, 'logoutAllDevices').mockRejectedValue(makeError());
    const res = await request(app).post('/api/v1/auth/logout-all').set(auth);
    expect(res.status).toBe(status);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('db-internal');
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  it('logout-all thành công -> 200 và xóa cookie', async () => {
    vi.spyOn(AuthService, 'logoutAllDevices').mockResolvedValue();
    const res = await request(app).post('/api/v1/auth/logout-all').set(auth);
    expect(res.status).toBe(200);
    expect(clearedCookies(res)).toContain('refreshToken=;');
  });

  it('revokeAll xóa hẳn token và session', async () => {
    const { tx } = fakeTx();
    useTx(tx);
    await AuthRepository.revokeAllUserTokensAndSessions(USER_A.id);
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_A.id } });
    expect(tx.refreshToken.updateMany).not.toHaveBeenCalled();
    expect(tx.session.deleteMany).toHaveBeenCalled();
  });
});

describe('Kho dữ liệu mẫu: thiết bị cũ không đá được phiên khác', () => {
  const later = new Date(Date.now() + 86400000);

  it.each([
    ['logout', async () => AuthService.logout('old-device')],
    ['logout-all', async () => AuthService.logoutAllDevices('fb-user')],
  ])('sau %s, token cũ -> 401 và không thu hồi phiên mới', async (_n, revoke) => {
    const down = () => Object.assign(new Error("Can't reach database server"), { code: 'P1001' });
    vi.spyOn(prisma, '$transaction').mockRejectedValue(down());
    vi.spyOn(prisma.refreshToken, 'findUnique').mockRejectedValue(down());
    vi.spyOn(prisma.refreshToken, 'deleteMany').mockRejectedValue(down());
    vi.spyOn(prisma.session, 'deleteMany').mockRejectedValue(down());

    await AuthRepository.createTokensAndSession('fb-user', AuthService.hashToken('old-device'), later);
    await revoke();
    await AuthRepository.createTokensAndSession('fb-user', AuthService.hashToken('new-device'), later);

    await expect(AuthService.refreshTokens('old-device')).rejects.toMatchObject({ statusCode: 401 });
    const survivor = await AuthRepository.findRefreshToken(AuthService.hashToken('new-device'));
    expect(survivor).toMatchObject({ revokedAt: null });
    // Token đã bị xóa không được xoay vòng thành token mới
    await expect(
      AuthRepository.rotateRefreshToken({ oldTokenId: 'gone', userId: 'fb-user', newHashedToken: 'x', expiresAt: later })
    ).resolves.toBe(false);
  });
});

describe('Refresh token', () => {
  const record = (revokedAgoMs: number | null) => ({
    id: 'rt-1',
    token: 'h',
    userId: USER_A.id,
    expiresAt: new Date(Date.now() + 86400000),
    revokedAt: revokedAgoMs === null ? null : new Date(Date.now() - revokedAgoMs),
    createdAt: new Date(),
  });
  const refresh = () => request(app).post('/api/v1/auth/refresh').set('Cookie', ['refreshToken=raw']);

  it('token vừa bị thu hồi (<20s) -> 409, không revokeAll, không xóa cookie, không cấp token', async () => {
    vi.spyOn(AuthRepository, 'findRefreshToken').mockResolvedValue(record(5000));
    const all = vi.spyOn(AuthRepository, 'revokeAllUserTokensAndSessions').mockResolvedValue();
    const issue = vi.spyOn(AuthRepository, 'createTokensAndSession').mockResolvedValue();
    const rotate = vi.spyOn(AuthRepository, 'rotateRefreshToken').mockResolvedValue(true);
    const res = await refresh();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REFRESH_IN_PROGRESS');
    expect(res.body.accessToken).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
    expect(all).not.toHaveBeenCalled();
    expect(issue).not.toHaveBeenCalled();
    expect(rotate).not.toHaveBeenCalled();
  });

  it('token bị thu hồi quá 20s -> revokeAll + 401 + xóa cookie', async () => {
    vi.spyOn(AuthRepository, 'findRefreshToken').mockResolvedValue(record(25000));
    const all = vi.spyOn(AuthRepository, 'revokeAllUserTokensAndSessions').mockResolvedValue();
    const res = await refresh();
    expect(res.status).toBe(401);
    expect(all).toHaveBeenCalledWith(USER_A.id);
    expect(cookiesOf(res).join(';')).toContain('refreshToken=;');
  });

  it('thua cuộc đua xoay vòng -> 409, không xóa cookie', async () => {
    vi.spyOn(AuthRepository, 'findRefreshToken').mockResolvedValue(record(null));
    vi.spyOn(AuthRepository, 'findUserById').mockResolvedValue(userRow() as any);
    vi.spyOn(AuthRepository, 'rotateRefreshToken').mockResolvedValue(false);
    const res = await refresh();
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('REFRESH_IN_PROGRESS');
    expect(res.body.accessToken).toBeUndefined();
    expect(res.headers['set-cookie']).toBeUndefined();
  });

  const params = { oldTokenId: 'rt-1', userId: USER_A.id, newHashedToken: 'new', expiresAt: new Date() };

  it('rotateRefreshToken: claim nguyên tử, count=0 thì không tạo token', async () => {
    const { tx } = fakeTx();
    tx.refreshToken.updateMany.mockResolvedValue({ count: 0 });
    useTx(tx);
    await expect(AuthRepository.rotateRefreshToken(params)).resolves.toBe(false);
    expect((tx.refreshToken.updateMany.mock.calls[0][0] as any).where).toEqual({ id: 'rt-1', revokedAt: null });
    expect(tx.refreshToken.create).not.toHaveBeenCalled();
    expect(tx.session.create).not.toHaveBeenCalled();
  });

  it('rotateRefreshToken: count=1 thì khóa user và tạo token trong cùng transaction', async () => {
    const { tx } = fakeTx();
    useTx(tx);
    await expect(AuthRepository.rotateRefreshToken(params)).resolves.toBe(true);
    expect(tx.$queryRaw).toHaveBeenCalled();
    expect(tx.refreshToken.create).toHaveBeenCalled();
    expect(tx.session.create).toHaveBeenCalled();
  });
});

describe('resetPassword dùng tx thật', () => {
  const record = { id: 'r1', userId: USER_A.id, token: 'h', usedAt: null, expiresAt: new Date(Date.now() + 60000), createdAt: new Date() };

  it('mọi thao tác ghi chạy trên tx', async () => {
    vi.spyOn(AuthRepository, 'findValidResetToken').mockResolvedValue(record);
    const { tx, calls } = fakeTx();
    useTx(tx);
    await AuthService.resetPassword('raw-token-123', 'NewPass456');
    expect(calls).toEqual(
      expect.arrayContaining(['user.update', 'refreshToken.deleteMany', 'session.deleteMany', 'passwordResetToken.updateMany'])
    );
  });

  it('token đã bị dùng giữa chừng -> 400, không đổi mật khẩu', async () => {
    vi.spyOn(AuthRepository, 'findValidResetToken').mockResolvedValue(record);
    const { tx } = fakeTx();
    tx.passwordResetToken.updateMany.mockResolvedValue({ count: 0 });
    useTx(tx);
    await expect(AuthService.resetPassword('raw-token-123', 'NewPass456')).rejects.toMatchObject({ statusCode: 400 });
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});

describe('deleteAccount', () => {
  it('xóa theo thứ tự an toàn với khóa ngoại trong một transaction', async () => {
    const { tx, calls } = fakeTx();
    useTx(tx);
    await UsersRepository.delete(USER_A.id);
    // Khóa dòng User trước tiên (cùng thứ tự với đồng bộ định kỳ) để không deadlock
    expect(calls).toEqual([
      'lockUser',
      'transaction.deleteMany',
      'recurringTransaction.deleteMany',
      'budgetLimit.deleteMany',
      'budget.deleteMany',
      'goal.deleteMany',
      'wallet.deleteMany',
      'category.deleteMany',
      'user.delete',
    ]);
  });
});
