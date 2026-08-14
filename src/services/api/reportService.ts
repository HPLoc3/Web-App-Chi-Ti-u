import { apiClient } from '../../lib/apiClient';
import { FinancialInsight, HealthScoreBreakdown } from '../../types';

export interface SummaryReportData {
  period: {
    month: number;
    year: number;
    startDate: string;
    endDate: string;
  };
  summary: {
    totalIncome: number;
    totalExpense: number;
    netBalance: number;
    totalWalletBalance: number;
    savingsRatePercent: number;
  };
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    icon: string;
    color: string;
    totalAmount: number;
    transactionCount: number;
    percentage: number;
  }>;
}

export interface InsightsReportData {
  healthScore: HealthScoreBreakdown;
  insights: FinancialInsight[];
}

export const reportService = {
  /**
   * Lấy báo cáo tổng hợp thu chi theo tháng từ backend
   */
  async getSummaryReport(month?: number, year?: number): Promise<SummaryReportData> {
    const response = await apiClient.get('/api/reports/summary', {
      params: { month, year },
    });

    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Không thể tải báo cáo tài chính.');
  },

  /**
   * Lấy điểm sức khỏe tài chính và insight thông minh từ backend
   */
  async getFinancialInsights(): Promise<InsightsReportData> {
    const response = await apiClient.get('/api/reports/insights');
    if (response.data && response.data.success) {
      return {
        healthScore: response.data.healthScore,
        insights: response.data.insights || [],
      };
    }
    throw new Error(response.data?.message || 'Không thể tải phân tích tài chính.');
  },
};
