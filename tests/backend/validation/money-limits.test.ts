import { describe, it, expect } from 'vitest';
import { MAX_VND } from '../../../src/utils/money';
import {
  createTransactionSchema,
  updateTransactionSchema,
  bulkCreateTransactionSchema,
} from '../../../src/modules/transactions/transactions.schema';
import { createWalletSchema, updateWalletSchema, transferWalletSchema } from '../../../src/modules/wallets/wallets.schema';
import { createGoalSchema, updateGoalSchema } from '../../../src/modules/goals/goals.schema';
import { updateBudgetSchema } from '../../../src/modules/budgets/budgets.schema';
import { syncClientStateSchema } from '../../../src/modules/sync/sync.schema';

const OVER = MAX_VND + 1;
const ok = (schema: any, value: unknown) => expect(schema.safeParse(value).success).toBe(true);
const bad = (schema: any, value: unknown) => expect(schema.safeParse(value).success).toBe(false);

describe('Trần số tiền ở các schema', () => {
  it('giao dịch create/update/bulk', () => {
    ok(createTransactionSchema, { amount: MAX_VND });
    bad(createTransactionSchema, { amount: OVER });
    bad(createTransactionSchema, { amount: 0 });
    bad(createTransactionSchema, { amount: '1000' });
    ok(updateTransactionSchema, { amount: MAX_VND });
    bad(updateTransactionSchema, { amount: OVER });
    bad(bulkCreateTransactionSchema, { items: [{ amount: 1 }, { amount: OVER }] });
  });

  it('ví: số dư có dấu, chuyển tiền > 0', () => {
    ok(createWalletSchema, { name: 'a', balance: -MAX_VND });
    bad(createWalletSchema, { name: 'a', balance: -OVER });
    bad(createWalletSchema, { name: 'a', balance: OVER });
    expect(createWalletSchema.parse({ name: 'a' }).balance).toBe(0);
    bad(updateWalletSchema, { balance: OVER });
    ok(updateWalletSchema, { balance: -1000 });
    bad(transferWalletSchema, { fromWalletId: 'a', toWalletId: 'b', amount: OVER });
    bad(transferWalletSchema, { fromWalletId: 'a', toWalletId: 'b', amount: 0 });
  });

  it('mục tiêu', () => {
    for (const key of ['target', 'targetAmount', 'current', 'currentAmount']) {
      bad(createGoalSchema, { name: 'a', [key]: OVER });
      bad(updateGoalSchema, { [key]: OVER });
    }
    ok(updateGoalSchema, { current: 0, target: MAX_VND });
    bad(createGoalSchema, { name: 'a', target: 0 });
  });

  it('ngân sách', () => {
    ok(updateBudgetSchema, { income: 0, categoryLimits: { an_uong: 0 } });
    bad(updateBudgetSchema, { income: OVER });
    bad(updateBudgetSchema, { categoryLimits: { an_uong: OVER } });
    bad(updateBudgetSchema, { categoryLimits: { an_uong: -1 } });
  });
});

describe('Schema đồng bộ', () => {
  it('nhận payload thật của client (kể cả trường thừa, giữ nguyên cho service)', () => {
    const payload = {
      expenses: [{ id: 'e1', amount: 1000, categoryId: 'an_uong', note: 'x', date: '2026-11-01' }],
      goals: [{ id: 'g1', name: 'Laptop', target: 5000000, current: 0, createdAt: '2026-11-01' }],
      recurringExpenses: [
        { id: 'r1', amount: 2000, categoryId: 'hoa_don', dayOfMonth: 5, note: 'Net', frequency: 'monthly', isActive: true },
      ],
      income: 1000,
      categoryLimits: { an_uong: 500 },
    };
    expect(syncClientStateSchema.parse(payload)).toMatchObject(payload);
    expect(syncClientStateSchema.parse({})).toEqual({ expenses: [], goals: [], recurringExpenses: [] });
  });

  it('phần tử vượt trần hoặc sai kiểu bị từ chối', () => {
    bad(syncClientStateSchema, { expenses: [{ amount: OVER }] });
    bad(syncClientStateSchema, { expenses: [{ amount: 'abc' }] });
    bad(syncClientStateSchema, { expenses: ['abc'] });
    bad(syncClientStateSchema, { expenses: [{ amount: 1, note: { a: 1 } }] });
    bad(syncClientStateSchema, { goals: [{ name: 'a', target: OVER }] });
    bad(syncClientStateSchema, { goals: [{ name: 'a', target: 1, current: OVER }] });
    bad(syncClientStateSchema, { goals: [{ name: 'a', targetAmount: OVER }] });
    bad(syncClientStateSchema, { recurringExpenses: [{ amount: OVER }] });
    bad(syncClientStateSchema, { income: OVER });
    bad(syncClientStateSchema, { categoryLimits: { a: OVER } });
  });
});
