import { Request, Response } from 'express';
import { Prisma, TransactionType } from '@prisma/client';
import { prisma } from '../lib/prisma';

/**
 * GET /api/transactions
 * Lấy danh sách giao dịch của người dùng (Có lọc theo tháng & năm)
 */
export const getTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const { month, year, walletId, categoryId, limit } = req.query;

    const whereCondition: Prisma.TransactionWhereInput = {
      userId,
    };

    if (walletId) {
      whereCondition.walletId = String(walletId);
    }

    if (categoryId) {
      whereCondition.categoryId = String(categoryId);
    }

    // Lọc theo tháng và năm nếu được chỉ định
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

    const takeCount = limit ? parseInt(String(limit), 10) : undefined;

    const transactions = await prisma.transaction.findMany({
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
      take: takeCount,
    });

    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions,
    });
  } catch (error: any) {
    console.error('Lỗi khi lấy danh sách giao dịch:', error);
    res.status(500).json({
      success: false,
      message: 'Không thể truy vấn danh sách giao dịch.',
      error: error.message,
    });
  }
};

/**
 * POST /api/transactions
 * Tạo giao dịch mới & tự động cập nhật số dư Ví tương ứng
 */
export const createTransaction = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const { amount, type, note, date, walletId, categoryId } = req.body;

    // Validate dữ liệu đầu vào
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      res.status(400).json({ success: false, message: 'Số tiền không hợp lệ.' });
      return;
    }

    if (!type || (type !== 'INCOME' && type !== 'EXPENSE')) {
      res.status(400).json({ success: false, message: 'Loại giao dịch phải là INCOME hoặc EXPENSE.' });
      return;
    }

    if (!categoryId) {
      res.status(400).json({ success: false, message: 'Vui lòng chọn danh mục chi tiêu/thu nhập.' });
      return;
    }

    const numAmount = new Prisma.Decimal(amount);
    const transactionType = type as TransactionType;
    const transactionDate = date ? new Date(date) : new Date();

    // Sử dụng Prisma Interactive Transaction để đảm bảo tính toàn vẹn dữ liệu
    const result = await prisma.$transaction(async (tx) => {
      // 1. Lấy ví tiền (hoặc lấy ví đầu tiên/tạo ví mặc định nếu không truyền walletId)
      let targetWalletId = walletId;

      if (targetWalletId) {
        const wallet = await tx.wallet.findFirst({
          where: { id: targetWalletId, userId },
        });
        if (!wallet) {
          throw new Error('Ví tiền không tồn tại hoặc không thuộc quyền sở hữu của bạn.');
        }
      } else {
        // Tìm ví đầu tiên của user
        let firstWallet = await tx.wallet.findFirst({
          where: { userId },
        });

        if (!firstWallet) {
          firstWallet = await tx.wallet.create({
            data: {
              name: 'Ví Chính',
              balance: new Prisma.Decimal(0),
              currency: 'VND',
              userId,
            },
          });
        }
        targetWalletId = firstWallet.id;
      }

      // 2. Tự động tính toán & Cập nhật số dư Wallet
      const balanceChange = transactionType === 'INCOME' ? numAmount : numAmount.negated();

      const updatedWallet = await tx.wallet.update({
        where: { id: targetWalletId },
        data: {
          balance: {
            increment: balanceChange,
          },
        },
      });

      // 3. Tạo bản ghi Giao dịch mới
      const newTransaction = await tx.transaction.create({
        data: {
          amount: numAmount,
          type: transactionType,
          note: note || '',
          date: transactionDate,
          walletId: targetWalletId,
          categoryId,
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
        updatedWallet,
      };
    });

    res.status(201).json({
      success: true,
      message: 'Tạo giao dịch thành công và đã cập nhật số dư ví.',
      data: result.transaction,
      wallet: result.updatedWallet,
    });
  } catch (error: any) {
    console.error('Lỗi khi tạo giao dịch:', error);
    res.status(400).json({
      success: false,
      message: error.message || 'Không thể tạo giao dịch mới.',
    });
  }
};

/**
 * GET /api/reports/summary
 * Báo cáo tổng quan thu, chi và số dư bằng truy vấn Prisma aggregate
 */
export const getSummaryReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: 'Chưa xác thực người dùng.' });
      return;
    }

    const now = new Date();
    const queryMonth = req.query.month ? parseInt(String(req.query.month), 10) : now.getMonth() + 1;
    const queryYear = req.query.year ? parseInt(String(req.query.year), 10) : now.getFullYear();

    const startDate = new Date(queryYear, queryMonth - 1, 1, 0, 0, 0, 0);
    const endDate = new Date(queryYear, queryMonth, 0, 23, 59, 59, 999);

    // 1. Tính tổng Thu Nhập trong tháng
    const incomeAggregate = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId,
        type: 'INCOME',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 2. Tính tổng Chi Tiêu trong tháng
    const expenseAggregate = await prisma.transaction.aggregate({
      _sum: {
        amount: true,
      },
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // 3. Tính tổng số dư hiện tại trên tất cả các Ví
    const walletBalanceAggregate = await prisma.wallet.aggregate({
      _sum: {
        balance: true,
      },
      where: {
        userId,
      },
    });

    // 4. GroupBy Phân tích chi tiêu theo từng Danh mục trong tháng
    const categoryExpenses = await prisma.transaction.groupBy({
      by: ['categoryId'],
      _sum: {
        amount: true,
      },
      _count: {
        id: true,
      },
      where: {
        userId,
        type: 'EXPENSE',
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        _sum: {
          amount: 'desc',
        },
      },
    });

    // Lấy thông tin chi tiết tên/màu/icon của từng danh mục
    const categoryIds = categoryExpenses.map((c) => c.categoryId);
    const categoriesInfo = await prisma.category.findMany({
      where: {
        id: { in: categoryIds },
      },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
      },
    });

    const categoryMap = new Map(categoriesInfo.map((cat) => [cat.id, cat]));

    const categoryBreakdown = categoryExpenses.map((item) => {
      const catDetails = categoryMap.get(item.categoryId);
      return {
        categoryId: item.categoryId,
        categoryName: catDetails?.name || 'Khác',
        icon: catDetails?.icon || 'Tag',
        color: catDetails?.color || '#94A3B8',
        totalAmount: item._sum.amount ? Number(item._sum.amount) : 0,
        transactionCount: item._count.id,
      };
    });

    const totalIncome = incomeAggregate._sum.amount ? Number(incomeAggregate._sum.amount) : 0;
    const totalExpense = expenseAggregate._sum.amount ? Number(expenseAggregate._sum.amount) : 0;
    const netBalance = totalIncome - totalExpense;
    const totalWalletBalance = walletBalanceAggregate._sum.balance
      ? Number(walletBalanceAggregate._sum.balance)
      : 0;

    res.status(200).json({
      success: true,
      period: {
        month: queryMonth,
        year: queryYear,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpense,
        netBalance,
        totalWalletBalance,
      },
      categoryBreakdown,
    });
  } catch (error: any) {
    console.error('Lỗi khi tính toán báo cáo tổng quan:', error);
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ khi tạo báo cáo tài chính.',
      error: error.message,
    });
  }
};
