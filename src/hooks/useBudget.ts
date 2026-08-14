import { useState, useEffect, useCallback } from 'react';
import { budgetService, BudgetSettingsData } from '../services/api/budgetService';

export function useBudget(userId: string | null) {
  const [budgetSettings, setBudgetSettings] = useState<BudgetSettingsData>({});
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchBudget = useCallback(async () => {
    if (!userId) {
      setBudgetSettings({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await budgetService.getBudgetSettings();
      setBudgetSettings(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setBudgetSettings({});
        setError(null);
        return;
      }
      console.error('Error fetching budget from PostgreSQL API:', err);
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải thiết lập ngân sách');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const updateBudgetSettings = useCallback(
    async (settings: BudgetSettingsData) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const prev = { ...budgetSettings };
      setBudgetSettings((curr) => ({ ...curr, ...settings }));

      try {
        const saved = await budgetService.saveBudgetSettings(userId, settings);
        setBudgetSettings((curr) => ({ ...curr, ...saved }));
        return saved;
      } catch (err: any) {
        setBudgetSettings(prev);
        setError(err?.response?.data?.message || err?.message || 'Không thể cập nhật thiết lập ngân sách');
        throw err;
      }
    },
    [userId, budgetSettings]
  );

  return {
    budgetSettings,
    income: budgetSettings.income,
    budgetTemplate: budgetSettings.budgetTemplate,
    categoryLimits: budgetSettings.categoryLimits,
    loading,
    error,
    updateBudgetSettings,
    refetchBudget: fetchBudget,
  };
}
