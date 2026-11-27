// Dùng chung client + server: không import DOM/React.

/** Trần số tiền VND (trị tuyệt đối). */
export const MAX_VND = 999_999_999_999;

// Chỉ chữ số liền, hoặc nhóm 3 chữ số với đúng một loại dấu phân cách
const VND_BODY = /^(?:\d+|[1-9]\d{0,2}([.,\s])\d{3}(?:\1\d{3})*)$/;

/**
 * Đọc số tiền người dùng nhập. Trả về null nếu không chắc chắn (số lẻ, chữ, vượt trần...).
 * "0" trả về 0: caller tự kiểm tra > 0 nếu cần.
 */
export function parseVndInput(raw: string, opts: { allowNegative?: boolean } = {}): number | null {
  let text = raw
    .replace(/\s/g, ' ')
    .trim()
    .replace(/ *(?:₫|đ|vnd)$/i, '');

  const negative = text.startsWith('-');
  if (negative) {
    if (!opts.allowNegative) return null;
    text = text.slice(1).trimStart();
  }

  if (!VND_BODY.test(text)) return null;

  const value = Number(text.replace(/\D/g, ''));
  if (value > MAX_VND) return null;
  return negative && value !== 0 ? -value : value;
}

/** Định dạng giá trị cho ô nhập (vi-VN, không kèm ký hiệu tiền). */
export function formatVndInput(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return '';
  // Tối đa 2 chữ số lẻ: 3 chữ số lẻ (vd "1,125") sẽ bị đọc nhầm thành phân cách nghìn
  return (n === 0 ? 0 : n).toLocaleString('vi-VN', { maximumFractionDigits: 2 });
}
