import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = vi.hoisted(() => ({
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
  $transaction: vi.fn(),
  aIUsage: { count: vi.fn(), create: vi.fn() },
}));

vi.mock('../../../src/lib/prisma', () => ({ prisma: mockPrisma, default: mockPrisma }));

import { PgRateLimitStore } from '../../../src/middleware/pgRateLimitStore';
import { AiQuotaManager, DAILY_AI_QUOTA_PER_USER, getVnDayWindow } from '../../../src/modules/ai/ai.quota';

describe('getVnDayWindow (ngày nghiệp vụ Asia/Ho_Chi_Minh)', () => {
  it('00:00 giờ VN = 17:00 UTC hôm trước', () => {
    // 2026-11-22 10:00 UTC = 17:00 VN -> ngày VN là 22/11, bắt đầu 21/11 17:00 UTC
    const { start, end, dateKey } = getVnDayWindow(new Date('2026-11-22T10:00:00Z'));
    expect(dateKey).toBe('2026-11-22');
    expect(start.toISOString()).toBe('2026-11-21T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-11-22T17:00:00.000Z');
  });

  it('sau 17:00 UTC thì đã sang ngày VN kế tiếp', () => {
    const { dateKey, start } = getVnDayWindow(new Date('2026-11-22T18:30:00Z'));
    expect(dateKey).toBe('2026-11-23');
    expect(start.toISOString()).toBe('2026-11-22T17:00:00.000Z');
  });
});

describe('AiQuotaManager (lưu trong DB)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma.$transaction.mockImplementation(async (fn: any) => fn(mockPrisma));
    mockPrisma.$executeRaw.mockResolvedValue(1);
  });

  it('getQuota đọc số lượt đã dùng từ DB', async () => {
    mockPrisma.aIUsage.count.mockResolvedValue(12);
    const q = await AiQuotaManager.getQuota('u1');
    expect(q.used).toBe(12);
    expect(q.limit).toBe(DAILY_AI_QUOTA_PER_USER);
    expect(q.remaining).toBe(DAILY_AI_QUOTA_PER_USER - 12);
  });

  it('còn lượt: ghi 1 dòng AIUsage và trả allowed', async () => {
    mockPrisma.aIUsage.count.mockResolvedValue(3);
    const r = await AiQuotaManager.checkAndConsumeQuota('u1', 'ăn phở 50k');
    expect(r.allowed).toBe(true);
    expect(r.quota.used).toBe(4);
    expect(mockPrisma.aIUsage.create).toHaveBeenCalledTimes(1);
    expect(mockPrisma.aIUsage.create.mock.calls[0][0].data.userId).toBe('u1');
  });

  it('hết lượt: từ chối và không ghi thêm', async () => {
    mockPrisma.aIUsage.count.mockResolvedValue(DAILY_AI_QUOTA_PER_USER);
    const r = await AiQuotaManager.checkAndConsumeQuota('u1', 'hello');
    expect(r.allowed).toBe(false);
    expect(r.quota.remaining).toBe(0);
    expect(mockPrisma.aIUsage.create).not.toHaveBeenCalled();
  });

  it('cắt prompt còn 100 ký tự khi lưu', async () => {
    mockPrisma.aIUsage.count.mockResolvedValue(0);
    await AiQuotaManager.checkAndConsumeQuota('u1', 'x'.repeat(500));
    expect(mockPrisma.aIUsage.create.mock.calls[0][0].data.prompt).toHaveLength(100);
  });
});

describe('PgRateLimitStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('increment trả totalHits và resetTime từ DB', async () => {
    const reset = new Date('2026-11-22T10:15:00Z');
    mockPrisma.$queryRaw.mockResolvedValue([{ hits: 3, resetAt: reset }]);
    const store = new PgRateLimitStore('login');
    store.init({ windowMs: 900000 } as any);
    const res = await store.increment('1.2.3.4');
    expect(res.totalHits).toBe(3);
    expect(res.resetTime?.toISOString()).toBe(reset.toISOString());
    expect(store.localKeys).toBe(false);
  });

  it('get trả undefined khi chưa có hoặc đã hết hạn', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([]);
    const store = new PgRateLimitStore('ai');
    expect(await store.get('k')).toBeUndefined();
  });

  it('resetKey và decrement gọi DB', async () => {
    mockPrisma.$executeRaw.mockResolvedValue(1);
    const store = new PgRateLimitStore('ai');
    await store.decrement('k');
    await store.resetKey('k');
    expect(mockPrisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});
