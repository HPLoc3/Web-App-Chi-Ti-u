import { apiClient } from '../../lib/apiClient';
import { Expense } from '../../types';

export const expenseService = {
  /**
   * Lấy danh sách giao dịch từ PostgreSQL qua Express API
   */
  async getExpenses(params?: {
    month?: number;
    year?: number;
    categoryId?: string;
    search?: string;
    limit?: number;
    all?: boolean;
  }): Promise<Expense[]> {
    const response = await apiClient.get('/api/transactions', {
      params: {
        all: true,
        ...params,
      },
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map((item: any) => ({
        id: item.id,
        amount: Number(item.amount) || 0,
        categoryId: item.categoryId || 'khac',
        note: item.note || '',
        date: item.date || new Date().toISOString().slice(0, 10),
      }));
    }
    return [];
  },

  /**
   * Tạo giao dịch chi tiêu mới
   */
  async addExpense(
    userId: string,
    expense: Omit<Expense, 'id'>
  ): Promise<Expense> {
    const response = await apiClient.post('/api/transactions', {
      amount: expense.amount,
      categoryId: expense.categoryId,
      note: expense.note,
      date: expense.date,
      type: 'EXPENSE',
    });

    if (response.data && response.data.success && response.data.data) {
      const d = response.data.data;
      return {
        id: d.id,
        amount: Number(d.amount) || 0,
        categoryId: d.categoryId || expense.categoryId,
        note: d.note || expense.note,
        date: d.date || expense.date,
      };
    }

    throw new Error(response.data?.message || 'Không thể tạo giao dịch.');
  },

  /**
   * Cập nhật thông tin giao dịch
   */
  async updateExpense(
    userId: string,
    expense: Expense
  ): Promise<Expense> {
    const response = await apiClient.put(`/api/transactions/${expense.id}`, {
      amount: expense.amount,
      categoryId: expense.categoryId,
      note: expense.note,
      date: expense.date,
      type: 'EXPENSE',
    });

    if (response.data && response.data.success && response.data.data) {
      const d = response.data.data;
      return {
        id: d.id,
        amount: Number(d.amount) || 0,
        categoryId: d.categoryId || expense.categoryId,
        note: d.note || expense.note,
        date: d.date || expense.date,
      };
    }

    throw new Error(response.data?.message || 'Không thể cập nhật giao dịch.');
  },

  /**
   * Xóa một giao dịch
   */
  async deleteExpense(
    userId: string,
    expenseId: string
  ): Promise<void> {
    const response = await apiClient.delete(`/api/transactions/${expenseId}`);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Không thể xóa giao dịch.');
    }
  },

  /**
   * Xóa hàng loạt giao dịch
   */
  async deleteBulkExpenses(
    userId: string,
    ids: string[]
  ): Promise<void> {
    const response = await apiClient.delete('/api/transactions/bulk', {
      data: { ids },
    });
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Không thể xóa các giao dịch đã chọn.');
    }
  },

  /**
   * Nhập nhiều giao dịch (Import sao kê hoặc mẫu)
   */
  async addBulkExpenses(
    userId: string,
    items: Omit<Expense, 'id'>[]
  ): Promise<Expense[]> {
    const response = await apiClient.post('/api/transactions/bulk', {
      items: items.map((i) => ({
        ...i,
        type: 'EXPENSE',
      })),
    });

    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data;
    }

    throw new Error(response.data?.message || 'Không thể nhập danh sách giao dịch.');
  },
};
