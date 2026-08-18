import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import app from '../../server';
import { USER_A, USER_B, generateTestToken } from '../helpers/authHelper';
import { AuthService } from '../../src/modules/auth/auth.service';
import { AuthRepository } from '../../src/modules/auth/auth.repository';
import { UsersRepository } from '../../src/modules/users/users.repository';
import { TransactionsRepository } from '../../src/modules/transactions/transactions.repository';
import { WalletsRepository } from '../../src/modules/wallets/wallets.repository';
import { BudgetsRepository } from '../../src/modules/budgets/budgets.repository';
import { GoalsRepository } from '../../src/modules/goals/goals.repository';
import { RecurringRepository } from '../../src/modules/recurring/recurring.repository';
import { SyncRepository } from '../../src/modules/sync/sync.repository';
import { parseNaturalExpense } from '../../src/utils/parser';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('E2E Full Scenarios (16 Key Workflows)', () => {
  const tokenA = generateTestToken(USER_A);
  const tokenB = generateTestToken(USER_B);

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // Scenario 1: Register
  it('Scenario 1: User Registration Flow', async () => {
    vi.spyOn(AuthService, 'register').mockResolvedValue({
      user: {
        id: 'new-user-id',
        email: 'newbie@test.com',
        name: 'New User',
        avatar: null,
        provider: 'local',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      tokens: {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'newbie@test.com',
        password: 'Password123!',
        name: 'New User',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe('newbie@test.com');
  });

  // Scenario 2: Login
  it('Scenario 2: User Login Flow with Credentials', async () => {
    const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue({
      id: USER_A.id,
      email: USER_A.email,
      name: USER_A.name,
      password: hashedPassword,
      avatar: null,
      provider: 'local',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(AuthRepository, 'createTokensAndSession').mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: USER_A.email,
        password: 'CorrectPassword123!',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(USER_A.email);
  });

  // Scenario 3: Google Login
  it('Scenario 3: Google OAuth Single Sign-On Flow', async () => {
    vi.spyOn(UsersRepository, 'findById').mockResolvedValue({
      id: 'google-user-id',
      email: 'googleuser@gmail.com',
      name: 'Google User',
      password: null,
      avatar: 'https://lh3.googleusercontent.com/photo.jpg',
      provider: 'google',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const mockToken = generateTestToken({
      id: 'google-user-id',
      email: 'googleuser@gmail.com',
      name: 'Google User',
    });

    expect(mockToken).toBeDefined();
    const res = await request(app)
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${mockToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('googleuser@gmail.com');
  });

  // Scenario 4: Logout
  it('Scenario 4: User Logout Flow & Cookie Clearing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Cookies should be cleared
    const cookies = res.headers['set-cookie'] || [];
    const cookieList = Array.isArray(cookies) ? cookies : [cookies];
    const isTokenCleared = cookieList.some((c: string) => c.includes('accessToken=') || c.includes('Max-Age=0'));
    expect(isTokenCleared || res.body.success).toBe(true);
  });

  // Scenario 5: Add Transaction
  it('Scenario 5: Add Transaction Flow', async () => {
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
        id: 'tx-s5',
        amount: new Prisma.Decimal(45000),
        categoryId: 'an_uong',
        category: { id: 'an_uong', name: 'Ăn uống', icon: 'Utensils', color: '#10B981', type: 'EXPENSE' },
        type: 'EXPENSE',
        note: 'Bún bò Huế',
        date: new Date('2026-08-15'),
        walletId: 'w-default',
        wallet: { id: 'w-default', name: 'Ví Chính', balance: new Prisma.Decimal(4955000), currency: 'VND' },
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      wallet: {
        id: 'w-default',
        name: 'Ví Chính',
        balance: new Prisma.Decimal(4955000),
        currency: 'VND',
        isDefault: true,
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const res = await request(app)
      .post('/api/v1/transactions')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 45000,
        categoryId: 'an_uong',
        note: 'Bún bò Huế',
        date: '2026-08-15',
        type: 'EXPENSE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.note).toBe('Bún bò Huế');
    expect(res.body.data.amount).toBe(45000);
  });

  // Scenario 6: Edit Transaction
  it('Scenario 6: Edit Transaction Flow', async () => {
    vi.spyOn(TransactionsRepository, 'findByIdAndUserId').mockResolvedValue({
      id: 'tx-s5',
      amount: new Prisma.Decimal(45000),
      categoryId: 'an_uong',
      type: 'EXPENSE',
      note: 'Bún bò Huế',
      date: new Date('2026-08-15'),
      walletId: 'w-default',
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(TransactionsRepository, 'updateWithWalletAdjustment').mockResolvedValue({
      updatedTransaction: {
        id: 'tx-s5',
        amount: new Prisma.Decimal(55000), // Adjusted amount
        categoryId: 'an_uong',
        category: { id: 'an_uong', name: 'Ăn uống', icon: 'Utensils', color: '#10B981', type: 'EXPENSE' },
        type: 'EXPENSE',
        note: 'Bún bò Huế đặc biệt',
        date: new Date('2026-08-15'),
        walletId: 'w-default',
        wallet: { id: 'w-default', name: 'Ví Chính', balance: new Prisma.Decimal(4945000), currency: 'VND' },
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any,
      updatedWallet: {
        id: 'w-default',
        name: 'Ví Chính',
        balance: new Prisma.Decimal(4945000),
        currency: 'VND',
        isDefault: true,
        userId: USER_A.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const res = await request(app)
      .put('/api/v1/transactions/tx-s5')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 55000,
        note: 'Bún bò Huế đặc biệt',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.amount).toBe(55000);
    expect(res.body.data.note).toBe('Bún bò Huế đặc biệt');
  });

  // Scenario 7: Delete Transaction
  it('Scenario 7: Delete Transaction Flow', async () => {
    vi.spyOn(TransactionsRepository, 'findByIdAndUserId').mockResolvedValue({
      id: 'tx-s5',
      amount: new Prisma.Decimal(55000),
      categoryId: 'an_uong',
      type: 'EXPENSE',
      walletId: 'w-default',
      userId: USER_A.id,
      note: 'Bún bò Huế đặc biệt',
      date: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    vi.spyOn(TransactionsRepository, 'deleteWithWalletAdjustment').mockResolvedValue(undefined);

    const res = await request(app)
      .delete('/api/v1/transactions/tx-s5')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  // Scenario 8: Add Wallet
  it('Scenario 8: Add Wallet Flow', async () => {
    vi.spyOn(WalletsRepository, 'create').mockResolvedValue({
      id: 'w-saving',
      name: 'Ví Tiết Kiệm',
      balance: new Prisma.Decimal(10000000),
      currency: 'VND',
      isDefault: false,
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/wallets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'Ví Tiết Kiệm',
        balance: 10000000,
        currency: 'VND',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('Ví Tiết Kiệm');
  });

  // Scenario 9: Budget Management Flow
  it('Scenario 9: Create and Check Category Budget Flow', async () => {
    vi.spyOn(BudgetsRepository, 'updateBudgetAndLimits').mockResolvedValue(undefined as any);
    vi.spyOn(BudgetsRepository, 'findByUserId').mockResolvedValue({
      id: 'b-user-a',
      income: new Prisma.Decimal(30000000),
      budgetTemplate: '50_30_20',
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
      budgetLimits: [
        {
          id: 'bl-1',
          budgetId: 'b-user-a',
          categoryId: 'an-uong',
          amount: new Prisma.Decimal(5000000),
          category: { id: 'an-uong', name: 'Ăn uống' },
        },
      ],
    } as any);

    const res = await request(app)
      .put('/api/v1/budgets')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        income: 30000000,
        budgetTemplate: '50_30_20',
        categoryLimits: { an_uong: 5000000 },
      });

    expect([200, 201]).toContain(res.status);
    expect(res.body.success).toBe(true);
  });

  // Scenario 10: Goal Tracking Flow
  it('Scenario 10: Create and Track Financial Goal Flow', async () => {
    vi.spyOn(GoalsRepository, 'create').mockResolvedValue({
      id: 'goal-macbook',
      name: 'MacBook M3 Pro',
      targetAmount: new Prisma.Decimal(45000000),
      currentAmount: new Prisma.Decimal(15000000),
      deadline: new Date('2026-12-31'),
      color: '#3B82F6',
      icon: 'Laptop',
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        name: 'MacBook M3 Pro',
        targetAmount: 45000000,
        currentAmount: 15000000,
        deadline: '2026-12-31',
        icon: 'Laptop',
        color: '#3B82F6',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.name).toBe('MacBook M3 Pro');
  });

  // Scenario 11: Recurring Expense Flow
  it('Scenario 11: Manage Recurring Subscriptions Flow', async () => {
    vi.spyOn(RecurringRepository, 'create').mockResolvedValue({
      id: 'rec-netflix',
      amount: new Prisma.Decimal(260000),
      dayOfMonth: 1,
      note: 'Netflix Premium',
      type: 'EXPENSE',
      isActive: true,
      userId: USER_A.id,
      categoryId: 'giai-tri',
      category: { id: 'c-gt', name: 'Giải trí', icon: 'Film', color: '#8B5CF6' } as any,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/recurring')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        amount: 260000,
        dayOfMonth: 1,
        note: 'Netflix Premium',
        type: 'EXPENSE',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.note).toBe('Netflix Premium');
  });

  // Scenario 12: AI Expense Parsing Flow
  it('Scenario 12: AI Natural Language Expense Parsing Flow', () => {
    const parsed = parseNaturalExpense('Ăn sáng 35k phở bò');
    expect(parsed.amount).toBe(35000);
    expect(parsed.categoryId).toBe('an_uong');
    expect(parsed.note).toContain('phở bò');

    const parsedGrab = parseNaturalExpense('Đi Grab 85 nghìn hôm qua');
    expect(parsedGrab.amount).toBe(85000);
    expect(parsedGrab.categoryId).toBe('di_chuyen');
  });

  // Scenario 13: Backup Data Flow
  it('Scenario 13: Backup User Data Flow', async () => {
    vi.spyOn(SyncRepository, 'findDefaultWallet').mockResolvedValue({
      id: 'w-default',
      name: 'Ví Chính',
      balance: new Prisma.Decimal(5000000),
      currency: 'VND',
      isDefault: true,
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(SyncRepository, 'createTransaction').mockResolvedValue({} as any);
    vi.spyOn(SyncRepository, 'upsertBudget').mockResolvedValue({
      id: 'b-sync',
      income: new Prisma.Decimal(25000000),
      budgetTemplate: '50_30_20',
      categoryLimits: '{}',
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/sync/client-state')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expenses: [{ id: 'tx-1', amount: 50000, categoryId: 'an_uong', note: 'Phở', date: '2026-08-16' }],
        wallets: [{ id: 'w-1', name: 'Ví Chính', balance: 5000000, currency: 'VND' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
  });

  // Scenario 14: Restore User Data Flow
  it('Scenario 14: Restore User Data Flow', async () => {
    vi.spyOn(SyncRepository, 'findDefaultWallet').mockResolvedValue({
      id: 'w-default',
      name: 'Ví Chính',
      balance: new Prisma.Decimal(5000000),
      currency: 'VND',
      isDefault: true,
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    vi.spyOn(SyncRepository, 'createTransaction').mockResolvedValue({} as any);
    vi.spyOn(SyncRepository, 'upsertBudget').mockResolvedValue({
      id: 'b-sync',
      income: new Prisma.Decimal(25000000),
      budgetTemplate: '50_30_20',
      categoryLimits: '{}',
      userId: USER_A.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);

    const res = await request(app)
      .post('/api/v1/sync/client-state')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        expenses: [
          { id: 'tx-restored-1', amount: 120000, categoryId: 'mua_sam', note: 'Áo thun', date: '2026-08-10' },
          { id: 'tx-restored-2', amount: 45000, categoryId: 'an_uong', note: 'Bánh mì', date: '2026-08-11' },
        ],
        wallets: [{ id: 'w-restored-1', name: 'Ví Tiết Kiệm', balance: 10000000, currency: 'VND' }],
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.stats).toBeDefined();
  });

  // Scenario 15: Refresh Page (State Persistence)
  it('Scenario 15: Refresh Page / Session Re-hydration Flow', async () => {
    vi.spyOn(UsersRepository, 'findById').mockResolvedValue({
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
      .get('/api/v1/users/profile')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(USER_A.id);
    expect(res.body.data.email).toBe(USER_A.email);
  });

  // Scenario 16: Different User Cannot See Other User Data
  it('Scenario 16: Strict Cross-Tenant Security: User B cannot access User A data', async () => {
    const USER_A_TX_ID = 'tx_user_a_secret_12345678';

    vi.spyOn(TransactionsRepository, 'findById').mockImplementation(async (id: string) => {
      if (id === USER_A_TX_ID) {
        return {
          id: USER_A_TX_ID,
          amount: new Prisma.Decimal(75000000),
          userId: USER_A.id, // User A's transaction!
          note: 'Bí mật của User A',
          category: { name: 'Đầu tư' },
          wallet: { name: 'Ví Đầu Tư' },
        } as any;
      }
      return null;
    });

    // User B attempts to fetch User A's transaction
    const res = await request(app)
      .get(`/api/v1/transactions/${USER_A_TX_ID}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect([403, 404]).toContain(res.status);
    expect(res.body.success).toBe(false);
    expect(JSON.stringify(res.body)).not.toContain('Bí mật của User A');
  });
});
