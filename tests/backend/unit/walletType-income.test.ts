import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { prisma } from '../../../src/lib/prisma';
import { createWalletSchema, updateWalletSchema } from '../../../src/modules/wallets/wallets.schema';
import { WalletsService } from '../../../src/modules/wallets/wallets.service';
import { WalletsRepository } from '../../../src/modules/wallets/wallets.repository';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { SyncRepository } from '../../../src/modules/sync/sync.repository';
import { RecurringRepository } from '../../../src/modules/recurring/recurring.repository';
import { BudgetsService } from '../../../src/modules/budgets/budgets.service';
import { BudgetsRepository } from '../../../src/modules/budgets/budgets.repository';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { ReportsRepository } from '../../../src/modules/reports/reports.repository';
import { AiFactsAggregator } from '../../../src/modules/ai/ai.aggregator';
import { AiService } from '../../../src/modules/ai/ai.service';
import { computeFinancialQueryResponse } from '../../../src/utils/aiService';
import { calculateHealthScore } from '../../../src/utils/healthScore';
import { generateFinancialInsights } from '../../../src/utils/insightsEngine';
import { AppState } from '../../../src/types';

const walletRow = (over: Record<string, unknown> = {}) => ({
  id: 'w1',
  name: 'VCB',
  balance: new Prisma.Decimal(100),
  currency: 'VND',
  isDefault: false,
  type: 'bank',
  userId: 'u1',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...over,
});

const emptyState: AppState = {
  expenses: [],
  goals: [],
  income: 0,
  budgetTemplate: 'none',
  categoryLimits: {},
  recurringExpenses: [],
  generatedRecurringMonths: [],
};

const INVITE = 'Bạn chưa nhập thu nhập tháng — vào Tổng quan để nhập, mình sẽ tính tỷ lệ tiết kiệm.';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Loại ví: zod', () => {
  it('create mặc định cash và nhận đủ 4 loại', () => {
    expect(createWalletSchema.parse({ name: 'A' }).type).toBe('cash');
    for (const type of ['cash', 'bank', 'credit', 'ewallet']) {
      expect(createWalletSchema.parse({ name: 'A', type }).type).toBe(type);
    }
    expect(createWalletSchema.safeParse({ name: 'A', type: 'gold' }).success).toBe(false);
  });

  it('update không chèn giá trị mặc định (không ghi đè type/balance)', () => {
    expect(updateWalletSchema.parse({ isDefault: true })).toEqual({ isDefault: true });
    expect(updateWalletSchema.parse({ type: 'credit' })).toEqual({ type: 'credit' });
    expect(updateWalletSchema.safeParse({ type: 'gold' }).success).toBe(false);
  });
});

