import { Prisma } from '@prisma/client';
import { GoalsRepository } from './goals.repository';
import { GoalDTO, CreateGoalInput, UpdateGoalInput } from './goals.types';
import { AppError } from '../../middleware/errorHandler.middleware';

export class GoalsService {
  private static formatGoal(goal: any): GoalDTO {
    return {
      id: goal.id,
      name: goal.name,
      target: Number(goal.targetAmount),
      current: Number(goal.currentAmount),
      deadline: goal.deadline ? new Date(goal.deadline).toISOString().slice(0, 10) : undefined,
      color: goal.color || '#F59E0B',
      icon: goal.icon || 'PiggyBank',
      createdAt: goal.createdAt ? new Date(goal.createdAt).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    };
  }

  static async getGoals(userId: string): Promise<GoalDTO[]> {
    const goals = await GoalsRepository.findByUserId(userId);
    return goals.map(this.formatGoal);
  }

  static async createGoal(userId: string, input: CreateGoalInput): Promise<GoalDTO> {
    if (!input.name || input.name.trim() === '') {
      throw new AppError('Tên mục tiêu không được để trống.', 400, 'INVALID_GOAL_NAME');
    }

    const rawTarget = input.target !== undefined ? input.target : input.targetAmount;
    const numTarget = new Prisma.Decimal(rawTarget || 0);

    if (numTarget.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền mục tiêu phải lớn hơn 0.', 400, 'INVALID_GOAL_TARGET');
    }

    const rawCurrent = input.current !== undefined ? input.current : input.currentAmount;
    const numCurrent = new Prisma.Decimal(rawCurrent || 0);

    const goal = await GoalsRepository.create({
      name: input.name.trim(),
      targetAmount: numTarget,
      currentAmount: numCurrent,
      deadline: input.deadline ? new Date(input.deadline) : null,
      color: input.color || '#F59E0B',
      icon: input.icon || 'PiggyBank',
      user: { connect: { id: userId } },
    });

    return this.formatGoal(goal);
  }

  static async updateGoal(id: string, userId: string, input: UpdateGoalInput): Promise<GoalDTO> {
    const existing = await GoalsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Mục tiêu không tồn tại hoặc bạn không có quyền cập nhật.', 404, 'GOAL_NOT_FOUND');
    }

    const dataToUpdate: Prisma.GoalUpdateInput = {};

    if (input.name !== undefined) dataToUpdate.name = input.name.trim();
    if (input.target !== undefined || input.targetAmount !== undefined) {
      const rawTarget = input.target !== undefined ? input.target : input.targetAmount;
      dataToUpdate.targetAmount = new Prisma.Decimal(rawTarget || 0);
    }
    if (input.current !== undefined || input.currentAmount !== undefined) {
      const rawCurrent = input.current !== undefined ? input.current : input.currentAmount;
      dataToUpdate.currentAmount = new Prisma.Decimal(rawCurrent || 0);
    }
    if (input.deadline !== undefined) {
      dataToUpdate.deadline = input.deadline ? new Date(input.deadline) : null;
    }
    if (input.color !== undefined) dataToUpdate.color = input.color;
    if (input.icon !== undefined) dataToUpdate.icon = input.icon;

    const updated = await GoalsRepository.update(id, dataToUpdate);
    return this.formatGoal(updated);
  }

  static async deleteGoal(id: string, userId: string): Promise<void> {
    const existing = await GoalsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Mục tiêu không tồn tại hoặc bạn không có quyền xóa.', 404, 'GOAL_NOT_FOUND');
    }

    await GoalsRepository.delete(id);
  }
}
