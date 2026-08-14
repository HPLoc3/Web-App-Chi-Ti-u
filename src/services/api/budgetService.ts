import { apiClient } from '../../lib/apiClient';

export interface BudgetSettingsData {
  income?: number;
  budgetTemplate?: 'none' | '50_30_20' | '6_jars' | '10_20_70' | 'custom';
  categoryLimits?: Record<string, number>;
  needsPercent?: number;
  wantsPercent?: number;
  savingsPercent?: number;
}

export const budgetService = {
  /**
   * Lấy thiết lập ngân sách từ Backend
   */
  async getBudgetSettings(): Promise<BudgetSettingsData> {
    const response = await apiClient.get('/api/budget');
    if (response.data && response.data.success && response.data.data) {
      const d = response.data.data;
      return {
        income: typeof d.income === 'number' ? d.income : 25000000,
        budgetTemplate: d.budgetTemplate || '50_30_20',
        categoryLimits: d.categoryLimits || {},
        needsPercent: d.needsPercent,
        wantsPercent: d.wantsPercent,
        savingsPercent: d.savingsPercent,
      };
    }
    return {
      income: 25000000,
      budgetTemplate: '50_30_20',
      categoryLimits: {},
    };
  },

  /**
   * Lưu thiết lập ngân sách vào PostgreSQL
   */
  async saveBudgetSettings(
    userId: string,
    settings: BudgetSettingsData
  ): Promise<BudgetSettingsData> {
    const response = await apiClient.put('/api/budget', settings);
    if (response.data && response.data.success && response.data.data) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Không thể lưu thiết lập ngân sách.');
  },
};
