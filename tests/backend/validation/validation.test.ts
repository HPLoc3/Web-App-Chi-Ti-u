import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server';
import { USER_A, generateTestToken } from '../../helpers/authHelper';
import { createTransactionSchema } from '../../../src/modules/transactions/transactions.schema';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { Prisma } from '@prisma/client';

describe('Validation Tests: Zod Schemas & Input Sanitization', () => {
  const token = generateTestToken(USER_A);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createTransactionSchema Zod validation', () => {
    it('should validate correct transaction input', () => {
      const validData = {
        amount: 50000,
        categoryId: 'an-uong',
        type: 'EXPENSE',
        note: 'Ăn trưa',
        date: '2026-08-15',
      };
      const result = createTransactionSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject non-positive amount (amount <= 0)', () => {
      const zeroAmount = {
        amount: 0,
        categoryId: 'an-uong',
        type: 'EXPENSE',
      };
      const negAmount = {
        amount: -50000,
        categoryId: 'an-uong',
        type: 'EXPENSE',
      };

      expect(createTransactionSchema.safeParse(zeroAmount).success).toBe(false);
      expect(createTransactionSchema.safeParse(negAmount).success).toBe(false);
    });

    it('should reject invalid transaction type', () => {
      const invalidType = {
        amount: 50000,
        categoryId: 'an-uong',
        type: 'UNKNOWN_TYPE',
      };
      expect(createTransactionSchema.safeParse(invalidType).success).toBe(false);
    });
  });

  describe('API Request Validation Middleware', () => {
    it('should return 400 when creating transaction with invalid amount', async () => {
      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: -1000,
          categoryId: 'an-uong',
          type: 'EXPENSE',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should sanitize prototype pollution payloads safely', async () => {
      vi.spyOn(TransactionsRepository, 'findDefaultWallet').mockResolvedValue({
        id: 'w-default',
        name: 'Ví Chính',
        balance: new Prisma.Decimal(5000000),
        currency: 'VND',
        isDefault: true,
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      vi.spyOn(TransactionsRepository, 'createWithWalletUpdate').mockResolvedValue({
        transaction: {
          id: 'tx-new',
          amount: new Prisma.Decimal(50000),
          categoryId: 'an-uong',
          category: { id: 'c1', name: 'Ăn uống', icon: 'Utensils', color: '#10B981', type: 'EXPENSE' },
          type: 'EXPENSE',
          note: 'An toàn',
          date: new Date('2026-08-15'),
          walletId: 'w-default',
          wallet: { id: 'w-default', name: 'Ví Chính', balance: new Prisma.Decimal(4950000), currency: 'VND' },
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        wallet: {
          id: 'w-default',
          name: 'Ví Chính',
          balance: new Prisma.Decimal(4950000),
          currency: 'VND',
          isDefault: true,
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      const res = await request(app)
        .post('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`)
        .send({
          amount: 50000,
          categoryId: 'an-uong',
          note: 'An toàn',
          __proto__: { isAdmin: true },
          constructor: { prototype: { hacked: true } },
        });

      // The server should not crash with 500, and prototype should not be polluted
      expect(res.status).toBe(201);
      expect(({} as any).isAdmin).toBeUndefined();
      expect(({} as any).hacked).toBeUndefined();
    });
  });
});
