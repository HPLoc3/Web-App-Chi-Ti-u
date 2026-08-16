import { Prisma } from '@prisma/client';
import { TransactionsRepository } from './transactions.repository';
import { TransactionDTO, GetTransactionsQuery, CreateTransactionInput, UpdateTransactionInput } from './transactions.types';
import { resolveCategoryId } from '../../services/category.helper';
import { AppError } from '../../middleware/errorHandler.middleware';

export class TransactionsService {
  private static formatTransaction(tx: any): TransactionDTO {
    return {
      id: tx.id,
      amount: Number(tx.amount),
      categoryId: tx.categoryId,
      categoryName: tx.category?.name || 'Khác',
      icon: tx.category?.icon || 'HelpCircle',
      color: tx.category?.color || '#4B5563',
      type: tx.type,
      note: tx.note || '',
      date: tx.date ? new Date(tx.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      walletId: tx.walletId,
      walletName: tx.wallet?.name,
      userId: tx.userId,
      createdAt: tx.createdAt?.toISOString?.() || tx.createdAt,
      updatedAt: tx.updatedAt?.toISOString?.() || tx.updatedAt,
    };
  }

  static async getTransactions(userId: string, query: GetTransactionsQuery & { month?: string; year?: string; limit?: string; page?: string; all?: string }) {
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

    if (query.month && query.year) {
      const m = parseInt(String(query.month), 10);
      const y = parseInt(String(query.year), 10);

      if (!isNaN(m) && !isNaN(y) && m >= 1 && m <= 12) {
        const startDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
        const endDate = new Date(y, m, 0, 23, 59, 59, 999);

        whereCondition.date = {
          gte: startDate,
          lte: endDate,
        };
      }
    } else if (query.startDate || query.endDate) {
      whereCondition.date = {
        ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
        ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
      };
    }

    const isAll = query.all === 'true' || query.all === '1';
    const pageSize = isAll ? 5000 : query.pageSize || (query.limit ? Math.min(Math.max(parseInt(String(query.limit), 10), 1), 1000) : 20);
    const pageNumber = query.page ? Math.max(parseInt(String(query.page), 10), 1) : 1;
    const skipCount = isAll ? 0 : (pageNumber - 1) * pageSize;

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
    const numAmount = new Prisma.Decimal(input.amount || 0);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
    }

    const transactionType = input.type || 'EXPENSE';
    const parsedDate = input.date ? new Date(input.date) : new Date();
    const validCategoryId = await resolveCategoryId(input.categoryId, userId, transactionType);

    let targetWalletId = input.walletId;
    if (!targetWalletId) {
      let wallet = await TransactionsRepository.findDefaultWallet(userId);
      if (!wallet) {
        wallet = await TransactionsRepository.createDefaultWallet(userId);
      }
      targetWalletId = wallet.id;
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
      balanceChange
    );

    return {
      transaction: this.formatTransaction(result.transaction),
      wallet: result.wallet,
    };
  }

  static async createBulkTransactions(userId: string, items: any[]) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new AppError('Danh sách giao dịch không hợp lệ.', 400, 'INVALID_ITEMS');
    }

    let defaultWallet = await TransactionsRepository.findDefaultWallet(userId);
    if (!defaultWallet) {
      defaultWallet = await TransactionsRepository.createDefaultWallet(userId);
    }

    const created: TransactionDTO[] = [];
    for (const item of items) {
      const numAmount = new Prisma.Decimal(item.amount || 0);
      if (numAmount.lessThanOrEqualTo(0)) continue;

      const transactionType = (item.type as 'EXPENSE' | 'INCOME') || 'EXPENSE';
      const itemDate = item.date ? new Date(item.date) : new Date();
      const validCategoryId = await resolveCategoryId(item.categoryId, userId, transactionType);

      const createdRes = await this.createTransaction(userId, {
        amount: Number(numAmount),
        type: transactionType,
        note: item.note,
        date: itemDate.toISOString(),
        walletId: item.walletId || defaultWallet.id,
        categoryId: validCategoryId,
      });
      created.push(createdRes.transaction);
    }

    return created;
  }

  static async updateTransaction(id: string, userId: string, input: UpdateTransactionInput) {
    const existing = await TransactionsRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Giao dịch không tồn tại hoặc bạn không có quyền chỉnh sửa.', 404, 'TRANSACTION_NOT_FOUND');
    }

    const targetWalletId = input.walletId || existing.walletId;
    let targetCategoryId = existing.categoryId;
    if (input.categoryId && input.categoryId !== existing.categoryId) {
      targetCategoryId = await resolveCategoryId(input.categoryId, userId, (input.type || existing.type) as 'EXPENSE' | 'INCOME');
    }

    const oldRevertChange = existing.type === 'INCOME'
      ? (existing.amount as Prisma.Decimal).negated()
      : (existing.amount as Prisma.Decimal);

    const newType = input.type || existing.type;
    const newAmount = input.amount !== undefined ? new Prisma.Decimal(input.amount) : existing.amount;
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
        date: input.date ? new Date(input.date) : existing.date,
        wallet: { connect: { id: targetWalletId } },
        category: { connect: { id: targetCategoryId } },
      }
    );

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

    const revertChange = existing.type === 'INCOME'
      ? (existing.amount as Prisma.Decimal).negated()
      : (existing.amount as Prisma.Decimal);

    await TransactionsRepository.deleteWithWalletAdjustment(id, existing.walletId, revertChange);
  }

  static async deleteBulkTransactions(ids: string[], userId: string): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) {
      throw new AppError('Danh sách ID không hợp lệ.', 400, 'INVALID_IDS');
    }
    return TransactionsRepository.deleteMany(ids, userId);
  }
}
