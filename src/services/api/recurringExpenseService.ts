import { apiClient } from '../../lib/apiClient';
import { RecurringExpense } from '../../types';

export const recurringExpenseService = {
  /**
   * Lấy danh sách chi tiêu định kỳ từ PostgreSQL
   */
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    const response = await apiClient.get('/api/recurring');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map((item: any) => ({
        id: item.id,
        amount: Number(item.amount) || 0,
        categoryId: item.categoryId || 'khac',
        dayOfMonth: Number(item.dayOfMonth) || 1,
        note: item.note || '',
        frequency: item.frequency || 'monthly',
        isActive: item.isActive !== false,
      }));
    }
    return [];
  },

  /**
   * Tạo chi tiêu định kỳ mới
   */
  async addRecurringExpense(
    userId: string,
    item: Omit<RecurringExpense, 'id'>
  ): Promise<RecurringExpense> {
    const response = await apiClient.post('/api/recurring', {
      amount: item.amount,
      categoryId: item.categoryId,
      dayOfMonth: item.dayOfMonth,
      note: item.note,
      frequency: item.frequency || 'monthly',
      isActive: item.isActive !== false,
    });

    if (response.data && response.data.success && response.data.data) {
      const d = response.data.data;
      return {
        id: d.id,
        amount: Number(d.amount) || item.amount,
        categoryId: d.categoryId || item.categoryId,
        dayOfMonth: Number(d.dayOfMonth) || item.dayOfMonth,
        note: d.note || item.note,
        frequency: d.frequency || 'monthly',
        isActive: d.isActive !== false,
      };
    }

    throw new Error(response.data?.message || 'Không thể tạo khoản định kỳ.');
  },

  /**
   * Cập nhật chi tiêu định kỳ
   */
  async updateRecurringExpense(
    userId: string,
    item: RecurringExpense
  ): Promise<RecurringExpense> {
    const response = await apiClient.put(`/api/recurring/${item.id}`, {
      amount: item.amount,
      categoryId: item.categoryId,
      dayOfMonth: item.dayOfMonth,
      note: item.note,
      frequency: item.frequency || 'monthly',
      isActive: item.isActive !== false,
    });

    if (response.data && response.data.success && response.data.data) {
      const d = response.data.data;
      return {
        id: d.id,
        amount: Number(d.amount) || item.amount,
        categoryId: d.categoryId || item.categoryId,
        dayOfMonth: Number(d.dayOfMonth) || item.dayOfMonth,
        note: d.note || item.note,
        frequency: d.frequency || 'monthly',
        isActive: d.isActive !== false,
      };
    }

    throw new Error(response.data?.message || 'Không thể cập nhật khoản định kỳ.');
  },

  /**
   * Xóa chi tiêu định kỳ
   */
  async deleteRecurringExpense(
    userId: string,
    itemId: string
  ): Promise<void> {
    const response = await apiClient.delete(`/api/recurring/${itemId}`);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Không thể xóa khoản định kỳ.');
    }
  },

  /**
   * Kích hoạt đồng bộ giao dịch tự động từ định kỳ
   */
  async syncRecurring(): Promise<{ syncedCount: number; message: string }> {
    const response = await apiClient.post('/api/recurring/sync');
    if (response.data && response.data.success) {
      return {
        syncedCount: response.data.syncedCount || 0,
        message: response.data.message || 'Đồng bộ thành công.',
      };
    }
    throw new Error(response.data?.message || 'Không thể đồng bộ khoản định kỳ.');
  },
};
