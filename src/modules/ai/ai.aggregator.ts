import { AggregatedFinancialFacts, CategoryMetricFact, GoalMetricFact } from './ai.types';
import { totalMonthlyRecurring } from '../../utils/recurringSchedule';

const CATEGORY_NAMES: Record<string, string> = {
  an_uong: 'Ăn uống',
  di_chuyen: 'Di chuyển',
  mua_sam: 'Mua sắm',
  giai_tri: 'Giải trí',
  hoa_don: 'Hóa đơn & Tiện ích',
  suc_khoe: 'Sức khỏe & Y tế',
  giao_duc: 'Giáo dục',
  khac: 'Chi tiêu khác',
};

export class AiFactsAggregator {
  static aggregate(context: {
    currentDate?: string;
    expenses?: any[];
    goals?: any[];
    categoryLimits?: Record<string, number>;
    income?: number;
    recurringExpenses?: any[];
  }): AggregatedFinancialFacts {
    const {
      currentDate = new Date().toISOString().split('T')[0],
      expenses = [],
      goals = [],
      categoryLimits = {},
      income = 0,
      recurringExpenses = [],
    } = context;

    const [yearStr, monthStr, dayStr] = currentDate.split('-');
    const year = parseInt(yearStr, 10) || new Date().getFullYear();
    const month = parseInt(monthStr, 10) || (new Date().getMonth() + 1);
    const currentDay = parseInt(dayStr, 10) || new Date().getDate();

    // Days in current month
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysRemaining = Math.max(0, daysInMonth - currentDay);

    const currentMonthPrefix = `${year}-${String(month).padStart(2, '0')}`;
    
    // Calculate previous month prefix
    const prevMonthDate = new Date(year, month - 2, 1);
    const prevYear = prevMonthDate.getFullYear();
    const prevMonth = prevMonthDate.getMonth() + 1;
    const prevMonthPrefix = `${prevYear}-${String(prevMonth).padStart(2, '0')}`;

    // Filter transactions
    const thisMonthExpenses = expenses.filter((e) => e && e.date && e.date.startsWith(currentMonthPrefix));
    const prevMonthExpenses = expenses.filter((e) => e && e.date && e.date.startsWith(prevMonthPrefix));

    const totalSpentThisMonth = thisMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    const totalSpentPreviousMonth = prevMonthExpenses.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);

    const transactionCountThisMonth = thisMonthExpenses.length;
    // Số thật (âm = chi vượt) để khớp với savingsRatePct; chưa có thu nhập thì để 0
    const netSavingsThisMonth = income > 0 ? income - totalSpentThisMonth : 0;
    const savingsRatePct = income > 0 ? Math.round(((income - totalSpentThisMonth) / income) * 100) : 0;

    // Burn rate & projections
    const daysPassed = Math.max(1, currentDay);
    const dailyBurnRate = Math.round(totalSpentThisMonth / daysPassed);
    const projectedEndMonthSpent = totalSpentThisMonth + dailyBurnRate * daysRemaining;
    const projectedEndMonthSavings = income > 0 ? income - projectedEndMonthSpent : 0;

    // Month over Month Growth
    const momDiff = totalSpentThisMonth - totalSpentPreviousMonth;
    const monthOverMonthGrowthPct = totalSpentPreviousMonth > 0
      ? Math.round((momDiff / totalSpentPreviousMonth) * 100)
      : 0;

    // Category aggregations
    const catSpending: Record<string, number> = {};
    thisMonthExpenses.forEach((e) => {
      const cId = e.categoryId || 'khac';
      catSpending[cId] = (catSpending[cId] || 0) + (Number(e.amount) || 0);
    });

    const previousInCategory = (cId: string) =>
      prevMonthExpenses.filter((e) => (e.categoryId || 'khac') === cId);

