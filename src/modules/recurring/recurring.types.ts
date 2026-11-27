import type { RecurringFrequency } from '../../utils/recurringSchedule';

export interface RecurringDTO {
  id: string;
  amount: number;
  categoryId: string;
  categoryName?: string;
  categoryIcon?: string;
  categoryColor?: string;
  dayOfMonth: number;
  note: string;
  type: string;
  isActive: boolean;
  frequency: RecurringFrequency;
  startDate?: string;
  /** null khi đang tạm dừng */
  nextPaymentDate: string | null;
}

export interface CreateRecurringInput {
  amount: number;
  categoryId?: string;
  dayOfMonth?: number;
  frequency?: RecurringFrequency;
  startDate?: string;
  note?: string;
  type?: 'EXPENSE' | 'INCOME';
  isActive?: boolean;
}

export type UpdateRecurringInput = Partial<CreateRecurringInput>;

export interface RecurringSyncResult {
  syncedCount: number;
  /** Số kỳ lỡ quá hạn bù, không được ghi */
  skippedMissed: number;
  /** Số khoản gặp lỗi khi ghi (sẽ thử lại ở lần đồng bộ sau) */
  failedCount: number;
}
