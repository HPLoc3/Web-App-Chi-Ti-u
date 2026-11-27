import { describe, it, expect } from 'vitest';
import {
  RECURRING_BACKFILL_DAYS,
  addDays,
  applyGuestRecurringSync,
  buildRule,
  createGuestRecurring,
  firstDueOnOrAfter,
  listDue,
  monthlyEquivalent,
  nextDueAfter,
  nextDueFromToday,
  totalMonthlyRecurring,
  updateGuestRecurring,
} from '../../../src/utils/recurringSchedule';
import { getBusinessDate } from '../../../src/utils/dateParser';
import type { Expense, RecurringExpense } from '../../../src/types';

const monthly = (dayOfMonth: number, anchorDate: string | null = null) =>
  ({ frequency: 'monthly' as const, dayOfMonth, anchorDate });

const chain = (rule: Parameters<typeof nextDueAfter>[0], from: string, n: number) => {
  const out = [firstDueOnOrAfter(rule, from)];
  while (out.length < n) out.push(nextDueAfter(rule, out[out.length - 1]));
  return out;
};

describe('recurringSchedule - hàm lịch', () => {
  it('ngày 31 co về cuối tháng nhưng vẫn giữ ngày 31 cho tháng sau', () => {
    expect(chain(monthly(31), '2027-01-15', 4)).toEqual([
      '2027-01-31',
      '2027-02-28',
      '2027-03-31',
      '2027-04-30',
    ]);
    expect(firstDueOnOrAfter(monthly(31), '2028-02-01')).toBe('2028-02-29');
  });

  it('tạo ngày 10 với dayOfMonth 5 thì kỳ đầu là tháng sau', () => {
    expect(nextDueFromToday(monthly(5), '2026-11-10')).toBe('2026-12-05');
    expect(nextDueFromToday(monthly(10), '2026-11-10')).toBe('2026-11-10');
  });

  it('ngày bắt đầu tương lai: không có kỳ trước ngày bắt đầu', () => {
    expect(firstDueOnOrAfter(monthly(5, '2027-03-10'), '2026-11-10')).toBe('2027-04-05');
  });

  it('hàng tuần neo theo ngày bắt đầu, cách nhau 7 ngày', () => {
    const rule = { frequency: 'weekly' as const, dayOfMonth: 2, anchorDate: '2026-11-02' };
    expect(chain(rule, '2026-11-26', 3)).toEqual(['2026-11-30', '2026-12-07', '2026-12-14']);
    expect(firstDueOnOrAfter(rule, '2026-11-30')).toBe('2026-11-30');
  });

  it('hàng năm neo 29/2 co về 28/2 ở năm thường và trở lại 29/2 ở năm nhuận', () => {
    const rule = { frequency: 'yearly' as const, dayOfMonth: 29, anchorDate: '2024-02-29' };
    expect(chain(rule, '2026-11-26', 3)).toEqual(['2027-02-28', '2028-02-29', '2029-02-28']);
  });

  it('23:30 UTC ngày 30 đã là ngày 1 theo giờ Việt Nam', () => {
    const today = getBusinessDate(new Date('2026-11-30T23:30:00Z'));
    expect(today).toBe('2026-12-01');
    expect(listDue({ ...monthly(1), nextDueDate: '2026-12-01' }, today).due).toEqual(['2026-12-01']);
  });

  it('listDue: chưa tới hạn thì rỗng', () => {
    expect(listDue({ ...monthly(27), nextDueDate: '2026-11-27' }, '2026-11-26')).toEqual({
      due: [],
      skippedCount: 0,
      nextDueDate: '2026-11-27',
    });
  });

  it('listDue: chỉ bù kỳ trong 31 ngày gần nhất, đếm kỳ cũ hơn', () => {
    expect(RECURRING_BACKFILL_DAYS).toBe(31);
    const res = listDue({ ...monthly(26), nextDueDate: '2026-07-26' }, '2026-11-26');
    // 31 ngày trước 26/11 là 26/10: kỳ đúng mốc vẫn được bù
    expect(res).toEqual({ due: ['2026-10-26', '2026-11-26'], skippedCount: 3, nextDueDate: '2026-12-26' });
    const older = listDue({ ...monthly(25), nextDueDate: '2026-10-25' }, '2026-11-26');
    expect(older).toEqual({ due: ['2026-11-25'], skippedCount: 1, nextDueDate: '2026-12-25' });
  });

  it('listDue: có chốt chống lặp vô hạn với ngày rất cũ', () => {
    const rule = { frequency: 'weekly' as const, dayOfMonth: 1, anchorDate: '1000-01-01', nextDueDate: '1000-01-01' };
    const res = listDue(rule, '2026-11-26');
    expect(res.due.length).toBeGreaterThanOrEqual(4);
    expect(res.due.length).toBeLessThanOrEqual(5);
    expect(res.due.every((d) => d >= addDays('2026-11-26', -31) && d <= '2026-11-26')).toBe(true);
    expect(res.nextDueDate > '2026-11-26').toBe(true);
  });

  it('listDue: ngày không hợp lệ thì ném lỗi, không lặp', () => {
    expect(() => listDue({ ...monthly(1), nextDueDate: 'abc' }, '2026-11-26')).toThrow();
  });

  it('đổi lịch: kỳ của chu kỳ đã ghi thì nhảy tiếp', () => {
    // Đã ghi 05/11, đổi sang ngày 28: không thu thêm trong tháng 11
    expect(nextDueFromToday(monthly(28), '2026-11-26', '2026-11-05')).toBe('2026-12-28');
    expect(nextDueFromToday(monthly(26), '2026-11-26', '2026-11-26')).toBe('2026-12-26');
    expect(nextDueFromToday(monthly(28), '2026-11-26', '2026-10-28')).toBe('2026-11-28');
  });

  it('buildRule: tuần/năm lấy ngày theo ngày bắt đầu; tháng giữ dayOfMonth', () => {
    expect(buildRule({ frequency: 'weekly', dayOfMonth: 5, startDate: '2026-12-02' }, '2026-11-26')).toEqual({
      frequency: 'weekly',
      dayOfMonth: 2,
      anchorDate: '2026-12-02',
    });
    expect(buildRule({ dayOfMonth: 5 }, '2026-11-26')).toEqual(monthly(5, '2026-11-26'));
    expect(buildRule({ startDate: '2026-12-09' }, '2026-11-26')).toEqual(monthly(9, '2026-12-09'));
    expect(buildRule({ frequency: 'yearly', dayOfMonth: 5 }, '2026-11-26')).toEqual({
      frequency: 'yearly',
      dayOfMonth: 5,
      anchorDate: '2026-12-05',
    });
  });

  it('ước tính chi phí tháng quy đổi đúng theo tần suất, bỏ khoản tạm dừng', () => {
    expect(monthlyEquivalent(120_000, 'weekly')).toBe(520_000);
    expect(monthlyEquivalent(1_200_000, 'yearly')).toBe(100_000);
    expect(monthlyEquivalent(300_000, undefined)).toBe(300_000);
    expect(
      totalMonthlyRecurring([
        { amount: 120_000, frequency: 'weekly' },
        { amount: 1_200_000, frequency: 'yearly' },
        { amount: 999_000, isActive: false },
      ])
    ).toBe(620_000);
  });
});

