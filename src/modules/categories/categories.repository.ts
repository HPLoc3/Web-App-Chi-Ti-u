import { prisma } from '../../lib/prisma';
import { Category, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore, DEFAULT_SYSTEM_CATEGORIES } from '../../lib/devFallbackStore';

export class CategoriesRepository {
  static async findAccessibleCategories(userId?: string): Promise<Category[]> {
    try {
      return await prisma.category.findMany({
        where: {
          OR: [{ isSystem: true }, { userId: userId || null }],
        },
        orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return Array.from(devFallbackStore.categories.values());
      }
      throw error;
    }
  }

  static async findUserCategoryByName(userId: string, name: string, type: string): Promise<Category | null> {
    try {
      return await prisma.category.findFirst({
        where: { userId, name, type },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        for (const cat of devFallbackStore.categories.values()) {
          if (cat.userId === userId && cat.name === name && cat.type === type) return cat;
        }
        return null;
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<Category | null> {
    try {
      return await prisma.category.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.categories.get(id) || null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.CategoryCreateInput): Promise<Category> {
    try {
      return await prisma.category.create({
        data,
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const id = `dev-cat-${Date.now()}`;
        const cat: Category = {
          id,
          name: data.name,
          type: data.type || 'EXPENSE',
          icon: data.icon || 'Sparkles',
          color: data.color || '#6B7280',
          isSystem: false,
          userId: (data.user as any)?.connect?.id || null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devFallbackStore.categories.set(id, cat);
        return cat;
      }
      throw error;
    }
  }

  static async delete(id: string, userId: string): Promise<void> {
    try {
      await prisma.$transaction([
        prisma.transaction.updateMany({
          where: { categoryId: id, userId },
          data: { categoryId: 'khac' },
        }),
        prisma.category.delete({
          where: { id },
        }),
      ]);
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        devFallbackStore.categories.delete(id);
        return;
      }
      throw error;
    }
  }
}

