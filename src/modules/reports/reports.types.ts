export interface SummaryReportQuery {
  month?: number;
  year?: number;
}

export interface SummaryReportResult {
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

export interface FinancialInsightsResult {
  healthScore: {
    savingsRateScore: number;
    budgetAdherenceScore: number;
    spendingStabilityScore: number;
    goalsProgressScore: number;
    recurringRatioScore: number;
    totalScore: number;
    savingsRatePercent: number;
    overspendingCount: number;
    recurringIncomeRatioPercent: number;
  };
  insights: Array<{
    id: string;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'positive' | 'recommendation';
    metricLabel?: string;
    metricValue?: string;
    category?: string;
    actionableStep?: string;
  }>;
}
