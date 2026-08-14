import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';

function formatGoal(goal: any) {
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

/**
 * GET /api/goals
 * Lấy danh sách mục tiêu tiết kiệm của authenticated user
 */
export const getGoals = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const goals = await prisma.goal.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const formattedGoals = goals.map(formatGoal);

  res.status(200).json({
    success: true,
    count: formattedGoals.length,
    data: formattedGoals,
  });
};

/**
 * POST /api/goals
 * Tạo mục tiêu tiết kiệm mới
 */
export const createGoal = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { name, target, targetAmount, current, currentAmount, deadline, color, icon } = req.body;

  if (!name || String(name).trim() === '') {
    throw new AppError('Tên mục tiêu không được để trống.', 400, 'INVALID_GOAL_NAME');
  }

  const rawTarget = target !== undefined ? target : targetAmount;
  const numTarget = new Prisma.Decimal(rawTarget || 0);

  if (numTarget.lessThanOrEqualTo(0)) {
    throw new AppError('Số tiền mục tiêu phải lớn hơn 0.', 400, 'INVALID_GOAL_TARGET');
  }

  const rawCurrent = current !== undefined ? current : currentAmount;
  const numCurrent = new Prisma.Decimal(rawCurrent || 0);

  const goal = await prisma.goal.create({
    data: {
      name: String(name).trim(),
      targetAmount: numTarget,
      currentAmount: numCurrent,
      deadline: deadline ? new Date(deadline) : null,
      color: color || '#F59E0B',
      icon: icon || 'PiggyBank',
      userId,
    },
  });

  res.status(201).json({
    success: true,
    message: 'Tạo mục tiêu tiết kiệm thành công.',
    data: formatGoal(goal),
  });
};

/**
 * PUT /api/goals/:id
 * Cập nhật tiến độ hoặc thông tin mục tiêu
 */
export const updateGoal = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const goalId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId },
  });

  if (!existing) {
    throw new AppError('Mục tiêu không tồn tại hoặc bạn không có quyền cập nhật.', 404, 'GOAL_NOT_FOUND');
  }

  const { name, target, targetAmount, current, currentAmount, deadline, color, icon } = req.body;

  const dataToUpdate: Prisma.GoalUpdateInput = {};

  if (name !== undefined) dataToUpdate.name = String(name).trim();
  if (target !== undefined || targetAmount !== undefined) {
    const rawTarget = target !== undefined ? target : targetAmount;
    dataToUpdate.targetAmount = new Prisma.Decimal(rawTarget);
  }
  if (current !== undefined || currentAmount !== undefined) {
    const rawCurrent = current !== undefined ? current : currentAmount;
    dataToUpdate.currentAmount = new Prisma.Decimal(rawCurrent);
  }
  if (deadline !== undefined) {
    dataToUpdate.deadline = deadline ? new Date(deadline) : null;
  }
  if (color !== undefined) dataToUpdate.color = color;
  if (icon !== undefined) dataToUpdate.icon = icon;

  const updatedGoal = await prisma.goal.update({
    where: { id: goalId },
    data: dataToUpdate,
  });

  res.status(200).json({
    success: true,
    message: 'Cập nhật mục tiêu thành công.',
    data: formatGoal(updatedGoal),
  });
};

/**
 * DELETE /api/goals/:id
 * Xóa mục tiêu tiết kiệm
 */
export const deleteGoal = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const goalId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const existing = await prisma.goal.findFirst({
    where: { id: goalId, userId },
  });

  if (!existing) {
    throw new AppError('Mục tiêu không tồn tại hoặc bạn không có quyền xóa.', 404, 'GOAL_NOT_FOUND');
  }

  await prisma.goal.delete({
    where: { id: goalId },
  });

  res.status(200).json({
    success: true,
    message: 'Đã xóa mục tiêu thành công.',
  });
};
