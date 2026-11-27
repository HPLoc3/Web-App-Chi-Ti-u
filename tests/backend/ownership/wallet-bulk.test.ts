import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import request from 'supertest';
import { Prisma } from '@prisma/client';
import app from '../../../server';
import { prisma } from '../../../src/lib/prisma';
import { USER_A, generateTestToken } from '../../helpers/authHelper';

const auth = { Authorization: `Bearer ${generateTestToken(USER_A)}` };

const wallet = (id: string, extra: Record<string, unknown> = {}): any => ({
  id, name: id, balance: new Prisma.Decimal(0), currency: 'VND', isDefault: false, type: 'cash',
  userId: USER_A.id, createdAt: new Date(), updatedAt: new Date(), ...extra,
});

/** tx giả mô phỏng bảng Wallet/Transaction đủ cho các điều kiện where được dùng */
function fakeDb(wallets: any[], txCounts: Record<string, number> = {}) {
  const match = (w: any, where: any = {}) =>
    Object.entries(where).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && 'not' in v) return w[k] !== v.not;
      if (v && typeof v === 'object' && 'in' in v) return v.in.includes(w[k]);
      return w[k] === v;
    });
  const tx = {
    $queryRaw: vi.fn(async (_sql?: any, ..._values: any[]): Promise<any[]> => []),
    wallet: {
      findFirst: vi.fn(async ({ where }: any): Promise<any> => wallets.find((w) => match(w, where)) || null),
      findMany: vi.fn(async ({ where }: any) => wallets.filter((w) => match(w, where))),
      count: vi.fn(async ({ where }: any) => wallets.filter((w) => match(w, where)).length),
      deleteMany: vi.fn(async ({ where }: any) => ({ count: wallets.filter((w) => match(w, where)).length })),
      updateMany: vi.fn(async ({ where }: any) => ({ count: wallets.filter((w) => match(w, where)).length })),
      update: vi.fn(async ({ where, data }: any) => ({ ...wallets.find((w) => w.id === where.id), ...data })),
      create: vi.fn(async ({ data }: any) => wallet('new', { name: data.name, isDefault: data.isDefault })),
    },
    transaction: {
      count: vi.fn(async ({ where }: any) => txCounts[where.walletId] || 0),
      createManyAndReturn: vi.fn(async ({ data }: any) =>
        data.map((d: any, i: number) => ({ id: `tx-${i}`, ...d, createdAt: new Date(), updatedAt: new Date() }))
      ),
      delete: vi.fn(async (_args?: any): Promise<any> => ({})),
    },
  };
  vi.spyOn(prisma, '$transaction').mockImplementation((async (cb: any) => cb(tx)) as any);
  vi.spyOn(prisma.wallet, 'findFirst').mockImplementation((async ({ where }: any) => wallets.find((w) => match(w, where)) || null) as any);
  vi.spyOn(prisma.wallet, 'findMany').mockImplementation((async ({ where }: any) => wallets.filter((w) => match(w, where))) as any);
  vi.spyOn(prisma.category, 'upsert').mockResolvedValue({} as any);
  return tx;
}

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('Migration: chặn xóa ví còn giao dịch', () => {
  it('FK Transaction.walletId đổi sang RESTRICT', () => {
    const sql = fs.readFileSync(
      path.resolve(process.cwd(), 'prisma/migrations/20261127000000_wallet_restrict_delete/migration.sql'), 'utf8');
    expect(sql).toMatch(/Transaction_walletId_fkey[\s\S]*ON DELETE RESTRICT/);
    const schema = fs.readFileSync(path.resolve(process.cwd(), 'prisma/schema.prisma'), 'utf8');
    expect(schema).toMatch(/fields: \[walletId\], references: \[id\], onDelete: Restrict/);
  });
});

