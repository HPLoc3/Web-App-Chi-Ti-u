import { useState, useEffect, useCallback } from 'react';
import { budgetService, BudgetSettingsData } from '../services/firebase/budgetService';

export function useBudget(userId: string | null) {
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettingsData>({});
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setBudgetSettings({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = budgetService.subscribeBudgetSettings(
      userId,
      (data) => {
        setBudgetSettings(data);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Lỗi tải thiết lập ngân sách');
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const updateBudgetSettings = useCallback(
    async (settings: BudgetSettingsData) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      setBudgetSettings((prev) => ({ ...prev, ...settings }));

      try {
        await budgetService.saveBudgetSettings(userId, settings);
      } catch (err: any) {
        setError(err?.message || 'Không thể cập nhật thiết lập ngân sách');
        throw err;
      }
    },
    [userId]
  );

  return {
    budgetSettings,
    income: budgetSettings.income,
    budgetTemplate: budgetSettings.budgetTemplate,
    categoryLimits: budgetSettings.categoryLimits,
    generatedRecurringMonths: budgetSettings.generatedRecurringMonths,
    loading,
    error,
    updateBudgetSettings,
  };
}
