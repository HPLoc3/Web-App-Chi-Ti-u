import { describe, it, expect } from 'vitest';
import express from 'express';
import rateLimit from 'express-rate-limit';
import request from 'supertest';

describe('Rate Limit Tests', () => {
  it('should return RateLimit standard headers on requests', async () => {
    const testApp = express();
    testApp.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 10,
        standardHeaders: true,
        legacyHeaders: false,
      })
    );
    testApp.get('/test', (_req, res) => res.json({ ok: true }));

    const res = await request(testApp).get('/test');
    expect(res.status).toBe(200);
    expect(res.headers).toHaveProperty('ratelimit-limit');
    expect(res.headers).toHaveProperty('ratelimit-remaining');
  });

  it('should block requests exceeding rate limit with 429 Too Many Requests', async () => {
    const testApp = express();
    testApp.use(
      rateLimit({
        windowMs: 60 * 1000,
        max: 2,
        standardHeaders: true,
        legacyHeaders: false,
        message: {
          success: false,
          code: 'TOO_MANY_REQUESTS',
          message: 'Rate limit exceeded.',
        },
      })
    );
    testApp.get('/limited', (_req, res) => res.json({ success: true }));

    // Request 1: OK
    const res1 = await request(testApp).get('/limited');
    expect(res1.status).toBe(200);

    // Request 2: OK
    const res2 = await request(testApp).get('/limited');
    expect(res2.status).toBe(200);

    // Request 3: 429 Rate limited!
    const res3 = await request(testApp).get('/limited');
    expect(res3.status).toBe(429);
    expect(res3.body.code).toBe('TOO_MANY_REQUESTS');
  });
});
