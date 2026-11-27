import { formatVietnameseDisplayDate, getBusinessDate } from './dateParser';

export const MASKED_MONEY = '•••••• ₫';

export function formatCurrency(amount: number): string {
  const num = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${num.toLocaleString('vi-VN')}₫`;
}

export const formatVND = formatCurrency;

export function formatMaskedCurrency(amount: number, showBalance = true): string {
  return showBalance ? formatCurrency(amount) : MASKED_MONEY;
}

/** Che toàn bộ chuỗi số tiền (dạng đầy đủ có ₫ hoặc viết tắt k / tr / M...) khi đang ẩn số dư */
export function maskMoneyInText(text: string, showBalance = false): string {
  if (showBalance || !text) return text;
  return text
    .replace(/-?\d[\d.,]*\s*₫/g, MASKED_MONEY)
    .replace(/(?<![\p{L}\d])[+-]?\d+(?:[.,]\d+)?\s*(?:[kK]|[tT][rR]|[tT]riệu|[nN]ghìn|[nN]gàn|[tT]ỷ|[tT]ỉ|M)(?![\p{L}\d])/gu, MASKED_MONEY);
}

/** dd/MM/yyyy. Chuỗi chỉ có ngày được đảo trực tiếp (không lệch múi giờ); có giờ thì tính theo giờ Việt Nam */
export function formatDateShort(value: string): string {
  if (!value) return '';
  let ymd = value;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    ymd = getBusinessDate(parsed);
  }
  const [year, month, day] = ymd.split('-');
  return `${day}/${month}/${year}`;
}

/** Phần trăm kiểu vi-VN, vd 56,5%; giá trị dương nhỏ hơn ngưỡng hiển thị dạng <ngưỡng */
export function formatPercent(value: number, digits = 1): string {
  if (digits === 0 || digits === 1) {
    const min = 10 ** -digits;
    if (value > 0 && value < min) {
      return `<${min.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
    }
  }
  return `${value.toLocaleString('vi-VN', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;
}

export function formatDateVietnamese(dateStr: string): string {
  if (!dateStr) return '';
  return formatVietnameseDisplayDate(dateStr);
}

