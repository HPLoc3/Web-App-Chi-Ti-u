import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../../server';
import { prisma } from '../../../src/lib/prisma';
import { apiClient } from '../../../src/lib/apiClient';
import { expenseService } from '../../../src/services/api/expenseService';
import { getTransactionsQuerySchema } from '../../../src/modules/transactions/transactions.schema';
import { parseBusinessDate, getBusinessDate } from '../../../src/utils/dateParser';
import { USER_A, generateTestToken } from '../../helpers/authHelper';

const auth = { Authorization: `Bearer ${generateTestToken(USER_A)}` };

const row = (id: string, date: Date, extra: Record<string, unknown> = {}): any => ({
  id,
  amount: new Prisma.Decimal(1000),
  type: 'EXPENSE',
  note: id,
  date,
  walletId: 'w1',
  categoryId: 'an_uong',
  userId: USER_A.id,
  createdAt: new Date(Date.UTC(2026, 0, 1)),
  updatedAt: new Date(Date.UTC(2026, 0, 1)),
  ...extra,
});

/** Bảng Transaction giả: đủ where (userId, type, date gte/lt/lte) và skip/take */
function fakeTable(rows: any[]) {
  const match = (r: any, where: any) =>
    r.userId === where.userId &&
    (!where.type || r.type === where.type) &&
    (!where.date?.gte || r.date >= where.date.gte) &&
    (!where.date?.lt || r.date < where.date.lt) &&
    (!where.date?.lte || r.date <= where.date.lte);
  const findMany = vi.spyOn(prisma.transaction, 'findMany').mockImplementation((async (args: any) =>
    rows.filter((r) => match(r, args.where)).slice(args.skip, args.skip + args.take)) as any);
  vi.spyOn(prisma.transaction, 'count').mockImplementation((async (args: any) =>
    rows.filter((r) => match(r, args.where)).length) as any);
  return findMany;
}

/** Cho client gọi thẳng vào server thật (qua supertest) */
function routeClientToServer() {
  return vi.spyOn(apiClient, 'get').mockImplementation((async (url: string, config?: any) => {
    const res = await request(app).get(url).query(config?.params || {}).set(auth);
    if (res.status >= 400) throw Object.assign(new Error('HTTP ' + res.status), { response: { status: res.status, data: res.body } });
    return { data: res.body };
  }) as any);
}

