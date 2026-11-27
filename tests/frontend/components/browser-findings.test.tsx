import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { WalletsTab } from '../../../src/features/wallets/components/WalletsTab';
import { ToastProvider } from '../../../src/context/ToastContext';
import GoalsTab from '../../../src/features/goals/components/GoalsTab';
import { DashboardHero } from '../../../src/features/dashboard/components/DashboardHero';
import { ImportStatementModal } from '../../../src/features/transactions/components/ImportStatementModal';
import { walletService } from '../../../src/services/api';
import BudgetProgressCard from '../../../src/features/dashboard/components/BudgetProgressCard';
import OnboardingModal from '../../../src/components/common/OnboardingModal';
import LandingNavbar from '../../../src/components/landing/LandingNavbar';
import LandingPage from '../../../src/components/layout/LandingPage';
import AiCopilotSection from '../../../src/components/landing/AiCopilotSection';
import { SettingsTab } from '../../../src/features/settings/components/SettingsTab';
import { FitText } from '../../../src/components/common/FitText';

vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({ isAuthenticated: true, user: { id: 'u1' } }),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Header landing', () => {
  it('khách luôn có nút Xem Demo (có tên truy cập) và Đăng nhập', () => {
    const onDemo = vi.fn();
    render(<LandingNavbar onOpenLogin={vi.fn()} onOpenRegister={vi.fn()} onStartDemo={onDemo} isLoggedIn={false} />);
    const demo = screen.getByRole('button', { name: 'Xem Demo' });
    // Không bị ẩn ở bất kỳ breakpoint nào từ sm trở lên
    expect(demo.className).not.toMatch(/(?:^|\s)(?:md|lg|xl|2xl):hidden/);
    fireEvent.click(demo);
    expect(onDemo).toHaveBeenCalled();
    // Dưới sm: cả hai nằm trong menu thu gọn
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu điều hướng' }));
    expect(screen.getByRole('button', { name: /Xem Demo trải nghiệm ngay/ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /Đăng nhập/ })).toHaveLength(2);
  });
});

describe('FitText', () => {
  const textStyle = (supported: boolean) => {
    vi.stubGlobal('CSS', { supports: () => supported });
    render(<FitText text="999.999.999.999₫" />);
    return screen.getByText('999.999.999.999₫');
  };

  it('hỗ trợ cqi: một dòng, co theo khung', () => {
    const el = textStyle(true);
    expect(el.className).toContain('whitespace-nowrap');
    // happy-dom không giữ giá trị chứa cqi nên đọc từ markup tĩnh
    expect(renderToStaticMarkup(<FitText text="999.999.999.999₫" />)).toContain('cqi)');
  });

  it('không hỗ trợ cqi: cỡ tối đa và cho xuống dòng', () => {
    const el = textStyle(false);
    expect(el.className).toContain('[overflow-wrap:anywhere]');
    expect(el.className).not.toContain('whitespace-nowrap');
    expect(el.style.fontSize).toBe('var(--fit-max, 1.25rem)');
  });
});

