import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const gemini = vi.hoisted(() => ({ generateContent: vi.fn() }));
vi.mock('@google/genai', () => ({
  GoogleGenAI: class {
    models = { generateContent: gemini.generateContent };
  },
  Type: { OBJECT: 'OBJECT', STRING: 'STRING', NUMBER: 'NUMBER', ARRAY: 'ARRAY' },
}));

import { computeMonthlySummary } from '../../../src/utils/monthlySummary';
import {
  detectIncomeSegments,
  isIncomeOnlyMessage,
  detectCategoryQuery,
  findDeleteTarget,
  INCOME_NOT_SUPPORTED_REPLY,
} from '../../../src/utils/aiIntent';
import { AiService } from '../../../src/modules/ai/ai.service';
import { AiQuotaManager } from '../../../src/modules/ai/ai.quota';
import { AiFactsAggregator } from '../../../src/modules/ai/ai.aggregator';
import { aiAssistantSchema } from '../../../src/modules/ai/ai.schema';
import { sendToAIAssistant } from '../../../src/utils/aiService';
import { apiClient } from '../../../src/lib/apiClient';

const exp = (id: string, amount: number, categoryId: string, note: string, date = '2026-11-10') => ({
  id, amount, categoryId, note, date,
});
const expenses = [
  exp('1', 45000, 'an_uong', 'Phở'),
  exp('2', 25000, 'an_uong', 'Cafe'),
  exp('3', 80000, 'di_chuyen', 'Đi Grab'),
  exp('4', 99000, 'an_uong', 'Cơm', '2026-10-05'),
];
const ctx = {
  currentDate: '2026-11-26', expenses, goals: [], categoryLimits: { an_uong: 60000 }, income: 1000000,
};

const quota = { userId: 'u', dateKey: '2026-11-26', used: 1, limit: 50, remaining: 49, resetAt: 'x' };
let quotaSpy: any;
const oldKey = process.env.GEMINI_API_KEY;

beforeEach(() => {
  vi.restoreAllMocks();
  gemini.generateContent.mockReset();
  quotaSpy = vi.spyOn(AiQuotaManager, 'checkAndConsumeQuota').mockResolvedValue({ allowed: true, quota });
  process.env.GEMINI_API_KEY = '';
});
afterEach(() => {
  process.env.GEMINI_API_KEY = oldKey;
});

const useGemini = (payload: unknown) => {
  process.env.GEMINI_API_KEY = 'test-key';
  gemini.generateContent.mockResolvedValue({ text: JSON.stringify(payload) });
};
const run = (message: string, context: any = ctx) => AiService.processMessage({ message, context }, 'u');
const actionsOf = (data: any) => data.actions ?? (data.action ? [data.action] : []);
const create = (amount: number, note: string) => ({ type: 'CREATE_EXPENSE', expense: { amount, note, category: 'khac' } });

describe('computeMonthlySummary', () => {
  it('chi vượt thu: net âm không kẹp, tỷ lệ kẹp 0', () => {
    const s = computeMonthlySummary([exp('a', 1245001, 'khac', 'x')], 1000000, '2026-11');
    expect(s.totalExpense).toBe(1245001);
    expect(s.net).toBe(-245001);
    expect(s.savingsRatePct).toBe(0);
  });
  it('income 0: tỷ lệ chưa đánh giá', () => {
    expect(computeMonthlySummary([], 0, '2026-11').savingsRatePct).toBeNull();
  });
  it('tháng 3 so tháng 2, tháng 1 so tháng 12 năm trước', () => {
    const list = [
      exp('a', 10, 'khac', 'x', '2026-02-28'),
      exp('b', 20, 'khac', 'x', '2026-01-31'),
      exp('c', 30, 'khac', 'x', '2025-12-31'),
    ];
    expect(computeMonthlySummary(list, 100, '2026-03')).toMatchObject({ prevMonthKey: '2026-02', prevTotal: 10 });
    expect(computeMonthlySummary(list, 100, '2026-01')).toMatchObject({ prevMonthKey: '2025-12', prevTotal: 30 });
  });
});

