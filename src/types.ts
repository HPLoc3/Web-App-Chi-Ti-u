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
}

export interface AppState {
  expenses: Expense[];
  goals: Goal[];
  income: number; // monthly income
  budgetTemplate: 'none' | '50_30_20' | '6_jars' | '10_20_70';
  categoryLimits: Record<string, number>; // categoryId -> limit amount (0 means no limit)
  recurringExpenses: RecurringExpense[];
  generatedRecurringMonths: string[]; // Keep track of which months we already auto-generated e.g. ["2026-07"]
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

