import { AppState, FinancialInsight } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatVND } from './format';

export function generateFinancialInsights(state: AppState): FinancialInsight[] {
  const insights: FinancialInsight[] = [];
  const { expenses, income, categoryLimits, goals, recurringExpenses } = state;

  const today = new Date();
  const currentMonthStr = today.toISOString().slice(0, 7);
  
  // Previous month string
  const prevDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStr = prevDate.toISOString().slice(0, 7);

  const currentExpenses = expenses.filter((e) => e.date.startsWith(currentMonthStr));
  const prevExpenses = expenses.filter((e) => e.date.startsWith(prevMonthStr));

  const totalCurrent = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPrev = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  // 1. Overall Income vs Expense & Savings Rate
  const netSavings = Math.max(0, income - totalCurrent);
  const savingsRate = income > 0 ? (netSavings / income) * 100 : 0;

  if (totalCurrent > income && income > 0) {
    insights.push({
      id: 'ins-overbudget-total',
      title: 'Cảnh báo thâm hụt ngân sách',
      message: `Tổng chi tiêu tháng này (${formatVND(totalCurrent)}) đã vượt quá tổng thu nhập (${formatVND(income)}).`,
      severity: 'critical',
      metricLabel: 'Tỷ lệ chi/thu',
      metricValue: `${Math.round((totalCurrent / income) * 100)}%`,
      actionableStep: 'Cắt giảm các khoản chi tiêu không thiết yếu ngay lập tức.',
    });
  } else if (savingsRate >= 20) {
    insights.push({
      id: 'ins-savings-good',
      title: 'Tỷ lệ tích lũy xuất sắc',
      message: `Tỷ lệ tiết kiệm tháng này đạt ${Math.round(savingsRate)}%, cao hơn mức chuẩn tối thiểu 20%.`,
      severity: 'positive',
      metricLabel: 'Tiết kiệm ròng',
      metricValue: formatVND(netSavings),
      actionableStep: 'Xem xét phân bổ số tiền nhàn rỗi này vào các mục tiêu dài hạn.',
    });
  } else if (income > 0 && savingsRate < 10) {
    insights.push({
      id: 'ins-savings-low',
      title: 'Tỷ lệ tích lũy còn thấp',
      message: `Bạn mới tích lũy được ${Math.round(savingsRate)}% thu nhập. Mức an toàn khuyến nghị là 15-20%.`,
      severity: 'warning',
      metricLabel: 'Tiết kiệm ròng',
      metricValue: formatVND(netSavings),
      actionableStep: 'Xem xét áp dụng quy tắc 50/30/20 để tự động trích lập quỹ dự phòng.',
    });
  }

  // 2. Category Level Spending Limits & Month-over-Month Comparison
  const currentCatTotals: Record<string, number> = {};
  currentExpenses.forEach((e) => {
    currentCatTotals[e.categoryId] = (currentCatTotals[e.categoryId] || 0) + e.amount;
  });

  const prevCatTotals: Record<string, number> = {};
  prevExpenses.forEach((e) => {
    prevCatTotals[e.categoryId] = (prevCatTotals[e.categoryId] || 0) + e.amount;
  });

  // Check category limit overshoots
  Object.entries(categoryLimits).forEach(([catId, limit]) => {
    const catTotal = currentCatTotals[catId] || 0;
    const catName = CATEGORIES.find((c) => c.id === catId)?.name || catId;

    if (limit > 0 && catTotal > limit) {
      const excess = catTotal - limit;
      const pctOver = Math.round((excess / limit) * 100);
      insights.push({
        id: `ins-limit-${catId}`,
        title: `Vượt ngân sách ${catName}`,
        message: `Bạn đang chi ${formatVND(catTotal)}, vượt ${pctOver}% (${formatVND(excess)}) so với hạn mức ${formatVND(limit)}.`,
        severity: 'critical',
        metricLabel: 'Hạn mức quy định',
        metricValue: formatVND(limit),
        category: catName,
        actionableStep: `Ngừng phát sinh giao dịch nhóm ${catName} trong những ngày còn lại của tháng.`,
      });
    }
  });

  // Check MoM increases
  Object.entries(currentCatTotals).forEach(([catId, currentAmt]) => {
    const prevAmt = prevCatTotals[catId] || 0;
    const catName = CATEGORIES.find((c) => c.id === catId)?.name || catId;

    if (prevAmt > 200000 && currentAmt > prevAmt) {
      const diffPct = Math.round(((currentAmt - prevAmt) / prevAmt) * 100);
      if (diffPct >= 20) {
        insights.push({
          id: `ins-mom-${catId}`,
          title: `Tăng mạnh chi tiêu ${catName}`,
          message: `Chi tiêu ${catName} tăng ${diffPct}% (${formatVND(currentAmt - prevAmt)}) so với tháng trước.`,
          severity: 'warning',
          metricLabel: 'Mức tăng MoM',
          metricValue: `+${diffPct}%`,
          category: catName,
          actionableStep: 'Kiểm tra lại các hóa đơn lẻ trong lịch sử để tối ưu hóa.',
        });
      }
    }
  });

  // 3. Subscriptions / Recurring Expenses Optimization
  const totalRecurring = recurringExpenses.reduce((acc, r) => acc + r.amount, 0);
  if (income > 0 && totalRecurring > 0) {
    const recIncomePct = Math.round((totalRecurring / income) * 100);
    if (recIncomePct > 20) {
      insights.push({
        id: 'ins-recurring-high',
        title: 'Tỷ lệ chi phí cố định cao',
        message: `Hóa đơn & đăng ký định kỳ ngốn ${recIncomePct}% tổng thu nhập (${formatVND(totalRecurring)}/tháng).`,
        severity: 'warning',
        metricLabel: 'Tổng hóa đơn định kỳ',
        metricValue: `${formatVND(totalRecurring)}/tháng`,
        actionableStep: 'Rà soát hủy các dịch vụ đăng ký ít sử dụng.',
      });
    }
  }

  // 4. Goals Optimization Recommendation
  goals.forEach((goal) => {
    const remaining = goal.target - goal.current;
    if (remaining > 0) {
      // Suggest practical monthly savings step
      const monthlySavingsGoal = Math.ceil(remaining / 6); // 6 months target
      insights.push({
        id: `ins-goal-${goal.id}`,
        title: `Khuyến nghị cho mục tiêu "${goal.name}"`,
        message: `Còn thiếu ${formatVND(remaining)}. Nếu tiết kiệm thêm ${formatVND(monthlySavingsGoal)}/tháng, bạn sẽ hoàn thành mục tiêu trong 6 tháng tới.`,
        severity: 'recommendation',
        metricLabel: 'Đã hoàn thành',
        metricValue: `${Math.round((goal.current / goal.target) * 100)}%`,
        actionableStep: 'Tự động trích lập khoản này vào đầu tháng.',
      });
    }
  });

  return insights;
}
