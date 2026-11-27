// @vitest-environment node
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import request from 'supertest';

const APP_ORIGIN = 'https://chitieu.hophuloc.online';
const LOGOUT = '/api/v1/auth/logout';

describe('CSRF + CORS trên mount /api thật (production)', () => {
  let app: any;
  let cookieHelpers: typeof import('../../../src/middleware/auth.middleware');

  beforeAll(async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('ALLOWED_ORIGINS', APP_ORIGIN);
    vi.stubEnv('APP_URL', APP_ORIGIN);
    // allowedOrigins của CORS được tính lúc import nên phải import lại sau khi stub env
    vi.resetModules();
    app = (await import('../../../server')).default;
    cookieHelpers = await import('../../../src/middleware/auth.middleware');
    // Import lại cả server: ~1s khi chạy riêng, nhưng vượt hookTimeout mặc định 10s khi máy tải nặng
  }, 60_000);

  afterAll(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  const expectDenied = (res: request.Response) => {
    expect(res.status).toBe(403);
    expect(res.body).toMatchObject({ success: false, error: { code: 'CSRF_ORIGIN_DENIED' } });
  };

  it.each([
    'https://evil.example',
    'https://hophuloc.online',
    'https://www.hophuloc.online',
    'https://chitieu.hophuloc.online.evil.com',
    'https://localhost.evil.com',
    'https://evil.run.app',
    'http://localhost:3000',
    'http://chitieu.hophuloc.online',
    'null',
    'not-a-url',
  ])('POST với Origin %s bị 403', async (origin) => {
    expectDenied(await request(app).post(LOGOUT).set('Origin', origin));
  });

  it('chặn Origin giả chứa Host trong tên miền', async () => {
    expectDenied(
      await request(app)
        .post(LOGOUT)
        .set('Host', 'app.internal')
        .set('Origin', 'https://app.internal.evil.com')
    );
  });

  it.each(['https://evil.example/page', 'not-a-url'])('chỉ có Referer %s bị 403', async (referer) => {
    expectDenied(await request(app).post(LOGOUT).set('Referer', referer));
  });

  it('alias cũ /api/auth/logout cũng bị chặn', async () => {
    expectDenied(await request(app).post('/api/auth/logout').set('Origin', 'https://evil.example'));
  });

  it('cho qua Origin đúng, Referer đúng và request không có Origin/Referer', async () => {
    expect((await request(app).post(LOGOUT).set('Origin', APP_ORIGIN)).status).toBe(200);
    expect((await request(app).post(LOGOUT).set('Referer', `${APP_ORIGIN}/trang`)).status).toBe(200);
    expect((await request(app).post(LOGOUT)).status).toBe(200);
  });

  it('cho qua khi Origin trùng Host', async () => {
    const res = await request(app)
      .post(LOGOUT)
      .set('Host', 'my-service.onrender.com')
      .set('Origin', 'https://my-service.onrender.com');
    expect(res.status).toBe(200);
  });

  it('không chặn GET có Origin lạ', async () => {
    const res = await request(app).get('/api/health').set('Origin', 'https://evil.example');
    expect(res.status).not.toBe(403);
  });

  it.each(['https://hophuloc.online', 'https://www.hophuloc.online', 'https://evil.run.app'])(
    'preflight từ %s không được cấp CORS',
    async (origin) => {
      const res = await request(app)
        .options(LOGOUT)
        .set('Origin', origin)
        .set('Access-Control-Request-Method', 'POST');
      expect(res.headers['access-control-allow-origin']).toBeUndefined();
    }
  );

  it.each([
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:3000',
  ])('production: preflight từ %s không được cấp CORS', async (origin) => {
    const res = await request(app)
      .options(LOGOUT)
      .set('Origin', origin)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it.each(['localhost:3000', '127.0.0.1:3000', '192.168.1.20:3000'])(
    'production: POST cùng origin trên %s không bị CORS/CSRF chặn',
    async (host) => {
      const res = await request(app).post(LOGOUT).set('Host', host).set('Origin', `http://${host}`);
      expect(res.status).toBe(200);
    }
  );

  it('preflight từ origin của app được cấp CORS', async () => {
    const res = await request(app)
      .options(LOGOUT)
      .set('Origin', APP_ORIGIN)
      .set('Access-Control-Request-Method', 'POST');
    expect(res.headers['access-control-allow-origin']).toBe(APP_ORIGIN);
  });

  it('cookie production dùng SameSite=Lax khi set', () => {
    for (const options of [
      cookieHelpers.getAccessTokenCookieOptions(),
      cookieHelpers.getRefreshTokenCookieOptions(),
    ]) {
      expect(options).toMatchObject({ sameSite: 'lax', secure: true, httpOnly: true, path: '/' });
    }
  });

  it('cookie production dùng SameSite=Lax khi xoá (logout)', async () => {
    const res = await request(app).post(LOGOUT).set('Origin', APP_ORIGIN);
    const cookies = res.headers['set-cookie'] as unknown as string[];
    expect(cookies).toHaveLength(3);
    for (const cookie of cookies) {
      expect(cookie).toContain('SameSite=Lax');
      expect(cookie).toContain('Secure');
      expect(cookie).toContain('HttpOnly');
      expect(cookie).toContain('Path=/');
    }
  });
});