describe('Xóa ví còn giao dịch', () => {
  const wallet = (id: string, transactionCount?: number): any => ({
    id, name: `Ví ${id}`, balance: 1000, currency: 'VND', isDefault: id === 'A', type: 'cash', transactionCount,
  });
  const mount = async () => {
    render(
      <ToastProvider>
        <WalletsTab />
      </ToastProvider>
    );
    await screen.findByRole('heading', { name: 'Ví A' });
  };

  it('báo ngay lý do, không hỏi xác nhận, không gọi API xóa', async () => {
    vi.spyOn(walletService, 'getWallets').mockResolvedValue([wallet('A', 0), wallet('B', 3)]);
    const del = vi.spyOn(walletService, 'deleteWallet').mockResolvedValue(undefined as any);
    await mount();
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
    expect(screen.getByText('Không thể xóa ví "Ví B" vì ví còn 3 giao dịch.')).toBeInTheDocument();
    expect(screen.queryByText(/Bạn có chắc muốn xóa ví/)).toBeNull();
    expect(del).not.toHaveBeenCalled();
  });

  it('số cũ còn giao dịch nhưng tải lại đã hết: cho xác nhận và xóa được', async () => {
    const list = vi
      .spyOn(walletService, 'getWallets')
      .mockResolvedValueOnce([wallet('A', 0), wallet('B', 3)])
      .mockResolvedValue([wallet('A', 0), wallet('B', 0)]);
    const del = vi.spyOn(walletService, 'deleteWallet').mockResolvedValue(undefined as any);
    await mount();
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
    expect(list).toHaveBeenCalledTimes(2);
    expect(screen.queryByText(/Không thể xóa ví/)).toBeNull();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Xóa' })));
    expect(del).toHaveBeenCalledWith('B');
  });

  it('tải lại thấy ví không còn: báo cho người dùng, không hỏi xác nhận', async () => {
    vi.spyOn(walletService, 'getWallets')
      .mockResolvedValueOnce([wallet('A', 0), wallet('B', 3)])
      .mockResolvedValue([wallet('A', 0)]);
    await mount();
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
    expect(screen.getByText('Ví này không còn tồn tại.')).toBeInTheDocument();
    expect(screen.queryByText(/Bạn có chắc muốn xóa ví/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ví B' })).toBeNull();
  });

  it('tải lại lỗi: không tự chặn, để server quyết định', async () => {
    vi.spyOn(walletService, 'getWallets')
      .mockResolvedValueOnce([wallet('A', 0), wallet('B', 3)])
      .mockRejectedValue(new Error('mạng'));
    await mount();
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
    expect(screen.getByText(/Bạn có chắc muốn xóa ví/)).toBeInTheDocument();
    expect(screen.queryByText(/Không thể xóa ví/)).toBeNull();
  });

  it.each([0, undefined])('số giao dịch %s: vẫn hỏi xác nhận, server từ chối thì hiện lỗi server', async (count) => {
    vi.spyOn(walletService, 'getWallets').mockResolvedValue([wallet('A', 0), wallet('B', count)]);
    vi.spyOn(walletService, 'deleteWallet').mockRejectedValue({
      response: { data: { error: { code: 'WALLET_HAS_TRANSACTIONS', message: 'Ví còn 1 giao dịch nên không xóa được.' } } },
    });
    await mount();
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
    expect(screen.getByText(/Bạn có chắc muốn xóa ví/)).toBeInTheDocument();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Xóa' })));
    expect(screen.getByText('Ví còn 1 giao dịch nên không xóa được.')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ví B' })).toBeInTheDocument();
  });
});

const goalsTab = (income: number, onUpdateIncome = vi.fn()) =>
  render(
    <GoalsTab
      expenses={[]}
      goals={[{ id: 'g', name: 'Quỹ', target: 10, current: 1, createdAt: '2026-10-31T18:00:00.000Z' }]}
      income={income}
      onUpdateIncome={onUpdateIncome}
      onAddGoal={vi.fn()}
      onUpdateGoalProgress={vi.fn()}
      onDeleteGoal={vi.fn()}
    />
  );

describe('Mục tiêu: thu nhập', () => {
  it('chưa nhập thu nhập thì ghi "Chưa nhập", không ghi 0₫; ngày tạo theo giờ Việt Nam', () => {
    const { container } = goalsTab(0);
    expect(screen.getByText('Chưa nhập')).toBeInTheDocument();
    expect(container.textContent).toContain('Thiết lập ngày: 01/11/2026');
    expect(screen.getByText('Thu nhập hằng tháng').closest('div.rounded-lg')!.textContent).not.toContain('0₫');
  });

  it.each(['nút Hủy', 'Escape'])('%s đóng ô sửa mà không lưu', (how) => {
    const onUpdate = vi.fn();
    goalsTab(5_000_000, onUpdate);
    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }));
    const input = screen.getByLabelText('Thu nhập hằng tháng');
    fireEvent.change(input, { target: { value: '9000000' } });
    if (how === 'Escape') fireEvent.keyDown(input, { key: 'Escape' });
    else fireEvent.click(screen.getByRole('button', { name: 'Hủy' }));
    expect(screen.queryByLabelText('Thu nhập hằng tháng')).toBeNull();
    expect(screen.getAllByText('5.000.000₫').length).toBeGreaterThan(0);
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('Tổng quan: nút lưu/hủy thu nhập', () => {
  it('có tên truy cập, vùng bấm 40px; Hủy và Escape không lưu', () => {
    const onUpdate = vi.fn();
    render(
      <DashboardHero
        totalBalance={0} income={0} monthlyExpense={0} monthlySavings={0} savingsRate={0} dailyBurnRate={0}
        selectedMonth="2026-11" availableMonths={['2026-11']} onChangeMonth={vi.fn()}
        onUpdateIncome={onUpdate} onOpenQuickAdd={vi.fn()}
      />
    );
    for (const how of ['button', 'Escape']) {
      fireEvent.click(screen.getByRole('button', { name: 'Nhập thu nhập tháng' }));
      for (const name of ['Lưu thu nhập', 'Hủy sửa thu nhập']) {
        expect(screen.getByRole('button', { name }).className).toMatch(/\bw-10 h-10\b/);
      }
      if (how === 'Escape') fireEvent.keyDown(screen.getByLabelText('Thu nhập tháng'), { key: 'Escape' });
      else fireEvent.click(screen.getByRole('button', { name: 'Hủy sửa thu nhập' }));
      expect(screen.queryByLabelText('Thu nhập tháng')).toBeNull();
    }
    expect(onUpdate).not.toHaveBeenCalled();
  });
});

describe('Xem trước sao kê', () => {
  it('hiện dd/MM/yyyy nhưng gửi đi giữ nguyên yyyy-MM-dd', async () => {
    const onImport = vi.fn();
    const { container } = render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={onImport} />);
    const file = new File(['Ngày,Nội dung,Số tiền\n25/11/2026,COM TAM chuyen tien,45000'], 'a.csv');
    fireEvent.change(container.querySelector('input[type="file"]')!, { target: { files: [file] } });
    await screen.findByText('25/11/2026');
    expect(container.textContent).not.toContain('2026-11-25');
    await act(async () => fireEvent.click(screen.getByRole('button', { name: /Xác nhận nhập/ })));
    await waitFor(() => expect(onImport).toHaveBeenCalled());
    expect(onImport.mock.calls[0][0][0]).toMatchObject({ date: '2026-11-25', categoryId: 'an_uong' });
  });
});

describe('Thẻ tiến độ ngân sách', () => {
  const card = (categoryLimits: Record<string, number>, income = 1_000_000) => {
    const expenses = [
      { categoryId: 'an_uong', amount: 5_000 },
      { categoryId: 'mua_sam', amount: 995_000 },
    ];
    return render(
      <BudgetProgressCard
        categoryLimits={categoryLimits} expensesThisMonth={expenses} income={income}
        totalExpenseThisMonth={1_000_000} onNavigateToBudget={vi.fn()}
      />
    ).container.textContent;
  };

  it('có hạn mức danh mục: chỉ tính chi của danh mục có hạn mức và ghi rõ', () => {
    const text = card({ an_uong: 10_000 });
    expect(text).toContain('Đã dùng trong các danh mục có hạn mức');
    expect(text).toContain('5.000₫ / 10.000₫ (50%)');
  });

  it('chưa đặt hạn mức: so tổng chi với thu nhập', () => {
    expect(card({}, 2_000_000)).toContain('1.000.000₫ / 2.000.000₫ (50%)');
  });
});

describe('Huy hiệu % thu nhập', () => {
  it.each([
    [1_000, '0,1% thu nhập'],
    [1_001_000, '100,1% thu nhập'],
    [200_200_700_000, '20.020.070,0% thu nhập'],
  ])('chi %s trên thu nhập 1.000.000', (expense, badge) => {
    render(
      <DashboardHero
        totalBalance={0} income={1_000_000} monthlyExpense={expense} monthlySavings={1_000_000 - expense}
        savingsRate={0} dailyBurnRate={0} selectedMonth="2026-11" availableMonths={['2026-11']}
        onChangeMonth={vi.fn()} onUpdateIncome={vi.fn()} onOpenQuickAdd={vi.fn()}
      />
    );
    expect(screen.getByText(badge)).toBeInTheDocument();
  });
});

describe('Onboarding bước dữ liệu', () => {
  const lastStep = (isGuest: boolean) => {
    const { container } = render(<OnboardingModal isOpen onClose={vi.fn()} isGuest={isGuest} />);
    fireEvent.click(screen.getByTitle('Chuyển đến bước 4'));
    expect(container.textContent).not.toMatch(/Firebase|Firestore|Xóa dữ liệu mẫu/);
    return container.textContent;
  };
  it('khách: nói về dữ liệu mẫu lưu trên trình duyệt', () => {
    expect(lastStep(true)).toContain('chỉ lưu trên trình duyệt này');
  });
  it('tài khoản: không nói đã nạp dữ liệu mẫu', () => {
    const text = lastStep(false);
    expect(text).toContain('sổ tay mới bắt đầu trống');
    expect(text).not.toContain('3 tuần dữ liệu mẫu');
  });
});

describe('Xóa ví đã bị xóa ở nơi khác', () => {
  const wallet = (id: string): any => ({
    id, name: `Ví ${id}`, balance: 0, currency: 'VND', isDefault: id === 'A', type: 'cash', transactionCount: 0,
  });
  const mountAndDelete = async () => {
    render(
      <ToastProvider>
        <WalletsTab />
      </ToastProvider>
    );
    await screen.findByRole('heading', { name: 'Ví B' });
    await act(async () => fireEvent.click(screen.getAllByTitle('Xóa ví')[1]));
  };

  it('ví trống đã mất: tải lại trước khi hỏi, báo và bỏ thẻ', async () => {
    vi.spyOn(walletService, 'getWallets')
      .mockResolvedValueOnce([wallet('A'), wallet('B'), wallet('C')])
      .mockResolvedValue([wallet('A'), wallet('C')]);
    await mountAndDelete();
    expect(screen.getByText('Ví này không còn tồn tại.')).toBeInTheDocument();
    expect(screen.queryByText(/Bạn có chắc muốn xóa ví/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ví B' })).toBeNull();
  });

  it('DELETE trả 404: tải lại danh sách và báo ví không còn', async () => {
    const list = vi
      .spyOn(walletService, 'getWallets')
      .mockResolvedValueOnce([wallet('A'), wallet('B'), wallet('C')])
      .mockResolvedValueOnce([wallet('A'), wallet('B'), wallet('C')])
      .mockResolvedValue([wallet('A'), wallet('C')]);
    vi.spyOn(walletService, 'deleteWallet').mockRejectedValue({
      response: { status: 404, data: { error: { message: 'Không tìm thấy ví hoặc bạn không có quyền truy cập.' } } },
    });
    await mountAndDelete();
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Xóa' })));
    expect(screen.getByText('Ví này không còn tồn tại.')).toBeInTheDocument();
    expect(screen.queryByText(/Không tìm thấy ví/)).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Ví B' })).toBeNull();
    expect(list).toHaveBeenCalledTimes(3);
  });
});

describe('Landing: không quảng cáo điều không có', () => {
  it('không nói tới offline, HttpOnly/chống XSS, xóa tài khoản hay Firebase', () => {
    const onDemo = vi.fn();
    const onTryChatbot = vi.fn();
    const { container } = render(
      <LandingPage
        onOpenLogin={vi.fn()} onOpenRegister={vi.fn()} onStartDemo={onDemo} onTryChatbot={onTryChatbot}
        isLoggedIn={false}
      />
    );
    expect(container.textContent).not.toMatch(/offline|mất mạng|HttpOnly|XSS|đánh cắp token|xóa tài khoản|Firebase|trọn đời|giọng|gõ hoặc nói/i);
    fireEvent.click(screen.getByRole('button', { name: 'Mở app để thử câu của bạn' }));
    expect(onTryChatbot).toHaveBeenCalled();
    expect(onDemo).not.toHaveBeenCalled();
  });
});

describe('Cài đặt: chỉ nói đúng những gì có thật', () => {
  const state: any = {
    expenses: [], goals: [], recurringExpenses: [], income: 0, categoryLimits: {}, budgetTemplate: 'none',
  };
  const open = (section: string | null, currentUser: any = null) => {
    const utils = render(
      <ToastProvider>
        <SettingsTab currentUser={currentUser} state={state} onLogout={vi.fn()} />
      </ToastProvider>
    );
    if (section) fireEvent.click(screen.getByText(section));
    return utils;
  };

  it('khách: không hứa đồng bộ Cloud', () => {
    const { container } = open(null);
    expect(container.textContent).toContain('dữ liệu dùng thử không tự chuyển sang tài khoản');
    expect(container.textContent).not.toMatch(/đồng bộ|Cloud/i);
  });

  it.each(['local', 'google'])('tài khoản %s: không gắn huy hiệu đã xác thực', (provider) => {
    const { container } = open(null, { id: 'u', email: 'a@b.vn', displayName: 'An', provider });
    expect(container.textContent).not.toMatch(/Đã xác thực|đã xác minh/i);
  });

  it('tiền tệ và ngưỡng cảnh báo bị khóa, ghi "Sắp có", không báo đã lưu', () => {
    const { container } = open('Tùy chọn ứng dụng');
    expect(screen.getByLabelText(/Đơn vị tiền tệ chính/)).toBeDisabled();
    expect(screen.getByLabelText(/Ngưỡng cảnh báo ngân sách/)).toBeDisabled();
    const save = screen.getByRole('button', { name: /Lưu tùy chọn/ });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(screen.getAllByText('Sắp có')).toHaveLength(3);
    expect(container.textContent).not.toMatch(/Đã lưu tùy chọn|sẽ chuyển màu cảnh báo/);
  });

  it('xuất JSON: nói rõ không gồm ví', () => {
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const { container } = open('Quản lý dữ liệu');
    fireEvent.click(screen.getByRole('button', { name: /Xuất tệp JSON/ }));
    expect(screen.getByText(/ra tệp JSON \(không gồm ví\)/)).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/toàn bộ dữ liệu|Toàn Bộ Dữ Liệu|tất cả/i);
  });

  it('tích hợp: không có nhãn trạng thái viết cứng', () => {
    const { container } = open('Tích hợp & AI');
    expect(container.textContent).not.toMatch(/Đang hoạt động|Sẵn sàng/);
  });
});

describe('Nút "Mở app để thử câu của bạn"', () => {
  it('không có handler thì không hiện nút', () => {
    render(<AiCopilotSection />);
    expect(screen.queryByRole('button', { name: 'Mở app để thử câu của bạn' })).toBeNull();
  });
});
