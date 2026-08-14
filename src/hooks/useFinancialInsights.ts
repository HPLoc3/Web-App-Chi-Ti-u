import { useState, useEffect, useCallback, useMemo } from 'react';
import { AppState, Expense } from '../types';
import { reportService, InsightsReportData } from '../services/api/reportService';
import { CATEGORIES } from '../constants/categories';

export interface FinancialHealthScore {
  score: number;
  status: 'EXCELLENT' | 'GOOD' | 'WARNING' | 'CRITICAL';
  statusText: string;
  color: string;
  savingsRate: number;
  spendingRate: number;
  topCategoryName: string;
  topCategorySpent: number;
  overBudgetCount: number;
}

export function useFinancialInsights(state?: AppState, userId?: string | null) {
  const [insightsData, setInsightsData] = useState<InsightsReportData | null>(null);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchInsights = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await reportService.getFinancialInsights();
      setInsightsData(data);
    } catch (err: any) {
      console.warn('Backend insights fetch failed, falling back to local computation:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchInsights();
    }
  }, [userId, fetchInsights]);

  const healthScore = useMemo<FinancialHealthScore>(() => {
    if (!state) {
      return {
        score: 80,
        status: 'GOOD',
        statusText: 'Tốt',
        color: '#10B981',
        savingsRate: 20,
        spendingRate: 80,
        topCategoryName: 'Khác',
        topCategorySpent: 0,
        overBudgetCount: 0,
      };
    }

    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    const monthExpenses = state.expenses.filter((e) => e.date && e.date.startsWith(currentMonthStr));
    const totalSpent = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
    const income = state.income || 15000000;

    const spendingRate = income > 0 ? (totalSpent / income) * 100 : 0;
    const savingsRate = Math.max(0, 100 - spendingRate);

    // Calculate top category
    const catTotals: Record<string, number> = {};
    monthExpenses.forEach((e) => {
      catTotals[e.categoryId] = (catTotals[e.categoryId] || 0) + e.amount;
    });

    let topCatId = 'khac';
    let maxSpent = 0;
    Object.entries(catTotals).forEach(([id, amt]) => {
      if (amt > maxSpent) {
        maxSpent = amt;
        topCatId = id;
      }
    });

    const topCatObj = CATEGORIES.find((c) => c.id === topCatId);

    // Over budget categories count
    let overBudgetCount = 0;
    Object.entries(state.categoryLimits || {}).forEach(([catId, limit]) => {
      if (limit > 0) {
        const spent = catTotals[catId] || 0;
        if (spent > limit) overBudgetCount++;
      }
    });

    // Score algorithm
    let score = 100;
    if (spendingRate > 100) score -= 40;
    else if (spendingRate > 80) score -= 20;
    else if (spendingRate > 60) score -= 10;

    score -= overBudgetCount * 10;
    score = Math.max(10, Math.min(100, Math.round(score)));

    let status: FinancialHealthScore['status'] = 'GOOD';
    let statusText = 'Tốt';
    let color = '#10B981';

    if (score >= 85) {
      status = 'EXCELLENT';
      statusText = 'Xuất sắc';
      color = '#059669';
    } else if (score >= 65) {
      status = 'GOOD';
      statusText = 'Khá';
      color = '#10B981';
    } else if (score >= 45) {
      status = 'WARNING';
      statusText = 'Cần chú ý';
      color = '#F59E0B';
    } else {
      status = 'CRITICAL';
      statusText = 'Nguy cơ cao';
      color = '#EF4444';
    }

    const finalScore = typeof insightsData?.healthScore === 'number' 
      ? insightsData.healthScore 
      : (insightsData?.healthScore?.totalScore ?? score);

    return {
      score: finalScore,
      status,
      statusText,
      color,
      savingsRate,
      spendingRate,
      topCategoryName: topCatObj?.name || 'Khác',
      topCategorySpent: maxSpent,
      overBudgetCount,
    };
  }, [state, insightsData]);

  return {
    healthScore,
    insights: insightsData?.insights || [],
    loading,
    error,
    refetchInsights: fetchInsights,
  };
}
