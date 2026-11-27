import { apiClient } from '../../lib/apiClient';
import { RecurringExpense } from '../../types';

const toRecurringExpense = (d: any): RecurringExpense => ({
  id: d.id,
  amount: Number(d.amount) || 0,
  categoryId: d.categoryId || 'khac',
  dayOfMonth: Number(d.dayOfMonth) || 1,
  note: d.note || '',
  frequency: d.frequency || 'monthly',
  startDate: d.startDate || undefined,
  nextPaymentDate: d.nextPaymentDate || undefined,
  isActive: d.isActive !== false,
});

const toPayload = (item: Omit<RecurringExpense, 'id'>) => ({
  amount: item.amount,
  categoryId: item.categoryId,
  dayOfMonth: item.dayOfMonth,
  note: item.note,
  frequency: item.frequency || 'monthly',
  startDate: item.startDate || undefined,
  isActive: item.isActive !== false,
});

export interface RecurringSyncResponse {
  syncedCount: number;
  skippedMissed: number;
  failedCount: number;
  message: string;
}

export const recurringExpenseService = {
  /**
   * Lấy danh sách chi tiêu định kỳ từ PostgreSQL
   */
  async getRecurringExpenses(): Promise<RecurringExpense[]> {
    const response = await apiClient.get('/api/recurring');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map(toRecurringExpense);
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
    const response = await apiClient.post('/api/recurring', toPayload(item));

    if (response.data && response.data.success && response.data.data) {
      return toRecurringExpense(response.data.data);
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
    const response = await apiClient.put(`/api/recurring/${item.id}`, toPayload(item));

    if (response.data && response.data.success && response.data.data) {
      return toRecurringExpense(response.data.data);
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
  async syncRecurring(): Promise<RecurringSyncResponse> {
    const response = await apiClient.post('/api/recurring/sync');
    if (response.data && response.data.success) {
      return {
        syncedCount: response.data.syncedCount || 0,
        skippedMissed: response.data.skippedMissed || 0,
        failedCount: response.data.failedCount || 0,
        message: response.data.message || 'Đồng bộ thành công.',
      };
    }
    throw new Error(response.data?.message || 'Không thể đồng bộ khoản định kỳ.');
  },
};
