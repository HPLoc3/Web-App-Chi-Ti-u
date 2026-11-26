// @vitest-environment node
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  AuthService,
  FORGOT_PASSWORD_MIN_RESPONSE_MS as MIN,
} from '../../../src/modules/auth/auth.service';
import { AuthRepository } from '../../../src/modules/auth/auth.repository';
import { EmailService } from '../../../src/services/email.service';

const GENERIC =
  'Nếu địa chỉ email tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi đến hòm thư của bạn.';
const USER = { id: 'u1', email: 'victim@example.com', name: 'Victim' };

let logs: ReturnType<typeof vi.spyOn>[];

/** Chạy forgotPassword và đo thời gian ảo đã trôi qua; trả về cả kết quả/lỗi. */
async function run(): Promise<{ elapsed: number; result?: any; error?: unknown }> {
  const start = Date.now();
  let settledAt = -1;
  let result: any;
  let error: unknown;
  const p = AuthService.forgotPassword(USER.email)
    .then((r) => (result = r))
    .catch((e) => (error = e))
    .finally(() => (settledAt = Date.now()));
  await vi.advanceTimersByTimeAsync(10000);
  await p;
  return { elapsed: settledAt - start, result, error };
}

describe('forgotPassword: thời gian phản hồi cố định', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    logs = [
      vi.spyOn(console, 'log').mockImplementation(() => {}),
      vi.spyOn(console, 'warn').mockImplementation(() => {}),
      vi.spyOn(console, 'error').mockImplementation(() => {}),
    ];
    vi.spyOn(AuthRepository, 'createResetToken').mockResolvedValue(undefined as any);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('email không tồn tại: chờ đủ mốc, trả thông báo chung', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(null as any);
    const { elapsed, result } = await run();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(elapsed).toBeLessThan(MIN + 100);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it('email tồn tại + gửi mail nhanh: vẫn chờ đủ mốc', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    vi.spyOn(EmailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const { elapsed, result } = await run();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(elapsed).toBeLessThan(MIN + 100);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it('email tồn tại + gửi mail chậm 5s: trả ở ~mốc, không chờ hết', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    vi.spyOn(EmailService, 'sendPasswordResetEmail').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(true), 5000))
    );
    const { elapsed, result } = await run();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(elapsed).toBeLessThan(MIN + 100);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it.each([
    ['ném lỗi', () => Promise.reject(new Error('boom victim@example.com'))],
    ['trả false', () => Promise.resolve(false)],
  ])('email tồn tại + gửi mail %s: cùng thông báo, chờ đủ mốc, không throw', async (_l, impl) => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    vi.spyOn(EmailService, 'sendPasswordResetEmail').mockImplementation(impl as any);
    const { elapsed, result, error } = await run();
    expect(error).toBeUndefined();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it('lỗi DB ở nhánh có user: vẫn trả thông báo chung sau đủ mốc, log không chứa email', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    vi.spyOn(AuthRepository, 'createResetToken').mockRejectedValue(new Error('db down victim@example.com'));
    const { elapsed, result, error } = await run();
    expect(error).toBeUndefined();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(result).toEqual({ success: true, message: GENERIC });
    const logged = logs.flatMap((s) => s.mock.calls).map((a) => a.join(' ')).join('\n');
    expect(logged).not.toContain(USER.email);
  });

  it('DB ghi token chậm 3s: vẫn trả ở ~mốc, cùng thông báo', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    vi.spyOn(AuthRepository, 'createResetToken').mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(undefined as any), 3000))
    );
    vi.spyOn(EmailService, 'sendPasswordResetEmail').mockResolvedValue(true);
    const { elapsed, result, error } = await run();
    expect(error).toBeUndefined();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(elapsed).toBeLessThan(MIN + 100);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it('findUserByEmail ném lỗi: trả thông báo chung sau đủ mốc', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockRejectedValue(new Error('lookup fail'));
    const { elapsed, result, error } = await run();
    expect(error).toBeUndefined();
    expect(elapsed).toBeGreaterThanOrEqual(MIN);
    expect(result).toEqual({ success: true, message: GENERIC });
  });

  it('log lỗi có tên lỗi/mã, không chứa email hay message gốc', async () => {
    vi.spyOn(AuthRepository, 'findUserByEmail').mockResolvedValue(USER as any);
    const dbErr: any = new Error('secret detail victim@example.com');
    dbErr.name = 'PrismaClientKnownRequestError';
    dbErr.code = 'P2002';
    vi.spyOn(AuthRepository, 'createResetToken').mockRejectedValue(dbErr);
    await run();
    const logged = logs.flatMap((s) => s.mock.calls).map((a) => a.join(' ')).join(' | ');
    expect(logged).toContain('PrismaClientKnownRequestError');
    expect(logged).toContain('P2002');
    expect(logged).not.toContain(USER.email);
    expect(logged).not.toContain('secret detail');
  });
});
