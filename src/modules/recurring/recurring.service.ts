import { Prisma, RecurringTransaction } from '@prisma/client';
import { RecurringRepository } from './recurring.repository';
import { RecurringDTO, CreateRecurringInput, UpdateRecurringInput, RecurringSyncResult } from './recurring.types';
import { resolveCategoryId } from '../../services/category.helper';
import { AppError } from '../../middleware/errorHandler.middleware';
import { FinancialMath } from '../../utils/financialMath';
import { FinancialAuditLogger } from '../../utils/financialAudit';
import { getBusinessDate } from '../../utils/dateParser';
import { Logger } from '../../utils/logger';
import {
  ScheduleRule,
  buildRule,
  fromDbDate,
  isScheduleChanged,
  legacyNoteVariants,
  listDue,
  nextDueAfter,
  nextDueFromToday,
  normalizeFrequency,
  toDbDate,
} from '../../utils/recurringSchedule';

const ruleOf = (item: Pick<RecurringTransaction, 'frequency' | 'dayOfMonth' | 'anchorDate'>): ScheduleRule => ({
  frequency: normalizeFrequency(item.frequency),
  dayOfMonth: item.dayOfMonth,
  anchorDate: fromDbDate(item.anchorDate),
});

const scheduleColumns = (rule: ScheduleRule, nextDue: string) => ({
  frequency: rule.frequency,
  dayOfMonth: rule.dayOfMonth,
  anchorDate: rule.anchorDate ? toDbDate(rule.anchorDate) : null,
  nextDueDate: toDbDate(nextDue),
});

/** Nửa đêm giờ Việt Nam của ngày 1 tháng chứa ymd (offsetMonths = 1: tháng kế) */
const monthStartVn = (ymd: string, offsetMonths: number): Date => {
  const [year, month] = ymd.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1 + offsetMonths, 1, -7));
};

