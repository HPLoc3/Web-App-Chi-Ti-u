import { prisma } from '../../lib/prisma';
import { RecurringTransaction, Prisma, Wallet } from '@prisma/client';
import { devFallbackStore, DevFallbackStore, DEFAULT_SYSTEM_CATEGORIES } from '../../lib/devFallbackStore';
import { lockUserRow } from '../../lib/lockUser';
import { parseBusinessDate } from '../../utils/dateParser';
import { AUTO_NOTE_SUFFIX, fromDbDate } from '../../utils/recurringSchedule';

const CATEGORY_INCLUDE = {
  category: {
    select: { id: true, name: true, icon: true, color: true },
  },
} as const;

export interface OccurrenceClaim {
  id: string;
  userId: string;
  due: Date;
  /** Kỳ sau theo đúng dữ liệu đang lưu (đọc trong transaction) */
  nextAfter: (item: RecurringTransaction) => Date;
}

export interface RecordedOccurrence {
  transactionId: string;
  walletId: string;
  amount: Prisma.Decimal;
  delta: Prisma.Decimal;
}

export type LegacyInitializer = (
  item: RecurringTransaction,
  findTransactions: (where: Prisma.TransactionWhereInput) => Promise<Array<{ id: string }>>
) => Promise<Prisma.RecurringTransactionUpdateManyMutationInput>;

const occurrenceData = (item: RecurringTransaction, walletId: string, due: Date) => ({
  amount: item.amount,
  type: item.type,
  note: `${item.note}${AUTO_NOTE_SUFFIX}`,
  date: parseBusinessDate(fromDbDate(due)!),
  walletId,
  categoryId: item.categoryId,
  userId: item.userId,
  recurringId: item.id,
  recurringDueDate: due,
});

const balanceDeltaOf = (item: RecurringTransaction): Prisma.Decimal =>
  item.type === 'INCOME' ? item.amount : item.amount.negated();

const claimData = (due: Date, nextDue: Date) => ({ nextDueDate: nextDue, lastDueDate: due, lastRunAt: new Date() });

