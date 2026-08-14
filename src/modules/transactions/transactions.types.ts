export interface TransactionDTO {
  id: string;
  amount: number;
  type: string;
  note: string;
  date: string;
  walletId: string;
  walletName?: string;
  categoryId: string;
  categoryName?: string;
  icon?: string;
  color?: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface GetTransactionsQuery {
  page?: number;
  pageSize?: number;
  type?: string;
  categoryId?: string;
  walletId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface CreateTransactionInput {
  amount: number;
  type?: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  walletId?: string;
  note?: string;
  date?: string;
}

export interface UpdateTransactionInput {
  amount?: number;
  type?: 'EXPENSE' | 'INCOME';
  categoryId?: string;
  walletId?: string;
  note?: string;
  date?: string;
}
