import { formatVietnameseDisplayDate } from './dateParser';

export function formatCurrency(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${num.toLocaleString('vi-VN')}₫`;
}

export const formatVND = formatCurrency;

export function formatDateVietnamese(dateStr: string): string {
  if (!dateStr) return '';
  return formatVietnameseDisplayDate(dateStr);
}

