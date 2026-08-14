import { Prisma } from '@prisma/client';
import { RecurringRepository } from './recurring.repository';
import { RecurringDTO, CreateRecurringInput, UpdateRecurringInput } from './recurring.types';
import { resolveCategoryId } from '../../services/category.helper';
import { AppError } from '../../middleware/errorHandler.middleware';

export class RecurringService {
  private static formatRecurring(item: any): RecurringDTO {
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

  static async getRecurring(userId: string): Promise<RecurringDTO[]> {
    const items = await RecurringRepository.findByUserId(userId);
    return items.map(this.formatRecurring);
  }

  static async createRecurring(userId: string, input: CreateRecurringInput): Promise<RecurringDTO> {
    const numAmount = new Prisma.Decimal(input.amount || 0);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
    }

    const numDay = Math.min(Math.max(parseInt(String(input.dayOfMonth || 1), 10) || 1, 1), 31);
    const validCategoryId = await resolveCategoryId(input.categoryId, userId, input.type || 'EXPENSE');

    const item = await RecurringRepository.create({
      amount: numAmount,
      category: { connect: { id: validCategoryId } },
      dayOfMonth: numDay,
      note: String(input.note || '').slice(0, 500),
      type: input.type || 'EXPENSE',
      isActive: input.isActive !== false,
      user: { connect: { id: userId } },
    });

    return this.formatRecurring(item);
  }

  static async updateRecurring(id: string, userId: string, input: UpdateRecurringInput): Promise<RecurringDTO> {
    const existing = await RecurringRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
    }

    const dataToUpdate: Prisma.RecurringTransactionUpdateInput = {};

    if (input.amount !== undefined) {
      dataToUpdate.amount = new Prisma.Decimal(input.amount);
    }

    if (input.categoryId !== undefined) {
      dataToUpdate.category = {
        connect: { id: await resolveCategoryId(input.categoryId, userId, (input.type || existing.type) as 'EXPENSE' | 'INCOME') },
      };
    }

    if (input.dayOfMonth !== undefined) {
      dataToUpdate.dayOfMonth = Math.min(Math.max(parseInt(String(input.dayOfMonth), 10) || 1, 1), 31);
    }

    if (input.note !== undefined) {
      dataToUpdate.note = String(input.note).slice(0, 500);
    }

    if (input.type !== undefined) {
      dataToUpdate.type = input.type;
    }

    if (input.isActive !== undefined) {
      dataToUpdate.isActive = Boolean(input.isActive);
    }

    const updated = await RecurringRepository.update(id, dataToUpdate);
    return this.formatRecurring(updated);
  }

  static async deleteRecurring(id: string, userId: string): Promise<void> {
    const existing = await RecurringRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
    }

    await RecurringRepository.delete(id);
  }

  static async syncRecurringTransactions(userId: string): Promise<number> {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + 1;

    const activeRecurring = await RecurringRepository.findActiveByUserId(userId);
    if (activeRecurring.length === 0) {
      return 0;
    }

    let wallet = await RecurringRepository.findDefaultWallet(userId);
    if (!wallet) {
      wallet = await RecurringRepository.createDefaultWallet(userId);
    }

    const startDate = new Date(year, month - 1, 1, 0, 0, 0);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const existingMonthTxs = await RecurringRepository.findMonthTransactions(userId, startDate, endDate);

    let createdCount = 0;

    for (const item of activeRecurring) {
      const dayStr = String(Math.min(item.dayOfMonth, 28)).padStart(2, '0');
      const targetDate = new Date(`${year}-${String(month).padStart(2, '0')}-${dayStr}T08:00:00Z`);

      const isAlreadyGenerated = existingMonthTxs.some(
        (tx) =>
          tx.categoryId === item.categoryId &&
          Number(tx.amount) === Number(item.amount) &&
          tx.note?.includes(item.note)
      );

      if (!isAlreadyGenerated) {
        await RecurringRepository.createTransaction({
          amount: item.amount,
          type: item.type,
          note: `${item.note} (Tự động định kỳ)`,
          date: targetDate,
          wallet: { connect: { id: wallet.id } },
          category: { connect: { id: item.categoryId } },
          user: { connect: { id: userId } },
        });
        createdCount++;
      }
    }

    return createdCount;
  }
}
