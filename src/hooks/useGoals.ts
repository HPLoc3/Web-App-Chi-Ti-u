import { useState, useEffect, useCallback } from 'react';
import { Goal } from '../types';
import { goalService } from '../services/firebase/goalService';

export function useGoals(userId: string | null) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState<boolean>(!!userId);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setGoals([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = goalService.subscribeGoals(
      userId,
      (fetchedGoals) => {
        setGoals(fetchedGoals);
        setLoading(false);
      },
      (err) => {
        setError(err.message || 'Lỗi tải mục tiêu tiết kiệm');
        setLoading(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [userId]);

  const addGoal = useCallback(
    async (goal: Omit<Goal, 'id'>) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const tempId = `temp-${Date.now()}`;
      const tempGoal: Goal = { ...goal, id: tempId };
      setGoals((prev) => [tempGoal, ...prev]);

      try {
        const created = await goalService.addGoal(userId, goal);
        return created;
      } catch (err: any) {
        setGoals((prev) => prev.filter((g) => g.id !== tempId));
        setError(err?.message || 'Không thể tạo mục tiêu mới');
        throw err;
      }
    },
    [userId]
  );

  const updateGoal = useCallback(
    async (goal: Goal) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = goals.find((g) => g.id === goal.id);
      setGoals((prev) => prev.map((g) => (g.id === goal.id ? goal : g)));

      try {
        await goalService.updateGoal(userId, goal);
      } catch (err: any) {
        if (original) {
          setGoals((prev) => prev.map((g) => (g.id === goal.id ? original : g)));
        }
        setError(err?.message || 'Không thể cập nhật mục tiêu');
        throw err;
      }
    },
    [userId, goals]
  );

  const deleteGoal = useCallback(
    async (goalId: string) => {
      if (!userId) throw new Error('Người dùng chưa đăng nhập');

      const original = goals.find((g) => g.id === goalId);
      setGoals((prev) => prev.filter((g) => g.id !== goalId));

      try {
        await goalService.deleteGoal(userId, goalId);
      } catch (err: any) {
        if (original) {
          setGoals((prev) => [...prev, original]);
        }
        setError(err?.message || 'Không thể xóa mục tiêu');
        throw err;
      }
    },
    [userId, goals]
  );

  return {
    goals,
    loading,
    error,
    isEmpty: !loading && goals.length === 0,
    addGoal,
    updateGoal,
    deleteGoal,
  };
}
