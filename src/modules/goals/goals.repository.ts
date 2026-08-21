import { prisma } from '../../lib/prisma';
import { Goal, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class GoalsRepository {
  static async findByUserId(userId: string): Promise<Goal[]> {
    try {
      return await prisma.goal.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.getUserGoals(userId);
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Goal | null> {
    try {
      return await prisma.goal.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.goals.get(id) || null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.GoalCreateInput): Promise<Goal> {
    try {
      return await prisma.goal.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const id = `dev-goal-${Date.now()}`;
        const g: Goal = {
          id,
          name: data.name,
          targetAmount: new Prisma.Decimal(data.targetAmount?.toString() || '0'),
          currentAmount: data.currentAmount ? new Prisma.Decimal(data.currentAmount.toString()) : new Prisma.Decimal(0),
          deadline: data.deadline ? new Date(data.deadline) : null,
          color: data.color || '#3B82F6',
          icon: data.icon || 'Target',
          userId: (data.user as any)?.connect?.id || 'dev-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devFallbackStore.goals.set(id, g);
        return g;
      }
      throw error;
    }
  }

  static async update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    try {
      return await prisma.goal.update({
        where: { id },
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const g = devFallbackStore.goals.get(id);
        if (g) {
          if (data.name) g.name = String(data.name);
          if (data.targetAmount) g.targetAmount = new Prisma.Decimal(data.targetAmount.toString());
          if (data.currentAmount) g.currentAmount = new Prisma.Decimal(data.currentAmount.toString());
          g.updatedAt = new Date();
          devFallbackStore.goals.set(id, g);
          return g;
        }
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.goal.delete({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.goals.delete(id);
        return;
      }
      throw error;
    }
  }
}
