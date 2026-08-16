import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../../server';
import { USER_A, generateTestToken } from '../../helpers/authHelper';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { WalletsRepository } from '../../../src/modules/wallets/wallets.repository';
import { BudgetsRepository } from '../../../src/modules/budgets/budgets.repository';
import { GoalsRepository } from '../../../src/modules/goals/goals.repository';
import { Prisma } from '@prisma/client';

describe('Integration Tests: API Endpoints', () => {
  const token = generateTestToken(USER_A);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/health', () => {
    it('should return 200 with status ok', async () => {
      const res = await request(app).get('/api/health');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('status', 'ok');
      expect(res.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return 401 when token is missing', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return user info when valid token is provided', async () => {
      vi.spyOn(AuthRepository, 'findUserById').mockResolvedValue({
        id: USER_A.id,
        email: USER_A.email,
        name: USER_A.name,
        password: 'hashed-password',
        avatar: null,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(USER_A.id);
      expect(res.body.data.email).toBe(USER_A.email);
    });
  });

  describe('Transactions API: /api/v1/transactions', () => {
    it('should fetch user transactions with pagination', async () => {
      vi.spyOn(TransactionsRepository, 'findMany').mockResolvedValue([
        {
          id: 'tx-1',
          amount: new Prisma.Decimal(50000),
          categoryId: 'an-uong',
          category: { id: 'c1', name: 'Ăn uống', icon: 'Utensils', color: '#10B981', type: 'EXPENSE' },
          type: 'EXPENSE',
          note: 'Phở bò',
          date: new Date('2026-08-15'),
          walletId: 'w1',
          wallet: { id: 'w1', name: 'Ví Tiền Mặt', balance: new Prisma.Decimal(1000000), currency: 'VND' },
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);
      vi.spyOn(TransactionsRepository, 'count').mockResolvedValue(1);

      const res = await request(app)
        .get('/api/v1/transactions')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data[0].note).toBe('Phở bò');
      expect(res.body.meta.total).toBe(1);
    });

    it('should create a new transaction', async () => {
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
          amount: new Prisma.Decimal(35000),
          categoryId: 'an-uong',
          category: { id: 'c1', name: 'Ăn uống', icon: 'Utensils', color: '#10B981', type: 'EXPENSE' },
          type: 'EXPENSE',
          note: 'Bánh mì',
          date: new Date('2026-08-15'),
          walletId: 'w-default',
          wallet: { id: 'w-default', name: 'Ví Chính', balance: new Prisma.Decimal(4965000), currency: 'VND' },
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
        wallet: {
          id: 'w-default',
          name: 'Ví Chính',
          balance: new Prisma.Decimal(4965000),
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
          amount: 35000,
          categoryId: 'an-uong',
          note: 'Bánh mì',
          date: '2026-08-15',
          type: 'EXPENSE',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.amount).toBe(35000);
      expect(res.body.data.note).toBe('Bánh mì');
    });
  });

  describe('Wallets API: /api/v1/wallets', () => {
    it('should list wallets for the authenticated user', async () => {
      vi.spyOn(WalletsRepository, 'findByUserId').mockResolvedValue([
        {
          id: 'w-1',
          name: 'Ví Tiền Mặt',
          balance: new Prisma.Decimal(2000000),
          currency: 'VND',
          isDefault: true,
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/wallets')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('Ví Tiền Mặt');
    });
  });

  describe('Budgets API: /api/v1/budgets', () => {
    it('should return budget items for user', async () => {
      vi.spyOn(BudgetsRepository, 'findByUserId').mockResolvedValue({
        id: 'b-1',
        income: new Prisma.Decimal(25000000),
        budgetTemplate: '50_30_20',
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetLimits: [
          {
            id: 'bl-1',
            budgetId: 'b-1',
            categoryId: 'an-uong',
            amount: new Prisma.Decimal(3000000),
            createdAt: new Date(),
            updatedAt: new Date(),
            category: { id: 'c1', name: 'Ăn uống', icon: 'Utensils', color: '#10B981' },
          },
        ],
      } as any);

      const res = await request(app)
        .get('/api/v1/budgets')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('Goals API: /api/v1/goals', () => {
    it('should return goals list for user', async () => {
      vi.spyOn(GoalsRepository, 'findByUserId').mockResolvedValue([
        {
          id: 'g-1',
          name: 'Mua Laptop',
          targetAmount: new Prisma.Decimal(25000000),
          currentAmount: new Prisma.Decimal(10000000),
          deadline: new Date('2026-12-31'),
          color: '#3B82F6',
          icon: 'Laptop',
          userId: USER_A.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const res = await request(app)
        .get('/api/v1/goals')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data[0].name).toBe('Mua Laptop');
    });
  });
});
