import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within, cleanup } from '@testing-library/react';
import { ToastProvider } from '../../../src/context/ToastContext';
import { WalletsTab } from '../../../src/features/wallets/components/WalletsTab';
import { DashboardHero } from '../../../src/features/dashboard/components/DashboardHero';
import { FinancialHealthCard } from '../../../src/features/dashboard/components/FinancialHealthCard';
import { MonthlyReportModal } from '../../../src/components/common/MonthlyReportModal';
import InsightsTab from '../../../src/features/insights/components/InsightsTab';
import { RecurringTab } from '../../../src/features/recurring/components/RecurringTab';
import BudgetTab from '../../../src/features/budgets/components/BudgetTab';
import GoalsTab from '../../../src/features/goals/components/GoalsTab';
import { ReportsTab } from '../../../src/features/reports/components/ReportsTab';
import ChatbotTab from '../../../src/features/ai/components/ChatbotTab';
import { LedgerApp } from '../../../src/app/App';
import { renderInlineMarkdown } from '../../../src/utils/inlineMarkdown';
import { walletService } from '../../../src/services/api/walletService';
import { apiClient } from '../../../src/lib/apiClient';
import { calculateHealthScore } from '../../../src/utils/healthScore';
import { formatCurrency } from '../../../src/utils/format';

// WalletsTab chỉ đọc server khi đã đăng nhập; các phần còn lại chạy ở chế độ khách
const authMock = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: null,
    loading: false,
    logout: vi.fn(),
    isAuthenticated: authMock.isAuthenticated,
    user: authMock.isAuthenticated ? { id: 'u1' } : null,
  }),
}));
vi.mock('../../../src/features/auth/components/GoogleAuthButton', () => ({
  GoogleAuthButton: () => null,
}));
vi.mock('../../../src/components/layout/LandingPage', () => ({
  default: ({ onOpenRegister, onOpenLogin }: any) => (
    <div>
      <button onClick={onOpenRegister}>mo-dang-ky</button>
      <button onClick={onOpenLogin}>mo-dang-nhap</button>
    </div>
  ),
}));

const wallet = (id: string, name: string, type: string, balance: number) => ({
  id,
  name,
  type,
  balance,
  currency: 'VND',
  isDefault: false,
  createdAt: '2026-11-01',
  updatedAt: '2026-11-01',
});