export class RecurringService {
  private static formatRecurring(item: any, today: string): RecurringDTO {
    const rule = ruleOf(item);
    const isActive = item.isActive !== false;
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
      isActive,
      frequency: rule.frequency,
      startDate: rule.anchorDate || undefined,
      nextPaymentDate: isActive
        ? fromDbDate(item.nextDueDate) || nextDueFromToday(rule, today, fromDbDate(item.lastDueDate))
        : null,
    };
  }

  static async getRecurring(userId: string): Promise<RecurringDTO[]> {
    const items = await RecurringRepository.findByUserId(userId);
    const today = getBusinessDate();
    return items.map((item) => this.formatRecurring(item, today));
  }

  static async createRecurring(userId: string, input: CreateRecurringInput): Promise<RecurringDTO> {
    const numAmount = FinancialMath.toDecimal(input.amount);
    if (numAmount.lessThanOrEqualTo(0)) {
      throw new AppError('Số tiền phải lớn hơn 0.', 400, 'INVALID_AMOUNT');
    }

    const today = getBusinessDate();
    const rule = buildRule(input, today);
    const validCategoryId = await resolveCategoryId(input.categoryId, userId, input.type || 'EXPENSE');

    const item = await RecurringRepository.create({
      amount: numAmount,
      category: { connect: { id: validCategoryId } },
      ...scheduleColumns(rule, nextDueFromToday(rule, today)),
      note: String(input.note || '').slice(0, 500),
      type: input.type || 'EXPENSE',
      isActive: input.isActive !== false,
      user: { connect: { id: userId } },
    });

    return this.formatRecurring(item, today);
  }

  static async updateRecurring(id: string, userId: string, input: UpdateRecurringInput): Promise<RecurringDTO> {
    const notFound = () => new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
    const existing = await RecurringRepository.findByIdAndUserId(id, userId);
    if (!existing) throw notFound();

    const dataToUpdate: Prisma.RecurringTransactionUpdateInput = {};

    if (input.amount !== undefined) {
      dataToUpdate.amount = FinancialMath.toDecimal(input.amount);
    }

    if (input.categoryId !== undefined) {
      dataToUpdate.category = {
        connect: { id: await resolveCategoryId(input.categoryId, userId, (input.type || existing.type) as 'EXPENSE' | 'INCOME') },
      };
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

    const today = getBusinessDate();
    const updated = await RecurringRepository.updateWithUserLock(id, userId, (current) => {
      const currentRule = ruleOf(current);
      const changed = isScheduleChanged(input, currentRule);
      const reactivated = current.isActive === false && input.isActive === true;
      // Đổi số tiền/ghi chú không đụng tới lịch (kể cả kỳ đang chờ ghi)
      if (!changed && !reactivated) return dataToUpdate;

      const rule = changed ? buildRule(input, today, currentRule) : currentRule;
      return {
        ...dataToUpdate,
        ...scheduleColumns(rule, nextDueFromToday(rule, today, fromDbDate(current.lastDueDate))),
      };
    });
    if (!updated) throw notFound();

    return this.formatRecurring(updated, today);
  }

  static async deleteRecurring(id: string, userId: string): Promise<void> {
    const existing = await RecurringRepository.findByIdAndUserId(id, userId);
    if (!existing) {
      throw new AppError('Khoản định kỳ không tồn tại.', 404, 'RECURRING_NOT_FOUND');
    }

    await RecurringRepository.delete(id);
  }

  /**
   * Bản ghi cũ (chưa có nextDueDate): lấy kỳ đầu tiên từ hôm nay. Nếu tháng của kỳ đó đã có
   * giao dịch khớp nguyên văn (do bản đồng bộ cũ hoặc nút "ghi nhận ngay") thì coi như đã ghi.
   */
  private static async initializeLegacySchedules(userId: string, today: string): Promise<void> {
    const matchedIds = new Set<string>();
    await RecurringRepository.initializeSchedules(userId, async (item, findTransactions) => {
      const rule = ruleOf(item);
      const due = nextDueFromToday(rule, today, fromDbDate(item.lastDueDate));
      const candidates = await findTransactions({
        userId,
        recurringId: null,
        type: item.type,
        categoryId: item.categoryId,
        amount: item.amount,
        note: { in: legacyNoteVariants(item.note) },
        date: { gte: monthStartVn(due, 0), lt: monthStartVn(due, 1) },
      });
      const recorded = candidates.find((t) => !matchedIds.has(t.id));
      if (!recorded) return { nextDueDate: toDbDate(due) };

      matchedIds.add(recorded.id);
      return { nextDueDate: toDbDate(nextDueAfter(rule, due)), lastDueDate: toDbDate(due) };
    });
  }

  private static async syncOne(
    item: RecurringTransaction,
    userId: string,
    today: string,
    result: RecurringSyncResult
  ): Promise<void> {
    const nextDue = fromDbDate(item.nextDueDate);
    if (!nextDue || nextDue > today) return;

    const plan = listDue({ ...ruleOf(item), nextDueDate: nextDue }, today);

    if (plan.skippedCount > 0) {
      // Tiến lịch qua các kỳ quá cũ trước khi báo, để không báo lặp lại
      const advanced = await RecurringRepository.advanceDue(
        item.id,
        userId,
        toDbDate(nextDue),
        toDbDate(plan.due[0] || plan.nextDueDate)
      );
      if (!advanced) return;
      result.skippedMissed += plan.skippedCount;
    }

    for (const due of plan.due) {
      const recorded = await RecurringRepository.recordOccurrence({
        id: item.id,
        userId,
        due: toDbDate(due),
        nextAfter: (current) => toDbDate(nextDueAfter(ruleOf(current), due)),
      });
      if (!recorded) continue;

      result.syncedCount++;
      FinancialAuditLogger.log({
        userId,
        action: 'RECURRING_SYNC',
        entity: 'Transaction',
        entityId: recorded.transactionId,
        walletId: recorded.walletId,
        amount: recorded.amount,
        delta: recorded.delta,
        metadata: { recurringId: item.id, dueDate: due },
      });
    }
  }

  static async syncRecurringTransactions(userId: string): Promise<RecurringSyncResult> {
    const today = getBusinessDate();
    const result: RecurringSyncResult = { syncedCount: 0, skippedMissed: 0, failedCount: 0 };

    let items = await RecurringRepository.findActiveByUserId(userId);
    if (items.some((item) => !item.nextDueDate)) {
      await this.initializeLegacySchedules(userId, today);
      items = await RecurringRepository.findActiveByUserId(userId);
    }

    let firstError: unknown;
    for (const item of items) {
      try {
        await this.syncOne(item, userId, today, result);
      } catch (error) {
        firstError ??= error;
        result.failedCount++;
        Logger.error(`Recurring sync failed for item ${item.id}`, error as Error);
      }
    }

    // Không làm được gì thì báo lỗi thật; ghi được một phần thì trả kết quả để client tải lại
    if (firstError && result.syncedCount === 0 && result.skippedMissed === 0) {
      throw firstError;
    }

    return result;
  }
}
