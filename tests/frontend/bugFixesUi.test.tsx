import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within, fireEvent } from '@testing-library/react';
import { formatPercent, maskMoneyInText } from '../../src/utils/format';
import { ToastProvider } from '../../src/context/ToastContext';
import BudgetTab from '../../src/features/budgets/components/BudgetTab';
import { ReportsTab } from '../../src/features/reports/components/ReportsTab';
import { OverviewTab } from '../../src/features/dashboard/components/OverviewTab';
import { GoalsSummarySection } from '../../src/features/dashboard/components/GoalsSummarySection';
import { AppState } from '../../src/types';

describe('formatPercent', () => {
  it('shows <min% for tiny positive non-zero values below 10^-digits when digits is 0 or 1', () => {
    expect(formatPercent(0.02)).toBe('<0,1%');
    expect(formatPercent(0.09)).toBe('<0,1%');
    expect(formatPercent(0.05, 0)).toBe('<1%');
    expect(formatPercent(0.3, 0)).toBe('<1%');
  });

  it('keeps zero as zero and preserves normal and negative formatting', () => {
    expect(formatPercent(0)).toBe('0,0%');
    expect(formatPercent(0, 0)).toBe('0%');
    expect(formatPercent(0.1)).toBe('0,1%');
    expect(formatPercent(1, 0)).toBe('1%');
    expect(formatPercent(56.5)).toBe('56,5%');
    expect(formatPercent(400, 0)).toBe('400%');
    expect(formatPercent(1200, 0)).toBe('1.200%');
    expect(formatPercent(-25, 0)).toBe('-25%');
    expect(formatPercent(0.05, 2)).toBe('0,05%');
  });
});

