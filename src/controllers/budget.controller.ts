import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import { resolveCategoryId } from '../services/category.helper';

/**
 * GET /api/budget
 * Lấy thiết lập ngân sách & hạn mức từng danh mục của user
 */
export const getBudget = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  let budget = await prisma.budget.findUnique({
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

  if (!budget) {
    // Tự động tạo bản ghi mặc định
    budget = await prisma.budget.create({
      data: {
        income: new Prisma.Decimal(25000000),
        budgetTemplate: '50_30_20',
        userId,
      },
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

  // Parse category limits object
  const categoryLimits: Record<string, number> = {};

  if (budget.categoryLimits) {
    try {
      const parsed = JSON.parse(budget.categoryLimits);
      Object.assign(categoryLimits, parsed);
    } catch (e) {
      // Ignore JSON parse error
    }
  }

  // Bổ sung từ BudgetLimit relation
  for (const limit of budget.budgetLimits) {
    categoryLimits[limit.categoryId] = Number(limit.amount);
  }

  res.status(200).json({
    success: true,
    data: {
      id: budget.id,
      income: Number(budget.income),
      budgetTemplate: budget.budgetTemplate,
      needsPercent: budget.needsPercent,
      wantsPercent: budget.wantsPercent,
      savingsPercent: budget.savingsPercent,
      categoryLimits,
      limits: budget.budgetLimits.map(l => ({
        categoryId: l.categoryId,
        categoryName: l.category.name,
        amount: Number(l.amount),
      })),
    },
  });
};

/**
 * PUT /api/budget
 * Cập nhật thu nhập, mẫu ngân sách, và hạn mức chi tiêu từng danh mục
 */
export const updateBudget = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const {
    income,
    budgetTemplate,
    categoryLimits,
    needsPercent,
    wantsPercent,
    savingsPercent,
  } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    // 1. Tìm hoặc tạo bản ghi Budget
    let budget = await tx.budget.findUnique({
      where: { userId },
    });

    const updateData: Prisma.BudgetUpdateInput = {};

    if (income !== undefined) {
      updateData.income = new Prisma.Decimal(Math.max(Number(income) || 0, 0));
    }

    if (budgetTemplate !== undefined) {
      updateData.budgetTemplate = String(budgetTemplate);
    }

    if (needsPercent !== undefined) updateData.needsPercent = Number(needsPercent);
    if (wantsPercent !== undefined) updateData.wantsPercent = Number(wantsPercent);
    if (savingsPercent !== undefined) updateData.savingsPercent = Number(savingsPercent);

    if (categoryLimits !== undefined) {
      updateData.categoryLimits = JSON.stringify(categoryLimits);
    }

    if (!budget) {
      budget = await tx.budget.create({
        data: {
          income: updateData.income as Prisma.Decimal || new Prisma.Decimal(25000000),
          budgetTemplate: (updateData.budgetTemplate as string) || '50_30_20',
          categoryLimits: JSON.stringify(categoryLimits || {}),
          userId,
        },
      });
    } else {
      budget = await tx.budget.update({
        where: { id: budget.id },
        data: updateData,
      });
    }

    // 2. Cập nhật bảng BudgetLimit nếu có truyền categoryLimits
    if (categoryLimits && typeof categoryLimits === 'object') {
      for (const [catId, limitAmt] of Object.entries(categoryLimits)) {
        const numLimit = new Prisma.Decimal(Math.max(Number(limitAmt) || 0, 0));
        const validCatId = await resolveCategoryId(catId, userId);

        await tx.budgetLimit.upsert({
          where: {
            budgetId_categoryId: {
              budgetId: budget.id,
              categoryId: validCatId,
            },
          },
          update: {
            amount: numLimit,
          },
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

  // Trả về dữ liệu mới nhất
  let finalLimits: Record<string, number> = {};
  if (result.categoryLimits) {
    try {
      finalLimits = JSON.parse(result.categoryLimits);
    } catch (e) {
      // Ignore
    }
  }

  res.status(200).json({
    success: true,
    message: 'Cập nhật thiết lập ngân sách thành công.',
    data: {
      id: result.id,
      income: Number(result.income),
      budgetTemplate: result.budgetTemplate,
      needsPercent: result.needsPercent,
      wantsPercent: result.wantsPercent,
      savingsPercent: result.savingsPercent,
      categoryLimits: finalLimits,
    },
  });
};