const norm = (s: string | null | undefined) => (s || '').replace(/\s/g, ' ');
const money = (n: number) => norm(formatCurrency(n));
const statValue = (title: string) => {
  let el: HTMLElement | null = screen.getByText(title);
  while (el && !norm(el.textContent).includes('₫')) el = el.parentElement;
  return norm(el?.textContent);
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
beforeEach(() => {
  window.localStorage.clear();
});

describe('WalletsTab theo loại ví', () => {
  beforeEach(() => {
    authMock.isAuthenticated = true;
  });
  afterEach(() => {
    authMock.isAuthenticated = false;
  });

  const renderWallets = async (list: any[]) => {
    vi.spyOn(walletService, 'getWallets').mockResolvedValue(list);
    render(
      <ToastProvider>
        <WalletsTab />
      </ToastProvider>
    );
    await screen.findByText(list[0].name);
  };

  it('chỉ ví credit âm tính vào nợ thẻ; bank âm trừ vào khả dụng', async () => {
    await renderWallets([
      wallet('a', 'Visa tên Ngân hàng', 'bank', -500000),
      wallet('b', 'Thẻ B', 'credit', -3200000),
    ]);
    expect(statValue('Dư Nợ Thẻ Tín Dụng')).toContain(money(3200000));
    expect(statValue('Tổng Số Dư Khả Dụng')).toContain(money(-500000));
    expect(statValue('Tổng Giá Trị Ròng (Net Worth)')).toContain(money(-3700000));
    expect(screen.getByText('Số dư âm')).toBeInTheDocument();
    expect(screen.getByText('Tiền mặt + Ngân hàng + Ví (đã trừ số dư âm)')).toBeInTheDocument();
  });

  it('credit dương chỉ vào net worth', async () => {
    await renderWallets([wallet('a', 'Tiền', 'cash', 1000000), wallet('b', 'Thẻ B', 'credit', 200000)]);
    expect(statValue('Tổng Số Dư Khả Dụng')).toContain(money(1000000));
    expect(statValue('Tổng Giá Trị Ròng (Net Worth)')).toContain(money(1200000));
    expect(statValue('Dư Nợ Thẻ Tín Dụng')).toContain(money(0));
  });

  it.each([
    [-3200000, '3.200.000'],
    [200000, '200.000'],
    [-1000.5, '1.000,5'],
  ])('mở form sửa ví credit (%d) rồi lưu không sửa: không đổi số dư, gửi type', async (balance, shown) => {
    await renderWallets([wallet('b', 'Thẻ B', 'credit', balance)]);
    const update = vi.spyOn(walletService, 'updateWallet').mockResolvedValue({} as any);
    fireEvent.click(screen.getByTitle('Sửa thông tin ví'));
    expect(screen.getByText('Dư nợ hiện tại (VNĐ)')).toBeInTheDocument();
    const input = screen.getByPlaceholderText('0') as HTMLInputElement;
    expect(input.value).toBe(shown);
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][1]).toEqual({ name: 'Thẻ B', type: 'credit' });
    // Đã đăng nhập: đợi tải lại từ server, không ghi cache cục bộ
    await waitFor(() => expect(walletService.getWallets).toHaveBeenCalledTimes(2));
    expect(window.localStorage.getItem('so_tay_wallets_data')).toBeNull();
  });

  it.each([-3200000, 200000, -1000.5])('khách: sửa ví credit (%d) rồi lưu không sửa giữ nguyên số dư', async (balance) => {
    authMock.isAuthenticated = false;
    window.localStorage.setItem('so_tay_wallets_data', JSON.stringify([wallet('b', 'Thẻ B', 'credit', balance)]));
    render(
      <ToastProvider>
        <WalletsTab />
      </ToastProvider>
    );
    fireEvent.click(screen.getByTitle('Sửa thông tin ví'));
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText('Đã cập nhật thông tin tài khoản!');
    expect(JSON.parse(window.localStorage.getItem('so_tay_wallets_data')!)[0].balance).toBe(balance);
  });

  it('sửa dư nợ ví credit lưu số âm; đổi loại mà không sửa số thì giữ số dư', async () => {
    const serverList = [wallet('b', 'Thẻ B', 'credit', -3200000)];
    await renderWallets(serverList);
    // Server giả lưu thay đổi: danh sách tải lại phải phản ánh số dư mới
    const update = vi.spyOn(walletService, 'updateWallet').mockImplementation(async (_id, data) => {
      Object.assign(serverList[0], data);
      return serverList[0] as any;
    });
    fireEvent.click(screen.getByTitle('Sửa thông tin ví'));
    fireEvent.change(screen.getByPlaceholderText('0'), { target: { value: '1000000' } });
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(1));
    expect(update.mock.calls[0][1]).toEqual({ name: 'Thẻ B', type: 'credit', balance: -1000000 });
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Lưu thay đổi' })).toBeNull());

    fireEvent.click(screen.getByTitle('Sửa thông tin ví'));
    fireEvent.click(screen.getByRole('button', { name: 'Ngân hàng' }));
    expect((screen.getByPlaceholderText('0') as HTMLInputElement).value).toBe('-1.000.000');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await waitFor(() => expect(update).toHaveBeenCalledTimes(2));
    expect(update.mock.calls[1][1]).toEqual({ name: 'Thẻ B', type: 'bank' });
  });

  it('setDefaultWallet gọi PUT /wallets/:id {isDefault:true}', async () => {
    const put = vi.spyOn(apiClient, 'put').mockResolvedValue({ data: { data: {} } } as any);
    await walletService.setDefaultWallet('w9');
    expect(put).toHaveBeenCalledWith('/api/v1/wallets/w9', { isDefault: true });
  });
});