describe('DELETE /wallets/:id', () => {
  const del = (id: string) => request(app).delete(`/api/v1/wallets/${id}`).set(auth);

  it('ví còn giao dịch -> 409 WALLET_HAS_TRANSACTIONS kèm số lượng', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true }), wallet('w2')], { w2: 3 });
    const res = await del('w2');
    expect(res.status).toBe(409);
    expect(res.body.error).toEqual({ code: 'WALLET_HAS_TRANSACTIONS', message: 'Ví còn 3 giao dịch nên không xóa được.' });
    expect(tx.wallet.deleteMany).not.toHaveBeenCalled();
  });

  it('ví cuối cùng -> 400', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true })]);
    const res = await del('w1');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('CANNOT_DELETE_ONLY_WALLET');
    expect(tx.wallet.deleteMany).not.toHaveBeenCalled();
  });

  it('ví người khác -> 404', async () => {
    const tx = fakeDb([wallet('w1'), wallet('w2'), wallet('foreign', { userId: 'other' })]);
    const res = await del('foreign');
    expect(res.status).toBe(404);
    expect(tx.wallet.deleteMany).not.toHaveBeenCalled();
  });

  it('xóa ví mặc định (số dư khác 0, không giao dịch) -> chuyển mặc định sang ví cũ nhất còn lại', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true, balance: new Prisma.Decimal(500) }), wallet('w2')]);
    tx.wallet.findFirst
      .mockResolvedValueOnce(wallet('w1', { isDefault: true }))
      .mockResolvedValueOnce(wallet('w2'));
    const res = await del('w1');
    expect(res.status).toBe(200);
    expect(tx.wallet.deleteMany).toHaveBeenCalledWith({ where: { id: 'w1', userId: USER_A.id } });
    expect(tx.wallet.findFirst).toHaveBeenLastCalledWith({ where: { userId: USER_A.id }, orderBy: { createdAt: 'asc' } });
    expect(tx.wallet.update).toHaveBeenCalledWith({ where: { id: 'w2', userId: USER_A.id }, data: { isDefault: true } });
  });

  it('P2003 (giao dịch chen vào giữa chừng) -> 409 WALLET_HAS_TRANSACTIONS', async () => {
    const tx = fakeDb([wallet('w1'), wallet('w2')]);
    tx.wallet.deleteMany.mockRejectedValue(Object.assign(new Error('fk'), { code: 'P2003' }));
    const res = await del('w2');
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('WALLET_HAS_TRANSACTIONS');
  });
});

describe('Ví mặc định khi tạo/sửa', () => {
  const put = (id: string, body: object) => request(app).put(`/api/v1/wallets/${id}`).set(auth).send(body);

  it('bỏ mặc định của ví mặc định duy nhất -> 400', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true }), wallet('w2')]);
    const res = await put('w1', { isDefault: false });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('DEFAULT_WALLET_REQUIRED');
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it('ví không mặc định vẫn sửa được khi gửi isDefault:false', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true }), wallet('w2')]);
    const res = await put('w2', { name: 'Mới', isDefault: false });
    expect(res.status).toBe(200);
    expect(tx.wallet.update).toHaveBeenCalledWith({ where: { id: 'w2', userId: USER_A.id }, data: { name: 'Mới', isDefault: false } });
  });

  it('đặt mặc định: xóa cờ cũ và cập nhật trong cùng một transaction', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true }), wallet('w2')]);
    const res = await put('w2', { isDefault: true });
    expect(res.status).toBe(200);
    expect(tx.wallet.updateMany).toHaveBeenCalled();
    expect(tx.wallet.update).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('tạo ví mặc định: xóa cờ cũ và tạo trong cùng một transaction', async () => {
    const tx = fakeDb([wallet('w1', { isDefault: true })]);
    const res = await request(app).post('/api/v1/wallets').set(auth).send({ name: 'N', isDefault: true });
    expect(res.status).toBe(201);
    expect(tx.wallet.updateMany).toHaveBeenCalled();
    expect(tx.wallet.create).toHaveBeenCalled();
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
  });
});

describe('Bulk giao dịch', () => {
  const item = (extra: object = {}) => ({ amount: 1000, categoryId: 'an_uong', note: 'n', date: '2026-03-05', type: 'EXPENSE', ...extra });
  const post = (items: unknown) => request(app).post('/api/v1/transactions/bulk').set(auth).send({ items });
  const mine = () => [wallet('mine', { isDefault: true }), wallet('foreign', { userId: 'victim' })];

  it('walletId của người khác -> 404 WALLET_NOT_FOUND cả lô, không ghi gì', async () => {
    const tx = fakeDb(mine());
    const res = await post([item({ walletId: 'mine' }), item({ walletId: 'foreign' })]);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('WALLET_NOT_FOUND');
    expect(tx.wallet.updateMany).not.toHaveBeenCalled();
    expect(tx.transaction.createManyAndReturn).not.toHaveBeenCalled();
  });

  it('hợp lệ: updateMany lọc userId, ngày nghiệp vụ, trả đúng bản ghi vừa tạo', async () => {
    const tx = fakeDb(mine());
    const res = await post([item(), item({ walletId: 'mine', amount: 500 })]);
    expect(res.status).toBe(201);
    expect(res.body.count).toBe(2);
    expect(res.body.data.map((d: any) => d.amount)).toEqual([1000, 500]);
    expect(res.body.data[0]).toMatchObject({ walletId: 'mine', date: '2026-03-05', categoryId: 'an_uong' });
    expect(tx.wallet.updateMany.mock.calls[0][0].where).toEqual({ id: 'mine', userId: USER_A.id });
    const written = (tx.transaction.createManyAndReturn.mock.calls[0][0] as any).data;
    expect(written[0].date.toISOString()).toBe('2026-03-05T12:00:00.000Z');
  });

  it.each([
    ['mảng rỗng', []],
    ['thiếu items', undefined],
    ['quá 500', Array.from({ length: 501 }, () => item())],
    ['một phần tử sai', [item(), item({ amount: -5 })]],
  ])('%s -> 400, không ghi gì', async (_n, items) => {
    const tx = fakeDb(mine());
    const res = await post(items);
    expect(res.status).toBe(400);
    expect(tx.transaction.createManyAndReturn).not.toHaveBeenCalled();
  });

  it('DELETE /bulk không bị route /:id nuốt', async () => {
    const tx = fakeDb(mine());
    returnDeletedRows(tx, [{ amount: new Prisma.Decimal(10), type: 'EXPENSE', walletId: 'mine' }]);
    const res = await request(app).delete('/api/v1/transactions/bulk').set(auth).send({ ids: ['a'] });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Đã xóa thành công 1 giao dịch.');
    expect((tx.wallet.update.mock.calls[0][0] as any).where).toEqual({ id: 'mine', userId: USER_A.id });
  });

  it.each([
    ['rỗng', [] as unknown[]],
    ['quá 500', Array.from({ length: 501 }, (_, i) => `id${i}`)],
    ['sai kiểu', [1]],
  ])('DELETE /bulk ids %s -> 400', async (_n, ids) => {
    const tx = fakeDb(mine());
    const res = await request(app).delete('/api/v1/transactions/bulk').set(auth).send({ ids });
    expect(res.status).toBe(400);
    expect(tx.$queryRaw).not.toHaveBeenCalled();
  });
});