const many = (n: number) =>
  Array.from({ length: n }, (_, i) => row(`t${i}`, parseBusinessDate('2026-11-10')));

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Query GET /transactions', () => {
  it('mặc định pageSize 20, tối đa 500, không còn "all"', () => {
    expect(getTransactionsQuerySchema.parse({}).pageSize).toBe(20);
    expect(getTransactionsQuerySchema.parse({ pageSize: '500' }).pageSize).toBe(500);
    expect(getTransactionsQuerySchema.safeParse({ pageSize: '501' }).success).toBe(false);
    expect(getTransactionsQuerySchema.parse({ all: 'true' })).not.toHaveProperty('all');
  });

  it('giữ month, year (ép số); từ chối giá trị sai và month thiếu year', () => {
    expect(getTransactionsQuerySchema.parse({ month: '11', year: '2026' })).toMatchObject({ month: 11, year: 2026 });
    expect(getTransactionsQuerySchema.safeParse({ month: '13', year: '2026' }).success).toBe(false);
    expect(getTransactionsQuerySchema.safeParse({ month: '11' }).success).toBe(false);
  });

  it('sắp xếp ổn định date, createdAt, id đều giảm dần', async () => {
    const findMany = fakeTable([]);
    await request(app).get('/api/v1/transactions').set(auth).expect(200);
    expect((findMany.mock.calls[0][0] as any).orderBy).toEqual([{ date: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]);
  });

  it('lọc tháng theo giờ Asia/Ho_Chi_Minh', async () => {
    const rows = [
      // 12:00Z là cách API lưu ngày
      row('dau-thang', parseBusinessDate('2026-11-01')),
      row('cuoi-thang', parseBusinessDate('2026-11-30')),
      // 17:00Z ngày 31/10 = 00:00 ngày 01/11 giờ Việt Nam
      row('nua-dem-dau', new Date('2026-10-31T17:00:00.000Z')),
      row('truoc', new Date('2026-10-31T16:59:59.999Z')),
      row('sau', new Date('2026-11-30T17:00:00.000Z')),
      row('thang-sau', parseBusinessDate('2026-12-01')),
    ];
    fakeTable(rows);
    const res = await request(app).get('/api/v1/transactions?month=11&year=2026&pageSize=500').set(auth).expect(200);
    expect(res.body.data.map((t: any) => t.id).sort()).toEqual(['cuoi-thang', 'dau-thang', 'nua-dem-dau']);
    for (const t of res.body.data) expect(t.date.startsWith('2026-11')).toBe(true);
    expect(getBusinessDate(rows[3].date)).toBe('2026-10-31');
  });

  it('chỉ year: lọc cả năm theo giờ Việt Nam', async () => {
    fakeTable([
      row('a', new Date('2025-12-31T17:00:00.000Z')),
      row('b', new Date('2025-12-31T16:00:00.000Z')),
      row('c', parseBusinessDate('2026-12-31')),
    ]);
    const res = await request(app).get('/api/v1/transactions?year=2026').set(auth).expect(200);
    expect(res.body.data.map((t: any) => t.id).sort()).toEqual(['a', 'c']);
  });
});

describe('expenseService.getExpenses lặp trang', () => {
  it('45 bản ghi trả đủ (không dừng ở 20), chỉ lấy EXPENSE', async () => {
    fakeTable([...many(45), row('thu', parseBusinessDate('2026-11-10'), { type: 'INCOME' })]);
    routeClientToServer();
    const list = await expenseService.getExpenses();
    expect(list).toHaveLength(45);
    expect(new Set(list.map((e) => e.id)).size).toBe(45);
    expect(list.map((e) => e.id)).not.toContain('thu');
  });

  it('1203 bản ghi: 3 trang pageSize=500 đến khi hasNextPage=false', async () => {
    fakeTable(many(1203));
    const get = routeClientToServer();
    const list = await expenseService.getExpenses();
    expect(list).toHaveLength(1203);
    expect(get.mock.calls.map((c: any) => c[1].params)).toEqual(
      [1, 2, 3].map((page) => ({ type: 'EXPENSE', page, pageSize: 500 }))
    );
  });

  it('chốt chống lặp vô hạn: server luôn báo còn trang thì ném lỗi', async () => {
    let n = 0;
    const get = vi.spyOn(apiClient, 'get').mockImplementation((async () => ({
      data: { success: true, data: [{ id: `x${n++}`, amount: 1, date: '2026-11-01' }], meta: { hasNextPage: true } },
    })) as any);
    await expect(expenseService.getExpenses()).rejects.toThrow(/quá nhiều/i);
    expect(get.mock.calls.length).toBeLessThanOrEqual(200);
  });

  it('trang rỗng nhưng vẫn báo còn trang: dừng bằng lỗi, không lặp mãi', async () => {
    const get = vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [], meta: { hasNextPage: true } } } as any);
    await expect(expenseService.getExpenses()).rejects.toThrow();
    expect(get).toHaveBeenCalledTimes(1);
  });

  it('trang giữa chừng lỗi thì không trả danh sách thiếu', async () => {
    vi.spyOn(apiClient, 'get')
      .mockResolvedValueOnce({ data: { success: true, data: [{ id: 'a', amount: 1 }], meta: { hasNextPage: true } } } as any)
      .mockResolvedValueOnce({ data: { success: false } } as any);
    await expect(expenseService.getExpenses()).rejects.toThrow();
  });
});
