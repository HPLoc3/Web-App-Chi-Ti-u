import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { ToastProvider } from '../../../src/context/ToastContext';
import { RecurringTab } from '../../../src/features/recurring/components/RecurringTab';
import BudgetTab from '../../../src/features/budgets/components/BudgetTab';
import { UpcomingRecurringSection } from '../../../src/features/dashboard/components/UpcomingRecurringSection';
import { LedgerApp } from '../../../src/app/App';
import { recurringExpenseService } from '../../../src/services/api/recurringExpenseService';
import { expenseService } from '../../../src/services/api/expenseService';
import { apiClient } from '../../../src/lib/apiClient';
import { getBusinessDate } from '../../../src/utils/dateParser';
import type { RecurringExpense } from '../../../src/types';

const auth = vi.hoisted(() => ({ uid: null as string | null, state: 'ANONYMOUS' }));
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: auth.uid ? { uid: auth.uid, email: 'a@b.test', displayName: 'A' } : null,
    authState: auth.state,
    logout: vi.fn(),
    logoutAll: vi.fn(),
    isAuthenticated: !!auth.uid,
    user: auth.uid ? { id: auth.uid } : null,
  }),
}));
vi.mock('../../../src/features/auth/components/GoogleAuthButton', () => ({ GoogleAuthButton: () => null }));

const today = getBusinessDate();
const item: RecurringExpense = {
  id: 'r1',
  amount: 500000,
  categoryId: 'hoa_don',
  dayOfMonth: 5,
  note: 'Internet',
  frequency: 'weekly',
  startDate: '2099-01-02',
  nextPaymentDate: '2099-01-09',
  isActive: true,
};
const apiError = (message: string) => ({ response: { status: 400, data: { error: { message } } } });
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  auth.uid = null;
  auth.state = 'ANONYMOUS';
});
beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('so_tay_onboarding_completed', 'true');
});

const renderTab = (props: Partial<React.ComponentProps<typeof RecurringTab>> = {}) => {
  const handlers = {
    onAddRecurringExpense: vi.fn().mockResolvedValue(undefined),
    onUpdateRecurringExpense: vi.fn().mockResolvedValue(undefined),
    onDeleteRecurringExpense: vi.fn().mockResolvedValue(undefined),
  };
  render(
    <ToastProvider>
      <RecurringTab recurringExpenses={[item]} {...handlers} {...props} />
    </ToastProvider>
  );
  return handlers;
};

describe('RecurringTab', () => {
  it('hiện kỳ kế tiếp theo nextPaymentDate và quy đổi chi phí tuần ra tháng', () => {
    renderTab();
    expect(screen.getByText(/Kỳ tới 09\/01\/2099/)).toBeInTheDocument();
    expect(screen.getByText('Thứ 6 hàng tuần')).toBeInTheDocument();
    expect(document.body.textContent).toContain('2.166.667');
  });

  it('bật/tạm dừng gọi cập nhật thật; khoản tạm dừng không tính vào tổng', async () => {
    const h = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Đang kích hoạt' }));
    await waitFor(() => expect(h.onUpdateRecurringExpense).toHaveBeenCalledWith({ ...item, isActive: false }));
    cleanup();
    const h2 = renderTab({ recurringExpenses: [{ ...item, isActive: false, nextPaymentDate: undefined }] });
    expect(screen.getByText('0 khoản đang kích hoạt (quy đổi theo tháng)')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Đã tạm dừng' }));
    await waitFor(() =>
      expect(h2.onUpdateRecurringExpense).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }))
    );
  });

  it('sửa: điền sẵn, gửi đủ tần suất và ngày bắt đầu', async () => {
    const h = renderTab();
    fireEvent.click(screen.getByRole('button', { name: 'Sửa Internet' }));
    expect(screen.getByLabelText('Số tiền định kỳ')).toHaveValue('500.000');
    expect(screen.getByLabelText('Ngày bắt đầu')).toHaveValue('2099-01-02');
    type(screen.getByLabelText('Số tiền định kỳ'), '600000');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu khoản định kỳ' }));
    await waitFor(() =>
      expect(h.onUpdateRecurringExpense).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'r1', amount: 600000, frequency: 'weekly', startDate: '2099-01-02' })
      )
    );
    await waitFor(() => expect(screen.queryByText('Sửa giao dịch định kỳ')).toBeNull());
  });

  it('lỗi API hiện nguyên văn và giữ form', async () => {
    const h = renderTab({
      onAddRecurringExpense: vi.fn().mockRejectedValue(apiError('Số tiền tối đa là 999.999.999.999 ₫.')),
    });
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản định kỳ' }));
    type(screen.getByPlaceholderText('VD: Tiền thuê nhà, Tiền điện, Netflix'), 'Netflix');
    type(screen.getByLabelText('Số tiền định kỳ'), '100000');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu khoản định kỳ' }));
    expect(await screen.findByText('Số tiền tối đa là 999.999.999.999 ₫.')).toBeInTheDocument();
    expect(screen.getByLabelText('Số tiền định kỳ')).toHaveValue('100.000');
    expect(h.onUpdateRecurringExpense).not.toHaveBeenCalled();
  });

  it('số tiền không hợp lệ thì chặn gửi', () => {
    const h = renderTab();
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản định kỳ' }));
    type(screen.getByLabelText('Số tiền định kỳ'), '12,5');
    fireEvent.submit(screen.getByLabelText('Số tiền định kỳ').closest('form')!);
    expect(h.onAddRecurringExpense).not.toHaveBeenCalled();
    expect(screen.getByText('Vui lòng nhập số tiền hợp lệ lớn hơn 0.')).toBeInTheDocument();
  });

  it('hiện lỗi tải danh sách', () => {
    renderTab({ loadError: 'Không thể kết nối máy chủ.' });
    expect(screen.getByRole('alert')).toHaveTextContent('Không thể kết nối máy chủ.');
  });
});

