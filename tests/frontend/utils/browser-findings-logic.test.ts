import { describe, it, expect, vi, afterEach } from 'vitest';
import { suggestStatementCategory } from '../../../src/utils/statementCategory';
import { formatDateShort, formatPercent } from '../../../src/utils/format';
import { generateFinancialInsights } from '../../../src/utils/insightsEngine';
import { parseStatement } from '../../../src/utils/csv';
import { WalletsService } from '../../../src/modules/wallets/wallets.service';
import { prisma } from '../../../src/lib/prisma';
import { AppState } from '../../../src/types';
import { computeFinancialQueryResponse } from '../../../src/utils/aiService';
import { AiFactsAggregator } from '../../../src/modules/ai/ai.aggregator';
import { AiService } from '../../../src/modules/ai/ai.service';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('Phân loại sao kê', () => {
  it.each([
    ['COM TAM SUON chuyen tien', 'an_uong'],
    ['chuyển tiền cơm tấm', 'an_uong'],
    ['Thanh toan tien dien EVN HCMC', 'hoa_don'],
    ['EVNHCMC0123456789', 'hoa_don'],
    ['TIEN DIEN THANG 11', 'hoa_don'],
    ['Tiền nước sạch tháng 11', 'hoa_don'],
    ['GRAB chuyen khoan', 'di_chuyen'],
    ['GrabFood don hang 123', 'an_uong'],
    ['Đổ xăng xe máy', 'di_chuyen'],
    ['Ăn phở', 'an_uong'],
    ['MUA DIEN THOAI', 'mua_sam'],
    ['DIEN MAY XANH', 'mua_sam'],
    ['shopee.com thanh toan', 'mua_sam'],
    ['Nha thuoc Long Chau', 'suc_khoe'],
    ['Hoc phi ky 1', 'giao_duc'],
    ['Ve xem phim CGV', 'giai_tri'],
    // Không được đoán từ chuyển khoản hay chuỗi con
    ['CHUYEN TIEN', 'khac'],
    ['Chuyển tiền qua ngân hàng', 'khac'],
    ['Giao dịch ngân hàng', 'khac'],
    ['NGUYEN VAN BEN chuyen tien', 'khac'],
    ['NH TMCP Tien Phong', 'khac'],
    ['thanh pho Ho Chi Minh', 'khac'],
    ['Hoàn trả cho An', 'khac'],
    ['', 'khac'],
    // Cụm chung nhường thương hiệu cụ thể
    ['hoa don tiki', 'mua_sam'],
    ['Hóa đơn Shopee', 'mua_sam'],
    ['hoa don grab', 'di_chuyen'],
    ['Hóa đơn điện tử Tiki', 'mua_sam'],
    ['hoa don tien dien', 'hoa_don'],
    ['Hóa đơn điện tháng 11', 'hoa_don'],
    ['Thanh toan hoa don', 'hoa_don'],
  ])('"%s" -> %s', (note, expected) => {
    expect(suggestStatementCategory(note)).toBe(expected);
  });

  it('mô tả rỗng trong sao kê thành Khác', () => {
    const result = parseStatement('Ngày,Nội dung,Số tiền\n25/11/2026,,45000');
    expect(result.ok && result.expenses[0].categoryId).toBe('khac');
  });
});

describe('Định dạng hiển thị', () => {
  it('ngày dd/MM/yyyy không lệch múi giờ', () => {
    expect(formatDateShort('2026-11-25')).toBe('25/11/2026');
    expect(formatDateShort('2026-01-01')).toBe('01/01/2026');
    expect(formatDateShort('2026-11-30T18:00:00.000Z')).toBe('01/12/2026');
    expect(formatDateShort('không phải ngày')).toBe('không phải ngày');
    expect(formatDateShort('')).toBe('');
  });

  it('phần trăm dùng dấu phẩy', () => {
    expect(formatPercent(56.5)).toBe('56,5%');
    expect(formatPercent(0)).toBe('0,0%');
    expect(formatPercent(33.333, 0)).toBe('33%');
  });
});

describe('Gợi ý khi thâm hụt', () => {
  const state = (amount: number, extra: Partial<AppState> = {}) =>
    ({
      expenses: [{ id: 'e', amount, categoryId: 'khac', note: 'x', date: '2026-11-05' }],
      goals: [], income: 1_000_000, categoryLimits: {}, recurringExpenses: [], ...extra,
    }) as unknown as AppState;

  it('đã vượt thu nhập: nêu số đã vượt, khuyên tạm dừng, không có hạn mức ngày', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T05:00:00Z'));
    const item = generateFinancialInsights(state(1_300_000)).find((i) => i.id === 'ins-overbudget-total')!;
    expect(item.suggestedAction).toContain('đã chi vượt thu nhập 300.000₫');
    expect(item.suggestedAction).toContain('tạm dừng các khoản chi không thiết yếu');
    expect(item.dailyImpact).toBe('Đã vượt 300.000₫');
    expect(`${item.suggestedAction} ${item.dailyImpact} ${item.actionableStep}`).not.toMatch(/\/ngày|mỗi ngày/);
  });

  it('vượt hạn mức danh mục: nêu số đã vượt, khuyên ngừng chi, không có mức cắt giảm mỗi ngày', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T05:00:00Z'));
    const item = generateFinancialInsights(state(250_000, { categoryLimits: { khac: 200_000 } })).find(
      (i) => i.id === 'ins-limit-khac'
    )!;
    expect(item.suggestedAction).toBe('Đã vượt hạn mức 50.000₫, hãy ngừng chi nhóm Khác đến hết tháng.');
    expect(item.dailyImpact).toBe('Đã vượt 50.000₫');
    expect(`${item.suggestedAction} ${item.dailyImpact}`).not.toMatch(/\/ngày|mỗi ngày|an toàn/);
  });

  it('dùng đúng hết hạn mức danh mục: không gợi ý 0₫/ngày', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T05:00:00Z'));
    const item = generateFinancialInsights(state(200_000, { categoryLimits: { khac: 200_000 } })).find(
      (i) => i.id === 'ins-near-limit-khac'
    )!;
    expect(JSON.stringify(item)).not.toContain(' 0₫');
    expect(item.dailyImpact).toBe('Đã dùng hết hạn mức');
  });
});

