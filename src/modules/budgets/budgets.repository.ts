import { prisma } from '../../lib/prisma';
import { Budget, Prisma } from '@prisma/client';

export class BudgetsRepository {
  static async findByUserId(userId: string) {
    return prisma.budget.findUnique({
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
  }

  static async createDefault(userId: string): Promise<Budget> {
    return prisma.budget.create({
      data: {
        income: new Prisma.Decimal(25000000),
        budgetTemplate: '50_30_20',
        userId,
      },
    });
  }

  static async updateBudgetAndLimits(
    userId: string,
    updateData: Prisma.BudgetUpdateInput,
    createDataIfMissing: Prisma.BudgetCreateInput,
    categoryLimits?: Record<string, number>,
    resolveCategoryFn?: (catId: string, userId: string) => Promise<string>
  ) {
    return prisma.$transaction(async (tx) => {
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
  }
}