describe('Loại ví: service và repository', () => {
  it('createWallet truyền type xuống repository và trả type', async () => {
    const spy = vi.spyOn(WalletsRepository, 'create').mockResolvedValue(walletRow({ type: 'credit' }) as any);
    const result = await WalletsService.createWallet('u1', { name: 'Visa', type: 'credit' });
    expect(spy.mock.calls[0][0]).toMatchObject({ type: 'credit' });
    expect(result.type).toBe('credit');
  });

  it('updateWallet truyền type; chỉ isDefault thì không đổi balance/type', async () => {
    vi.spyOn(WalletsRepository, 'findByIdAndUserId').mockResolvedValue(walletRow() as any);
    const update = vi.spyOn(WalletsRepository, 'update').mockResolvedValue(walletRow({ type: 'ewallet' }) as any);

    const result = await WalletsService.updateWallet('w1', 'u1', { type: 'ewallet' });
    expect(update.mock.calls[0].slice(0, 2)).toEqual(['w1', 'u1']);
    expect(update.mock.calls[0][2]).toEqual({ type: 'ewallet' });
    expect(result.type).toBe('ewallet');

    await WalletsService.updateWallet('w1', 'u1', { isDefault: true });
    expect(update.mock.calls[1].slice(0, 2)).toEqual(['w1', 'u1']);
    expect(update.mock.calls[1][2]).toEqual({ isDefault: true });
  });

  it('ví tự tạo đầu tiên là cash', async () => {
    vi.spyOn(WalletsRepository, 'findByUserId').mockResolvedValue([]);
    const spy = vi.spyOn(WalletsRepository, 'create').mockResolvedValue(walletRow({ type: 'cash' }) as any);
    await WalletsService.getWallets('u1');
    expect(spy.mock.calls[0][0]).toMatchObject({ type: 'cash', isDefault: true });
  });

  it.each([
    ['transactions', TransactionsRepository],
    ['sync', SyncRepository],
    ['recurring', RecurringRepository],
  ])('%s: findDefaultWallet ưu tiên ví mặc định; ví tự tạo là cash', async (_n, repo: any) => {
    const find = vi.fn().mockResolvedValue(null);
    const create = vi.fn().mockResolvedValue(walletRow());
    const originalFind = prisma.wallet.findFirst;
    const originalCreate = prisma.wallet.create;
    (prisma.wallet as any).findFirst = find;
    (prisma.wallet as any).create = create;
    try {
      await repo.findDefaultWallet('u1');
      await repo.createDefaultWallet('u1');
    } finally {
      (prisma.wallet as any).findFirst = originalFind;
      (prisma.wallet as any).create = originalCreate;
    }
    expect(find.mock.calls[0][0]).toEqual({
      where: { userId: 'u1' },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
    expect(create.mock.calls[0][0].data).toMatchObject({ type: 'cash', isDefault: true });
  });
});

describe('Thu nhập mặc định 0', () => {
  it('BudgetsService.getBudget khi chưa có budget tạo và trả income 0', async () => {
    let stored: any = null;
    vi.spyOn(BudgetsRepository, 'findByUserId').mockImplementation(async () => stored);
    const original = prisma.budget.create;
    const create = vi.fn().mockImplementation(async ({ data }: any) => {
      stored = { id: 'b1', budgetLimits: [], ...data };
      return stored;
    });
    (prisma.budget as any).create = create;
    try {
      const budget = await BudgetsService.getBudget('u1');
      expect(budget.income).toBe(0);
    } finally {
      (prisma.budget as any).create = original;
    }
    expect(Number(create.mock.calls[0][0].data.income)).toBe(0);
  });

  it('reports insights: chưa có thu nhập -> assessable false, không bịa 25 triệu', async () => {
    vi.spyOn(ReportsRepository, 'findUserBudget').mockResolvedValue(null as any);
    vi.spyOn(ReportsRepository, 'findPeriodTransactions').mockResolvedValue([] as any);
    vi.spyOn(ReportsRepository, 'findUserGoals').mockResolvedValue([] as any);
    vi.spyOn(ReportsRepository, 'findActiveRecurring').mockResolvedValue([] as any);
    const { healthScore, insights } = await ReportsService.getFinancialInsights('u1');
    expect((healthScore as any).assessable).toBe(false);
    expect(healthScore.savingsRatePercent).toBe(0);
    expect(insights.find((i) => i.id === 'ins-savings-good')).toBeUndefined();
  });

  it('calculateHealthScore income 0 -> assessable false, không NaN; income > 0 -> true', () => {
    const score = calculateHealthScore(emptyState);
    expect(score.assessable).toBe(false);
    expect(score.savingsRatePercent).toBe(0);
    expect(Number.isFinite(score.totalScore)).toBe(true);
    expect(calculateHealthScore({ ...emptyState, income: 1000 }).assessable).toBe(true);
  });

  it('insightsEngine mời nhập thu nhập khi income 0', () => {
    expect(generateFinancialInsights(emptyState).some((i) => i.id === 'ins-income-missing')).toBe(true);
    expect(
      generateFinancialInsights({ ...emptyState, income: 1000 }).some((i) => i.id === 'ins-income-missing')
    ).toBe(false);
  });

  const expenses = [{ id: 'e1', amount: 200000, categoryId: 'an_uong', note: 'x', date: '2026-11-10' }];
  const goals = [{ id: 'g1', name: 'Laptop', target: 1000000, current: 0, createdAt: '2026-11-01' }];

  it('estimatedMonthsNeeded: null khi chưa tính được, 0 chỉ khi đã đạt', () => {
    const done = { id: 'g2', name: 'Xong', target: 100, current: 100, createdAt: '2026-11-01' };
    const none = AiFactsAggregator.aggregate({ currentDate: '2026-11-15', expenses, goals: [...goals, done] });
    expect(none.goals.map((g) => g.estimatedMonthsNeeded)).toEqual([null, 0]);
    const some = AiFactsAggregator.aggregate({ currentDate: '2026-11-15', expenses, goals, income: 2000000 });
    expect(some.goals[0].estimatedMonthsNeeded).toBeGreaterThan(0);
  });

  it.each(['Dự báo dòng tiền cuối tháng', 'Tổng quan tài chính', 'Tôi có vượt ngân sách không'])(
    'AI server income 0: "%s" không NaN/Infinity, không tỷ lệ/tích lũy/hạn mức ngày',
    (question) => {
      const facts = AiFactsAggregator.aggregate({ currentDate: '2026-11-15', expenses, goals });
      expect(facts.income).toBe(0);
      expect(facts.savingsRatePct).toBe(0);
      expect(facts.goals[0].estimatedMonthsNeeded).toBeNull();
      const result = (AiService as any).generateDeterministicCopilotResponse(
        question,
        facts,
        expenses,
        '2026-11-15'
      );
      const text = JSON.stringify(result);
      expect(text).not.toMatch(/NaN|Infinity|∞/);
      expect(text).not.toMatch(/% thu nhập|% tích lũy|Tỷ lệ tiết kiệm|dưới \*\*0₫\/ngày/);
      if (!question.includes('ngân sách')) {
        expect(result.data.reply).toContain(INVITE);
      }
    }
  );

  it.each([
    'Tháng này tôi tiêu bao nhiêu?',
    'Bao lâu nữa đạt mục tiêu?',
    'Dự báo dòng tiền cuối tháng',
    'xin tổng quan',
  ])('AI client income 0: "%s" mời nhập thu nhập, không NaN/Infinity', (question) => {
    const reply = computeFinancialQueryResponse(question, {
      currentDate: '2026-11-15',
      expenses,
      goals,
      categoryLimits: {},
      income: 0,
    });
    expect(reply).not.toMatch(/NaN|Infinity|∞/);
    expect(reply).not.toMatch(/Tích lũy còn lại|tốc độ tích lũy|\/ngày\*\* để|an toàn là|Số dư/);
    expect(reply).toContain(INVITE);
  });

  it('AI client income > 0 dùng nhãn "còn lại so với thu nhập khai báo"', () => {
    const reply = computeFinancialQueryResponse('xin tổng quan', {
      currentDate: '2026-11-15',
      expenses,
      goals,
      categoryLimits: {},
      income: 1000000,
    });
    expect(reply.toLowerCase()).toContain('còn lại so với thu nhập khai báo');
    expect(reply).not.toContain('Số dư dự kiến');
  });
});
