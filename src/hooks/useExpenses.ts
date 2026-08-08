import { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { expenseService } from '../services/firebase/expenseService';

export function useExpenses(userId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = expenseService.subscribeExpenses(
      userId,
      (fetchedExpenses) => {
        setExpenses(fetchedExpenses);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Lỗi tải danh sách chi tiêu');
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const addExpense = useCallback(
    async (expense: Omit<Expense, 'id'>) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempExpense: Expense = { ...expense, id: tempId };
      setExpenses((prev) => [tempExpense, ...prev]);

      try {
        const created = await expenseService.addExpense(userId, expense);
        return created;
      } catch (err: any) {
        // Rollback optimistic update
        setExpenses((prev) => prev.filter((e) => e.id !== tempId));
        setError(err?.message || 'Không thể thêm chi tiêu');
        throw err;
      }
    },
    [userId]
  );

  const updateExpense = useCallback(
    async (expense: Expense) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = expenses.find(e => e.id === expense.id);
      // Optimistic update
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));

      try {
        await expenseService.updateExpense(userId, expense);
      } catch (err: any) {
        if (original) {
          setExpenses((prev) => prev.map((e) => (e.id === expense.id ? original : e)));
        }
        setError(err?.message || 'Không thể cập nhật chi tiêu');
        throw err;
      }
    },
    [userId, expenses]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = expenses.find(e => e.id === expenseId);
      // Optimistic update
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

      try {
        await expenseService.deleteExpense(userId, expenseId);
      } catch (err: any) {
        if (original) {
          setExpenses((prev) => [...prev, original]);
        }
        setError(err?.message || 'Không thể xóa chi tiêu');
        throw err;
      }
    },
    [userId, expenses]
  );

  return {
    expenses,
    loading,
    error,
    isEmpty: !loading && expenses.length === 0,
    addExpense,
    updateExpense,
    deleteExpense,
  };
}
