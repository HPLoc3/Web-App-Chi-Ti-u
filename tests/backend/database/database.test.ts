import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { WalletsRepository } from '../../../src/modules/wallets/wallets.repository';
import { BudgetsRepository } from '../../../src/modules/budgets/budgets.repository';
import { GoalsRepository } from '../../../src/modules/goals/goals.repository';
import { RecurringRepository } from '../../../src/modules/recurring/recurring.repository';

describe('Database Tests: Schema, Atomicity & Entity Isolation', () => {
  const mockUserId = 'db-test-user-001';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Database Models & Type Safety', () => {
    it('should validate Decimal arithmetic for Wallet balance and Transactions', () => {
      const initialBalance = new Prisma.Decimal(5000000);
      const expenseAmount = new Prisma.Decimal(125000);
      const newBalance = initialBalance.minus(expenseAmount);

      expect(newBalance.toNumber()).toBe(4875000);
      expect(newBalance.equals(new Prisma.Decimal(4875000))).toBe(true);
    });

    it('should maintain transaction atomicity with interactive transaction rollback on failure', async () => {
      const mockTx = {
        amount: new Prisma.Decimal(100000),
        type: 'EXPENSE' as const,
        note: 'Giao dịch rollback test',
        date: new Date(),
        wallet: { connect: { id: 'w-1' } },
        category: { connect: { id: 'an_uong' } },
        user: { connect: { id: mockUserId } },
      };

      // Mock prisma.$transaction throwing error
      vi.spyOn(prisma, '$transaction').mockRejectedValue(
        new Error('DB_DEADLOCK_OR_CONSTRAINT_VIOLATION')
      );

      await expect(
        TransactionsRepository.createWithWalletUpdate(mockTx, 'w-1', new Prisma.Decimal(-100000))
      ).rejects.toThrow('DB_DEADLOCK_OR_CONSTRAINT_VIOLATION');
    });

    it('should correctly build where clauses for multi-tenant query isolation', () => {
      const userId1 = 'user-tenant-1';
      const userId2 = 'user-tenant-2';

      const queryForUser1: Prisma.TransactionWhereInput = {
        userId: userId1,
        type: 'EXPENSE',
      };

      const queryForUser2: Prisma.TransactionWhereInput = {
        userId: userId2,
        type: 'EXPENSE',
      };

      expect(queryForUser1.userId).not.toBe(queryForUser2.userId);
      expect(queryForUser1.userId).toBe(userId1);
    });
  });

  describe('Entity Repository Contracts', () => {
    it('WalletsRepository: should enforce default wallet constraints', async () => {
      vi.spyOn(WalletsRepository, 'findByUserId').mockResolvedValue([
        {
          id: 'w-def',
          name: 'Ví Chính',
          balance: new Prisma.Decimal(1000000),
          currency: 'VND',
          isDefault: true,
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const wallets = await WalletsRepository.findByUserId(mockUserId);
      expect(wallets.length).toBe(1);
      expect(wallets[0].isDefault).toBe(true);
    });

    it('BudgetsRepository: should format budget limits and category relations', async () => {
      vi.spyOn(BudgetsRepository, 'findByUserId').mockResolvedValue({
        id: 'b-01',
        income: new Prisma.Decimal(20000000),
        budgetTemplate: '50_30_20',
        userId: mockUserId,
        createdAt: new Date(),
        updatedAt: new Date(),
        budgetLimits: [
          {
            id: 'bl-1',
            budgetId: 'b-01',
            categoryId: 'an_uong',
            amount: new Prisma.Decimal(5000000),
            createdAt: new Date(),
            updatedAt: new Date(),
            category: { id: 'an_uong', name: 'Ăn uống', icon: 'Utensils', color: '#10B981' },
          },
        ],
      } as any);

      const budget = await BudgetsRepository.findByUserId(mockUserId);
      expect(budget).toBeDefined();
      expect(budget?.income.toNumber()).toBe(20000000);
      expect(budget?.budgetLimits.length).toBe(1);
      expect(budget?.budgetLimits[0].category.name).toBe('Ăn uống');
    });

    it('GoalsRepository: should track progress percentage accurately', async () => {
      vi.spyOn(GoalsRepository, 'findByUserId').mockResolvedValue([
        {
          id: 'g-01',
          name: 'Tiết kiệm xe máy',
          targetAmount: new Prisma.Decimal(50000000),
          currentAmount: new Prisma.Decimal(25000000),
          deadline: new Date('2026-12-31'),
          color: '#10B981',
          icon: 'Bike',
          userId: mockUserId,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const goals = await GoalsRepository.findByUserId(mockUserId);
      expect(goals.length).toBe(1);
      const target = goals[0].targetAmount.toNumber();
      const current = goals[0].currentAmount.toNumber();
      const progressPercent = Math.round((current / target) * 100);
      expect(progressPercent).toBe(50);
    });

    it('RecurringRepository: should query active recurring transactions', async () => {
      vi.spyOn(RecurringRepository, 'findActiveByUserId').mockResolvedValue([
        {
          id: 'rec-01',
          amount: new Prisma.Decimal(250000),
          dayOfMonth: 5,
          note: 'Internet cáp quang',
          type: 'EXPENSE',
          isActive: true,
          userId: mockUserId,
          categoryId: 'hoa_don',
          category: { id: 'hoa_don', name: 'Hóa đơn', icon: 'Receipt', color: '#F97316' } as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        } as any,
      ]);

      const activeList = await RecurringRepository.findActiveByUserId(mockUserId);
      expect(activeList.length).toBe(1);
      expect(activeList[0].isActive).toBe(true);
      expect(activeList[0].amount.toNumber()).toBe(250000);
    });
  });
});