describe('BudgetTab định kỳ', () => {
  const renderBudget = (props: Record<string, unknown>) =>
    render(
      <ToastProvider>
        <BudgetTab expenses={[]} categoryLimits={{}} recurringExpenses={[]} {...props} />
      </ToastProvider>
    );
  const fill = () => {
    type(screen.getByLabelText('Số tiền định kỳ'), '220000');
    type(screen.getByPlaceholderText('VD: Tiền nhà, Internet FPT, iCloud...'), 'iCloud');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ định kỳ' }));
  };

  it('gửi ngày bắt đầu và tần suất; chỉ xóa form khi lưu được', async () => {
    const onAdd = vi.fn().mockRejectedValueOnce(apiError('Máy chủ bận.')).mockResolvedValue(undefined);
    renderBudget({ onAddRecurringExpense: onAdd });
    fill();
    expect(await screen.findByText('Máy chủ bận.')).toBeInTheDocument();
    expect(screen.getByLabelText('Số tiền định kỳ')).toHaveValue('220.000');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu dịch vụ định kỳ' }));
    await waitFor(() => expect(screen.getByLabelText('Số tiền định kỳ')).toHaveValue(''));
    expect(onAdd).toHaveBeenLastCalledWith(
      expect.objectContaining({ amount: 220000, frequency: 'monthly', startDate: today, isActive: true })
    );
  });

  it('nút ghi khoản đến hạn và đổi mẫu không báo thành công giả khi lỗi', async () => {
    renderBudget({
      onTriggerManualRecurringSync: vi.fn().mockRejectedValue(apiError('Lỗi đồng bộ.')),
      onUpdateTemplate: vi.fn().mockRejectedValue(apiError('Không lưu được mẫu.')),
    });
    fireEvent.click(screen.getByRole('button', { name: /Ghi khoản đến hạn/ }));
    expect(await screen.findByText('Lỗi đồng bộ.')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Mẫu 10-20-70'));
    expect(await screen.findByText('Không lưu được mẫu.')).toBeInTheDocument();
    expect(screen.queryByText(/Đã đồng bộ|Đã áp dụng/)).toBeNull();
  });
});

describe('UpcomingRecurringSection', () => {
  it('bỏ khoản tạm dừng, quy đổi tổng tháng, hỏi trước khi ghi tay', () => {
    const onQuick = vi.fn();
    const confirm = vi.fn().mockReturnValue(false);
    window.confirm = confirm;
    render(
      <UpcomingRecurringSection
        recurringExpenses={[item, { ...item, id: 'r2', note: 'Gym', isActive: false }]}
        onQuickRecordRecurring={onQuick}
      />
    );
    expect(screen.queryByText('Gym')).toBeNull();
    expect(document.body.textContent).toContain('2.166.667₫/tháng');
    fireEvent.click(screen.getByTitle('Ghi nhận ngay vào sổ'));
    expect(onQuick).not.toHaveBeenCalled();
    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByTitle('Ghi nhận ngay vào sổ'));
    expect(onQuick).toHaveBeenCalledTimes(1);
  });
});

