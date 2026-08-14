import { prisma } from '../../lib/prisma';
import { Category, Prisma } from '@prisma/client';

export class CategoriesRepository {
  static async findAccessibleCategories(userId?: string): Promise<Category[]> {
    return prisma.category.findMany({
      where: {
        OR: [{ isSystem: true }, { userId: userId || null }],
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    });
  }

  static async findUserCategoryByName(userId: string, name: string, type: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { userId, name, type },
    });
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Category | null> {
    return prisma.category.findFirst({
      where: { id, userId },
    });
  }

  static async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    return prisma.category.create({
      data,
    });
  }

  static async delete(id: string, userId: string): Promise<void> {
    await prisma.$transaction([
      prisma.transaction.updateMany({
        where: { categoryId: id, userId },
        data: { categoryId: 'khac' },
      }),
      prisma.category.delete({
        where: { id },
      }),
    ]);
  }
}
