import { useState, useEffect, useCallback } from 'react';
import { RecurringExpense } from '../types';
import { recurringExpenseService } from '../services/api/recurringExpenseService';

export function useRecurringExpenses(userId: string | null) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchRecurring = useCallback(async () => {
    if (!userId) {
      setRecurringExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await recurringExpenseService.getRecurringExpenses();
      setRecurringExpenses(items);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setRecurringExpenses([]);
        setError(null);
        return;
      }
      console.error('Error fetching recurring expenses from PostgreSQL API:', err);
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải chi tiêu định kỳ');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring]);

  const addRecurringExpense = useCallback(
    async (item: Omit<RecurringExpense, 'id'>) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const tempId = `temp-${Date.now()}`;
      const tempItem: RecurringExpense = { ...item, id: tempId };
      setRecurringExpenses((prev) => [...prev, tempItem]);

      try {
        const created = await recurringExpenseService.addRecurringExpense(userId, item);
        setRecurringExpenses((prev) => prev.map((i) => (i.id === tempId ? created : i)));
        return created;
      } catch (err: any) {
        setRecurringExpenses((prev) => prev.filter((i) => i.id !== tempId));
        setError(err?.response?.data?.message || err?.message || 'Không thể tạo chi tiêu định kỳ');
        throw err;
      }
    },
    [userId]
  );

  const updateRecurringExpense = useCallback(
    async (item: RecurringExpense) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = recurringExpenses.find((i) => i.id === item.id);
      setRecurringExpenses((prev) => prev.map((i) => (i.id === item.id ? item : i)));

      try {
        const updated = await recurringExpenseService.updateRecurringExpense(userId, item);
        setRecurringExpenses((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
        return updated;
      } catch (err: any) {
        if (original) {
          setRecurringExpenses((prev) => prev.map((i) => (i.id === item.id ? original : i)));
        }
        setError(err?.response?.data?.message || err?.message || 'Không thể cập nhật chi tiêu định kỳ');
        throw err;
      }
    },
    [userId, recurringExpenses]
  );

  const deleteRecurringExpense = useCallback(
    async (itemId: string) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = recurringExpenses.find((i) => i.id === itemId);
      setRecurringExpenses((prev) => prev.filter((i) => i.id !== itemId));

      try {
        await recurringExpenseService.deleteRecurringExpense(userId, itemId);
      } catch (err: any) {
        if (original) {
          setRecurringExpenses((prev) => [...prev, original]);
        }
        setError(err?.response?.data?.message || err?.message || 'Không thể xóa chi tiêu định kỳ');
        throw err;
      }
    },
    [userId, recurringExpenses]
  );

  const syncRecurring = useCallback(async () => {
    if (!userId) throw new Error('Người dùng chưa đăng nhập');
    try {
      const result = await recurringExpenseService.syncRecurring();
      await fetchRecurring();
      return result;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Lỗi đồng bộ chi tiêu định kỳ');
      throw err;
    }
  }, [userId, fetchRecurring]);

  return {
    recurringExpenses,
    loading,
    error,
    isEmpty: !loading && recurringExpenses.length === 0,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    syncRecurring,
    refetchRecurring: fetchRecurring,
  };
}