describe('detectIncomeSegments', () => {
  it.each([
    'nhận lương 20 triệu', 'lãnh lương 20tr', 'lĩnh lương 20tr', 'lương về 20tr', 'được thưởng 2 triệu',
    'thu nhập 20tr', 'tiền lãi nhận 500k', 'hoàn tiền 50k', 'được cho 200k', 'được mẹ tặng 500k',
    'bán được xe cũ 5 triệu', 'nhan luong 20tr', 'duoc thuong 2tr', 'ban duoc xe 5tr', 'lương về, 20 triệu',
    'nhận lương 1,500,000', 'cập nhật thu nhập 20tr',
  ])('"%s" là khoản thu', (m) => {
    expect(isIncomeOnlyMessage(m)).toBe(true);
    expect(detectIncomeSegments(m).expenseText).toBe('');
  });
  it.each([
    'trả lương giúp việc 5 triệu', 'chi lương nhân viên 5tr', 'đóng lãi ngân hàng 2tr', 'trả lãi 2tr',
    'mua quà tặng 200k', 'nhận hàng 200k trả shipper', 'nộp thuế thu nhập 2tr', 'ăn mừng nhận lương 500k',
    'hoàn tiền cho khách 200k', 'ăn phở 45k', 'tra luong giup viec 5tr', 'mua 2 được tặng 1 hết 50k',
    'được thưởng thức món lạ 100k',
  ])('"%s" là khoản chi', (m) => {
    expect(detectIncomeSegments(m).incomeSegments).toEqual([]);
  });
  it('tách thu và chi, giữ số có dấu phẩy', () => {
    for (const m of ['nhận lương 20tr, ăn phở 45k', 'nhận lương 20tr ăn phở 45k', 'ăn phở 45k và nhận lương 20,000,000']) {
      const d = detectIncomeSegments(m);
      expect(d.incomeSegments).toHaveLength(1);
      expect(d.expenseText).toContain('45k');
      expect(d.expenseText).not.toMatch(/20/);
    }
    expect(detectIncomeSegments('mua tủ 1,500,000').expenseText).toContain('1,500,000');
  });
});

describe('Server: khoản thu không thành khoản chi', () => {
  it('fallback rule: không action, không tiêu quota', async () => {
    const r = await run('nhận lương 20 triệu');
    expect(r.data!.reply).toBe(INCOME_NOT_SUPPORTED_REPLY);
    expect(actionsOf(r.data)).toEqual([]);
    expect(quotaSpy).not.toHaveBeenCalled();
  });
  it('Gemini mock trả CREATE_EXPENSE: trả ngay, không gọi Gemini', async () => {
    useGemini({ intent: 'CREATE_EXPENSE', reply: 'Đã nhận diện khoản chi', actions: [create(20000000, 'Lương')] });
    const r = await run('nhận lương 20 triệu');
    expect(actionsOf(r.data)).toEqual([]);
    expect(gemini.generateContent).not.toHaveBeenCalled();
    expect(quotaSpy).not.toHaveBeenCalled();
  });
  it('fallback lẫn thu + chi: đúng 1 action 45000', async () => {
    const r = await run('nhận lương 20tr, ăn phở 45k');
    expect(actionsOf(r.data).map((a: any) => a.expense.amount)).toEqual([45000]);
    expect(r.data!.reply).toContain(INCOME_NOT_SUPPORTED_REPLY);
  });
  it.each([
    ['mảng actions', { actions: [create(20000000, 'Lương'), create(45000, 'Phở')] }],
    ['action đơn là khoản thu', { action: create(20000000, 'Lương') }],
    ['không action nào', {}],
  ])('hậu kiểm Gemini (%s)', async (_n, extra) => {
    useGemini({ intent: 'CREATE_EXPENSE', reply: 'Đã nhận diện khoản chi lương 20.000.000₫', ...extra });
    const r = await run('nhận lương 20tr, ăn phở 45k');
    expect(actionsOf(r.data).map((a: any) => a.expense.amount)).toEqual([45000]);
    expect(r.data!.action!.expense!.amount).toBe(45000);
    expect(r.data!.reply).not.toContain('20.000.000₫');
    expect(r.data!.reply).toContain(INCOME_NOT_SUPPORTED_REPLY);
  });
  it('câu hỏi có khoản thu: loại action của đoạn thu kể cả action đơn', async () => {
    useGemini({ intent: 'CREATE_EXPENSE', reply: 'Đã nhận diện khoản chi 20 triệu', action: create(20000000, 'Lương') });
    const r = await run('nhận lương 20tr thì nên tiết kiệm bao nhiêu?');
    expect(actionsOf(r.data)).toEqual([]);
    expect(r.data!.reply).not.toContain('khoản chi 20 triệu');
  });
  it('prompt có quy tắc khoản thu', async () => {
    useGemini({ intent: 'GENERAL_CHAT', reply: 'ok' });
    await run('chào bạn');
    expect(gemini.generateContent.mock.calls[0][0].config.systemInstruction).toContain('KHOẢN TIỀN VÀO');
  });
  it('trả lương giúp việc vẫn là chi', async () => {
    const r = await run('trả lương giúp việc 5 triệu');
    expect(actionsOf(r.data).map((a: any) => a.expense.amount)).toEqual([5000000]);
  });
});

describe('Client fallback: khoản thu', () => {
  it('khách: không action', async () => {
    const r = await sendToAIAssistant('nhận lương 20 triệu', ctx, false);
    expect(r.reply).toBe(INCOME_NOT_SUPPORTED_REPLY);
    expect(r.actions).toBeUndefined();
    expect(r.action).toBeUndefined();
  });
  it('API lỗi: lẫn thu + chi chỉ đề xuất 45000', async () => {
    vi.spyOn(apiClient, 'post').mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const r = await sendToAIAssistant('nhận lương 20tr, ăn phở 45k', ctx, true);
    expect(r.actions!.map((a) => a.expense!.amount)).toEqual([45000]);
    expect(r.reply).toContain(INCOME_NOT_SUPPORTED_REPLY);
  });
});

