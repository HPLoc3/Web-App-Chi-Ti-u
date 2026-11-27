import { MAX_VND, formatVndInput } from './money';

/** Trạng thái một ô MoneyInput: raw giúp phân biệt ô bỏ trống với nội dung không hợp lệ */
export interface MoneyDraft {
  value: number | null;
  raw: string;
}

export const EMPTY_MONEY: MoneyDraft = { value: null, raw: '' };

export const moneyDraft = (value: number | null): MoneyDraft => ({ value, raw: formatVndInput(value) });

/** Trả về thông báo lỗi, hoặc null nếu gửi được */
export function moneyDraftError(
  draft: MoneyDraft,
  rule: 'positive' | 'nonNegative' | 'signed',
  label = 'số tiền'
): string | null {
  const { value, raw } = draft;
  if (value === null) {
    return raw.trim() === '' ? `Vui lòng nhập ${label}.` : 'Số tiền không hợp lệ.';
  }
  if (Math.abs(value) > MAX_VND) return `Số tiền tối đa là ${formatVndInput(MAX_VND)} ₫.`;
  if (rule === 'positive' && value <= 0) return 'Số tiền phải lớn hơn 0.';
  if (rule === 'nonNegative' && value < 0) return 'Số tiền không được âm.';
  return null;
}
