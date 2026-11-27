import { z } from 'zod';
import { MAX_VND, formatVndInput } from './money';

const INVALID = 'Số tiền không hợp lệ.';
const TOO_BIG = `Số tiền tối đa là ${formatVndInput(MAX_VND)} ₫.`;
const TOO_SMALL = `Số tiền tối thiểu là ${formatVndInput(-MAX_VND)} ₫.`;

// z.number() của zod 4 đã loại NaN và Infinity; không ép số nguyên, không ép kiểu từ chuỗi
const base = z.number({ message: INVALID });

/** Số tiền > 0 */
export const zMoney = base.positive('Số tiền phải lớn hơn 0.').max(MAX_VND, TOO_BIG);

/** Số tiền >= 0 */
export const zMoneyNonNegative = base.nonnegative('Số tiền không được âm.').max(MAX_VND, TOO_BIG);

/** Số tiền có dấu trong khoảng ±MAX_VND (vd số dư ví) */
export const zMoneySigned = base.min(-MAX_VND, TOO_SMALL).max(MAX_VND, TOO_BIG);