describe('Hỏi theo danh mục', () => {
  it('nhận câu hỏi, bỏ qua câu ghi chi', () => {
    expect(detectCategoryQuery('tháng này ăn uống hết bao nhiêu')?.categoryId).toBe('an_uong');
    expect(detectCategoryQuery('tổng di chuyển tháng trước')).toMatchObject({ categoryId: 'di_chuyen', monthOffset: -1 });
    expect(detectCategoryQuery('chi cho mua sắm')?.categoryId).toBe('mua_sam');
    expect(detectCategoryQuery('ăn phở hết 45k')).toBeNull();
    expect(detectCategoryQuery('chi cho ăn uống 45k')).toBeNull();
    expect(detectCategoryQuery('tháng này tôi tiêu bao nhiêu')).toBeNull();
  });
  it('server và client trả đúng tổng an_uong + số giao dịch + hạn mức', async () => {
    for (const reply of [
      (await run('tháng này ăn uống hết bao nhiêu')).data!.reply,
      (await sendToAIAssistant('tháng này ăn uống hết bao nhiêu', ctx, false)).reply,
    ]) {
      expect(reply).toContain('70.000₫');
      expect(reply).toContain('2 giao dịch');
      expect(reply).toContain('60.000₫');
      expect(reply).toContain('10.000₫');
    }
  });
  it('tháng trước', async () => {
    const r = await run('tháng trước ăn uống hết bao nhiêu');
    expect(r.data!.reply).toContain('99.000₫');
    expect(r.data!.reply).toContain('1 giao dịch');
  });
  it('aggregator có categoryFacts đầy đủ', () => {
    const f = AiFactsAggregator.aggregate(ctx);
    expect(f.categoryFacts).toHaveLength(8);
    expect(f.categoryFacts.find((c) => c.categoryId === 'an_uong')).toMatchObject({
      spent: 70000, transactionCount: 2, previousMonthSpent: 99000, previousMonthTransactionCount: 1, limit: 60000,
    });
  });
});

describe('Sửa kèm', () => {
  const over = { ...ctx, expenses: [exp('a', 1245001, 'khac', 'x')] };
  it('thâm hụt: số thật nhất quán, không 0₫ kèm phần trăm âm', async () => {
    const f = AiFactsAggregator.aggregate(over);
    expect(f.netSavingsThisMonth).toBe(-245001);
    expect(f.savingsRatePct).toBe(-25);
    const reply = (await run('xin tổng quan', over)).data!.reply;
    expect(reply).toContain('Thâm hụt');
    expect(reply).toContain('245.001₫');
    expect(reply).not.toMatch(/Tích lũy ròng\*\*: \*\*0₫/);
  });
  it('hạn mức mỗi ngày không âm khi đã chi vượt', async () => {
    const m = 'dự báo dòng tiền cuối tháng';
    for (const reply of [(await run(m, over)).data!.reply, (await sendToAIAssistant(m, over, false)).reply]) {
      expect(reply).not.toMatch(/-[\d.]+₫\/ngày/);
      expect(reply).toContain('vượt thu nhập');
    }
  });
  it('xóa: chỉ khớp ghi chú/số tiền', () => {
    expect(findDeleteTarget('bỏ khoản grab vừa ghi', expenses, '2026-11-26')?.id).toBe('3');
    expect(findDeleteTarget('xóa khoản 25k', expenses, '2026-11-26')?.id).toBe('2');
    expect(findDeleteTarget('xóa khoản vừa ghi', expenses, '2026-11-26')).toBeNull();
    expect(findDeleteTarget('xóa khoản ăn tối 120k', expenses, '2026-11-26')).toBeNull();
    expect(findDeleteTarget('xóa khoản 45k', [...expenses, exp('9', 45000, 'khac', 'Vở')], '2026-11-26')).toBeNull();
  });
  it('xóa không khớp: hỏi lại, không đề xuất (server, client, Gemini)', async () => {
    for (const data of [(await run('xóa khoản xem phim')).data!, await sendToAIAssistant('xóa khoản xem phim', ctx, false)]) {
      expect(actionsOf(data)).toEqual([]);
      expect(data.reply).toContain('ghi chú');
    }
    useGemini({
      intent: 'DELETE_EXPENSE', reply: 'Xóa nhé?',
      actions: [{ type: 'DELETE_EXPENSE', expense: { amount: 0, note: 'xem phim', category: 'an_uong' } }],
    });
    const r = await run('xóa khoản xem phim');
    expect(actionsOf(r.data)).toEqual([]);
    expect(r.data!.reply).toContain('ghi chú');
  });
  it('schema giữ recurringExpenses và giới hạn kích thước', () => {
    const ok = aiAssistantSchema.parse({ message: 'a', context: { recurringExpenses: [{ amount: 1, dayOfMonth: 2 }] } });
    expect(ok.context!.recurringExpenses).toHaveLength(1);
    expect(aiAssistantSchema.safeParse({ message: 'a', context: { recurringExpenses: Array(501).fill({}) } }).success).toBe(false);
  });
});
