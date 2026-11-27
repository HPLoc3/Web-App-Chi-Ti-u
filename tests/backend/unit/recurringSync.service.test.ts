import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Prisma } from '@prisma/client';

// Prisma giả trong bộ nhớ: đủ cho claim có điều kiện, rollback và UNIQUE(recurringId, recurringDueDate)
const db = vi.hoisted(() => {
  const state = { recurring: [] as any[], transactions: [] as any[], wallets: [] as any[], seq: 0, locks: 0 };
  const same = (a: any, b: any) =>
    a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b;
  const matches = (row: any, where: any = {}) =>
    Object.entries(where).every(([key, cond]: [string, any]) => {
      const value = row[key] ?? null;
      if (cond === null || cond instanceof Date || typeof cond !== 'object') return same(value, cond);
      if (typeof cond.toFixed === 'function') return Number(value) === Number(cond);
      if ('in' in cond) return cond.in.includes(value);
      return (!('gte' in cond) || value >= cond.gte) && (!('lt' in cond) || value < cond.lt);
    });
  const clone = (row: any) => (row ? { ...row } : null);
  const client: any = {
    $queryRaw: async () => {
      state.locks++;
      return [];
    },
    recurringTransaction: {
      findMany: async ({ where }: any) => state.recurring.filter((r) => matches(r, where)).map(clone),
      findFirst: async ({ where }: any) => clone(state.recurring.find((r) => matches(r, where))),
      create: async ({ data }: any) => {
        const { user, category, ...rest } = data;
        const row = {
          id: `rec-${++state.seq}`,
          lastRunAt: null,
          lastDueDate: null,
          ...rest,
          userId: user.connect.id,
          categoryId: category.connect.id,
        };
        state.recurring.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.recurring.find((r) => matches(r, where));
        if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' });
        const { category, ...rest } = data;
        Object.assign(row, rest, category ? { categoryId: category.connect.id } : {});
        return clone(row);
      },
      updateMany: async ({ where, data }: any) => {
        const rows = state.recurring.filter((r) => matches(r, where));
        rows.forEach((r) => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    transaction: {
      findMany: async ({ where }: any) => state.transactions.filter((t) => matches(t, where)).map(clone),
      findFirst: async ({ where }: any) => clone(state.transactions.find((t) => matches(t, where))),
      create: async ({ data }: any) => {
        if (
          data.recurringId &&
          state.transactions.some((t) =>
            matches(t, { recurringId: data.recurringId, recurringDueDate: data.recurringDueDate })
          )
        ) {
          throw Object.assign(new Error('unique'), { code: 'P2002' });
        }
        const row = { id: `tx-${++state.seq}`, ...data };
        state.transactions.push(row);
        return clone(row);
      },
    },
    wallet: {
      findFirst: async ({ where }: any) => clone(state.wallets.find((w) => matches(w, where))),
      create: async ({ data }: any) => {
        const row = { id: `w-${++state.seq}`, ...data };
        state.wallets.push(row);
        return clone(row);
      },
      update: async ({ where, data }: any) => {
        const row = state.wallets.find((w) => matches(w, where));
        if (!row) throw Object.assign(new Error('missing'), { code: 'P2025' });
        row.balance = row.balance.add(data.balance.increment);
        return clone(row);
      },
    },
  };
  let queue: Promise<unknown> = Promise.resolve();
  client.$transaction = (fn: (tx: any) => Promise<any>) => {
    const run = queue.then(async () => {
      const snapshot = {
        recurring: state.recurring.map((r) => ({ ...r })),
        transactions: state.transactions.map((r) => ({ ...r })),
        wallets: state.wallets.map((r) => ({ ...r })),
      };
      try {
        return await fn(client);
      } catch (error) {
        Object.assign(state, snapshot);
        throw error;
      }
    });
    queue = run.catch(() => undefined);
    return run;
  };
  return { state, client };
});

vi.mock('../../../src/lib/prisma', () => ({ prisma: db.client }));
vi.mock('../../../src/services/category.helper', () => ({
  resolveCategoryId: async (id: string | undefined) => id || 'khac',
}));

import { RecurringService } from '../../../src/modules/recurring/recurring.service';
import { createRecurringSchema, updateRecurringSchema } from '../../../src/modules/recurring/recurring.schema';

const U = 'user-1';
const at = (ymd: string) => vi.setSystemTime(new Date(`${ymd}T05:00:00Z`));
const day = (d: Date) => d.toISOString().slice(0, 10);
const balance = () => Number(db.state.wallets[0].balance);
const input = { amount: 100_000, categoryId: 'hoa_don', note: 'Net', dayOfMonth: 26 };

describe('RecurringService - lịch và đồng bộ', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    at('2026-11-26');
    Object.assign(db.state, {
      recurring: [],
      transactions: [],
      wallets: [{ id: 'w-main', userId: U, isDefault: true, balance: new Prisma.Decimal(1_000_000) }],
      seq: 0,
      locks: 0,
    });
  });
  afterEach(() => vi.useRealTimers());

  it('chưa tới hạn: không ghi gì', async () => {
    await RecurringService.createRecurring(U, { ...input, dayOfMonth: 27 });
    expect(await RecurringService.syncRecurringTransactions(U)).toEqual({
      syncedCount: 0,
      skippedMissed: 0,
      failedCount: 0,
    });
    expect(db.state.transactions).toHaveLength(0);
    expect(balance()).toBe(1_000_000);
  });

  it('tới hạn ghi đúng 1 giao dịch, gọi lại ghi 0', async () => {
    const rec = await RecurringService.createRecurring(U, input);
    expect(rec.nextPaymentDate).toBe('2026-11-26');

    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(1);
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);

    expect(db.state.transactions).toHaveLength(1);
    const tx = db.state.transactions[0];
    expect(tx.recurringId).toBe(rec.id);
    expect(day(tx.recurringDueDate)).toBe('2026-11-26');
    expect(tx.date.toISOString()).toBe('2026-11-26T12:00:00.000Z');
    expect(tx.walletId).toBe('w-main');
    expect(balance()).toBe(900_000);
    expect(db.state.locks).toBeGreaterThan(0);
    const row = db.state.recurring[0];
    expect(day(row.nextDueDate)).toBe('2026-12-26');
    expect(day(row.lastDueDate)).toBe('2026-11-26');
    expect(row.lastRunAt).toBeInstanceOf(Date);
  });

  it('khoản thu cộng vào ví', async () => {
    await RecurringService.createRecurring(U, { ...input, type: 'INCOME' });
    await RecurringService.syncRecurringTransactions(U);
    expect(balance()).toBe(1_100_000);
  });

  it('claim thất bại (request khác đã ghi) thì không ghi', async () => {
    await RecurringService.createRecurring(U, input);
    const spy = vi.spyOn(db.client.recurringTransaction, 'updateMany').mockResolvedValue({ count: 0 });
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);
    expect(db.state.transactions).toHaveLength(0);
    expect(balance()).toBe(1_000_000);
    spy.mockRestore();
  });

  it('nhiều lần đồng bộ cùng lúc chỉ ghi 1 giao dịch', async () => {
    await RecurringService.createRecurring(U, input);
    const results = await Promise.all([1, 2, 3, 4].map(() => RecurringService.syncRecurringTransactions(U)));
    expect(results.reduce((s, r) => s + r.syncedCount, 0)).toBe(1);
    expect(db.state.transactions).toHaveLength(1);
    expect(balance()).toBe(900_000);
  });

  it('P2002: rollback ví, coi như đã ghi và tiến sang kỳ sau', async () => {
    const rec = await RecurringService.createRecurring(U, input);
    db.state.transactions.push({
      id: 'tx-old',
      userId: U,
      recurringId: rec.id,
      recurringDueDate: new Date('2026-11-26T00:00:00Z'),
    });
    const res = await RecurringService.syncRecurringTransactions(U);
    expect(res).toEqual({ syncedCount: 0, skippedMissed: 0, failedCount: 0 });
    expect(db.state.transactions).toHaveLength(1);
    expect(balance()).toBe(1_000_000);
    expect(day(db.state.recurring[0].nextDueDate)).toBe('2026-12-26');
  });

  it('2 khoản giống hệt nhau ra 2 giao dịch', async () => {
    await RecurringService.createRecurring(U, input);
    await RecurringService.createRecurring(U, input);
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(2);
    expect(balance()).toBe(800_000);
  });

  it('sửa ghi chú/số tiền không đổi lịch và không ghi trùng', async () => {
    const rec = await RecurringService.createRecurring(U, input);
    await RecurringService.syncRecurringTransactions(U);
    const updated = await RecurringService.updateRecurring(rec.id, U, {
      note: 'Net mới',
      amount: 200_000,
      dayOfMonth: 26,
      frequency: 'monthly',
      startDate: rec.startDate,
      isActive: true,
    });
    expect(updated.nextPaymentDate).toBe('2026-12-26');
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);
    expect(db.state.transactions).toHaveLength(1);
  });

  it('sửa số tiền khi kỳ đang chờ ghi: giữ nguyên kỳ đó', async () => {
    const rec = await RecurringService.createRecurring(U, input);
    at('2026-11-28');
    const updated = await RecurringService.updateRecurring(rec.id, U, { amount: 120_000 });
    expect(updated.nextPaymentDate).toBe('2026-11-26');
    await RecurringService.syncRecurringTransactions(U);
    expect(day(db.state.transactions[0].recurringDueDate)).toBe('2026-11-26');
    expect(Number(db.state.transactions[0].amount)).toBe(120_000);
  });

  it('đổi lịch tính lại từ hôm nay, không thu thêm trong tháng đã ghi', async () => {
    const rec = await RecurringService.createRecurring(U, input);
    await RecurringService.syncRecurringTransactions(U);
    const updated = await RecurringService.updateRecurring(rec.id, U, { dayOfMonth: 28 });
    expect(updated.nextPaymentDate).toBe('2026-12-28');
  });

  it('tạm dừng không ghi; bật lại không bù thời gian dừng', async () => {
    const rec = await RecurringService.createRecurring(U, { ...input, dayOfMonth: 27 });
    const paused = await RecurringService.updateRecurring(rec.id, U, { isActive: false });
    expect(paused.isActive).toBe(false);
    expect(paused.nextPaymentDate).toBeNull();
    at('2027-01-28');
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);
    const resumed = await RecurringService.updateRecurring(rec.id, U, { isActive: true });
    expect(resumed.nextPaymentDate).toBe('2027-02-27');
    expect(await RecurringService.syncRecurringTransactions(U)).toMatchObject({ syncedCount: 0, skippedMissed: 0 });
  });

  it('hàng tuần: lưu và trả đúng tần suất, ngày bắt đầu, kỳ kế tiếp', async () => {
    const rec = await RecurringService.createRecurring(U, {
      ...input,
      frequency: 'weekly',
      startDate: '2026-11-12',
    });
    expect(rec).toMatchObject({ frequency: 'weekly', startDate: '2026-11-12', nextPaymentDate: '2026-11-26' });
    expect((await RecurringService.getRecurring(U))[0].frequency).toBe('weekly');
    await RecurringService.syncRecurringTransactions(U);
    expect((await RecurringService.getRecurring(U))[0].nextPaymentDate).toBe('2026-12-03');
  });

  it('bù kỳ lỡ trong 31 ngày đúng ngày đến hạn, báo số kỳ bỏ qua đúng một lần', async () => {
    at('2026-07-01');
    await RecurringService.createRecurring(U, input);
    at('2026-11-26');
    expect(await RecurringService.syncRecurringTransactions(U)).toEqual({
      syncedCount: 2,
      skippedMissed: 3,
      failedCount: 0,
    });
    expect(db.state.transactions.map((t) => day(t.date))).toEqual(['2026-10-26', '2026-11-26']);
    expect(await RecurringService.syncRecurringTransactions(U)).toMatchObject({ syncedCount: 0, skippedMissed: 0 });
  });

  it('chỉ có kỳ quá cũ: vẫn tiến nextDueDate để không báo lặp', async () => {
    at('2026-01-01');
    await RecurringService.createRecurring(U, { ...input, frequency: 'yearly', startDate: '2026-02-01' });
    at('2026-11-26');
    expect(await RecurringService.syncRecurringTransactions(U)).toMatchObject({ syncedCount: 0, skippedMissed: 1 });
    expect(day(db.state.recurring[0].nextDueDate)).toBe('2027-02-01');
    expect(await RecurringService.syncRecurringTransactions(U)).toMatchObject({ skippedMissed: 0 });
  });

  const legacyRow = (id: string, dayOfMonth: number) => ({
    id,
    userId: U,
    categoryId: 'hoa_don',
    amount: new Prisma.Decimal(100_000),
    type: 'EXPENSE',
    note: 'Net',
    dayOfMonth,
    isActive: true,
    frequency: 'monthly',
    anchorDate: null,
    nextDueDate: null,
    lastDueDate: null,
  });
  const manualTx = (id: string, note: string, iso: string) => ({
    id,
    userId: U,
    categoryId: 'hoa_don',
    amount: new Prisma.Decimal(100_000),
    type: 'EXPENSE',
    note,
    date: new Date(iso),
    recurringId: null,
  });

  it('khoản cũ: không sinh quá khứ', async () => {
    db.state.recurring.push(legacyRow('old', 5));
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);
    expect(day(db.state.recurring[0].nextDueDate)).toBe('2026-12-05');
  });

  it('khoản cũ đã ghi trong tháng: không ghi trùng, mỗi giao dịch chỉ khớp một khoản', async () => {
    db.state.recurring.push(legacyRow('old-a', 28), legacyRow('old-b', 28));
    db.state.transactions.push(manualTx('m1', 'Net (Tự động định kỳ)', '2026-11-28T08:00:00Z'));
    at('2026-11-28');
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(1);
    expect(db.state.transactions).toHaveLength(2);
    expect(db.state.recurring.map((r) => day(r.nextDueDate))).toEqual(['2026-12-28', '2026-12-28']);
  });

  it('khoản cũ: ghi chú chỉ chứa tên (không khớp nguyên văn) không bị coi là đã ghi', async () => {
    db.state.recurring.push(legacyRow('old', 26));
    db.state.transactions.push(manualTx('m1', 'Internet quán', '2026-11-20T08:00:00Z'));
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(1);
  });

  it('không đụng khoản của người dùng khác', async () => {
    db.state.recurring.push({ ...legacyRow('other', 26), userId: 'user-2' });
    expect((await RecurringService.syncRecurringTransactions(U)).syncedCount).toBe(0);
    await expect(RecurringService.updateRecurring('other', U, { note: 'x' })).rejects.toMatchObject({
      statusCode: 404,
    });
  });

  it('một khoản lỗi không chặn khoản khác; lỗi toàn bộ thì ném ra', async () => {
    await RecurringService.createRecurring(U, input);
    await RecurringService.createRecurring(U, input);
    const spy = vi.spyOn(db.client.transaction, 'create').mockRejectedValueOnce(new Error('boom'));
    expect(await RecurringService.syncRecurringTransactions(U)).toMatchObject({ syncedCount: 1, failedCount: 1 });
    expect(balance()).toBe(900_000);
    spy.mockRejectedValue(new Error('boom'));
    await expect(RecurringService.syncRecurringTransactions(U)).rejects.toThrow('boom');
    spy.mockRestore();
  });
});

describe('recurring.schema', () => {
  it('nhận frequency và startDate hợp lệ, không tự gán dayOfMonth', () => {
    const parsed = createRecurringSchema.parse({ amount: 1000, frequency: 'weekly', startDate: '2026-12-01' });
    expect(parsed).toMatchObject({ frequency: 'weekly', startDate: '2026-12-01' });
    expect(parsed.dayOfMonth).toBeUndefined();
  });

  it.each([
    { frequency: 'daily' },
    { startDate: '2026-02-30' },
    { startDate: '01/12/2026' },
    { startDate: '1800-01-01' },
    { amount: 1_000_000_000_000 },
    { dayOfMonth: 32 },
  ])('từ chối %o', (bad) => {
    expect(createRecurringSchema.safeParse({ amount: 1000, ...bad }).success).toBe(false);
    expect(updateRecurringSchema.safeParse(bad).success).toBe(false);
  });
});
