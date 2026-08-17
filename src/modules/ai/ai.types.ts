export type FinancialIntent =
  | 'CREATE_EXPENSE'
  | 'UPDATE_EXPENSE'
  | 'DELETE_EXPENSE'
  | 'QUERY_FINANCE'
  | 'ANALYZE_SPENDING'
  | 'BUDGET_ADVICE'
  | 'GOAL_FORECAST'
  | 'CASHFLOW_FORECAST'
  | 'GENERAL_CHAT';

export type DateConfidenceType = 'EXACT' | 'RELATIVE' | 'INFERRED' | 'DEFAULT';

export interface StructuredExpense {
  id?: string;
  amount: number;
  currency?: string;
  category: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  dateExpression?: string;
  dateType?: DateConfidenceType;
  note: string;
  originalExpense?: {
    id: string;
    amount: number;
    category: string;
    categoryName: string;
    date: string;
    note: string;
  };
}

export interface StructuredAction {
  type: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE' | 'NONE';
  expense?: StructuredExpense;
  targetExpenseId?: string;
  targetSummary?: string;
  confidence: number;
  explanation?: string;
  requiresConfirmation: boolean;
}

export interface CategoryMetricFact {
  categoryId: string;
  categoryName: string;
  spent: number;
  percentageOfTotal: number;
  limit: number;
  limitUsagePct: number;
  status: 'safe' | 'near_limit' | 'over_budget' | 'no_limit';
  overAmount: number;
}

export interface GoalMetricFact {
  id: string;
  name: string;
  target: number;
  current: number;
  remaining: number;
  progressPct: number;
  estimatedMonthsNeeded: number;
}

export interface AggregatedFinancialFacts {
  currentDate: string;
  month: number;
  year: number;
  daysInMonth: number;
  currentDay: number;
  daysRemaining: number;

  income: number;
  totalSpentThisMonth: number;
  transactionCountThisMonth: number;
  netSavingsThisMonth: number;
  savingsRatePct: number;

  dailyBurnRate: number;
  projectedEndMonthSpent: number;
  projectedEndMonthSavings: number;

  totalSpentPreviousMonth: number;
  monthOverMonthGrowthPct: number;

  topCategories: CategoryMetricFact[];
  overBudgetCategories: CategoryMetricFact[];
  nearLimitCategories: CategoryMetricFact[];

  upcomingRecurringTotal: number;
  upcomingRecurringList: Array<{
    name: string;
    amount: number;
    dayOfMonth: number;
    categoryId: string;
  }>;

  goals: GoalMetricFact[];
}

export interface AiAssistantInput {
  message: string;
  context?: {
    currentDate?: string;
    expenses?: any[];
    goals?: any[];
    categoryLimits?: Record<string, number>;
    income?: number;
    recurringExpenses?: any[];
  };
}

export interface AiFinancialSummary {
  currentStatus?: string;
  riskOrInsight?: string;
  recommendedAction?: string;
}

export interface AiAssistantResult {
  success: boolean;
  data?: {
    intent: FinancialIntent;
    action?: StructuredAction;
    financialSummary?: AiFinancialSummary;
    reply: string;
    confidence: number;
    aggregatedFactsSnippet?: Partial<AggregatedFinancialFacts>;
    quota?: {
      usedToday: number;
      limitToday: number;
      remainingToday: number;
      resetAt: string;
    };
  };
  fallbackToRule?: boolean;
  reason?: string;
}

export interface AiQuotaInfo {
  userId: string;
  dateKey: string;
  used: number;
  limit: number;
  remaining: number;
  resetAt: string;
}

export interface AiRequestLog {
  id: string;
  userId: string;
  timestamp: string;
  intent: FinancialIntent;
  promptSnippet: string;
  status: 'SUCCESS' | 'RATE_LIMITED' | 'ERROR' | 'FALLBACK';
  durationMs: number;
  quotaRemaining: number;
}
