import { describe, it, expect } from 'vitest';
import { computeFinancialQueryResponse, sendToAIAssistant } from '../../src/utils/aiService';

describe('Client fallback budget advice consistency', () => {
  it('warns about deficit and missing category limits instead of claiming safe limits', async () => {
    const res = await sendToAIAssistant(
      'Tôi có vượt ngân sách không?',
      {
        currentDate: '2026-05-15',
        income: 5_000_000,
        categoryLimits: {},
        expenses: [
          { id: '1', amount: 7_000_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
        ],
        goals: [],
      },
      false
    );

    expect(res.intent).toBe('BUDGET_ADVICE');
    expect(res.reply).toContain('thâm hụt');
    expect(res.reply).toContain('hạn chế tối đa các khoản chi chưa cần thiết');
    expect(res.reply).toContain('Chưa có danh mục nào được thiết lập hạn mức');
    expect(res.reply).not.toContain('Tuyệt vời');
    expect(res.reply).not.toContain('nằm trong hạn mức an toàn');
  });

  it('does not claim all categories are within safe limits when income is not entered', () => {
    const reply = computeFinancialQueryResponse('Tôi có vượt ngân sách không?', {
      currentDate: '2026-05-15',
      income: 0,
      categoryLimits: {},
      expenses: [
        { id: '1', amount: 1_200_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
      ],
      goals: [],
    });

    expect(reply).toContain('chưa nhập thu nhập');
    expect(reply).not.toContain('Tuyệt vời');
    expect(reply).not.toContain('nằm trong hạn mức an toàn');
  });

  it('notes missing category limits even when monthly income has surplus', () => {
    const reply = computeFinancialQueryResponse('Tôi có vượt ngân sách không?', {
      currentDate: '2026-05-15',
      income: 10_000_000,
      categoryLimits: {},
      expenses: [
        { id: '1', amount: 2_000_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
      ],
      goals: [],
    });

    expect(reply).toContain('chưa thiết lập hạn mức cho từng danh mục');
    expect(reply).not.toContain('nằm trong hạn mức an toàn');
  });

  it('confirms safe limits when income is positive and configured category limits are not exceeded', () => {
    const reply = computeFinancialQueryResponse('Tôi có vượt ngân sách không?', {
      currentDate: '2026-05-15',
      income: 10_000_000,
      categoryLimits: { an_uong: 3_000_000 },
      expenses: [
        { id: '1', amount: 1_000_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
      ],
      goals: [],
    });

    expect(reply).toContain('Tuyệt vời');
    expect(reply).toContain('an toàn');
  });

  it('still parses an expense message with an amount even when it mentions ngân sách', async () => {
    const res = await sendToAIAssistant(
      'Hôm nay mua sách ngân sách 50k',
      {
        currentDate: '2026-05-15',
        income: 10_000_000,
        categoryLimits: {},
        expenses: [],
        goals: [],
      },
      false
    );

    expect(res.intent).toBe('CREATE_EXPENSE');
    expect(res.actions).toHaveLength(1);
    expect(res.actions?.[0].type).toBe('CREATE_EXPENSE');
    expect(res.actions?.[0].expense?.amount).toBe(50_000);
  });
});
