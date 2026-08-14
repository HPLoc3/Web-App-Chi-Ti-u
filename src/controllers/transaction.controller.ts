import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler.middleware';
import { resolveCategoryId } from '../services/category.helper';

export type TransactionType = 'INCOME' | 'EXPENSE';

/**
 * Format Transaction data to frontend Expense standard
 */
function formatTransaction(tx: any) {
  return {
    id: tx.id,
    amount: Number(tx.amount),
    categoryId: tx.categoryId,
    categoryName: tx.category?.name || 'Khác',
    categoryIcon: tx.category?.icon || 'HelpCircle',
    categoryColor: tx.category?.color || '#4B5563',
    type: tx.type,
    note: tx.note || '',
    date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    walletId: tx.walletId,
    createdAt: tx.createdAt?.toISOString?.() || tx.createdAt,
  };
}

/**
 * GET /api/transactions
 * Lấy danh sách giao dịch của authenticated user
 */
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { month, year, walletId, categoryId, search, type, limit, page, all } = req.query as {
    month?: string;
    year?: string;
    walletId?: string;
    categoryId?: string;
    search?: string;
    type?: string;
    limit?: string;
    page?: string;
    all?: string;
  };

  const whereCondition: Prisma.TransactionWhereInput = {
    userId,
  };

  if (type) {
    whereCondition.type = type;
  }

  if (walletId) {
    whereCondition.walletId = String(walletId);
  }

  if (categoryId && categoryId !== 'all') {
    whereCondition.categoryId = String(categoryId);
  }

  if (search && search.trim() !== '') {
    whereCondition.note = {
      contains: search.trim(),
      mode: 'insensitive',
    };
  }

  if (month && year) {
    const m = parseInt(String(month), 10);
    const y = parseInt(String(year), 10);

    if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
      const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
      const endDate = new Date(y, m, 0, 23, 59, 59, 999);

      whereCondition.date = {
        gte: startDate,
        lte: endDate,
      };
    }
  }

  const isAll = all === 'true' || all === '1';
  const takeCount = isAll ? 5000 : limit ? Math.min(Math.max(parseInt(String(limit), 10), 1), 1000) : 500;
  const pageNumber = page ? Math.max(parseInt(String(page), 10), 1) : 1;
  const skipCount = isAll ? 0 : (pageNumber - 1) * takeCount;

  const [transactions, totalCount] = await Promise.all([
    prisma.transaction.findMany({
      where: whereCondition,
      include: {
        category: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        wallet: {
          select: { id: true, name: true, balance: true, currency: true },
        },
      },
      orderBy: {
        date: 'desc',
      },
      skip: skipCount,
      take: takeCount,
    }),
    prisma.transaction.count({
      where: whereCondition,
    }),
  ]);

  const formattedTransactions = transactions.map(formatTransaction);

  res.status(200).json({
    success: true,
    count: formattedTransactions.length,
    total: totalCount,
    page: pageNumber,
    data: formattedTransactions,
  });
};

/**
 * POST /api/transactions
 * Tạo giao dịch mới
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { amount, type = 'EXPENSE', note, date, walletId, categoryId } = req.body;

  const numAmount = new Prisma.Decimal(amount || 0);
  if (numAmount.lessThanOrEqualTo(0)) {
    throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
  }

  const transactionType = (type || 'EXPENSE') as TransactionType;
  const parsedDate = date ? new Date(date) : new Date();

  // Đảm bảo category tồn tại
  const validCategoryId = await resolveCategoryId(categoryId, userId, transactionType);

  const result = await prisma.$transaction(async (tx) => {
    // 1. Kiểm tra hoặc tạo Ví mặc định
    let targetWalletId = walletId;
    if (targetWalletId) {
      const wallet = await tx.wallet.findFirst({
        where: { id: targetWalletId, userId },
      });
      if (!wallet) {
        throw new AppError('Ví tiền không tồn tại hoặc bạn không có quyền truy cập.', 403, 'FORBIDDEN_WALLET_ACCESS');
      }
    } else {
      let firstWallet = await tx.wallet.findFirst({
        where: { userId },
      });
      if (!firstWallet) {
        firstWallet = await tx.wallet.create({
          data: {
            name: 'Ví Chính',
            balance: new Prisma.Decimal(0),
            currency: 'VND',
            isDefault: true,
            userId,
          },
        });
      }
      targetWalletId = firstWallet.id;
    }

    // 2. Cập nhật số dư Ví
    const balanceChange = transactionType === 'INCOME' ? numAmount : numAmount.negated();
    const updatedWallet = await tx.wallet.update({
      where: { id: targetWalletId },
      data: {
        balance: {
          increment: balanceChange,
        },
      },
    });

    // 3. Tạo Transaction
    const newTransaction = await tx.transaction.create({
      data: {
        amount: numAmount,
        type: transactionType,
        note: note ? String(note).slice(0, 500) : '',
        date: parsedDate,
        walletId: targetWalletId,
        categoryId: validCategoryId,
        userId,
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        wallet: {
          select: { id: true, name: true, balance: true, currency: true },
        },
      },
    });

    return {
      transaction: newTransaction,
      wallet: updatedWallet,
    };
  });

  res.status(201).json({
    success: true,
    message: 'Tạo giao dịch thành công.',
    data: formatTransaction(result.transaction),
    wallet: result.wallet,
  });
};

/**
 * POST /api/transactions/bulk
 * Tạo hàng loạt giao dịch (Dành cho Import sao kê, Sample Data hoặc Di chuyển dữ liệu)
 */
