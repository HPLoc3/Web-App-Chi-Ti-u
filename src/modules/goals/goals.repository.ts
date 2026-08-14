import { prisma } from '../../lib/prisma';
import { Goal, Prisma } from '@prisma/client';

export class GoalsRepository {
  static async findByUserId(userId: string): Promise<Goal[]> {
    return prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Goal | null> {
    return prisma.goal.findFirst({
      where: { id, userId },
    });
  }

  static async create(data: Prisma.GoalCreateInput): Promise<Goal> {
    return prisma.goal.create({
      data,
    });
  }

  static async update(id: string, data: Prisma.GoalUpdateInput): Promise<Goal> {
    return prisma.goal.update({
      where: { id },
      data,
    });
  }

  static async delete(id: string): Promise<void> {
    await prisma.goal.delete({
      where: { id },
    });
  }
}
