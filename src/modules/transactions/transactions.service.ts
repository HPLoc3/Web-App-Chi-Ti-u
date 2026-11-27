import { Prisma } from '@prisma/client';
import { TransactionsRepository } from './transactions.repository';
import { WalletsRepository } from '../wallets/wallets.repository';
import { TransactionDTO, GetTransactionsQuery, CreateTransactionInput, UpdateTransactionInput } from './transactions.types';
import { resolveCategoryId } from '../../services/category.helper';
import { AppError } from '../../middleware/errorHandler.middleware';
import { getBusinessDate, parseBusinessDate } from '../../utils/dateParser';
import { FinancialMath } from '../../utils/financialMath';
import { FinancialAuditLogger } from '../../utils/financialAudit';

// Asia/Ho_Chi_Minh cố định UTC+7, không có giờ mùa hè
const BUSINESS_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Khoảng [đầu kỳ, đầu kỳ kế) của một tháng hoặc cả năm theo giờ Việt Nam */
function businessPeriodRange(year: number, month?: number) {
  const firstMonth = month ? month - 1 : 0;
  const monthCount = month ? 1 : 12;
  return {
    gte: new Date(Date.UTC(year, firstMonth, 1) - BUSINESS_UTC_OFFSET_MS),
    lt: new Date(Date.UTC(year, firstMonth + monthCount, 1) - BUSINESS_UTC_OFFSET_MS),
  };
}

export class TransactionsService {
  private static formatTransaction(tx: any): TransactionDTO {
    let dateStr = '';
    if (tx.date) {
      if (typeof tx.date === 'string') {
        dateStr = tx.date.slice(0, 10);
      } else {
        dateStr = getBusinessDate(tx.date);
      }
    } else {
      dateStr = getBusinessDate();
    }

    return {
      id: tx.id,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      categoryName: tx.category?.name || 'Khác',
      icon: tx.category?.icon || 'HelpCircle',
      color: tx.category?.color || '#4B5563',
      type: tx.type,
      note: tx.note || '',
      date: dateStr,
      walletId: tx.walletId,
      walletName: tx.wallet?.name,
      userId: tx.userId,
      createdAt: tx.createdAt?.toISOString?.() || tx.createdAt,
      updatedAt: tx.updatedAt?.toISOString?.() || tx.updatedAt,
    };
  }

  static async getTransactions(userId: string, query: GetTransactionsQuery) {
    const whereCondition: Prisma.TransactionWhereInput = { userId };

    if (query.type) {
      whereCondition.type = query.type;
    }

    if (query.walletId) {
      whereCondition.walletId = String(query.walletId);
    }

    if (query.categoryId && query.categoryId !== 'all') {
      whereCondition.categoryId = String(query.categoryId);
    }

    if (query.search && query.search.trim() !== '') {
      whereCondition.note = {
        contains: query.search.trim(),
        mode: 'insensitive',
      };
    }

    if (query.year) {
      whereCondition.date = businessPeriodRange(query.year, query.month);
    } else if (query.startDate || query.endDate) {
      whereCondition.date = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const pageSize = query.pageSize || 20;
    const pageNumber = query.page || 1;
    const skipCount = (pageNumber - 1) * pageSize;

    const [transactions, totalCount] = await Promise.all([
      TransactionsRepository.findMany(whereCondition, skipCount, pageSize),
      TransactionsRepository.count(whereCondition),
    ]);

    const formattedTransactions = transactions.map(this.formatTransaction);
    const hasNextPage = pageNumber * pageSize < totalCount;

    return {
      transactions: formattedTransactions,
      meta: {
        page: pageNumber,
        pageSize,
        total: totalCount,
        hasNextPage,
      },
    };
  }

  static async getTransactionById(id: string, userId: string): Promise<TransactionDTO> {
    const transaction = await TransactionsRepository.findById(id);
    if (!transaction) {
      throw new AppError('Giao dịch không tồn tại.', 404, 'TRANSACTION_NOT_FOUND');
    }
    if (transaction.userId !== userId) {
      throw new AppError('Bạn không có quyền truy cập giao dịch này.', 403, 'FORBIDDEN_ACCESS');
    }
    return this.formatTransaction(transaction);
  }

  static async createTransaction(userId: string, input: CreateTransactionInput) {
    const numAmount = FinancialMath.toDecimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
    }

    const transactionType = input.type || 'EXPENSE';
    const parsedDate = input.date ? parseBusinessDate(input.date) : parseBusinessDate(getBusinessDate());
    const validCategoryId = await resolveCategoryId(input.categoryId, userId, transactionType);

    let targetWalletId = input.walletId;
    if (!targetWalletId) {
      let wallet = await TransactionsRepository.findDefaultWallet(userId);
      if (!wallet) {
        wallet = await TransactionsRepository.createDefaultWallet(userId);
      }
      targetWalletId = wallet.id;
    } else {
      const wallet = await WalletsRepository.findByIdAndUserId(targetWalletId, userId);
      if (!wallet) {
        throw new AppError('Ví thanh toán không tồn tại hoặc bạn không có quyền sử dụng.', 404, 'WALLET_NOT_FOUND');
      }
    }

    const balanceChange = transactionType === 'INCOME' ? numAmount : numAmount.negated();

    const result = await TransactionsRepository.createWithWalletUpdate(
      {
        amount: numAmount,
        type: transactionType,
        note: input.note ? String(input.note).slice(0, 500) : '',
        date: parsedDate,
        wallet: { connect: { id: targetWalletId } },
        category: { connect: { id: validCategoryId } },
        user: { connect: { id: userId } },
      },
      targetWalletId,
      balanceChange,
      userId
    );

    FinancialAuditLogger.log({
      userId,
      action: 'TRANSACTION_CREATE',
      entity: 'Transaction',
      entityId: result.transaction.id,
      walletId: targetWalletId,
      amount: numAmount,
      delta: balanceChange,
      metadata: { type: transactionType, categoryId: validCategoryId },
    });

    return {
      transaction: this.formatTransaction(result.transaction),
      wallet: result.wallet,
    };
  }

