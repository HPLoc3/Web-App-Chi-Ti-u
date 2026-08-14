import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';

/**
 * Format currency VND string
 */
function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

/**
 * GET /api/reports/summary
 * Báo cáo tài chính tổng quan theo tháng/năm từ PostgreSQL
 */
export const getSummaryReport = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const now = new Date();
  const queryMonth = req.query.month ? parseInt(String(req.query.month), 10) : now.getMonth() + 1;
  const queryYear = req.query.year ? parseInt(String(req.query.year), 10) : now.getFullYear();

  const startDate = new Date(queryYear, queryMonth - 1, 1, 0, 0, 0, 0);
  const endDate = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);

  // 1. Lấy thiết lập ngân sách & thu nhập hàng tháng của user
  const budget = await prisma.budget.findUnique({
    where: { userId },
  });
  const configuredIncome = budget?.income ? Number(budget.income) : 0;

  // 2. Aggregate Thu & Chi từ bảng Transaction
  const [incomeAggregate, expenseAggregate, walletBalanceAggregate] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: 'INCOME',
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: 'EXPENSE',
        date: { gte: startDate, lte: endDate },
      },
    }),
    prisma.wallet.aggregate({
      _sum: { balance: true },
      where: { userId },
    }),
  ]);

  const totalExpense = expenseAggregate._sum.amount ? Number(expenseAggregate._sum.amount) : 0;
  const recordedIncome = incomeAggregate._sum.amount ? Number(incomeAggregate._sum.amount) : 0;
  const effectiveIncome = recordedIncome > 0 ? recordedIncome : configuredIncome;
  const netBalance = effectiveIncome - totalExpense;
  const totalWalletBalance = walletBalanceAggregate._sum.balance ? Number(walletBalanceAggregate._sum.balance) : 0;

  // 3. Phân nhóm chi tiêu theo Danh mục
  const categoryExpenses = await prisma.transaction.groupBy({
    by: ['categoryId'],
    _sum: { amount: true },
    _count: { id: true },
    where: {
      userId,
      type: 'EXPENSE',
      date: { gte: startDate, lte: endDate },
    },
    orderBy: {
      _sum: { amount: 'desc' },
    },
  });

  const categoryIds = categoryExpenses.map((c) => c.categoryId);
  const categoriesInfo = await prisma.category.findMany({
    where: {
      id: { in: categoryIds },
      OR: [{ userId: null }, { userId }],
    },
    select: { id: true, name: true, icon: true, color: true },
  });

  const categoryMap = new Map(categoriesInfo.map((cat) => [cat.id, cat]));

  const categoryBreakdown = categoryExpenses.map((item) => {
    const catDetails = categoryMap.get(item.categoryId);
    const amount = item._sum.amount ? Number(item._sum.amount) : 0;
    const percentage = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0;
    return {
      categoryId: item.categoryId,
      categoryName: catDetails?.name || 'Khác',
      icon: catDetails?.icon || 'Tag',
      color: catDetails?.color || '#94A3B8',
      totalAmount: amount,
      transactionCount: item._count.id,
      percentage,
    };
  });

  res.status(200).json({
    success: true,
    period: {
      month: queryMonth,
      year: queryYear,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      totalIncome: effectiveIncome,
      totalExpense,
      netBalance,
      totalWalletBalance,
      savingsRatePercent: effectiveIncome > 0 ? Math.max(0, Math.round((netBalance / effectiveIncome) * 100)) : 0,
    },
    categoryBreakdown,
  });
};

/**
 * GET /api/reports/insights
 * Báo cáo chỉ số sức khỏe tài chính & gợi ý thông minh từ Backend
 */
