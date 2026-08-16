import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server';
import { USER_A, generateTestToken, generateExpiredToken } from '../../helpers/authHelper';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import bcrypt from 'bcryptjs';

describe('Auth Tests: Security, Tokens & Verification', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Registration & Input Validation', () => {
    it('should reject registration with invalid email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'Password123!',
          name: 'Test User',
        });

      expect([400, 401]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration with short password (< 6 chars)', async () => {
      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'valid@test.com',
          password: '123',
          name: 'Test User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should reject registration when email already exists', async () => {
      vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        id: 'existing-user',
        email: 'user_a@test.com',
        name: 'Existing User',
        password: 'hashed-password',
        avatar: null,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          email: 'user_a@test.com',
          password: 'Password123!',
          name: 'User A',
        });

      expect([400, 409]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Login & Password Verification', () => {
    it('should reject login with wrong password', async () => {
      const hashedPassword = await bcrypt.hash('RealPassword123!', 10);

      vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
        id: 'u-1',
        email: 'user_a@test.com',
        name: 'User A',
        password: hashedPassword,
        avatar: null,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'user_a@test.com',
          password: 'WrongPassword999!',
        });

      expect([400, 401]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });
  });

  describe('Token Security & Middleware Access Control', () => {
    it('should reject request when token is expired', async () => {
      const expiredToken = generateExpiredToken(USER_A);

      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe('TOKEN_EXPIRED');
    });

    it('should reject request with tampered/invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', 'Bearer invalid.tampered.token');

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should clear cookies and respond 200 on logout', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