export const createBulkTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { items } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    throw new AppError('Danh sách giao dịch không hợp lệ.', 400, 'INVALID_ITEMS');
  }

  // Lấy ví mặc định của người dùng
  let userWallet = await prisma.wallet.findFirst({
    where: { userId },
  });

  if (!userWallet) {
    userWallet = await prisma.wallet.create({
      data: {
        name: 'Ví Chính',
        balance: new Prisma.Decimal(0),
        currency: 'VND',
        isDefault: true,
        userId,
      },
    });
  }

  const createdTransactions: any[] = [];

  for (const item of items) {
    const numAmount = new Prisma.Decimal(item.amount || 0);
    if (numAmount.lessThanOrEqualTo(0)) continue;

    const transactionType = (item.type || 'EXPENSE') as TransactionType;
    const itemDate = item.date ? new Date(item.date) : new Date();
    const validCategoryId = await resolveCategoryId(item.categoryId, userId, transactionType);

    const tx = await prisma.transaction.create({
      data: {
        amount: numAmount,
        type: transactionType,
        note: item.note ? String(item.note).slice(0, 500) : '',
        date: itemDate,
        walletId: item.walletId || userWallet.id,
        categoryId: validCategoryId,
        userId,
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
      },
    });
    createdTransactions.push(formatTransaction(tx));
  }

  res.status(201).json({
    success: true,
    message: `Đã nhập thành công ${createdTransactions.length} giao dịch.`,
    count: createdTransactions.length,
    data: createdTransactions,
  });
};

/**
 * PUT /api/transactions/:id
 * Cập nhật giao dịch
 */
export const updateTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const transactionId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  const { amount, type, note, date, walletId, categoryId } = req.body;

  const result = await prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findFirst({
      where: { id: transactionId, userId },
      include: { wallet: true },
    });

    if (!existingTransaction) {
      throw new AppError('Giao dịch không tồn tại hoặc bạn không có quyền chỉnh sửa.', 404, 'TRANSACTION_NOT_FOUND');
    }

    const targetWalletId = walletId || existingTransaction.walletId;
    if (walletId && walletId !== existingTransaction.walletId) {
      const newWallet = await tx.wallet.findFirst({
        where: { id: walletId, userId },
      });
      if (!newWallet) {
        throw new AppError('Ví đích không tồn tại.', 403, 'FORBIDDEN_WALLET_ACCESS');
      }
    }

    let targetCategoryId = existingTransaction.categoryId;
    if (categoryId && categoryId !== existingTransaction.categoryId) {
      targetCategoryId = await resolveCategoryId(categoryId, userId, (type || existingTransaction.type) as TransactionType);
    }

    // Hoàn tác số dư cũ
    const oldChange = existingTransaction.type === 'INCOME' 
      ? existingTransaction.amount.negated() 
      : existingTransaction.amount;

    await tx.wallet.update({
      where: { id: existingTransaction.walletId },
      data: { balance: { increment: oldChange } },
    });

    // Cộng số dư mới
    const newType = (type || existingTransaction.type) as TransactionType;
    const newAmount = amount !== undefined ? new Prisma.Decimal(amount) : existingTransaction.amount;
    const newChange = newType === 'INCOME' ? newAmount : newAmount.negated();

    const updatedWallet = await tx.wallet.update({
      where: { id: targetWalletId },
      data: { balance: { increment: newChange } },
    });

    // Cập nhật giao dịch
    const updatedTransaction = await tx.transaction.update({
      where: { id: transactionId },
      data: {
        amount: newAmount,
        type: newType,
        note: note !== undefined ? String(note).slice(0, 500) : existingTransaction.note,
        date: date ? new Date(date) : existingTransaction.date,
        walletId: targetWalletId,
        categoryId: targetCategoryId,
      },
      include: {
        category: {
          select: { id: true, name: true, type: true, icon: true, color: true },
        },
        wallet: {
          select: { id: true, name: true, balance: true, currency: true },
        },
      },
    });

    return { updatedTransaction, updatedWallet };
  });

  res.status(200).json({
    success: true,
    message: 'Cập nhật giao dịch thành công.',
    data: formatTransaction(result.updatedTransaction),
    wallet: result.updatedWallet,
  });
};

/**
 * DELETE /api/transactions/:id
 * Xóa giao dịch
 */
export const deleteTransaction = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const transactionId = req.params.id;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  await prisma.$transaction(async (tx) => {
    const existingTransaction = await tx.transaction.findFirst({
      where: { id: transactionId, userId },
    });

    if (!existingTransaction) {
      throw new AppError('Giao dịch không tồn tại hoặc bạn không có quyền xóa.', 404, 'TRANSACTION_NOT_FOUND');
    }

    const revertChange = existingTransaction.type === 'INCOME'
      ? existingTransaction.amount.negated()
      : existingTransaction.amount;

    await tx.wallet.update({
      where: { id: existingTransaction.walletId },
      data: { balance: { increment: revertChange } },
    });

    await tx.transaction.delete({
      where: { id: transactionId },
    });
  });

  res.status(200).json({
    success: true,
    message: 'Đã xóa giao dịch thành công.',
  });
};

/**
 * DELETE /api/transactions/bulk
 * Xóa nhiều giao dịch
 */
export const deleteBulkTransactions = async (req: Request, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { ids } = req.body;

  if (!userId) {
    throw new AppError('Chưa xác thực người dùng.', 401, 'UNAUTHORIZED');
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    throw new AppError('Danh sách ID không hợp lệ.', 400, 'INVALID_IDS');
  }

  await prisma.transaction.deleteMany({
    where: {
      id: { in: ids },
      userId,
    },
  });

  res.status(200).json({
    success: true,
    message: `Đã xóa thành công ${ids.length} giao dịch.`,
  });
};