export const getFinancialInsights = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const curStart = new Date(currentYear, currentMonth - 1, 1, 0, 0, 0, 0);
  const curEnd = new Date(currentYear, currentMonth, 0, 23, 59, 59, 999);

  const prevStart = new Date(currentYear, currentMonth - 2, 1, 0, 0, 0, 0);
  const prevEnd = new Date(currentYear, currentMonth - 1, 0, 23, 59, 59, 999);

  // Fetch all related entities in parallel from PostgreSQL
  const [budget, currentTxs, prevTxs, goals, recurring] = await Promise.all([
    prisma.budget.findUnique({
      where: { userId },
      include: { budgetLimits: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: curStart, lte: curEnd } },
      include: { category: true },
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: prevStart, lte: prevEnd } },
    }),
    prisma.goal.findMany({
      where: { userId },
    }),
    prisma.recurringTransaction.findMany({
      where: { userId, isActive: true },
    }),
  ]);

  const income = budget?.income ? Number(budget.income) : 25000000;
  const currentExpenses = currentTxs.filter((t) => t.type === 'EXPENSE');
  const totalExpense = currentExpenses.reduce((sum, t) => sum + Number(t.amount), 0);

  // 1. Health Score Calculation
  const netSavings = Math.max(0, income - totalExpense);
  const savingsRatePercent = income > 0 ? Math.round((netSavings / income) * 100) : 0;

  let savingsRateScore = 0;
  if (savingsRatePercent >= 25) savingsRateScore = 30;
  else if (savingsRatePercent >= 20) savingsRateScore = 26;
  else if (savingsRatePercent >= 10) savingsRateScore = 18;
  else if (savingsRatePercent > 0) savingsRateScore = 10;

  // Category Limits & Overspending
  const categoryTotals: Record<string, number> = {};
  currentExpenses.forEach((t) => {
    categoryTotals[t.categoryId] = (categoryTotals[t.categoryId] || 0) + Number(t.amount);
  });

  const categoryLimits: Record<string, number> = {};
  if (budget?.categoryLimits) {
    try {
      Object.assign(categoryLimits, JSON.parse(budget.categoryLimits));
    } catch (e) {
      // Ignore
    }
  }
  budget?.budgetLimits?.forEach((bl) => {
    categoryLimits[bl.categoryId] = Number(bl.amount);
  });

  let overspendingCount = 0;
  Object.entries(categoryLimits).forEach(([catId, limit]) => {
    if (limit > 0 && (categoryTotals[catId] || 0) > limit) {
      overspendingCount++;
    }
  });

  let budgetAdherenceScore = 25;
  if (overspendingCount === 0) budgetAdherenceScore = 25;
  else if (overspendingCount === 1) budgetAdherenceScore = 18;
  else if (overspendingCount === 2) budgetAdherenceScore = 10;
  else budgetAdherenceScore = 5;

  if (totalExpense > income && income > 0) {
    budgetAdherenceScore = Math.max(0, budgetAdherenceScore - 10);
  }

  // Spending Stability
  const daySpendMap: Record<string, number> = {};
  currentExpenses.forEach((t) => {
    const dayStr = t.date.toISOString().slice(0, 10);
    daySpendMap[dayStr] = (daySpendMap[dayStr] || 0) + Number(t.amount);
  });
  const dailySpendValues = Object.values(daySpendMap);
  let spendingStabilityScore = 15;
  if (dailySpendValues.length > 3) {
    const maxSingleDay = Math.max(...dailySpendValues);
    if (totalExpense > 0 && maxSingleDay / totalExpense > 0.45) {
      spendingStabilityScore = 8;
    } else {
      spendingStabilityScore = 20;
    }
  }

  // Goals Progress
  let goalsProgressScore = 10;
  if (goals.length > 0) {
    const totalTarget = goals.reduce((a, b) => a + Number(b.targetAmount), 0);
    const totalCurrent = goals.reduce((a, b) => a + Number(b.currentAmount), 0);
    const avgProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    if (avgProgress >= 80) goalsProgressScore = 15;
    else if (avgProgress >= 50) goalsProgressScore = 12;
    else if (avgProgress >= 20) goalsProgressScore = 8;
    else goalsProgressScore = 5;
  }

  // Recurring Ratio
  const totalRecurringPerMonth = recurring.reduce((acc, r) => acc + Number(r.amount), 0);
  const recurringIncomeRatioPercent = income > 0 ? Math.round((totalRecurringPerMonth / income) * 100) : 0;
  let recurringRatioScore = 10;
  if (recurringIncomeRatioPercent <= 20) recurringRatioScore = 10;
  else if (recurringIncomeRatioPercent <= 35) recurringRatioScore = 7;
  else recurringRatioScore = 4;

  const totalScore = Math.min(
    100,
    Math.max(
      0,
      savingsRateScore + budgetAdherenceScore + spendingStabilityScore + goalsProgressScore + recurringRatioScore
    )
  );

  const healthScore = {
    savingsRateScore,
    budgetAdherenceScore,
    spendingStabilityScore,
    goalsProgressScore,
    recurringRatioScore,
    totalScore,
    savingsRatePercent,
    overspendingCount,
    recurringIncomeRatioPercent,
  };

  // 2. Financial Insights Generation
  const insights: any[] = [];

  if (totalExpense > income && income > 0) {
    insights.push({
      id: 'ins-overbudget-total',
      title: 'Cảnh báo thâm hụt ngân sách',
      message: `Tổng chi tiêu tháng này (${formatVND(totalExpense)}) đã vượt quá tổng thu nhập (${formatVND(income)}).`,
      severity: 'critical',
      metricLabel: 'Tỷ lệ chi/thu',
      metricValue: `${Math.round((totalExpense / income) * 100)}%`,
      actionableStep: 'Cắt giảm các khoản chi tiêu không thiết yếu ngay lập tức.',
    });
  } else if (savingsRatePercent >= 20) {
    insights.push({
      id: 'ins-savings-good',
      title: 'Tỷ lệ tích lũy xuất sắc',
      message: `Tỷ lệ tiết kiệm tháng này đạt ${savingsRatePercent}%, cao hơn mức chuẩn tối thiểu 20%.`,
      severity: 'positive',
      metricLabel: 'Tiết kiệm ròng',
      metricValue: formatVND(netSavings),
      actionableStep: 'Xem xét phân bổ số tiền nhàn rỗi này vào các mục tiêu dài hạn.',
    });
  } else if (income > 0 && savingsRatePercent < 10) {
    insights.push({
      id: 'ins-savings-low',
      title: 'Tỷ lệ tích lũy còn thấp',
      message: `Bạn mới tích lũy được ${savingsRatePercent}% thu nhập. Mức an toàn khuyến nghị là 15-20%.`,
      severity: 'warning',
      metricLabel: 'Tiết kiệm ròng',
      metricValue: formatVND(netSavings),
      actionableStep: 'Xem xét áp dụng quy tắc 50/30/20 để tự động trích lập quỹ dự phòng.',
    });
  }

  // Category Limit Warnings
  Object.entries(categoryLimits).forEach(([catId, limit]) => {
    const catTotal = categoryTotals[catId] || 0;
    if (limit > 0 && catTotal > limit) {
      const excess = catTotal - limit;
      const pctOver = Math.round((excess / limit) * 100);
      insights.push({
        id: `ins-limit-${catId}`,
        title: `Vượt ngân sách danh mục`,
        message: `Bạn đang chi ${formatVND(catTotal)}, vượt ${pctOver}% (${formatVND(excess)}) so với hạn mức ${formatVND(limit)}.`,
        severity: 'critical',
        metricLabel: 'Hạn mức quy định',
        metricValue: formatVND(limit),
        category: catId,
        actionableStep: `Ngừng phát sinh chi tiêu nhóm này trong các ngày còn lại của tháng.`,
      });
    }
  });

  // Recurring ratio check
  if (recurringIncomeRatioPercent > 35) {
    insights.push({
      id: 'ins-recurring-heavy',
      title: 'Chi phí định kỳ chiếm tỷ trọng lớn',
      message: `Các khoản phí cố định (${formatVND(totalRecurringPerMonth)}) đang chiếm ${recurringIncomeRatioPercent}% thu nhập hàng tháng.`,
      severity: 'warning',
      metricLabel: 'Tỷ trọng cố định',
      metricValue: `${recurringIncomeRatioPercent}%`,
      actionableStep: 'Rà soát và hủy bớt các gói dịch vụ thuê bao hoặc thẻ thành viên không sử dụng.',
    });
  }

  // Savings Goal Advice
  if (goals.length > 0 && netSavings > 0) {
    const activeGoal = goals[0];
    const target = Number(activeGoal.targetAmount);
    const current = Number(activeGoal.currentAmount);
    const remaining = Math.max(0, target - current);
    const monthsEst = Math.ceil(remaining / (netSavings || 1));

    insights.push({
      id: 'ins-goal-advice',
      title: `Tiến độ mục tiêu: ${activeGoal.name}`,
      message: `Với tốc độ tích lũy ${formatVND(netSavings)}/tháng, bạn có thể hoàn thành mục tiêu sau khoảng ${monthsEst} tháng.`,
      severity: 'recommendation',
      metricLabel: 'Cần tích lũy thêm',
      metricValue: formatVND(remaining),
      actionableStep: `Cân nhắc chuyển ${formatVND(Math.round(netSavings * 0.5))} sang mục tiêu "${activeGoal.name}".`,
    });
  }

  res.status(200).json({
    success: true,
    healthScore,
    insights,
  });
};
