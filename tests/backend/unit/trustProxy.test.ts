import { describe, it, expect } from 'vitest';
import { parseTrustProxyHops } from '../../../src/config/env';

describe('parseTrustProxyHops', () => {
  it('nhận số nguyên từ 0 đến 10', () => {
    expect(parseTrustProxyHops('0')).toBe(0);
    expect(parseTrustProxyHops('2')).toBe(2);
    expect(parseTrustProxyHops(' 10 ')).toBe(10);
  });

  it.each([undefined, '', 'true', 'false', '-1', '1.5', '2abc', '0x2', '1e1', '11', '999999'])(
    'giá trị không hợp lệ %j dùng mặc định 1',
    (value) => {
      expect(parseTrustProxyHops(value)).toBe(1);
    }
  );
});
