export interface SyncClientStateInput {
  expenses?: any[];
  goals?: any[];
  recurringExpenses?: any[];
  income?: number;
  budgetTemplate?: string;
  categoryLimits?: Record<string, number>;
}

export interface SyncClientStateResult {
  expenses: number;
  goals: number;
  recurring: number;
}
