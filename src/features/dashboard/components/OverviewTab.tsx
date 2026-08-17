import React, { useState, useMemo } from 'react';
import { Expense, Goal, RecurringExpense } from '../../../types';
import { calculateHealthScore } from '../../../utils/healthScore';
import { generateFinancialInsights } from '../../../utils/insightsEngine';
import { DashboardHero } from './DashboardHero';
import { ActionableInsightSection } from './ActionableInsightSection';
import { FinancialHealthCard } from './FinancialHealthCard';
import { BudgetProgressCard } from './BudgetProgressCard';
import { SpendingTrendsSection } from './SpendingTrendsSection';
import { UpcomingRecurringSection } from './UpcomingRecurringSection';
import { GoalsSummarySection } from './GoalsSummarySection';

interface OverviewTabProps {
  expenses: Expense[];
  goals: Goal[];
  income: number;
  categoryLimits?: Record<string, number>;
  recurringExpenses?: RecurringExpense[];
  onUpdateIncome: (income: number) => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoalProgress: (id: string, current: number) => void;
  onDeleteGoal: (id: string) => void;
  onQuickAdd?: () => void;
  onNavigateTab?: (tab: any) => void;
  onTriggerManualRecurringSync?: () => void;
  onAddExpense?: (expense: Omit<Expense, 'id'>) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = React.memo(({
  expenses = [],
  goals = [],
  income = 0,
  categoryLimits = {},
  recurringExpenses = [],
  onUpdateIncome,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal,
  onQuickAdd,
  onNavigateTab,
  onTriggerManualRecurringSync,
  onAddExpense,
}) => {
  // Current month detection
  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Derive available months from expenses or current
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthKey);
    expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [expenses, currentMonthKey]);

  // Expenses for the active selected month
  const monthlyExpenses = useMemo(() => {
    return expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  const totalMonthlyExpense = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  // Cumulative savings & balance calculation
  const totalAccumulatedInGoals = useMemo(() => {
    return goals.reduce((sum, g) => sum + g.current, 0);
  }, [goals]);

  // Current month net savings
  const monthlySavings = income - totalMonthlyExpense;
  const savingsRate = income > 0 ? (Math.max(0, monthlySavings) / income) * 100 : 0;

  // Total balance = Total goals accumulated + positive net savings from current and past activity
  const totalBalance = useMemo(() => {
    return Math.max(0, totalAccumulatedInGoals + (income > 0 ? monthlySavings : 0));
  }, [totalAccumulatedInGoals, income, monthlySavings]);

  // Burn rate calculation (average per elapsed day of month)
  const currentDay = Math.max(1, now.getDate());
  const dailyBurnRate = totalMonthlyExpense / currentDay;

  // Calculate Health Score
  const healthScore = useMemo(() => {
    return calculateHealthScore({
      expenses,
      income,
      categoryLimits,
      goals,
      recurringExpenses,
      budgetTemplate: 'none',
      generatedRecurringMonths: [],
    });
  }, [expenses, income, categoryLimits, goals, recurringExpenses]);

  // Calculate AI Decision Insights
  const actionableInsights = useMemo(() => {
    return generateFinancialInsights({
      expenses,
      income,
      categoryLimits,
      goals,
      recurringExpenses,
      budgetTemplate: 'none',
      generatedRecurringMonths: [],
    });
  }, [expenses, income, categoryLimits, goals, recurringExpenses]);

  const handleQuickRecordRecurring = (rec: RecurringExpense) => {
    if (onAddExpense) {
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      onAddExpense({
        amount: rec.amount,
        categoryId: rec.categoryId,
        date: todayStr,
        note: `[Định kỳ] ${rec.note || 'Khoản chi cố định'}`,
      });
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* 1. Dashboard Hero: Header, Total Balance, Quick Add CTA, 4 Core Metric Pillars */}
      <DashboardHero
        totalBalance={totalBalance}
        income={income}
        monthlyExpense={totalMonthlyExpense}
        monthlySavings={monthlySavings}
        savingsRate={savingsRate}
        dailyBurnRate={dailyBurnRate}
        selectedMonth={selectedMonth}
        availableMonths={availableMonths}
        onChangeMonth={setSelectedMonth}
        onUpdateIncome={onUpdateIncome}
        onOpenQuickAdd={onQuickAdd || (() => onNavigateTab?.('expenses'))}
        onOpenAiChat={() => onNavigateTab?.('chatbot')}
      />

      {/* 2. Actionable AI Decision Making Section ("Vậy tôi nên làm gì?") */}
      <ActionableInsightSection
        insights={actionableInsights}
        onNavigateTab={(tab) => onNavigateTab?.(tab)}
        onOpenChatbot={() => onNavigateTab?.('chatbot')}
      />

      {/* 3. Core Financial Diagnosis: Health Score (Am I saving enough?) + Budget Progress (Where am I over budget?) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <FinancialHealthCard
          healthScore={healthScore}
          onNavigateToInsights={() => onNavigateTab?.('insights')}
        />

        <BudgetProgressCard
          categoryLimits={categoryLimits}
          expensesThisMonth={monthlyExpenses}
          income={income}
          totalExpenseThisMonth={totalMonthlyExpense}
          onNavigateToBudget={() => onNavigateTab?.('budget')}
        />
      </div>

      {/* 4. Top Spending Categories & Spending Trend Chart */}
      <SpendingTrendsSection
        filteredExpenses={monthlyExpenses}
        allExpenses={expenses}
        totalExpenseThisMonth={totalMonthlyExpense}
        onNavigateToExpenses={() => onNavigateTab?.('expenses')}
      />

      {/* 5. Upcoming Recurring Bills & Goals Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
        <UpcomingRecurringSection
          recurringExpenses={recurringExpenses}
          onTriggerSync={onTriggerManualRecurringSync}
          onNavigateToBudget={() => onNavigateTab?.('budget')}
          onQuickRecordRecurring={handleQuickRecordRecurring}
        />

        <GoalsSummarySection
          goals={goals}
          onAddGoal={onAddGoal}
          onUpdateGoalProgress={onUpdateGoalProgress}
          onNavigateToGoals={() => onNavigateTab?.('goals')}
        />
      </div>
    </div>
  );
});
export default OverviewTab;