describe('DashboardHero', () => {
  const renderHero = (income: number, expense = 200000) =>
    render(
      <DashboardHero
        totalBalance={0}
        income={income}
        monthlyExpense={expense}
        monthlySavings={income - expense}
        savingsRate={income > 0 ? ((income - expense) / income) * 100 : 0}
        dailyBurnRate={1000}
        selectedMonth="2026-11"
        availableMonths={['2026-11']}
        onChangeMonth={vi.fn()}
        onUpdateIncome={vi.fn()}
        onOpenQuickAdd={vi.fn()}
      />
    );

  it('income 0: mời nhập, không tỷ lệ, không thâm hụt', () => {
    const { container } = renderHero(0);
    expect(screen.getAllByText('Chưa nhập').length).toBeGreaterThan(0);
    expect(screen.getByText('Chưa đánh giá')).toBeInTheDocument();
    expect(screen.getAllByText('Chưa nhập thu nhập').length).toBeGreaterThan(0);
    expect(container.textContent).not.toMatch(/% thu nhập|thâm hụt|Thâm hụt|Chi vượt|0,0%|NaN|Infinity/);
    fireEvent.click(screen.getByRole('button', { name: 'Nhập thu nhập tháng' }));
    const input = screen.getByPlaceholderText('VD: 15.000.000') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('nhãn mới khi có thu nhập', () => {
    const { container } = renderHero(1000000);
    expect(screen.getByText('1. ƯỚC TÍNH CÒN LẠI THEO THU NHẬP KHAI BÁO')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Thu nhập khai báo − đã chi trong tháng đang chọn + tổng tiền đã góp mục tiêu (không hiện số âm). Không phải số dư thật trong ví — xem tab Ví tiền.'
      )
    ).toBeInTheDocument();
    expect(container.textContent).not.toContain('Khả dụng & tích lũy');
    expect(screen.getByTitle('Ẩn số tiền')).toBeInTheDocument();
    expect(screen.getByText('Chi ít hơn thu nhập khai báo')).toBeInTheDocument();
    expect(screen.getByText('Do bạn khai báo')).toBeInTheDocument();
    expect(screen.getByText('Còn lại tháng này')).toBeInTheDocument();
    expect(screen.getByText('Thu nhập khai báo − đã chi')).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/SỐ DƯ TÀI CHÍNH|Định mức ngân sách|Tiền tích lũy|Sẵn sàng chuyển quỹ/);
  });

  it('income 0: mô tả đúng công thức, bỏ phụ đề cũ', () => {
    const { container } = renderHero(0);
    expect(
      screen.getByText(
        'Chưa nhập thu nhập nên chỉ hiện tổng tiền đã góp mục tiêu, chưa trừ chi tiêu. Không phải số dư thật trong ví — xem tab Ví tiền.'
      )
    ).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/Khả dụng & tích lũy|Thu nhập khai báo − đã chi/);
  });

  it('chi vượt thu nhập khai báo', () => {
    renderHero(1000, 5000);
    expect(screen.getByText('Chi vượt thu nhập khai báo')).toBeInTheDocument();
  });
});

describe('Sức khỏe tài chính khi chưa có thu nhập', () => {
  const state: any = {
    expenses: [],
    goals: [],
    income: 0,
    budgetTemplate: 'none',
    categoryLimits: {},
    recurringExpenses: [],
    generatedRecurringMonths: [],
  };

  it('FinancialHealthCard hiện Chưa đánh giá, không hiện điểm', () => {
    const { container } = render(<FinancialHealthCard healthScore={calculateHealthScore(state)} />);
    expect(container.textContent).toContain('Chưa đánh giá — hãy nhập thu nhập tháng');
    expect(container.textContent).not.toMatch(/\/ 100|Tỷ lệ tiết kiệm \(0%\)/);
  });

  it.each([
    ['InsightsTab', InsightsTab as React.ComponentType<any>],
    ['ReportsTab', ReportsTab as React.ComponentType<any>],
  ])('%s hiện Chưa đánh giá, không hiện điểm', (_name, Tab) => {
    const { container } = render(<Tab state={state} />);
    expect(container.textContent).toContain('Chưa đánh giá');
    expect(container.textContent).not.toMatch(/Tổng điểm: \d|\d\/100|NaN|Infinity/);
  });

  it('MonthlyReportModal (bản in) hiện Chưa nhập / Chưa đánh giá', () => {
    const { container } = render(<MonthlyReportModal isOpen state={state} onClose={vi.fn()} />);
    expect(container.textContent).toContain('Chưa nhập');
    expect(container.textContent).toContain('Chưa đánh giá — hãy nhập thu nhập tháng');
    expect(container.textContent).not.toMatch(/\/ 100|Tỷ lệ: 0%/);
  });
});

