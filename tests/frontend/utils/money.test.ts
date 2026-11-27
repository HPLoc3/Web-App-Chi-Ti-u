import { describe, it, expect } from 'vitest';
import { MAX_VND, parseVndInput, formatVndInput } from '../../../src/utils/money';
import { zMoney, zMoneyNonNegative, zMoneySigned } from '../../../src/utils/moneySchema';

describe('parseVndInput', () => {
  it.each([
    ['45000', 45000],
    ['45.000', 45000],
    ['45,000', 45000],
    ['1,500,000', 1500000],
    ['1.500.000', 1500000],
    ['15 000', 15000],
    ['1 500 000', 1500000],
    ['  45000  ', 45000],
    ['115.000 ₫', 115000],
    ['45000đ', 45000],
    ['45.000 Đ', 45000],
    ['45.000 VND', 45000],
    ['45000vnd', 45000],
    ['0', 0],
    ['999999999999', MAX_VND],
    ['999.999.999.999', MAX_VND],
  ])('nhận %j', (raw, expected) => {
    expect(parseVndInput(raw)).toBe(expected);
  });

  it.each([
    '', '   ', 'đ', 'VND', 'abc', '45k', '45.5', '45,5', '45.50', '45.0000', '1.5000', '1.500,000',
    '1,500.000', '1 500.000', '1..000', '45.', '.500', '0.500', '1500.000', '4 5', '1e15', '1e3',
    '0x10', 'Infinity', 'NaN', '+5', '--5', '5-', '1000000000000', '1.000.000.000.000',
    '45000 USD', '45 đ đ', '₫45000', '-5', '-45.000',
  ])('từ chối %j', (raw) => {
    expect(parseVndInput(raw)).toBeNull();
  });

  it('chỉ nhận số âm khi allowNegative', () => {
    expect(parseVndInput('-45.000', { allowNegative: true })).toBe(-45000);
    expect(parseVndInput('-45000 ₫', { allowNegative: true })).toBe(-45000);
    expect(parseVndInput('-999999999999', { allowNegative: true })).toBe(-MAX_VND);
    expect(parseVndInput('-1000000000000', { allowNegative: true })).toBeNull();
    expect(parseVndInput('-45.5', { allowNegative: true })).toBeNull();
    expect(parseVndInput('-', { allowNegative: true })).toBeNull();
    expect(Object.is(parseVndInput('-0', { allowNegative: true }), 0)).toBe(true);
  });
});

describe('formatVndInput', () => {
  it('định dạng vi-VN, giữ dấu âm', () => {
    expect(formatVndInput(null)).toBe('');
    expect(formatVndInput(NaN)).toBe('');
    expect(formatVndInput(Infinity)).toBe('');
    expect(formatVndInput(0)).toBe('0');
    expect(formatVndInput(-0)).toBe('0');
    expect(formatVndInput(1500000)).toBe('1.500.000');
    expect(formatVndInput(-45000)).toBe('-45.000');
  });

  it('số lẻ không bao giờ bị đọc lại thành số nguyên khác', () => {
    expect(formatVndInput(45.5)).toBe('45,5');
    expect(parseVndInput(formatVndInput(1.125))).toBeNull();
  });
});

describe('moneySchema', () => {
  it('zMoney: dương, tối đa MAX_VND, không ép số nguyên hay chuỗi', () => {
    expect(zMoney.parse(45.5)).toBe(45.5);
    expect(zMoney.parse(MAX_VND)).toBe(MAX_VND);
    for (const bad of [0, -1, MAX_VND + 1, Infinity, NaN, '5', null, undefined]) {
      expect(zMoney.safeParse(bad).success).toBe(false);
    }
  });

  it('zMoneyNonNegative và zMoneySigned', () => {
    expect(zMoneyNonNegative.parse(0)).toBe(0);
    for (const bad of [-1, MAX_VND + 1, Infinity, NaN]) {
      expect(zMoneyNonNegative.safeParse(bad).success).toBe(false);
    }
    for (const ok of [-MAX_VND, -1.5, 0, MAX_VND]) {
      expect(zMoneySigned.parse(ok)).toBe(ok);
    }
    for (const bad of [-MAX_VND - 1, MAX_VND + 1, -Infinity, NaN, '-5']) {
      expect(zMoneySigned.safeParse(bad).success).toBe(false);
    }
  });

  it('thông báo tiếng Việt', () => {
    const msg = (r: any) => r.error.issues[0].message;
    expect(msg(zMoney.safeParse('x'))).toBe('Số tiền không hợp lệ.');
    expect(msg(zMoney.safeParse(0))).toBe('Số tiền phải lớn hơn 0.');
    expect(msg(zMoneyNonNegative.safeParse(-1))).toBe('Số tiền không được âm.');
    expect(msg(zMoney.safeParse(MAX_VND + 1))).toBe('Số tiền tối đa là 999.999.999.999 ₫.');
    expect(msg(zMoneySigned.safeParse(-MAX_VND - 1))).toBe('Số tiền tối thiểu là -999.999.999.999 ₫.');
  });
});