describe('UI bug fixes', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-15T05:00:00Z'));
    localStorage.clear();
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  it('BudgetTab displays real usage percentage (e.g. 400%) while capping progress bar at 100%', () => {
    const { container } = render(
      <ToastProvider>
        <BudgetTab
          income={10_000_000}
          expenses={[
            { id: 'e1', amount: 400_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
          ]}
          categoryLimits={{ an_uong: 100_000 }}
        />
      </ToastProvider>
    );

    expect(screen.getByText('400% đã dùng')).toBeInTheDocument();
    expect(screen.queryByText('100% đã dùng')).not.toBeInTheDocument();

    const redBar = container.querySelector('.bg-red-700') as HTMLElement | null;
    expect(redBar).not.toBeNull();
    expect(redBar?.style.width).toBe('100%');
  });

  it('ReportsTab Overview in deficit advises pausing non-essential spending without advising increasing savings or falsely mentioning over-limit categories', () => {
    const baseState: AppState = {
      income: 5_000_000,
      budgetTemplate: 'none',
      categoryLimits: {},
      goals: [],
      recurringExpenses: [],
      generatedRecurringMonths: [],
      expenses: [
        { id: 'e1', amount: 6_000_000, categoryId: 'an_uong', note: 'Chi tiêu', date: '2026-05-10' },
      ],
    };

    const { rerender } = render(<ReportsTab state={baseState} />);

    expect(screen.getByText(/tạm dừng các khoản chi không thiết yếu/i)).toBeInTheDocument();
    expect(screen.queryByText(/tăng tỷ lệ tích lũy/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/vượt hạn mức/i)).not.toBeInTheDocument();

    rerender(
      <ReportsTab
        state={{
          ...baseState,
          categoryLimits: { an_uong: 2_000_000 },
        }}
      />
    );

    expect(screen.getByText(/tạm dừng các khoản chi không thiết yếu/i)).toBeInTheDocument();
    expect(screen.getByText(/vượt hạn mức/i)).toBeInTheDocument();
    expect(screen.queryByText(/tăng tỷ lệ tích lũy/i)).not.toBeInTheDocument();

    rerender(
      <ReportsTab
        state={{
          ...baseState,
          income: 10_000_000,
          expenses: [
            { id: 'e2', amount: 10_002_000, categoryId: 'an_uong', note: 'Vượt nhẹ', date: '2026-05-10' },
          ],
        }}
      />
    );

    expect(screen.getByText('Thâm hụt (vượt <0,1%)')).toBeInTheDocument();
    expect(screen.queryByText(/dưới 0,1%/)).not.toBeInTheDocument();
  });

  it('OverviewTab masks daily average, percent-of-income badge, and insight deficit amounts when so_tay_show_balance is false', () => {
    localStorage.setItem('so_tay_show_balance', 'false');

    render(
      <ToastProvider>
        <OverviewTab
          income={5_000_000}
          expenses={[
            { id: 'e1', amount: 7_500_000, categoryId: 'an_uong', note: 'Chi quá tay', date: '2026-05-10' },
          ]}
          goals={[]}
          categoryLimits={{}}
          recurringExpenses={[]}
          onUpdateIncome={vi.fn()}
          onAddGoal={vi.fn()}
          onUpdateGoalProgress={vi.fn()}
          onDeleteGoal={vi.fn()}
        />
      </ToastProvider>
    );

    const dailyAvgLine = screen.getByText(
      (_, el) => el?.tagName === 'DIV' && /^TB:\s*.*\/ngày$/.test(el.textContent?.trim() || '')
    );
    expect(dailyAvgLine).toHaveTextContent(/^TB:\s*•••••• ₫\/ngày$/);
    expect(within(dailyAvgLine).queryByText(/500\.000₫/)).not.toBeInTheDocument();

    expect(screen.getByText('••% thu nhập')).toBeInTheDocument();
    expect(screen.queryByText(/150,0% thu nhập/)).not.toBeInTheDocument();

    const insightCard = screen.getByText('Báo động thâm hụt ngân sách tháng').closest('div.rounded-xl') as HTMLElement | null;
    expect(insightCard).not.toBeNull();
    expect(within(insightCard!).getByText(/Đã vượt •••••• ₫/)).toBeInTheDocument();
    expect(within(insightCard!).getByText(/thâm hụt •••••• ₫ so với thu nhập/i)).toBeInTheDocument();
    expect(within(insightCard!).getByText(/vượt thu nhập •••••• ₫/i)).toBeInTheDocument();
    expect(within(insightCard!).queryByText(/\d[\d.]*₫/)).not.toBeInTheDocument();
  });

  it('OverviewTab masks every money figure across all cards when hide balance is on and shows them when toggled off', () => {
    localStorage.setItem('so_tay_show_balance', 'false');

    const getTextWithoutQuickDeposits = (root: HTMLElement): string => {
      const clone = root.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('button').forEach((btn) => {
        if (/^\+(200k|500k|1Tr)$/.test(btn.textContent?.trim() || '')) {
          btn.remove();
        }
      });
      return clone.textContent || '';
    };

    const { container } = render(
      <ToastProvider>
        <OverviewTab
          income={10_000_000}
          expenses={[
            { id: 'e1', amount: 3_000_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
          ]}
          categoryLimits={{ an_uong: 2_000_000 }}
          goals={[
            { id: 'g1', name: 'Quỹ dự phòng', target: 20_000_000, current: 5_000_000, createdAt: '2026-05-01' },
          ]}
          recurringExpenses={[
            {
              id: 'r1',
              amount: 1_500_000,
              categoryId: 'hoa_don',
              dayOfMonth: 20,
              note: 'Tiền nhà',
              frequency: 'monthly',
              isActive: true,
            },
          ]}
          onUpdateIncome={vi.fn()}
          onAddGoal={vi.fn()}
          onUpdateGoalProgress={vi.fn()}
          onDeleteGoal={vi.fn()}
        />
      </ToastProvider>
    );

    // Ba nút nạp nhanh giữ nguyên nhãn hành động cố định ngay cả khi ẩn số dư
    expect(screen.getByText('+200k')).toBeInTheDocument();
    expect(screen.getByText('+500k')).toBeInTheDocument();
    expect(screen.getByText('+1Tr')).toBeInTheDocument();

    const assertNoMaskedMoneyLeaks = () => {
      const text = getTextWithoutQuickDeposits(container);
      expect(text).not.toMatch(/\d[\d.,]*\s*₫/);
      expect(text).not.toMatch(/\d+(?:[.,]\d+)?\s*(?:[kK]|[tT][rR]|M)(?![\p{L}\d])/u);
    };

    assertNoMaskedMoneyLeaks();
    expect(screen.getByText('••% thu nhập')).toBeInTheDocument();
    // Tỷ lệ không phụ thuộc thu nhập vẫn hiển thị
    expect(screen.getByText('150%')).toBeInTheDocument();
    expect(screen.getByText('100,0%')).toBeInTheDocument();
    expect(screen.getByText('25%')).toBeInTheDocument();

    // Chuyển qua các thẻ khuyến nghị khác (#2, #3) trong ActionableInsightSection khi vẫn đang ẩn số dư
    fireEvent.click(screen.getByRole('button', { name: /#2/ }));
    assertNoMaskedMoneyLeaks();
    fireEvent.click(screen.getByRole('button', { name: /#3/ }));
    assertNoMaskedMoneyLeaks();

    // Chuyển sang biểu đồ "Tỷ trọng danh mục" trong SpendingTrendsSection khi vẫn đang ẩn số dư
    fireEvent.click(screen.getByRole('button', { name: /Tỷ trọng danh mục/ }));
    expect(screen.getByText(/Tổng:\s*•••••• ₫/)).toBeInTheDocument();
    assertNoMaskedMoneyLeaks();

    // Bấm nút hiện số tiền để mở lại toàn bộ số tiền trên mọi thẻ
    fireEvent.click(screen.getByTitle('Hiện số tiền'));

    expect(screen.getAllByText(/10\.000\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/3\.000\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.000\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/1\.500\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/5\.000\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/20\.000\.000₫/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Tổng:\s*3\.000\.000₫/)).toBeInTheDocument();
    expect(screen.getByText('+200k')).toBeInTheDocument();
    expect(screen.getByText('+500k')).toBeInTheDocument();
    expect(screen.getByText('+1Tr')).toBeInTheDocument();
    expect(screen.getByText('30,0% thu nhập')).toBeInTheDocument();
  });

  it('GoalsSummarySection shows consistent <1% on both total line and goal card for tiny non-zero ratio, and 0% for zero', () => {
    const { rerender } = render(
      <GoalsSummarySection
        goals={[
          { id: 'g1', name: 'Quỹ nhỏ', target: 1_000_000, current: 2_000, createdAt: '2026-05-01' },
        ]}
        onAddGoal={vi.fn()}
        onUpdateGoalProgress={vi.fn()}
        onNavigateToGoals={vi.fn()}
      />
    );

    const totalLine = screen.getByText(/Đã gom được:/);
    expect(totalLine).toHaveTextContent('(<1%)');
    expect(screen.getAllByText('<1%').length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/\(0%\)/)).not.toBeInTheDocument();
    expect(screen.queryByText('0%')).not.toBeInTheDocument();

    rerender(
      <GoalsSummarySection
        goals={[
          { id: 'g1', name: 'Quỹ nhỏ', target: 1_000_000, current: 0, createdAt: '2026-05-01' },
        ]}
        onAddGoal={vi.fn()}
        onUpdateGoalProgress={vi.fn()}
        onNavigateToGoals={vi.fn()}
      />
    );

    expect(screen.getByText(/Đã gom được:/)).toHaveTextContent('(0%)');
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('maskMoneyInText masks full VND and short money forms without touching points, percentages, or non-money units', () => {
    expect(maskMoneyInText('Đã vượt 500.000₫ và +200k, +1Tr, 2TR, 1.5M (Max 30đ, 20%, 1 mục, 5 m)', false)).toBe(
      'Đã vượt •••••• ₫ và •••••• ₫, •••••• ₫, •••••• ₫, •••••• ₫ (Max 30đ, 20%, 1 mục, 5 m)'
    );
    expect(maskMoneyInText('Đã vượt 500.000₫', true)).toBe('Đã vượt 500.000₫');
  });
});
