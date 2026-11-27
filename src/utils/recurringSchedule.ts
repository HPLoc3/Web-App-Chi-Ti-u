// Dùng chung client + server. Mọi ngày là chuỗi YYYY-MM-DD (ngày nghiệp vụ giờ Việt Nam),
// tính toán bằng số học UTC nên không phụ thuộc múi giờ của máy chạy.
import type { Expense, RecurringExpense } from '../types';

export type RecurringFrequency = 'weekly' | 'monthly' | 'yearly';

/** Chỉ bù các kỳ lỡ trong số ngày gần nhất này; kỳ cũ hơn chỉ được đếm là "bỏ qua". */
export const RECURRING_BACKFILL_DAYS = 31;

/** Chốt chống lặp vô hạn khi duyệt các kỳ quá cũ */
const MAX_SCHEDULE_STEPS = 2000;
const DAY_MS = 86_400_000;

export const AUTO_NOTE_SUFFIX = ' (Tự động định kỳ)';

export interface ScheduleRule {
  frequency: RecurringFrequency;
  /** Ngày gốc trong tháng (1-31), không bị co theo tháng ngắn */
  dayOfMonth: number;
  /** Ngày bắt đầu: mốc của chu kỳ tuần/năm và không có kỳ nào trước ngày này */
  anchorDate: string | null;
}

export interface ScheduleInput {
  frequency?: string;
  dayOfMonth?: number;
  startDate?: string;
}

export const normalizeFrequency = (value: unknown): RecurringFrequency =>
  value === 'weekly' || value === 'yearly' ? value : 'monthly';

export const toDbDate = (ymd: string): Date => new Date(`${ymd}T00:00:00.000Z`);

export const fromDbDate = (date: Date | null | undefined): string | null =>
  date ? date.toISOString().slice(0, 10) : null;

