export interface RecurringDTO {
  id: string;
  amount: number;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  dayOfMonth: number;
  note: string;
  type: string;
  isActive: boolean;
  frequency: string;
}

export interface CreateRecurringInput {
  amount: number;
  categoryId?: string;
  dayOfMonth?: number;
  note?: string;
  type?: 'EXPENSE' | 'INCOME';
  isActive?: boolean;
}

export interface UpdateRecurringInput {
  amount?: number;
  categoryId?: string;
  dayOfMonth?: number;
  note?: string;
  type?: 'EXPENSE' | 'INCOME';
  isActive?: boolean;
}
