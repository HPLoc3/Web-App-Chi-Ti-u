import { prisma } from '../../lib/prisma';
import { Budget, Prisma } from '@prisma/client';
import { devFallbackStore, DevFallbackStore } from '../../lib/devFallbackStore';

export class BudgetsRepository {
  static async findByUserId(userId: string) {
    try {
      return await prisma.budget.findUnique({
        where: { userId },
        include: {
          budgetLimits: {
            include: {
              category: {
                select: { id: true, name: true, icon: true, color: true },
              },
            },
          },
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        return devFallbackStore.findBudgetByUserId(userId);
      }
      throw error;
    }
  }

  static async createDefault(userId: string): Promise<Budget> {
    try {
      return await prisma.budget.create({
        data: {
          income: new Prisma.Decimal(25000000),
          budgetTemplate: '50_30_20',
          userId,
        },
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        const id = `dev-b-${Date.now()}`;
        const b: Budget = {
          id,
          income: new Prisma.Decimal(25000000),
          budgetTemplate: '50_30_20',
          needsPercent: 50,
          wantsPercent: 30,
          savingsPercent: 20,
          categoryLimits: null,
          userId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devFallbackStore.budgets.set(id, b);
        return b;
      }
      throw error;
    }
  }

  static async updateBudgetAndLimits(
    userId: string,
    updateData: Prisma.BudgetUpdateInput,
    createDataIfMissing: Prisma.BudgetCreateInput,
    categoryLimits?: Record<string, number>,
    resolveCategoryFn?: (catId: string, userId: string) => Promise<string>
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        let budget = await tx.budget.findUnique({
          where: { userId },
        });

        if (!budget) {
          budget = await tx.budget.create({
            data: createDataIfMissing,
          });
        } else {
          budget = await tx.budget.update({
            where: { id: budget.id },
            data: updateData,
          });
        }

        if (categoryLimits && typeof categoryLimits === 'object' && resolveCategoryFn) {
          for (const [catId, limitAmt] of Object.entries(categoryLimits)) {
            const numLimit = new Prisma.Decimal(Math.max(Number(limitAmt) || 0, 0));
            const validCatId = await resolveCategoryFn(catId, userId);

            await tx.budgetLimit.upsert({
              where: {
                budgetId_categoryId: {
                  budgetId: budget.id,
                  categoryId: validCatId,
                },
              },
              update: { amount: numLimit },
              create: {
                budgetId: budget.id,
                categoryId: validCatId,
                amount: numLimit,
              },
            });
          }
        }

        return budget;
      });
    } catch (error) {
      if (DevFallbackStore.isConnectionError(error)) {
        let budget = devFallbackStore.findBudgetByUserId(userId);
        if (!budget) {
          budget = await this.createDefault(userId);
        }
        return budget;
      }
      throw error;
    }
  }
}