export function isValidYmd(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = toDbDate(value);
  return !isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const parts = (ymd: string) => {
  if (!isValidYmd(ymd)) throw new Error(`Ngày không hợp lệ: ${ymd}`);
  const [year, month, day] = ymd.split('-').map(Number);
  return { year, month, day };
};

export function addDays(ymd: string, days: number): string {
  parts(ymd);
  return new Date(toDbDate(ymd).getTime() + days * DAY_MS).toISOString().slice(0, 10);
}

export const diffDays = (from: string, to: string): number =>
  Math.round((toDbDate(to).getTime() - toDbDate(from).getTime()) / DAY_MS);

/** month 1-12 (cho phép 13 = tháng 1 năm sau); day bị co về ngày cuối tháng nếu tháng ngắn */
function clampedDate(year: number, month: number, day: number): string {
  const y = year + Math.floor((month - 1) / 12);
  const m = ((month - 1) % 12) + 1;
  const lastDay = new Date(Date.UTC(2000 + (y % 400), m, 0)).getUTCDate();
  const d = Math.min(Math.max(Math.trunc(day) || 1, 1), lastDay);
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function firstDueOnOrAfter(rule: ScheduleRule, from: string): string {
  const start = rule.anchorDate && rule.anchorDate > from ? rule.anchorDate : from;
  const { year, month } = parts(start);

  if (rule.frequency === 'weekly') {
    const anchor = rule.anchorDate || start;
    return addDays(anchor, Math.ceil(diffDays(anchor, start) / 7) * 7);
  }

  if (rule.frequency === 'yearly') {
    const anchor = parts(rule.anchorDate || start);
    const candidate = clampedDate(year, anchor.month, anchor.day);
    return candidate >= start ? candidate : clampedDate(year + 1, anchor.month, anchor.day);
  }

  const candidate = clampedDate(year, month, rule.dayOfMonth);
  return candidate >= start ? candidate : clampedDate(year, month + 1, rule.dayOfMonth);
}

export function nextDueAfter(rule: ScheduleRule, due: string): string {
  return firstDueOnOrAfter(
    { ...rule, anchorDate: rule.anchorDate || (rule.frequency === 'monthly' ? null : due) },
    addDays(due, 1)
  );
}

/** Các kỳ đến hạn tính đến hôm nay, bắt đầu từ rule.nextDueDate */
export function listDue(
  rule: ScheduleRule & { nextDueDate: string },
  today: string,
  backfillDays: number = RECURRING_BACKFILL_DAYS
): { due: string[]; skippedCount: number; nextDueDate: string } {
  parts(rule.nextDueDate);
  const cutoff = addDays(today, -backfillDays);
  const due: string[] = [];
  let skippedCount = 0;
  let cursor = rule.nextDueDate;

  for (let step = 0; cursor <= today && step < MAX_SCHEDULE_STEPS; step++) {
    if (cursor < cutoff) skippedCount++;
    else due.push(cursor);
    cursor = nextDueAfter(rule, cursor);
    // Quá nhiều kỳ cũ: nhảy thẳng tới cửa sổ bù, chừa đủ số bước cho các kỳ trong cửa sổ
    if (step === MAX_SCHEDULE_STEPS - 100 && cursor < cutoff) cursor = firstDueOnOrAfter(rule, cutoff);
  }

  return { due, skippedCount, nextDueDate: cursor };
}

const isSamePeriod = (frequency: RecurringFrequency, a: string, b: string): boolean => {
  if (frequency === 'weekly') return Math.abs(diffDays(a, b)) < 7;
  const length = frequency === 'yearly' ? 4 : 7;
  return a.slice(0, length) === b.slice(0, length);
};

/**
 * Kỳ kế tiếp tính từ hôm nay (không sinh quá khứ). Nếu chu kỳ (tuần/tháng/năm) đó
 * đã được ghi (lastDueDate) thì nhảy sang kỳ sau để không thu hai lần.
 */
export function nextDueFromToday(rule: ScheduleRule, today: string, lastDueDate?: string | null): string {
  const from = lastDueDate && lastDueDate >= today ? addDays(lastDueDate, 1) : today;
  let due = firstDueOnOrAfter(rule, from);
  for (let step = 0; lastDueDate && step < 10 && isSamePeriod(rule.frequency, due, lastDueDate); step++) {
    due = nextDueAfter(rule, due);
  }
  return due;
}

/** Lịch hiệu lực từ dữ liệu người dùng nhập, bù phần thiếu bằng lịch cũ (khi sửa) */
export function buildRule(input: ScheduleInput, today: string, existing?: ScheduleRule): ScheduleRule {
  const frequency = normalizeFrequency(input.frequency ?? existing?.frequency);
  const startDate = input.startDate || existing?.anchorDate || null;
  const inputDay = input.dayOfMonth ?? existing?.dayOfMonth;

  if (frequency === 'monthly') {
    const dayOfMonth = inputDay ?? (startDate ? parts(startDate).day : 1);
    return { frequency, dayOfMonth, anchorDate: startDate || today };
  }

  // Tuần/năm lặp theo ngày bắt đầu; client cũ không gửi thì suy từ ngày trong tháng
  const anchorDate =
    startDate ||
    firstDueOnOrAfter(
      { frequency: 'monthly', dayOfMonth: inputDay ?? parts(today).day, anchorDate: null },
      today
    );
  return { frequency, dayOfMonth: parts(anchorDate).day, anchorDate };
}

/** Người dùng có đổi lịch không (đổi số tiền/ghi chú thì không) */
export function isScheduleChanged(input: ScheduleInput, existing: ScheduleRule): boolean {
  const frequency = normalizeFrequency(input.frequency ?? existing.frequency);
  if (frequency !== existing.frequency) return true;
  if (input.startDate && input.startDate !== existing.anchorDate) return true;
  return frequency === 'monthly' && input.dayOfMonth !== undefined && input.dayOfMonth !== existing.dayOfMonth;
}

/** Ghi chú mà bản cũ hoặc thao tác "ghi nhận ngay" tạo ra cho một khoản định kỳ */
export const legacyNoteVariants = (note: string): string[] => [
  note,
  `${note}${AUTO_NOTE_SUFFIX}`,
  `[Định kỳ] ${note || 'Khoản chi cố định'}`,
];

export function monthlyEquivalent(amount: number, frequency?: string): number {
  if (frequency === 'weekly') return Math.round((amount * 52) / 12);
  if (frequency === 'yearly') return Math.round(amount / 12);
  return amount;
}

/** Ước tính chi phí mỗi tháng của các khoản đang kích hoạt */
export const totalMonthlyRecurring = (
  items: Array<{ amount: number; frequency?: string; isActive?: boolean }>
): number =>
  items.reduce(
    (sum, item) => (item.isActive === false ? sum : sum + monthlyEquivalent(item.amount, item.frequency)),
    0
  );

const ruleOf = (item: Omit<RecurringExpense, 'id'>): ScheduleRule => ({
  frequency: normalizeFrequency(item.frequency),
  dayOfMonth: item.dayOfMonth,
  anchorDate: item.startDate || null,
});

/** Kỳ kế tiếp để hiển thị; dữ liệu chưa có nextPaymentDate thì tính từ hôm nay */
export const displayNextDue = (item: Omit<RecurringExpense, 'id'>, today: string): string =>
  item.nextPaymentDate || nextDueFromToday(ruleOf(item), today, item.lastDueDate);

// ----- Chế độ khách: cùng quy tắc lịch với máy chủ -----

export function createGuestRecurring(
  input: Omit<RecurringExpense, 'id'>,
  today: string,
  id: string
): RecurringExpense {
  const rule = buildRule(input, today);
  return {
    ...input,
    id,
    frequency: rule.frequency,
    dayOfMonth: rule.dayOfMonth,
    startDate: rule.anchorDate || undefined,
    nextPaymentDate: nextDueFromToday(rule, today),
    lastDueDate: undefined,
    isActive: input.isActive !== false,
  };
}

export function updateGuestRecurring(
  existing: RecurringExpense,
  updated: RecurringExpense,
  today: string
): RecurringExpense {
  const current = ruleOf(existing);
  const changed = isScheduleChanged(updated, current);
  const reactivated = existing.isActive === false && updated.isActive !== false;
  const merged: RecurringExpense = {
    ...existing,
    amount: updated.amount,
    categoryId: updated.categoryId,
    note: updated.note,
    isActive: updated.isActive !== false,
  };
  if (!changed && !reactivated) return merged;

  const rule = changed ? buildRule(updated, today, current) : current;
  return {
    ...merged,
    frequency: rule.frequency,
    dayOfMonth: rule.dayOfMonth,
    startDate: rule.anchorDate || undefined,
    nextPaymentDate: nextDueFromToday(rule, today, existing.lastDueDate),
  };
}

/** Hàm thuần: gọi lại trên kết quả của chính nó thì không ghi thêm */
export function applyGuestRecurringSync(
  recurring: RecurringExpense[],
  expenses: Expense[],
  today: string
): { recurringExpenses: RecurringExpense[]; expenses: Expense[]; syncedCount: number; skippedMissed: number } {
  const created: Expense[] = [];
  const matchedIds = new Set<string>();
  let skippedMissed = 0;
  let changed = false;

  const recurringExpenses = recurring.map((item) => {
    if (item.isActive === false) return item;
    const rule = ruleOf(item);
    let { nextPaymentDate: nextDue, lastDueDate } = item;

    if (!isValidYmd(nextDue)) {
      nextDue = nextDueFromToday(rule, today, lastDueDate);
      // Khoản cũ: kỳ đầu có thể đã được ghi (bản cũ hoặc ghi tay) trong cùng tháng
      const variants = legacyNoteVariants(item.note);
      const recorded = expenses.find(
        (e) =>
          !e.recurringId &&
          !matchedIds.has(e.id) &&
          e.categoryId === item.categoryId &&
          e.amount === item.amount &&
          variants.includes(e.note) &&
          e.date.slice(0, 7) === nextDue!.slice(0, 7)
      );
      if (recorded) {
        matchedIds.add(recorded.id);
        lastDueDate = nextDue;
        nextDue = nextDueAfter(rule, nextDue);
      }
    }

    const result = listDue({ ...rule, nextDueDate: nextDue }, today);
    skippedMissed += result.skippedCount;
    for (const due of result.due) {
      lastDueDate = due;
      if (expenses.some((e) => e.recurringId === item.id && e.recurringDueDate === due)) continue;
      created.push({
        id: `exp-${item.id}-${due}`,
        amount: item.amount,
        categoryId: item.categoryId,
        note: `${item.note}${AUTO_NOTE_SUFFIX}`,
        date: due,
        recurringId: item.id,
        recurringDueDate: due,
      });
    }

    if (result.nextDueDate === item.nextPaymentDate && lastDueDate === item.lastDueDate) return item;
    changed = true;
    return { ...item, nextPaymentDate: result.nextDueDate, lastDueDate };
  });

  return {
    recurringExpenses: changed ? recurringExpenses : recurring,
    expenses: created.length > 0 ? [...created, ...expenses] : expenses,
    syncedCount: created.length,
    skippedMissed,
  };
}
