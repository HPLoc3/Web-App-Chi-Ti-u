import { useState, useEffect, useCallback } from 'react';
import { Expense } from '../types';
import { expenseService } from '../services/api/expenseService';

export function useExpenses(userId: string | null) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchExpenses = useCallback(async () => {
    if (!userId) {
      setExpenses([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await expenseService.getExpenses();
      setExpenses(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setExpenses([]);
        setError(null);
        return;
      }
      console.error('Error fetching expenses from PostgreSQL API:', err);
      setError(err?.response?.data?.message || err?.message || 'Lỗi tải danh sách chi tiêu');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const addExpense = useCallback(
    async (expense: Omit<Expense, 'id'>) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      // Optimistic update
      const tempId = `temp-${Date.now()}`;
      const tempExpense: Expense = { ...expense, id: tempId };
      setExpenses((prev) => [tempExpense, ...prev]);

      try {
        const created = await expenseService.addExpense(userId, expense);
        setExpenses((prev) => prev.map((e) => (e.id === tempId ? created : e)));
        return created;
      } catch (err: any) {
        // Rollback optimistic update
        setExpenses((prev) => prev.filter((e) => e.id !== tempId));
        setError(err?.response?.data?.message || err?.message || 'Không thể thêm chi tiêu');
        throw err;
      }
    },
    [userId]
  );

  const updateExpense = useCallback(
    async (expense: Expense) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = expenses.find((e) => e.id === expense.id);
      // Optimistic update
      setExpenses((prev) => prev.map((e) => (e.id === expense.id ? expense : e)));

      try {
        const updated = await expenseService.updateExpense(userId, expense);
        setExpenses((prev) => prev.map((e) => (e.id === expense.id ? updated : e)));
        return updated;
      } catch (err: any) {
        if (original) {
          setExpenses((prev) => prev.map((e) => (e.id === expense.id ? original : e)));
        }
        setError(err?.response?.data?.message || err?.message || 'Không thể cập nhật chi tiêu');
        throw err;
      }
    },
    [userId, expenses]
  );

  const deleteExpense = useCallback(
    async (expenseId: string) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = expenses.find((e) => e.id === expenseId);
      // Optimistic update
      setExpenses((prev) => prev.filter((e) => e.id !== expenseId));

      try {
        await expenseService.deleteExpense(userId, expenseId);
      } catch (err: any) {
        if (original) {
          setExpenses((prev) => [original, ...prev]);
        }
        setError(err?.response?.data?.message || err?.message || 'Không thể xóa chi tiêu');
        throw err;
      }
    },
    [userId, expenses]
  );

  const deleteBulkExpenses = useCallback(
    async (ids: string[]) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');
      const original = [...expenses];
      setExpenses((prev) => prev.filter((e) => !ids.includes(e.id)));

      try {
        await expenseService.deleteBulkExpenses(userId, ids);
      } catch (err: any) {
        setExpenses(original);
        setError(err?.response?.data?.message || err?.message || 'Không thể xóa các chi tiêu đã chọn');
        throw err;
      }
    },
    [userId, expenses]
  );

  const addBulkExpenses = useCallback(
    async (items: Omit<Expense, 'id'>[]) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');
      try {
        const createdList = await expenseService.addBulkExpenses(userId, items);
        await fetchExpenses();
        return createdList;
      } catch (err: any) {
        setError(err?.response?.data?.message || err?.message || 'Không thể nhập hàng loạt chi tiêu');
        throw err;
      }
    },
    [userId, fetchExpenses]
  );

  return {
    expenses,
    loading,
    error,
    isEmpty: !loading && expenses.length === 0,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteBulkExpenses,
    addBulkExpenses,
    refetchExpenses: fetchExpenses,
  };
}
