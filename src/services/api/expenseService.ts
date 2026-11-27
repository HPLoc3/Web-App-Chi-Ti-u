import { apiClient } from '../../lib/apiClient';
import { Expense } from '../../types';

/** Bằng pageSize tối đa của server */
const PAGE_SIZE = 500;
/** Chốt chống lặp vô hạn (100.000 giao dịch). Chạm chốt thì báo lỗi, không cắt bớt âm thầm. */
const MAX_PAGES = 200;

export const expenseService = {
  /**
   * Lấy toàn bộ khoản chi từ PostgreSQL qua Express API (đi hết các trang).
   * Một trang lỗi thì ném lỗi, không trả danh sách thiếu.
   */
  async getExpenses(params?: {
    month?: number;
    year?: number;
    categoryId?: string;
    search?: string;
  }): Promise<Expense[]> {
    // Theo id: giao dịch mới chen vào giữa hai trang không làm bản ghi bị lặp
    const byId = new Map<string, Expense>();

    for (let page = 1; page <= MAX_PAGES; page++) {
      const response = await apiClient.get('/api/transactions', {
        params: { ...params, type: 'EXPENSE', page, pageSize: PAGE_SIZE },
      });
      const body = response.data;
      if (!body?.success || !Array.isArray(body.data)) {
        throw new Error('Phản hồi danh sách giao dịch không hợp lệ.');
      }

      for (const item of body.data) {
        byId.set(item.id, {
          id: item.id,
          amount: Number(item.amount) || 0,
          categoryId: item.categoryId || 'khac',
          note: item.note || '',
          date: item.date || new Date().toISOString().slice(0, 10),
        });
      }

      if (!body.meta?.hasNextPage) return Array.from(byId.values());
      if (body.data.length === 0) {
        throw new Error('Phản hồi phân trang giao dịch không hợp lệ.');
      }
    }

    throw new Error('Có quá nhiều giao dịch để tải một lần.');
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