  static async createBulkTransactions(userId: string, items: CreateTransactionInput[]) {
    let defaultWalletId: string | undefined;
    if (items.some((item) => !item.walletId)) {
      const defaultWallet =
        (await TransactionsRepository.findDefaultWallet(userId)) ||
        (await TransactionsRepository.createDefaultWallet(userId));
      defaultWalletId = defaultWallet.id;
    }

    const rows: Prisma.TransactionCreateManyInput[] = [];
    const walletBalanceAdjustments = new Map<string, Prisma.Decimal>();

    for (const item of items) {
      const numAmount = FinancialMath.toDecimal(item.amount);
      if (numAmount.lessThanOrEqualTo(0)) {
        throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
      }

      const transactionType = item.type || 'EXPENSE';
      const validCategoryId = await resolveCategoryId(item.categoryId, userId, transactionType);
      const targetWalletId = item.walletId || defaultWalletId!;

      rows.push({
        userId,
        walletId: targetWalletId,
        categoryId: validCategoryId,
        amount: numAmount,
        type: transactionType,
        note: item.note ? String(item.note).slice(0, 500) : '',
        date: parseBusinessDate(item.date || getBusinessDate()),
      });

      const currentAdjustment = walletBalanceAdjustments.get(targetWalletId) || new Prisma.Decimal(0);
      const delta = transactionType === 'INCOME' ? numAmount : numAmount.negated();
      walletBalanceAdjustments.set(targetWalletId, currentAdjustment.add(delta));
    }

    const created = await TransactionsRepository.createBulkWithWalletUpdate(userId, rows, walletBalanceAdjustments);

    FinancialAuditLogger.log({
      userId,
      action: 'TRANSACTION_BULK_CREATE',
      entity: 'Transaction',
      entityId: `bulk-${rows.length}`,
      metadata: { count: rows.length },
    });

    return created.map((t) => this.formatTransaction(t));
  }

  static async updateTransaction(id: string, userId: string, input: UpdateTransactionInput) {
    const existing = await TransactionsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Giao dịch không tồn tại hoặc bạn không có quyền chỉnh sửa.', 404, 'TRANSACTION_NOT_FOUND');
    }

    const targetWalletId = input.walletId || existing.walletId;
    if (input.walletId && input.walletId !== existing.walletId) {
      const wallet = await WalletsRepository.findByIdAndUserId(input.walletId, userId);
      if (!wallet) {
        throw new AppError('Ví thanh toán không tồn tại hoặc bạn không có quyền sử dụng.', 404, 'WALLET_NOT_FOUND');
      }
    }
    let targetCategoryId = existing.categoryId;
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      targetCategoryId = await resolveCategoryId(input.categoryId, userId, (input.type || existing.type) as 'EXPENSE' | 'INCOME');
    }

    const existingAmount = FinancialMath.toDecimal(existing.amount);
    const oldRevertChange = existing.type === 'INCOME'
      ? existingAmount.negated()
      : existingAmount;

    const newType = input.type || existing.type;
    const newAmount = input.amount !== undefined ? FinancialMath.toDecimal(input.amount) : existingAmount;
    const newApplyChange = newType === 'INCOME' ? newAmount : newAmount.negated();

    const result = await TransactionsRepository.updateWithWalletAdjustment(
      id,
      userId,
      existing.walletId,
      oldRevertChange,
      targetWalletId,
      newApplyChange,
      {
        amount: newAmount,
        type: newType,
        note: input.note !== undefined ? String(input.note).slice(0, 500) : existing.note,
        date: input.date ? parseBusinessDate(input.date) : existing.date,
        wallet: { connect: { id: targetWalletId } },
        category: { connect: { id: targetCategoryId } },
      }
    );

    FinancialAuditLogger.log({
      userId,
      action: 'TRANSACTION_UPDATE',
      entity: 'Transaction',
      entityId: id,
      walletId: targetWalletId,
      amount: newAmount,
      metadata: {
        oldWalletId: existing.walletId,
        newWalletId: targetWalletId,
        oldAmount: existingAmount.toString(),
        newAmount: newAmount.toString(),
      },
    });

    return {
      transaction: this.formatTransaction(result.updatedTransaction),
      wallet: result.updatedWallet,
    };
  }

  static async deleteTransaction(id: string, userId: string): Promise<void> {
    const existing = await TransactionsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Giao dịch không tồn tại hoặc bạn không có quyền xóa.', 404, 'TRANSACTION_NOT_FOUND');
    }

    const existingAmount = FinancialMath.toDecimal(existing.amount);
    const revertChange = existing.type === 'INCOME'
      ? existingAmount.negated()
      : existingAmount;

    await TransactionsRepository.deleteWithWalletAdjustment(id, userId);

    FinancialAuditLogger.log({
      userId,
      action: 'TRANSACTION_DELETE',
      entity: 'Transaction',
      entityId: id,
      walletId: existing.walletId,
      amount: existingAmount,
      delta: revertChange,
    });
  }

  static async deleteBulkTransactions(ids: string[], userId: string): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Danh sách ID không hợp lệ.', 400, 'INVALID_IDS');
    }
    const count = await TransactionsRepository.deleteMany(ids, userId);

    FinancialAuditLogger.log({
      userId,
      action: 'TRANSACTION_BULK_DELETE',
      entity: 'Transaction',
      entityId: `bulk-del-${ids.length}`,
      metadata: { requestedCount: ids.length, deletedCount: count },
    });

    return count;
  }
}
