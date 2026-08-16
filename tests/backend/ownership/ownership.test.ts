import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server';
import { USER_A, USER_B, generateTestToken } from '../../helpers/authHelper';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { Prisma } from '@prisma/client';

describe('Ownership & Multi-Tenant Data Isolation Tests', () => {
  const tokenUserA = generateTestToken(USER_A);
  const tokenUserB = generateTestToken(USER_B);

  const USER_B_TRANSACTION_ID = 'tx_user_b_99999999-9999-9999-9999-999999999999';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('CRITICAL: User A attempts to access User B transaction', () => {
    it('User A attempts GET /api/v1/transactions/{userBTransactionId} -> Expected 403 or 404 (strictly NO User B data leaked)', async () => {
      // Mock database returning User B transaction
      vi.spyOn(TransactionsRepository, 'findById').mockImplementation(async (id: string) => {
        if (id === USER_B_TRANSACTION_ID) {
          return {
            id: USER_B_TRANSACTION_ID,
            amount: new Prisma.Decimal(99000000), // Sensitive large amount of User B
            categoryId: 'bi-mat',
            category: { id: 'c-secret', name: 'Khoản Chi Bí Mật User B', icon: 'Lock', color: '#EF4444', type: 'EXPENSE' },
            type: 'EXPENSE',
            note: 'Dữ liệu cực kỳ nhạy cảm của User B',
            date: new Date('2026-08-15'),
            walletId: 'w-user-b',
            wallet: { id: 'w-user-b', name: 'Ví VIP User B', balance: new Prisma.Decimal(500000000), currency: 'VND' },
            userId: USER_B.id, // Owned by User B!
            createdAt: new Date(),
            updatedAt: new Date(),
          } as any;
        }
        return null;
      });

      // User A makes request with User A's token
      const res = await request(app)
        .get(`/api/v1/transactions/${USER_B_TRANSACTION_ID}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      // MUST be 403 Forbidden or 404 Not Found
      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);

      // STRICT CHECK: Ensure ZERO User B sensitive data leaked in response
      expect(JSON.stringify(res.body)).not.toContain('Dữ liệu cực kỳ nhạy cảm của User B');
      expect(JSON.stringify(res.body)).not.toContain('Khoản Chi Bí Mật User B');
      expect(JSON.stringify(res.body)).not.toContain('99000000');
      expect(JSON.stringify(res.body)).not.toContain('Ví VIP User B');
    });

    it('User B can successfully access their own transaction GET /api/v1/transactions/{userBTransactionId}', async () => {
      vi.spyOn(TransactionsRepository, 'findById').mockResolvedValue({
        id: USER_B_TRANSACTION_ID,
        amount: new Prisma.Decimal(99000000),
        categoryId: 'bi-mat',
        category: { id: 'c-secret', name: 'Khoản Chi Bí Mật User B', icon: 'Lock', color: '#EF4444', type: 'EXPENSE' },
        type: 'EXPENSE',
        note: 'Dữ liệu hợp lệ của User B',
        date: new Date('2026-08-15'),
        walletId: 'w-user-b',
        wallet: { id: 'w-user-b', name: 'Ví VIP User B', balance: new Prisma.Decimal(500000000), currency: 'VND' },
        userId: USER_B.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any);

      const res = await request(app)
        .get(`/api/v1/transactions/${USER_B_TRANSACTION_ID}`)
        .set('Authorization', `Bearer ${tokenUserB}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(USER_B_TRANSACTION_ID);
      expect(res.body.data.amount).toBe(99000000);
    });

    it('User A attempts PUT /api/v1/transactions/{userBTransactionId} -> Expected 403 or 404', async () => {
      vi.spyOn(TransactionsRepository, 'findByIdAndUserId').mockResolvedValue(null);

      const res = await request(app)
        .put(`/api/v1/transactions/${USER_B_TRANSACTION_ID}`)
        .set('Authorization', `Bearer ${tokenUserA}`)
        .send({
          amount: 1000,
          note: 'Hacked note',
        });

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('User A attempts DELETE /api/v1/transactions/{userBTransactionId} -> Expected 403 or 404', async () => {
      vi.spyOn(TransactionsRepository, 'findByIdAndUserId').mockResolvedValue(null);

      const res = await request(app)
        .delete(`/api/v1/transactions/${USER_B_TRANSACTION_ID}`)
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect([403, 404]).toContain(res.status);
      expect(res.body.success).toBe(false);
    });

    it('User A listing transactions GET /api/v1/transactions only queries where userId = userA', async () => {
      let capturedWhere: any = null;

      vi.spyOn(TransactionsRepository, 'findMany').mockImplementation(async (where: any) => {
        capturedWhere = where;
        return [];
      });
      vi.spyOn(TransactionsRepository, 'count').mockResolvedValue(0);

      await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${tokenUserA}`);

      expect(capturedWhere).toBeDefined();
      expect(capturedWhere.userId).toBe(USER_A.id);
      expect(capturedWhere.userId).not.toBe(USER_B.id);
    });
  });
});