describe('recurringSchedule - chế độ khách', () => {
  const base: Omit<RecurringExpense, 'id'> = {
    amount: 100_000,
    categoryId: 'hoa_don',
    dayOfMonth: 26,
    note: 'Net',
  };

  it('tạo mới với ngày bắt đầu quá khứ không sinh bù', () => {
    const rec = createGuestRecurring({ ...base, dayOfMonth: 5, startDate: '2026-01-01' }, '2026-11-26', 'r1');
    expect(rec.nextPaymentDate).toBe('2026-12-05');
    expect(applyGuestRecurringSync([rec], [], '2026-11-26').syncedCount).toBe(0);
  });

  it('tới hạn ghi 1 lần, gọi lại không ghi thêm; 2 khoản giống nhau ra 2', () => {
    const a = createGuestRecurring(base, '2026-11-26', 'a');
    const b = createGuestRecurring(base, '2026-11-26', 'b');
    const first = applyGuestRecurringSync([a, b], [], '2026-11-26');
    expect(first.syncedCount).toBe(2);
    expect(first.expenses.map((e) => [e.recurringId, e.recurringDueDate, e.date])).toEqual([
      ['a', '2026-11-26', '2026-11-26'],
      ['b', '2026-11-26', '2026-11-26'],
    ]);
    const second = applyGuestRecurringSync(first.recurringExpenses, first.expenses, '2026-11-26');
    expect(second.syncedCount).toBe(0);
    expect(second.expenses).toHaveLength(2);
  });

  it('sửa ghi chú không đổi lịch và không ghi trùng', () => {
    const rec = createGuestRecurring(base, '2026-11-26', 'a');
    const done = applyGuestRecurringSync([rec], [], '2026-11-26');
    const edited = updateGuestRecurring(
      done.recurringExpenses[0],
      { ...done.recurringExpenses[0], note: 'Net mới', amount: 150_000 },
      '2026-11-26'
    );
    expect(edited.nextPaymentDate).toBe('2026-12-26');
    expect(applyGuestRecurringSync([edited], done.expenses, '2026-11-26').syncedCount).toBe(0);
  });

  it('tạm dừng không ghi; bật lại tính từ hôm nay', () => {
    const rec = createGuestRecurring(base, '2026-09-01', 'a');
    const paused = updateGuestRecurring(rec, { ...rec, isActive: false }, '2026-09-01');
    expect(applyGuestRecurringSync([paused], [], '2026-11-27').syncedCount).toBe(0);
    const resumed = updateGuestRecurring(paused, { ...paused, isActive: true }, '2026-11-27');
    expect(resumed.nextPaymentDate).toBe('2026-12-26');
  });

  it('khoản cũ (chưa có kỳ kế tiếp) đã ghi tay trong tháng thì không ghi trùng', () => {
    const legacy: RecurringExpense = { ...base, id: 'old', dayOfMonth: 28 };
    const expenses: Expense[] = [
      { id: 'e1', amount: 100_000, categoryId: 'hoa_don', date: '2026-11-28', note: 'Net (Tự động định kỳ)' },
    ];
    const res = applyGuestRecurringSync([legacy], expenses, '2026-11-28');
    expect(res.syncedCount).toBe(0);
    expect(res.recurringExpenses[0].nextPaymentDate).toBe('2026-12-28');
  });

  it('bỏ qua kỳ quá 31 ngày đúng một lần', () => {
    const rec = { ...createGuestRecurring(base, '2026-07-01', 'a') };
    const first = applyGuestRecurringSync([rec], [], '2026-11-26');
    expect(first.skippedMissed).toBe(3);
    expect(first.syncedCount).toBe(2);
    expect(applyGuestRecurringSync(first.recurringExpenses, first.expenses, '2026-11-26').skippedMissed).toBe(0);
  });
});
