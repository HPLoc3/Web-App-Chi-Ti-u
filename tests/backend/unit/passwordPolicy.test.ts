import { describe, it, expect } from 'vitest';
import { validatePassword } from '../../../src/utils/passwordPolicy';

describe('validatePassword', () => {
  it('chấp nhận mật khẩu hợp lệ', () => {
    expect(validatePassword('abcdef12')).toBeNull();
    expect(validatePassword('a1' + 'x'.repeat(126))).toBeNull();
  });

  it('từ chối khi thiếu hoặc ngắn hơn 8 ký tự', () => {
    expect(validatePassword('')).toBe('Mật khẩu phải có ít nhất 8 ký tự');
    expect(validatePassword('abc1234')).toBe('Mật khẩu phải có ít nhất 8 ký tự');
  });

  it('từ chối khi dài hơn 128 ký tự', () => {
    expect(validatePassword('a1' + 'x'.repeat(127))).toBe('Mật khẩu không được vượt quá 128 ký tự');
  });

  it('bắt buộc có cả chữ và số', () => {
    const msg = 'Mật khẩu phải chứa ít nhất một chữ cái và một chữ số';
    expect(validatePassword('abcdefgh')).toBe(msg);
    expect(validatePassword('12345678')).toBe(msg);
  });
});
