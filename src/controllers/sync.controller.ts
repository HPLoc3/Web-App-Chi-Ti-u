import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import { resolveCategoryId } from '../services/category.helper';

/**
 * POST /api/sync/client-state
 * Đồng bộ toàn bộ state từ client (guest/localState) lên PostgreSQL cho authenticated user
 */
export const syncClientState = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { expenses = [], goals = [], recurringExpenses = [], income, budgetTemplate, categoryLimits = {} } = req.body;

  // Lấy hoặc tạo ví mặc định
  let wallet = await prisma.wallet.findFirst({
    where: { userId },
  });
  if (!wallet) {
    wallet = await prisma.wallet.create({
      data: {
        name: 'Ví Chính',
        balance: new Prisma.Decimal(0),
        currency: 'VND',
        isDefault: true,
        userId,
      },
    });
  }

  // 1. Cập nhật Budget
  if (income !== undefined || budgetTemplate !== undefined || categoryLimits !== undefined) {
    await prisma.budget.upsert({
      where: { userId },
      update: {
        income: income !== undefined ? new Prisma.Decimal(Math.max(Number(income) || 0, 0)) : undefined,
        budgetTemplate: budgetTemplate || undefined,
        categoryLimits: JSON.stringify(categoryLimits),
      },
      create: {
        income: new Prisma.Decimal(Math.max(Number(income) || 25000000, 0)),
        budgetTemplate: budgetTemplate || '50_30_20',
        categoryLimits: JSON.stringify(categoryLimits),
        userId,
      },
    });
  }

  // 2. Chèn các giao dịch chi tiêu chưa tồn tại
  let insertedExpensesCount = 0;
  if (Array.isArray(expenses) && expenses.length > 0) {
    for (const exp of expenses) {
      const numAmt = new Prisma.Decimal(exp.amount || 0);
      if (numAmt.lessThanOrEqualTo(0)) continue;

      const validCatId = await resolveCategoryId(exp.categoryId, userId, 'EXPENSE');
      const expDate = exp.date ? new Date(exp.date) : new Date();

      await prisma.transaction.create({
        data: {
          amount: numAmt,
          type: 'EXPENSE',
          note: exp.note ? String(exp.note).slice(0, 500) : '',
          date: expDate,
          walletId: wallet.id,
          categoryId: validCatId,
          userId,
        },
      });
      insertedExpensesCount++;
    }
  }

  // 3. Chèn các mục tiêu tiết kiệm
  let insertedGoalsCount = 0;
  if (Array.isArray(goals) && goals.length > 0) {
    for (const g of goals) {
      if (!g.name) continue;
      await prisma.goal.create({
        data: {
          name: String(g.name).trim(),
          targetAmount: new Prisma.Decimal(g.target || g.targetAmount || 0),
          currentAmount: new Prisma.Decimal(g.current || g.currentAmount || 0),
          deadline: g.deadline ? new Date(g.deadline) : null,
          color: g.color || '#F59E0B',
          userId,
        },
      });
      insertedGoalsCount++;
    }
  }

  // 4. Chèn các khoản định kỳ
  let insertedRecurringCount = 0;
  if (Array.isArray(recurringExpenses) && recurringExpenses.length > 0) {
    for (const r of recurringExpenses) {
      const numAmt = new Prisma.Decimal(r.amount || 0);
      if (numAmt.lessThanOrEqualTo(0)) continue;

      const validCatId = await resolveCategoryId(r.categoryId, userId, 'EXPENSE');
      await prisma.recurringTransaction.create({
        data: {
          amount: numAmt,
          categoryId: validCatId,
          dayOfMonth: Math.min(Math.max(parseInt(String(r.dayOfMonth), 10) || 1, 1), 31),
          note: r.note ? String(r.note).slice(0, 500) : '',
          type: 'EXPENSE',
          isActive: r.isActive !== false,
          userId,
        },
      });
      insertedRecurringCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: 'Đồng bộ dữ liệu lên PostgreSQL thành công.',
    stats: {
      expenses: insertedExpensesCount,
      goals: insertedGoalsCount,
      recurring: insertedRecurringCount,
    },
  });
};