export class RecurringRepository {
  static async findByUserId(userId: string): Promise<RecurringTransaction[]> {
    try {
      return await prisma.recurringTransaction.findMany({
        where: { userId },
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
        orderBy: { dayOfMonth: 'asc' },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.getUserRecurring(userId);
      }
      throw error;
    }
  }

  static async findActiveByUserId(userId: string): Promise<RecurringTransaction[]> {
    try {
      return await prisma.recurringTransaction.findMany({
        where: { userId, isActive: true },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.getUserRecurring(userId).filter((r) => r.isActive);
      }
      throw error;
    }
  }

  static async findByIdAndUserId(id: string, userId: string): Promise<RecurringTransaction | null> {
    try {
      return await prisma.recurringTransaction.findFirst({
        where: { id, userId },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const r = devFallbackStore.recurring.get(id);
        return r && r.userId === userId ? r : null;
      }
      throw error;
    }
  }

  static async create(data: Prisma.RecurringTransactionCreateInput): Promise<RecurringTransaction> {
    try {
      return await prisma.recurringTransaction.create({
        data,
        include: {
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const id = `dev-rec-${Date.now()}`;
        const catId = (data.category as any)?.connect?.id || 'hoa_don';
        const cat = devFallbackStore.categories.get(catId) || DEFAULT_SYSTEM_CATEGORIES[0];
        const r: RecurringTransaction = {
          id,
          amount: new Prisma.Decimal(data.amount?.toString() || '0'),
          type: data.type || 'EXPENSE',
          note: data.note,
          dayOfMonth: data.dayOfMonth,
          frequency: data.frequency || 'monthly',
          anchorDate: (data.anchorDate as Date | null | undefined) ?? null,
          nextDueDate: (data.nextDueDate as Date | null | undefined) ?? null,
          lastDueDate: null,
          isActive: data.isActive !== undefined ? data.isActive : true,
          lastRunAt: null,
          categoryId: catId,
          userId: (data.user as any)?.connect?.id || 'dev-user',
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        devFallbackStore.recurring.set(id, r);
        return { ...r, category: cat } as any;
      }
      throw error;
    }
  }

  /**
   * Đọc và ghi dưới khóa dòng User (cùng khóa với đồng bộ) để lịch mới không được tính
   * từ dữ liệu cũ khi một kỳ đang được ghi. Trả về null nếu không thuộc người dùng.
   */
  static async updateWithUserLock(
    id: string,
    userId: string,
    build: (current: RecurringTransaction) => Prisma.RecurringTransactionUpdateInput
  ): Promise<RecurringTransaction | null> {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        const current = await tx.recurringTransaction.findFirst({ where: { id, userId } });
        if (!current) return null;
        return tx.recurringTransaction.update({
          where: { id, userId },
          data: build(current),
          include: CATEGORY_INCLUDE,
        });
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const r = devFallbackStore.recurring.get(id);
        if (!r || r.userId !== userId) return null;
        const { amount, category, ...rest } = build(r) as any;
        Object.assign(r, rest, { updatedAt: new Date() });
        if (amount !== undefined) r.amount = new Prisma.Decimal(amount.toString());
        if (category?.connect?.id) r.categoryId = category.connect.id;
        const cat = devFallbackStore.categories.get(r.categoryId) || DEFAULT_SYSTEM_CATEGORIES[0];
        return { ...r, category: cat } as any;
      }
      throw error;
    }
  }

  static async delete(id: string): Promise<void> {
    try {
      await prisma.recurringTransaction.delete({
        where: { id },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        devFallbackStore.recurring.delete(id);
        return;
      }
      throw error;
    }
  }

  static async findDefaultWallet(userId: string, db: Prisma.TransactionClient = prisma): Promise<Wallet | null> {
    try {
      return await db.wallet.findFirst({
        where: { userId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const wallets = devFallbackStore.getUserWallets(userId);
        return wallets.find((w) => w.isDefault) || wallets[0] || null;
      }
      throw error;
    }
  }

  static async createDefaultWallet(userId: string, db: Prisma.TransactionClient = prisma): Promise<Wallet> {
    try {
      return await db.wallet.create({
        data: {
          name: 'Ví Chính',
          balance: new Prisma.Decimal(0),
          currency: 'VND',
          isDefault: true,
          type: 'cash',
          userId,
        },
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        return devFallbackStore.createWallet({ name: 'Ví Chính', isDefault: true, user: { connect: { id: userId } } });
      }
      throw error;
    }
  }

  /** Khởi tạo lịch cho bản ghi cũ trong một transaction để các khoản giống nhau không khớp chung một giao dịch */
  static async initializeSchedules(userId: string, init: LegacyInitializer): Promise<void> {
    try {
      await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);
        const rows = await tx.recurringTransaction.findMany({
          where: { userId, isActive: true, nextDueDate: null },
          orderBy: { createdAt: 'asc' },
        });
        for (const row of rows) {
          const data = await init(row, (where) => tx.transaction.findMany({ where, select: { id: true } }));
          await tx.recurringTransaction.updateMany({ where: { id: row.id, userId, nextDueDate: null }, data });
        }
      });
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        for (const stored of devFallbackStore.recurring.values()) {
          if (stored.userId !== userId || !stored.isActive || stored.nextDueDate) continue;
          // Kho mẫu chỉ khởi tạo lịch, không dò giao dịch đã ghi tay
          Object.assign(stored, await init(stored, async () => []));
        }
        return;
      }
      throw error;
    }
  }

  /** Tiến lịch có điều kiện: false nghĩa là request khác đã xử lý hoặc khoản đã đổi/tạm dừng */
  static async advanceDue(id: string, userId: string, expected: Date, next: Date, recorded?: Date): Promise<boolean> {
    const data = recorded ? claimData(recorded, next) : { nextDueDate: next };
    try {
      const result = await prisma.recurringTransaction.updateMany({
        where: { id, userId, isActive: true, nextDueDate: expected },
        data,
      });
      return result.count === 1;
    } catch (error) {
      if (DevFallbackStore.shouldFallback(error)) {
        const r = devFallbackStore.recurring.get(id);
        if (!r || r.userId !== userId || !r.isActive || r.nextDueDate?.getTime() !== expected.getTime()) return false;
        Object.assign(r, data);
        return true;
      }
      throw error;
    }
  }

  /**
   * Ghi một kỳ: claim, tạo giao dịch và cập nhật ví trong cùng một transaction.
   * Thứ tự khóa: User (như xóa ví/giao dịch) -> khoản định kỳ -> ví.
   * Trả về null nếu kỳ này không (còn) cần ghi.
   */
  static async recordOccurrence(claim: OccurrenceClaim): Promise<RecordedOccurrence | null> {
    const { id, userId, due, nextAfter } = claim;
    let nextDue: Date | undefined;
    try {
      return await prisma.$transaction(async (tx) => {
        await lockUserRow(tx, userId);

        const where = { id, userId, isActive: true, nextDueDate: due };
        const current = await tx.recurringTransaction.findFirst({ where });
        if (!current) return null;
        nextDue = nextAfter(current);
        const claimed = await tx.recurringTransaction.updateMany({ where, data: claimData(due, nextDue) });
        if (claimed.count !== 1) return null;
        // Đọc lại sau khi đã giữ khóa dòng khoản định kỳ: số tiền/danh mục là bản mới nhất
        const item = (await tx.recurringTransaction.findFirst({ where: { id, userId } }))!;

        const wallet =
          (await this.findDefaultWallet(userId, tx)) || (await this.createDefaultWallet(userId, tx));

        const transaction = await tx.transaction.create({ data: occurrenceData(item, wallet.id, due) });
        const delta = balanceDeltaOf(item);
        await tx.wallet.update({ where: { id: wallet.id, userId }, data: { balance: { increment: delta } } });

        return { transactionId: transaction.id, walletId: wallet.id, amount: item.amount, delta };
      });
    } catch (error: any) {
      // Kỳ này đã có giao dịch: transaction đã rollback toàn bộ, chỉ tiến lịch
      if (error?.code === 'P2002' && nextDue) {
        const existing = await prisma.transaction.findFirst({
          where: { userId, recurringId: id, recurringDueDate: due },
          select: { id: true },
        });
        if (existing) {
          await this.advanceDue(id, userId, due, nextDue, due);
          return null;
        }
      }
      if (DevFallbackStore.shouldFallback(error)) {
        return this.recordOccurrenceInMemory(claim);
      }
      throw error;
    }
  }

  private static recordOccurrenceInMemory({ id, userId, due, nextAfter }: OccurrenceClaim): RecordedOccurrence | null {
    const item = devFallbackStore.recurring.get(id);
    if (!item || item.userId !== userId || !item.isActive || item.nextDueDate?.getTime() !== due.getTime()) {
      return null;
    }
    Object.assign(item, claimData(due, nextAfter(item)));
    const exists = Array.from(devFallbackStore.transactions.values()).some(
      (t) => t.recurringId === id && t.recurringDueDate?.getTime() === due.getTime()
    );
    if (exists) return null;

    const wallets = devFallbackStore.getUserWallets(userId);
    const wallet = wallets.find((w) => w.isDefault) || wallets[0];
    // createTransaction của kho mẫu tự cập nhật số dư
    const transaction = devFallbackStore.createTransaction(occurrenceData(item, wallet.id, due));
    return { transactionId: transaction.id, walletId: wallet.id, amount: item.amount, delta: balanceDeltaOf(item) };
  }
}
