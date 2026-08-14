import { apiClient } from '../../lib/apiClient';
import { AppState } from '../../types';

export const syncService = {
  /**
   * Đồng bộ toàn bộ dữ liệu từ client state lên PostgreSQL
   */
  async syncClientState(state: Partial<AppState>): Promise<{ expenses: number; goals: number; recurring: number }> {
    const response = await apiClient.post('/api/sync/client-state', {
      expenses: state.expenses || [],
      goals: state.goals || [],
      recurringExpenses: state.recurringExpenses || [],
      income: state.income,
      budgetTemplate: state.budgetTemplate,
      categoryLimits: state.categoryLimits || {},
    });

    if (response.data && response.data.success) {
      return response.data.stats || { expenses: 0, goals: 0, recurring: 0 };
    }
    throw new Error(response.data?.message || 'Lỗi đồng bộ dữ liệu.');
  },
};
