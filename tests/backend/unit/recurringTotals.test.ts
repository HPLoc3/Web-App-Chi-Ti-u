import { describe, it, expect, vi, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';
import { calculateHealthScore } from '../../../src/utils/healthScore';
import { generateFinancialInsights } from '../../../src/utils/insightsEngine';
import { AiFactsAggregator } from '../../../src/modules/ai/ai.aggregator';
import { ReportsService } from '../../../src/modules/reports/reports.service';
import { ReportsRepository } from '../../../src/modules/reports/reports.repository';
import type { AppState, RecurringExpense } from '../../../src/types';

afterEach(() => {
  vi.restoreAllMocks();
});

const rec = (id: string, amount: number, frequency: RecurringExpense['frequency'], isActive = true): RecurringExpense => ({
  id, amount, frequency, isActive, categoryId: 'hoa_don', dayOfMonth: 28, note: id,
});
// Quy đổi tháng: 1.200.000/tuần = 5.200.000; 12.000.000/năm = 1.000.000; khoản tạm dừng bỏ qua
const items = [rec('w', 1_200_000, 'weekly'), rec('y', 12_000_000, 'yearly'), rec('off', 50_000_000, 'monthly', false)];
const MONTHLY = 6_200_000;
const INCOME = 20_000_000;
const state: AppState = {
  expenses: [], goals: [], income: INCOME, categoryLimits: {}, budgetTemplate: 'none',
  generatedRecurringMonths: [], recurringExpenses: items,
};

describe('Tổng chi định kỳ quy đổi theo tháng và bỏ khoản tạm dừng', () => {
  it('healthScore', () => {
    expect(calculateHealthScore(state)).toMatchObject({ recurringIncomeRatioPercent: 31, recurringRatioScore: 7 });
  });

  it('insightsEngine: số tiền và số khoản đang kích hoạt', () => {
    const insight = generateFinancialInsights(state).find((i) => i.id === 'ins-recurring-high')!;
    expect(insight.message).toContain('31%');
    expect(insight.metricValue!.replace(/\D/g, '')).toBe(String(MONTHLY));
    expect(insight.observation).toContain('Bạn có 2 khoản chi định kỳ');
  });

  it('reports.service (kể cả khi repository trả cả khoản tạm dừng)', async () => {
    vi.spyOn(ReportsRepository, 'findUserBudget').mockResolvedValue(
      { income: new Prisma.Decimal(INCOME), budgetLimits: [] } as any
    );
    vi.spyOn(ReportsRepository, 'findPeriodTransactions').mockResolvedValue([]);
    vi.spyOn(ReportsRepository, 'findUserGoals').mockResolvedValue([]);
    vi.spyOn(ReportsRepository, 'findActiveRecurring').mockResolvedValue(
      items.map((i) => ({ ...i, amount: new Prisma.Decimal(i.amount) })) as any
    );
    const result = await ReportsService.getFinancialInsights('u1');
    expect(result.healthScore).toMatchObject({ recurringIncomeRatioPercent: 31, recurringRatioScore: 7 });
  });

  it('ai.aggregator', () => {
    const facts = AiFactsAggregator.aggregate({ currentDate: '2026-11-26', recurringExpenses: items });
    expect(facts.upcomingRecurringTotal).toBe(MONTHLY);
    expect(facts.upcomingRecurringList.map((r) => r.name)).toEqual(['w', 'y']);
  });
});
