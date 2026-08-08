import { AppState, HealthScoreBreakdown } from '../types';

export function calculateHealthScore(state: AppState): HealthScoreBreakdown {
  const { expenses, income, categoryLimits, goals, recurringExpenses } = state;

  const currentMonth = new Date().toISOString().slice(0, 7);
  const currentMonthExpenses = expenses.filter((e) => e.date.startsWith(currentMonth));
  const totalExpense = currentMonthExpenses.reduce((acc, e) => acc + e.amount, 0);

  // 1. Savings Rate Score (Max 30)
  const netSavings = Math.max(0, income - totalExpense);
  const savingsRatePercent = income > 0 ? Math.round((netSavings / income) * 100) : 0;
  
  // Benchmark: 20%+ savings rate gets 30 pts, 10-20% scaled, 0-10% scaled
  let savingsRateScore = 0;
  if (savingsRatePercent >= 25) savingsRateScore = 30;
  else if (savingsRatePercent >= 20) savingsRateScore = 26;
  else if (savingsRatePercent >= 10) savingsRateScore = 18;
  else if (savingsRatePercent > 0) savingsRateScore = 10;
  else savingsRateScore = 0;

  // 2. Budget Adherence Score (Max 25)
  // Check how many categories exceeded their custom limits
  let overspendingCount = 0;
  const categoryTotals: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    categoryTotals[e.categoryId] = (categoryTotals[e.categoryId] || 0) + e.amount;
  });

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

  // 3. Spending Stability / Volatility (Max 20)
  // Calculate day-to-day spending distribution
  const daySpendMap: Record<string, number> = {};
  currentMonthExpenses.forEach((e) => {
    daySpendMap[e.date] = (daySpendMap[e.date] || 0) + e.amount;
  });
  const dailySpendValues = Object.values(daySpendMap);
  let spendingStabilityScore = 15; // default moderate
  if (dailySpendValues.length > 3) {
    const avgDaily = dailySpendValues.reduce((a, b) => a + b, 0) / dailySpendValues.length;
    const maxSingleDay = Math.max(...dailySpendValues);
    // If single day spend is > 50% of total month spend, volatility is high
    if (totalExpense > 0 && maxSingleDay / totalExpense > 0.45) {
      spendingStabilityScore = 8;
    } else {
      spendingStabilityScore = 20;
    }
  }

  // 4. Goals Progress (Max 15)
  let goalsProgressScore = 10;
  if (goals.length > 0) {
    const totalTarget = goals.reduce((a, b) => a + b.target, 0);
    const totalCurrent = goals.reduce((a, b) => a + b.current, 0);
    const avgProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    if (avgProgress >= 80) goalsProgressScore = 15;
    else if (avgProgress >= 50) goalsProgressScore = 12;
    else if (avgProgress >= 20) goalsProgressScore = 8;
    else goalsProgressScore = 5;
  }

  // 5. Recurring Expense Ratio Score (Max 10)
  const totalRecurringPerMonth = recurringExpenses.reduce((acc, r) => acc + r.amount, 0);
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

  return {
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
}
