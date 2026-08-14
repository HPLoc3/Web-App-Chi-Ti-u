export interface BudgetDTO {
  id: string;
  income: number;
  budgetTemplate: string;
  needsPercent: number;
  wantsPercent: number;
  savingsPercent: number;
  categoryLimits: Record<string, number>;
  limits?: Array<{
    categoryId: string;
    categoryName: string;
    amount: number;
  }>;
}

export interface UpdateBudgetInput {
  income?: number;
  budgetTemplate?: string;
  categoryLimits?: Record<string, number>;
  needsPercent?: number;
  wantsPercent?: number;
  savingsPercent?: number;
}