    const categoryFacts: CategoryMetricFact[] = Object.keys({ ...CATEGORY_NAMES, ...categoryLimits, ...catSpending }).map((cId) => {
      const spent = catSpending[cId] || 0;
      const limit = categoryLimits[cId] || 0;
      const percentageOfTotal = totalSpentThisMonth > 0 ? Math.round((spent / totalSpentThisMonth) * 100) : 0;
      const limitUsagePct = limit > 0 ? Math.round((spent / limit) * 100) : 0;

      let status: CategoryMetricFact['status'] = 'no_limit';
      let overAmount = 0;

      if (limit > 0) {
        if (spent > limit) {
          status = 'over_budget';
          overAmount = spent - limit;
        } else if (limitUsagePct >= 85) {
          status = 'near_limit';
        } else {
          status = 'safe';
        }
      }

      return {
        categoryId: cId,
        categoryName: CATEGORY_NAMES[cId] || cId,
        spent,
        transactionCount: thisMonthExpenses.filter((e) => (e.categoryId || 'khac') === cId).length,
        previousMonthSpent: previousInCategory(cId).reduce((sum, e) => sum + (Number(e.amount) || 0), 0),
        previousMonthTransactionCount: previousInCategory(cId).length,
        percentageOfTotal,
        limit,
        limitUsagePct,
        status,
        overAmount,
      };
    });

    // Sort categories by spent descending
    const topCategories = categoryFacts
      .filter((c) => c.spent > 0)
      .sort((a, b) => b.spent - a.spent)
      .slice(0, 5);

    const overBudgetCategories = categoryFacts.filter((c) => c.status === 'over_budget');
    const nearLimitCategories = categoryFacts.filter((c) => c.status === 'near_limit');

    // Recurring expenses
    const upcomingRecurring = recurringExpenses.filter((r) => r.dayOfMonth >= currentDay && r.isActive !== false);
    const upcomingRecurringList = upcomingRecurring
      .map((r) => ({
        name: r.note || CATEGORY_NAMES[r.categoryId] || 'Khoản định kỳ',
        amount: Number(r.amount) || 0,
        dayOfMonth: r.dayOfMonth,
        categoryId: r.categoryId,
      }));

    // Quy đổi theo tháng như các màn hình khác (khoản tuần/năm)
    const upcomingRecurringTotal = totalMonthlyRecurring(
      upcomingRecurring.map((r) => ({ amount: Number(r.amount) || 0, frequency: r.frequency }))
    );

    // Goals calculation
    // Chưa có thu nhập thì không ước tính tốc độ tích lũy
    // Không còn phần dư (hiện tại hoặc dự kiến cuối tháng) thì cũng không ước tính, không đặt mức sàn giả
    const monthlyNetSavingsEstimated =
      income > 0 && income > totalSpentThisMonth ? Math.max(0, income - projectedEndMonthSpent) : 0;
    const goalsFacts: GoalMetricFact[] = goals.map((g) => {
      const target = Number(g.target) || 0;
      const current = Number(g.current) || 0;
      const remaining = Math.max(0, target - current);
      const progressPct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
      let estimatedMonthsNeeded: number | null = 0; // đã đạt mục tiêu
      if (remaining > 0) {
        estimatedMonthsNeeded = monthlyNetSavingsEstimated > 0
          ? Math.ceil((remaining / monthlyNetSavingsEstimated) * 10) / 10
          : null;
      }

      return {
        id: g.id || 'goal-default',
        name: g.name || 'Mục tiêu tài chính',
        target,
        current,
        remaining,
        progressPct,
        estimatedMonthsNeeded,
      };
    });

    return {
      currentDate,
      month,
      year,
      daysInMonth,
      currentDay,
      daysRemaining,
      income,
      totalSpentThisMonth,
      transactionCountThisMonth,
      netSavingsThisMonth,
      savingsRatePct,
      dailyBurnRate,
      projectedEndMonthSpent,
      projectedEndMonthSavings,
      totalSpentPreviousMonth,
      monthOverMonthGrowthPct,
      categoryFacts,
      topCategories,
      overBudgetCategories,
      nearLimitCategories,
      upcomingRecurringTotal,
      upcomingRecurringList,
      goals: goalsFacts,
    };
  }
}
