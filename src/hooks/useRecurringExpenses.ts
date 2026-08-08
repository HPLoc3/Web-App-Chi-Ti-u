import { useState, useEffect, useCallback } from 'react';
import { RecurringExpense } from '../types';
import { recurringExpenseService } from '../services/firebase/recurringExpenseService';

export function useRecurringExpenses(userId: string | null) {
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setRecurringExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = recurringExpenseService.subscribeRecurringExpenses(
      userId,
      (items) => {
        setRecurringExpenses(items);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Lỗi tải chi tiêu định kỳ');
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const addRecurringExpense = useCallback(
    async (item: Omit<RecurringExpense, 'id'>) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const tempId = `temp-${Date.now()}`;
      const tempItem: RecurringExpense = { ...item, id: tempId };
      setRecurringExpenses((prev) => [...prev, tempItem]);

      try {
        const created = await recurringExpenseService.addRecurringExpense(userId, item);
        return created;
      } catch (err: any) {
        setRecurringExpenses((prev) => prev.filter((i) => i.id !== tempId));
        setError(err?.message || 'Không thể tạo chi tiêu định kỳ');
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
        await recurringExpenseService.updateRecurringExpense(userId, item);
      } catch (err: any) {
        if (original) {
          setRecurringExpenses((prev) => prev.map((i) => (i.id === item.id ? original : i)));
        }
        setError(err?.message || 'Không thể cập nhật chi tiêu định kỳ');
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
        setError(err?.message || 'Không thể xóa chi tiêu định kỳ');
        throw err;
      }
    },
    [userId, recurringExpenses]
  );

  return {
    recurringExpenses,
    loading,
    error,
    isEmpty: !loading && recurringExpenses.length === 0,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
  };
}