describe('Danh sách ví kèm số giao dịch', () => {
  it('chỉ đếm giao dịch của chính người dùng', async () => {
    const findMany = vi.spyOn(prisma.wallet, 'findMany').mockResolvedValue([
      { id: 'w', name: 'Ví', balance: 0, currency: 'VND', isDefault: true, type: 'cash', userId: 'u1', _count: { transactions: 2 } },
    ] as any);
    const [wallet] = await WalletsService.getWallets('u1');
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'u1' },
        include: { _count: { select: { transactions: { where: { userId: 'u1' } } } } },
      })
    );
    expect(wallet.transactionCount).toBe(2);
  });
});

describe('Không khuyên trích tiết kiệm khi không có phần dư', () => {
  const goals = [{ id: 'g', name: 'Mua xe', target: 100_000_000, current: 0, createdAt: '2026-11-01' }];
  const state = (income: number, expenses: Array<[string, number]>) =>
    ({
      income,
      expenses: expenses.map(([date, amount], i) => ({ id: String(i), amount, categoryId: 'khac', note: 'x', date })),
      goals, categoryLimits: {}, recurringExpenses: [],
    }) as unknown as AppState;
  const run = (s: AppState) => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-10T05:00:00Z'));
    return generateFinancialInsights(s);
  };
  const advice = (items: ReturnType<typeof generateFinancialInsights>) =>
    items.map((i) => [i.suggestedAction, i.actionableStep, i.dailyImpact, i.projection].join(' ')).join(' ');

  it.each([
    ['thâm hụt', state(1_000_000, [['2026-11-05', 1_300_000]])],
    ['dùng hết thu nhập', state(1_000_000, [['2026-11-05', 1_000_000]])],
    ['chưa nhập thu nhập', state(0, [['2026-11-05', 300_000]])],
    ['mức chi trung bình vượt thu nhập', state(1_000_000, [['2026-10-05', 5_000_000], ['2026-11-05', 100_000]])],
  ])('%s: không có thẻ trích tiền vào mục tiêu', (_name, s) => {
    const items = run(s);
    expect(items.some((i) => i.id.startsWith('ins-goal-'))).toBe(false);
    expect(advice(items)).not.toMatch(/Tự động trích|trích lập khoản|vào mục tiêu này|Chuyển ngay/);
  });

  it('còn dư: vẫn có kế hoạch cho mục tiêu', () => {
    expect(run(state(50_000_000, [['2026-11-05', 1_000_000]])).some((i) => i.id === 'ins-goal-g')).toBe(true);
  });

  const context = (spent: number, income: number): any => ({
    currentDate: '2026-11-10',
    expenses: [{ id: 'e', amount: spent, categoryId: 'khac', note: 'x', date: '2026-11-05' }],
    goals, categoryLimits: {}, income, recurringExpenses: [],
  });

  it('trợ lý dự phòng (khách): thâm hụt thì không bịa tốc độ tích lũy', () => {
    const reply = computeFinancialQueryResponse('mục tiêu bao lâu nữa', context(1_300_000, 1_000_000));
    expect(reply).toContain('chưa ước tính được');
    expect(reply).not.toMatch(/1\.000\.000₫\/tháng|tháng\*\* nữa/);
  });

  it('server: thâm hụt không ước tính số tháng', () => {
    const facts = AiFactsAggregator.aggregate(context(1_300_000, 1_000_000));
    expect(facts.goals[0].estimatedMonthsNeeded).toBeNull();
  });

  it.each([
    ['thâm hụt', 1_300_000, 1_000_000],
    ['chưa nhập thu nhập', 300_000, 0],
  ])('server dự phòng, hỏi ngân sách khi %s: không khuyên trích vào quỹ', (_n, spent, income) => {
    const facts = AiFactsAggregator.aggregate(context(spent, income));
    const result = (AiService as any).generateDeterministicCopilotResponse('ngân sách của tôi', facts, [], {}, '2026-11-10');
    expect(result.data.intent).toBe('BUDGET_ADVICE');
    expect(result.data.reply).not.toMatch(/trích thêm|Quỹ Mục tiêu/);
  });
});
