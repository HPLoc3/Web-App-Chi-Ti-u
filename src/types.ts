export interface Expense {
  id: string;
  amount: number;
  categoryId: string; // e.g., 'an_uong', 'di_chuyen', etc.
  note: string;
  date: string; // YYYY-MM-DD
}

export interface Goal {
  id: string;
  name: string;
  target: number;
  current: number;
  createdAt: string; // YYYY-MM-DD
}

export interface RecurringExpense {
  id: string;
  amount: number;
  categoryId: string;
  dayOfMonth: number; // 1 - 31
  note: string;
  frequency?: 'monthly' | 'yearly' | 'weekly';
  billingCycleMonth?: number; // 1-12 for yearly
  nextPaymentDate?: string;
  isActive?: boolean;
}

export interface AppState {
  expenses: Expense[];
  goals: Goal[];
  income: number; // monthly income
  budgetTemplate: 'none' | '50_30_20' | '6_jars' | '10_20_70';
  categoryLimits: Record<string, number>; // categoryId -> limit amount (0 means no limit)
  recurringExpenses: RecurringExpense[];
  generatedRecurringMonths: string[]; // Keep track of which months we already auto-generated e.g. ["2026-07"]
  isSampleData?: boolean;
}

export interface Category {
  id: string;
  name: string;
  iconName: string; // lucide icon identifier
  color: string; // hex color or tailwind class for indicators
  textColor: string;
  bgColor: string;
  keywords: string[];
}

export type SeverityType = 'positive' | 'warning' | 'critical' | 'recommendation';

export interface FinancialInsight {
  id: string;
  title: string;
  message: string;
  severity: SeverityType;
  metricLabel?: string;
  metricValue?: string;
  actionableStep?: string;
  category?: string;
  observation?: string;
  projection?: string;
  suggestedAction?: string;
  dailyImpact?: string;
  targetTab?: 'budget' | 'expenses' | 'goals' | 'chatbot' | 'insights';
}

export interface HealthScoreBreakdown {
  savingsRateScore: number; // max 30
  budgetAdherenceScore: number; // max 25
  spendingStabilityScore: number; // max 20
  goalsProgressScore: number; // max 15
  recurringRatioScore: number; // max 10
  totalScore: number; // 0 - 100
  savingsRatePercent: number;
  overspendingCount: number;
  recurringIncomeRatioPercent: number;
}

export interface ImportPreviewItem {
  id: string;
  date: string;
  note: string;
  amount: number;
  categoryId: string;
  selected: boolean;
  confidence: number;
}