describe('Các tab khác khi chưa có thu nhập', () => {
  const noop = vi.fn();
  const recurring = [{ id: 'r1', amount: 500000, categoryId: 'hoa_don', dayOfMonth: 5, note: 'Net' }];
  const expenses = [{ id: 'e1', amount: 200000, categoryId: 'an_uong', note: 'x', date: '2026-11-10' }];
  const goals = [{ id: 'g1', name: 'Laptop', target: 1000000, current: 0, createdAt: '2026-11-01' }];

  const renderRecurring = (income: number) =>
    render(
      <ToastProvider>
        <RecurringTab
          recurringExpenses={recurring}
          income={income}
          onAddRecurringExpense={noop}
          onDeleteRecurringExpense={noop}
        />
      </ToastProvider>
    );
  const renderBudget = (income: number) =>
    render(
      <ToastProvider>
        <BudgetTab expenses={[]} categoryLimits={{}} income={income} recurringExpenses={recurring} />
      </ToastProvider>
    );
  const renderGoals = (income: number) =>
    render(
      <GoalsTab
        expenses={expenses}
        goals={goals}
        income={income}
        onUpdateIncome={noop}
        onAddGoal={noop}
        onUpdateGoalProgress={noop}
        onDeleteGoal={noop}
      />
    );
  const cardText = (title: string) => {
    const el = screen.getByText(title);
    return norm(el.parentElement?.parentElement?.textContent);
  };

  it('RecurringTab: Chưa đánh giá, không 0% / an toàn', () => {
    const { container } = renderRecurring(0);
    expect(container.textContent).toContain('Chưa đánh giá');
    expect(container.textContent).not.toMatch(/0%|Mức chi cố định an toàn|cao so với thu nhập/);
  });

  it('RecurringTab có thu nhập giữ tỷ trọng', () => {
    const { container } = renderRecurring(5000000);
    expect(container.textContent).toContain('10,0%');
    expect(container.textContent).toContain('Mức chi cố định an toàn');
  });

  it('BudgetTab: ô tỷ trọng định kỳ Chưa đánh giá', () => {
    renderBudget(0);
    expect(cardText('Tỷ trọng/Thu nhập')).toContain('Chưa đánh giá');
    expect(cardText('Tỷ trọng/Thu nhập')).not.toContain('0%');
    cleanup();
    renderBudget(5000000);
    expect(cardText('Tỷ trọng/Thu nhập')).toContain('10,0%');
  });

  it('GoalsTab: không tích lũy âm, mời nhập thu nhập', () => {
    const { container } = renderGoals(0);
    expect(container.textContent).toContain('Nhập thu nhập tháng để tính tiền tích lũy');
    expect(container.textContent).toContain('Chưa đánh giá — hãy nhập thu nhập tháng để dự báo');
    expect(norm(container.textContent)).not.toMatch(/-200.000|vượt quá thu nhập|đang âm/);
  });

  it('GoalsTab có thu nhập nhưng chi vượt vẫn cảnh báo', () => {
    const { container } = renderGoals(100000);
    expect(container.textContent).toContain('Chi tiêu đang vượt quá thu nhập');
  });
});

describe('renderInlineMarkdown', () => {
  const html = (text: string) => render(<div data-testid="md">{renderInlineMarkdown(text)}</div>).getByTestId('md');

  it('đổi **x** thành strong và *x* thành em, giữ xuống dòng', () => {
    const el = html('• **Đậm**: *"nghiêng"*\ndòng 2');
    expect(el.querySelector('strong')?.textContent).toBe('Đậm');
    expect(el.querySelector('em')?.textContent).toBe('"nghiêng"');
    expect(el.textContent).toBe('• Đậm: "nghiêng"\ndòng 2');
  });

  it.each(['2 * 3', '2 * 3 * 4 = 24', '2*3*4', 'chỉ một * dấu', 'a ** b ** c', '* mục 1\n* mục 2'])(
    'giữ nguyên "%s"',
    (text) => {
      const el = html(text);
      expect(el.textContent).toBe(text);
      expect(el.querySelector('strong, em')).toBeNull();
    }
  );

  it('<script> vẫn là text', () => {
    const el = html('**<script>alert(1)</script>** <img src=x onerror=alert(1)>');
    expect(el.querySelector('script, img')).toBeNull();
    expect(el.textContent).toBe('<script>alert(1)</script> <img src=x onerror=alert(1)>');
  });

  it('ChatbotTab render lời chào không còn dấu **', () => {
    const { container } = render(
      <ToastProvider>
        <ChatbotTab
          expenses={[]}
          categoryLimits={{}}
          onAddExpense={vi.fn()}
          currentUser={null}
          onOpenAuthModal={vi.fn()}
        />
      </ToastProvider>
    );
    const bubble = container.querySelector('.whitespace-pre-line')!;
    expect(bubble.textContent).not.toContain('**');
    expect(within(bubble as HTMLElement).getByText('Financial Copilot').tagName).toBe('STRONG');
  });
});

describe('AuthModal mở đúng tab ngay lần vẽ đầu', () => {
  it('bấm đăng ký: tab đăng ký không bao giờ đi qua trạng thái đăng nhập', async () => {
    render(
      <ToastProvider>
        <LedgerApp />
      </ToastProvider>
    );
    const mutations: MutationRecord[] = [];
    const observer = new MutationObserver((records) => mutations.push(...records));
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });

    fireEvent.click(screen.getByText('mo-dang-ky'));
    const registerTab = screen.getByRole('button', { name: 'ĐĂNG KÝ' });
    await new Promise((r) => setTimeout(r, 20));
    mutations.push(...observer.takeRecords());
    observer.disconnect();

    expect(registerTab.className).toContain('border-emerald-900');
    expect(mutations.filter((m) => m.target === registerTab)).toHaveLength(0);
  });

  it('deep link ?action=reset-password giữ token', () => {
    window.history.pushState({}, '', '/?action=reset-password&token=tok-123');
    try {
      render(
        <ToastProvider>
          <LedgerApp />
        </ToastProvider>
      );
      expect(screen.getByDisplayValue('tok-123')).toBeInTheDocument();
    } finally {
      window.history.pushState({}, '', '/');
    }
  });
});