describe('App: tự đồng bộ khoản định kỳ khi mở', () => {
  const result = (syncedCount: number, skippedMissed = 0) => ({
    syncedCount,
    skippedMissed,
    failedCount: 0,
    message: 'ok',
  });
  const mockApi = () => {
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    return {
      expenses: vi.spyOn(expenseService, 'getExpenses').mockResolvedValue([]),
      list: vi.spyOn(recurringExpenseService, 'getRecurringExpenses').mockResolvedValue([]),
    };
  };
  const app = () => (
    <React.StrictMode>
      <ToastProvider>
        <LedgerApp />
      </ToastProvider>
    </React.StrictMode>
  );
  const flush = () => act(async () => new Promise((r) => setTimeout(r, 20)));

  it('gọi đúng một lần mỗi tài khoản, tải lại giao dịch và báo kỳ bỏ qua', async () => {
    auth.uid = 'u1';
    auth.state = 'AUTHENTICATED';
    mockApi();
    let release!: (v: any) => void;
    const sync = vi
      .spyOn(recurringExpenseService, 'syncRecurring')
      .mockImplementationOnce(() => new Promise((r) => (release = r)))
      .mockResolvedValue(result(0));
    const spies = { expenses: vi.mocked(expenseService.getExpenses) };

    const view = render(app());
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    const before = spies.expenses.mock.calls.length;
    await act(async () => release(result(2, 3)));
    expect(await screen.findByText('Đã ghi 2 giao dịch định kỳ đến hạn.')).toBeInTheDocument();
    expect(screen.getByText(/Bỏ qua 3 kỳ/)).toBeInTheDocument();
    expect(spies.expenses.mock.calls.length).toBe(before + 1);

    view.rerender(app());
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);

    auth.uid = 'u2';
    view.rerender(app());
    await flush();
    expect(sync).toHaveBeenCalledTimes(2);
  });

  it('chưa xác thực xong thì chưa gọi; lỗi đồng bộ im lặng, có log, không chặn app', async () => {
    auth.uid = 'u1';
    auth.state = 'LOADING';
    mockApi();
    const sync = vi.spyOn(recurringExpenseService, 'syncRecurring').mockRejectedValue(apiError('Hỏng đồng bộ'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const view = render(app());
    await flush();
    expect(sync).not.toHaveBeenCalled();
    auth.state = 'AUTHENTICATED';
    view.rerender(app());
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(screen.queryByText(/Hỏng đồng bộ/)).toBeNull();
    expect(screen.queryByText('Đang xác thực tài khoản...')).toBeNull();
  });

  it('chế độ khách: ghi khoản đến hạn một lần bằng cùng hàm lịch, không gọi API', async () => {
    const sync = vi.spyOn(recurringExpenseService, 'syncRecurring');
    window.localStorage.setItem(
      'so_tay_ledger_data',
      JSON.stringify({
        expenses: [],
        goals: [],
        income: 0,
        categoryLimits: {},
        budgetTemplate: 'none',
        generatedRecurringMonths: [],
        recurringExpenses: [{ ...item, frequency: 'monthly', startDate: today, nextPaymentDate: today }],
      })
    );
    render(app());
    expect(await screen.findByText('Đã ghi 1 giao dịch định kỳ đến hạn.')).toBeInTheDocument();
    await act(async () => new Promise((r) => setTimeout(r, 600)));
    const saved = JSON.parse(window.localStorage.getItem('so_tay_ledger_data')!);
    expect(saved.expenses).toHaveLength(1);
    expect(saved.expenses[0]).toMatchObject({ recurringId: 'r1', recurringDueDate: today, date: today });
    expect(saved.recurringExpenses[0].nextPaymentDate > today).toBe(true);
    expect(sync).not.toHaveBeenCalled();
  });
});
