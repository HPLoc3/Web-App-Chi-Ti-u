import { Expense } from '../types';

export interface MonthlySummary {
  totalExpense: number;
  /** Thu nhập khai báo trừ tổng chi; âm = thâm hụt (không kẹp) */
  net: number;
  /** Kẹp tối thiểu 0; null = chưa nhập thu nhập nên chưa đánh giá */
  savingsRatePct: number | null;
  prevMonthKey: string;
  prevTotal: number;
}

/** 'YYYY-MM' của tháng liền trước, tính trên chuỗi để không lệch múi giờ */
export function getPrevMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}`;
}

const totalOfMonth = (expenses: Expense[], monthKey: string): number =>
  expenses.filter((e) => e.date && e.date.startsWith(monthKey)).reduce((sum, e) => sum + e.amount, 0);

export function computeMonthlySummary(expenses: Expense[], income: number, monthKey: string): MonthlySummary {
  const totalExpense = totalOfMonth(expenses, monthKey);
  const net = income - totalExpense;
  const prevMonthKey = getPrevMonthKey(monthKey);

  return {
    totalExpense,
    net,
    savingsRatePct: income > 0 ? (Math.max(0, net) / income) * 100 : null,
    prevMonthKey,
    prevTotal: totalOfMonth(expenses, prevMonthKey),
  };
}
