import { useState, useEffect, useCallback } from 'react';
import { reportService, SummaryReportData, InsightsReportData } from '../services/api/reportService';

export function useReports(userId: string | null, month?: number, year?: number) {
  const [summary, setSummary] = useState<SummaryReportData | null>(null);
  const [insightsData, setInsightsData] = useState<InsightsReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    if (!userId) {
      setSummary(null);
      setInsightsData(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [sum, ins] = await Promise.all([
        reportService.getSummaryReport(month, year),
        reportService.getFinancialInsights(),
      ]);
      setSummary(sum);
      setInsightsData(ins);
    } catch (err: any) {
      console.error('Error fetching reports from backend:', err);
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải báo cáo');
    } finally {
      setLoading(false);
    }
  }, [userId, month, year]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return {
    summary,
    healthScore: insightsData?.healthScore,
    insights: insightsData?.insights || [],
    loading,
    error,
    refetchReports: fetchReports,
  };
}
