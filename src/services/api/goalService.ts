import { apiClient } from '../../lib/apiClient';
import { Goal } from '../../types';

export const goalService = {
  /**
   * Lấy danh sách mục tiêu tiết kiệm từ Backend PostgreSQL
   */
  async getGoals(): Promise<Goal[]> {
    const response = await apiClient.get('/api/goals');
    if (response.data && response.data.success && Array.isArray(response.data.data)) {
      return response.data.data.map((g: any) => ({
        id: g.id,
        name: g.name,
        target: Number(g.target) || 0,
        current: Number(g.current) || 0,
        createdAt: g.createdAt || new Date().toISOString().slice(0, 10),
      }));
    }
    return [];
  },

  /**
   * Tạo mục tiêu mới
   */
  async addGoal(
    userId: string,
    goal: Omit<Goal, 'id'>
  ): Promise<Goal> {
    const response = await apiClient.post('/api/goals', {
      name: goal.name,
      target: goal.target,
      current: goal.current || 0,
      createdAt: goal.createdAt,
    });

    if (response.data && response.data.success && response.data.data) {
      const g = response.data.data;
      return {
        id: g.id,
        name: g.name,
        target: Number(g.target) || goal.target,
        current: Number(g.current) || goal.current,
        createdAt: g.createdAt || goal.createdAt,
      };
    }

    throw new Error(response.data?.message || 'Không thể tạo mục tiêu mới.');
  },

  /**
   * Cập nhật mục tiêu
   */
  async updateGoal(
    userId: string,
    goal: Goal
  ): Promise<Goal> {
    const response = await apiClient.put(`/api/goals/${goal.id}`, {
      name: goal.name,
      target: goal.target,
      current: goal.current,
    });

    if (response.data && response.data.success && response.data.data) {
      const g = response.data.data;
      return {
        id: g.id,
        name: g.name,
        target: Number(g.target) || goal.target,
        current: Number(g.current) || goal.current,
        createdAt: g.createdAt || goal.createdAt,
      };
    }

    throw new Error(response.data?.message || 'Không thể cập nhật mục tiêu.');
  },

  /**
   * Xóa mục tiêu
   */
  async deleteGoal(
    userId: string,
    goalId: string
  ): Promise<void> {
    const response = await apiClient.delete(`/api/goals/${goalId}`);
    if (!response.data || !response.data.success) {
      throw new Error(response.data?.message || 'Không thể xóa mục tiêu.');
    }
  },
};
