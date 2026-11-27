import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../src/modules/ai/ai.quota', () => ({
  AiQuotaManager: {
    checkAndConsumeQuota: vi.fn().mockResolvedValue({
      allowed: true,
      quota: {
        userId: 'user-1',
        dateKey: '2026-05-15',
        used: 1,
        limit: 50,
        remaining: 49,
        resetAt: '2026-05-15T17:00:00.000Z',
      },
    }),
  },
}));

vi.mock('../../src/modules/ai/ai.logger', () => ({
  AiLogger: {
    logRequest: vi.fn(),
  },
}));

import { AiService } from '../../src/modules/ai/ai.service';

describe('AiService deterministic BUDGET_ADVICE consistency', () => {
  const originalApiKey = process.env.GEMINI_API_KEY;

  beforeEach(() => {
    delete process.env.GEMINI_API_KEY;
  });

  afterEach(() => {
    if (originalApiKey !== undefined) {
      process.env.GEMINI_API_KEY = originalApiKey;
    } else {
      delete process.env.GEMINI_API_KEY;
    }
  });

  it('does not contradict itself or claim safe limits when in deficit with no category limits', async () => {
    const result = await AiService.processMessage(
      {
        message: 'Tôi có vượt ngân sách không?',
        context: {
          currentDate: '2026-05-15',
          income: 5_000_000,
          categoryLimits: {},
          expenses: [
            { id: '1', amount: 6_500_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
          ],
          goals: [],
          recurringExpenses: [],
        },
      },
      'user-1'
    );

    expect(result.success).toBe(true);
    const data = result.data!;
    expect(data.intent).toBe('BUDGET_ADVICE');
    expect(data.reply).toContain('thâm hụt');
    expect(data.reply).toContain('Chưa có danh mục nào được thiết lập hạn mức');
    expect(data.reply).toContain('tạm dừng các khoản chi không thiết yếu');
    expect(data.reply).not.toContain('nằm trong hạn mức an toàn');

    expect(data.financialSummary?.riskOrInsight).toContain('vượt thu nhập');
    expect(data.financialSummary?.riskOrInsight).not.toContain('Ngân sách đang ổn định');
    expect(data.financialSummary?.recommendedAction).toContain('Tạm dừng các khoản chi không thiết yếu');
    expect(data.financialSummary?.recommendedAction).not.toContain('Tiếp tục duy trì kỷ luật');
  });

  it('does not claim stable budget or safe limits when income is not entered', async () => {
    const result = await AiService.processMessage(
      {
        message: 'Tôi có vượt ngân sách không?',
        context: {
          currentDate: '2026-05-15',
          income: 0,
          categoryLimits: {},
          expenses: [
            { id: '1', amount: 1_000_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
          ],
          goals: [],
          recurringExpenses: [],
        },
      },
      'user-1'
    );

    expect(result.success).toBe(true);
    const data = result.data!;
    expect(data.intent).toBe('BUDGET_ADVICE');
    expect(data.reply).toContain('chưa nhập thu nhập');
    expect(data.reply).not.toContain('nằm trong hạn mức an toàn');
    expect(data.financialSummary?.riskOrInsight).toContain('Chưa nhập thu nhập');
    expect(data.financialSummary?.riskOrInsight).not.toContain('Ngân sách đang ổn định');
    expect(data.financialSummary?.recommendedAction).not.toContain('Tiếp tục duy trì kỷ luật');
  });

  it('reports stable budget only when income is set, surplus exists, and category limits are respected', async () => {
    const result = await AiService.processMessage(
      {
        message: 'Tôi có vượt ngân sách không?',
        context: {
          currentDate: '2026-05-15',
          income: 10_000_000,
          categoryLimits: { an_uong: 3_000_000 },
          expenses: [
            { id: '1', amount: 1_500_000, categoryId: 'an_uong', note: 'Ăn uống', date: '2026-05-10' },
          ],
          goals: [],
          recurringExpenses: [],
        },
      },
      'user-1'
    );

    expect(result.success).toBe(true);
    const data = result.data!;
    expect(data.financialSummary?.riskOrInsight).toBe('Ngân sách đang ổn định.');
    expect(data.financialSummary?.recommendedAction).toBe('Tiếp tục duy trì kỷ luật.');
  });
});
