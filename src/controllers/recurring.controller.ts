import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import { resolveCategoryId } from '../services/category.helper';

function formatRecurring(item: any) {
  return {
    id: item.id,
    amount: Number(item.amount),
    categoryId: item.categoryId,
    categoryName: item.category?.name || 'Khác',
    categoryIcon: item.category?.icon || 'Receipt',
    categoryColor: item.category?.color || '#C2410C',
    dayOfMonth: item.dayOfMonth,
    note: item.note || '',
    type: item.type || 'EXPENSE',
    isActive: item.isActive !== false,
    frequency: 'monthly',
  };
}

/**
 * GET /api/recurring
 * Lấy danh sách chi tiêu/thu nhập định kỳ của user
 */
export const getRecurring = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const items = await prisma.recurringTransaction.findMany({
    where: { userId },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
    orderBy: { dayOfMonth: 'asc' },
  });

  const formatted = items.map(formatRecurring);

  res.status(200).json({
    success: true,
    count: formatted.length,
    data: formatted,
  });
};

/**
 * POST /api/recurring
 * Tạo định kỳ mới
 */
export const createRecurring = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { amount, categoryId, dayOfMonth = 1, note = '', type = 'EXPENSE', isActive = true } = req.body;

  const numAmount = new Prisma.Decimal(amount || 0);
  if (numAmount.lessThanOrEqualTo(0)) {
    throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
  }

  const numDay = Math.min(Math.max(parseInt(String(dayOfMonth), 10) || 1, 1), 31);
  const validCategoryId = await resolveCategoryId(categoryId, userId, type);

  const item = await prisma.recurringTransaction.create({
    data: {
      amount: numAmount,
      categoryId: validCategoryId,
      dayOfMonth: numDay,
      note: String(note).slice(0, 500),
      type,
      isActive: isActive !== false,
      userId,
    },
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  res.status(201).json({
    success: true,
    message: 'Tạo khoản định kỳ thành công.',
    data: formatRecurring(item),
  });
};

/**
 * PUT /api/recurring/:id
 * Cập nhật định kỳ
 */
export const updateRecurring = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const recurringId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });

  if (!existing) {
    throw new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
  }

  const { amount, categoryId, dayOfMonth, note, type, isActive } = req.body;

  const dataToUpdate: Prisma.RecurringTransactionUpdateInput = {};

  if (amount !== undefined) {
    dataToUpdate.amount = new Prisma.Decimal(amount);
  }

  if (categoryId !== undefined) {
    dataToUpdate.category = {
      connect: { id: await resolveCategoryId(categoryId, userId, type || existing.type) },
    };
  }

  if (dayOfMonth !== undefined) {
    dataToUpdate.dayOfMonth = Math.min(Math.max(parseInt(String(dayOfMonth), 10) || 1, 1), 31);
  }

  if (note !== undefined) {
    dataToUpdate.note = String(note).slice(0, 500);
  }

  if (type !== undefined) {
    dataToUpdate.type = type;
  }

  if (isActive !== undefined) {
    dataToUpdate.isActive = Boolean(isActive);
  }

  const updated = await prisma.recurringTransaction.update({
    where: { id: recurringId },
    data: dataToUpdate,
    include: {
      category: {
        select: { id: true, name: true, icon: true, color: true },
      },
    },
  });

  res.status(200).json({
    success: true,
    message: 'Cập nhật khoản định kỳ thành công.',
    data: formatRecurring(updated),
  });
};

/**
 * DELETE /api/recurring/:id
 * Xóa định kỳ
 */
export const deleteRecurring = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const recurringId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const existing = await prisma.recurringTransaction.findFirst({
    where: { id: recurringId, userId },
  });

  if (!existing) {
    throw new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
  }

  await prisma.recurringTransaction.delete({
    where: { id: recurringId },
  });

  res.status(200).json({
    success: true,
    message: 'Đã xóa khoản định kỳ.',
  });
};

/**
 * POST /api/recurring/sync
 * Đồng bộ sinh giao dịch tự động trong tháng cho các khoản định kỳ
 */
export const syncRecurringTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth() + 1;

  // Lấy các khoản định kỳ đang active của user
  const activeRecurring = await prisma.recurringTransaction.findMany({
    where: { userId, isActive: true },
  });

  if (activeRecurring.length === 0) {
    res.status(200).json({
      success: true,
      message: 'Không có khoản định kỳ nào cần đồng bộ.',
      syncedCount: 0,
    });
    return;
  }

  // Lấy ví mặc định
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

  // Lấy danh sách giao dịch trong tháng của user
  const startDate = new Date(year, month - 1, 1, 0, 0, 0);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const existingMonthTxs = await prisma.transaction.findMany({
    where: {
      userId,
      date: { gte: startDate, lte: endDate },
    },
  });

  let createdCount = 0;

  for (const item of activeRecurring) {
    const dayStr = String(Math.min(item.dayOfMonth, 28)).padStart(2, '0');
    const targetDate = new Date(`${year}-${String(month).padStart(2, '0')}-${dayStr}T08:00:00Z`);

    const isAlreadyGenerated = existingMonthTxs.some(tx => 
      tx.categoryId === item.categoryId &&
      Number(tx.amount) === Number(item.amount) &&
      tx.note?.includes(item.note)
    );

    if (!isAlreadyGenerated) {
      await prisma.transaction.create({
        data: {
          amount: item.amount,
          type: item.type,
          note: `${item.note} (Tự động định kỳ)`,
          date: targetDate,
          walletId: wallet.id,
          categoryId: item.categoryId,
          userId,
        },
      });
      createdCount++;
    }
  }

  res.status(200).json({
    success: true,
    message: `Đã đồng bộ thành công ${createdCount} giao dịch định kỳ.`,
    syncedCount: createdCount,
  });
};