/** $queryRaw dùng cho cả khóa user lẫn DELETE ... RETURNING */
function returnDeletedRows(tx: ReturnType<typeof fakeDb>, rows: any[]) {
  tx.$queryRaw.mockImplementation(async (sql: any) => (String(sql?.[0]).includes('DELETE') ? rows : []));
}

describe('Xóa đồng thời: chỉ hoàn số dư cho dòng thực sự bị xóa', () => {
  const incrementOf = (call: any) => Number(call[0].data.balance.increment);

  it('bulk: yêu cầu 2 id, DB chỉ xóa được 1 -> chỉ hoàn 1 dòng, count 1', async () => {
    const tx = fakeDb([wallet('mine')]);
    returnDeletedRows(tx, [{ amount: new Prisma.Decimal(10), type: 'EXPENSE', walletId: 'mine' }]);
    const res = await request(app).delete('/api/v1/transactions/bulk').set(auth).send({ ids: ['a', 'b'] });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Đã xóa thành công 1 giao dịch.');
    expect(tx.wallet.update.mock.calls.map(incrementOf)).toEqual([10]);
  });

  it('bulk: request thua (không còn dòng nào) -> không đổi số dư', async () => {
    const tx = fakeDb([wallet('mine')]);
    returnDeletedRows(tx, []);
    const res = await request(app).delete('/api/v1/transactions/bulk').set(auth).send({ ids: ['a'] });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Đã xóa thành công 0 giao dịch.');
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  const stale = { id: 'a', userId: USER_A.id, amount: new Prisma.Decimal(10), type: 'EXPENSE', walletId: 'mine' };

  it('xóa đơn: dòng đã bị request khác xóa -> 404, không hoàn số dư', async () => {
    const tx = fakeDb([wallet('mine')]);
    vi.spyOn(prisma.transaction, 'findFirst').mockResolvedValue(stale as any);
    tx.transaction.delete.mockRejectedValue(Object.assign(new Error('gone'), { code: 'P2025' }));
    const res = await request(app).delete('/api/v1/transactions/a').set(auth);
    expect(res.status).toBe(404);
    expect(tx.wallet.update).not.toHaveBeenCalled();
  });

  it('xóa đơn: hoàn theo dữ liệu của dòng vừa xóa, không theo bản đọc cũ', async () => {
    const tx = fakeDb([wallet('mine'), wallet('other')]);
    vi.spyOn(prisma.transaction, 'findFirst').mockResolvedValue(stale as any);
    tx.transaction.delete.mockResolvedValue({ amount: new Prisma.Decimal(25), type: 'INCOME', walletId: 'other' });
    const res = await request(app).delete('/api/v1/transactions/a').set(auth);
    expect(res.status).toBe(200);
    expect(tx.transaction.delete).toHaveBeenCalledWith({ where: { id: 'a', userId: USER_A.id } });
    expect((tx.wallet.update.mock.calls[0][0] as any).where).toEqual({ id: 'other', userId: USER_A.id });
    expect(tx.wallet.update.mock.calls.map(incrementOf)).toEqual([-25]);
  });
});
