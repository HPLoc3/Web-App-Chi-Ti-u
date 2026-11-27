import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { ToastProvider } from '../../../src/context/ToastContext';
import OverviewTab from '../../../src/features/dashboard/components/OverviewTab';
import BudgetTab from '../../../src/features/budgets/components/BudgetTab';
import GoalsTab from '../../../src/features/goals/components/GoalsTab';
import { LedgerApp } from '../../../src/app/App';
import { recurringExpenseService } from '../../../src/services/api/recurringExpenseService';
import { expenseService } from '../../../src/services/api/expenseService';
import { apiClient } from '../../../src/lib/apiClient';
import { getBusinessDate } from '../../../src/utils/dateParser';
import { addDays } from '../../../src/utils/recurringSchedule';
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
const apiError = (message: string) => ({ response: { status: 400, data: { error: { message } } } });
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const flush = () => act(async () => new Promise((r) => setTimeout(r, 20)));
const originalConfirm = window.confirm;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  window.confirm = originalConfirm;
  auth.uid = null;
  auth.state = 'ANONYMOUS';
});
beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('so_tay_onboarding_completed', 'true');
});

describe('OverviewTab: ghi tay khoản định kỳ', () => {
  const rec: RecurringExpense = {
    id: 'r1', amount: 500000, categoryId: 'hoa_don', dayOfMonth: 5, note: 'Internet',
    frequency: 'monthly', startDate: '2099-01-05', nextPaymentDate: '2099-01-05', isActive: true,
  };
  const renderOverview = (onAddExpense: any) => {
    const noop = vi.fn();
    render(
      <ToastProvider>
        <OverviewTab
          expenses={[]} goals={[]} income={0} recurringExpenses={[rec]}
          onUpdateIncome={noop} onAddGoal={noop} onUpdateGoalProgress={noop} onDeleteGoal={noop}
          onAddExpense={onAddExpense}
        />
      </ToastProvider>
    );
    return () => fireEvent.click(screen.getByTitle('Ghi nhận ngay vào sổ'));
  };

  it('hỏi trước khi ghi, ghi ngày nghiệp vụ, bấm lại khi đang lưu thì không ghi thêm', async () => {
    const confirm = vi.fn().mockReturnValue(true);
    window.confirm = confirm;
    let release!: () => void;
    const onAdd = vi.fn(() => new Promise<void>((r) => (release = r)));
    const click = renderOverview(onAdd);
    click();
    click();
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ date: today, amount: 500000 }));
    expect(confirm.mock.calls[0][0]).toContain('vẫn được tự ghi vào ngày 05/01');
    await act(async () => release());
    click();
    expect(onAdd).toHaveBeenCalledTimes(2);
    await act(async () => release());
  });

  it('lưu lỗi: hiện thông báo của máy chủ và cho bấm lại', async () => {
    window.confirm = vi.fn().mockReturnValue(true);
    const onAdd = vi.fn().mockRejectedValue(apiError('Ví không đủ điều kiện.'));
    const click = renderOverview(onAdd);
    click();
    expect(await screen.findByText('Ví không đủ điều kiện.')).toBeInTheDocument();
    click();
    await flush();
    expect(onAdd).toHaveBeenCalledTimes(2);
  });
});

describe('BudgetTab: hạn mức danh mục', () => {
  const open = (onUpdate: any, categoryLimits: Record<string, number> = {}) => {
    render(
      <ToastProvider>
        <BudgetTab expenses={[]} categoryLimits={categoryLimits} recurringExpenses={[]} onUpdateCategoryLimit={onUpdate} />
      </ToastProvider>
    );
    fireEvent.click(
      screen.getAllByRole('button', { name: categoryLimits.an_uong ? /^Hạn mức:/ : 'Đặt hạn mức' })[0]
    );
    return screen.getByLabelText(/^Hạn mức cho /) as HTMLInputElement;
  };
  const save = () => fireEvent.click(screen.getByRole('button', { name: 'Lưu hạn mức' }));

  it.each(['-5000', '1000000000000', '12,5'])(
    'nhập %s: không gửi, không bị đổi thành số khác, báo lỗi',
    async (raw) => {
      const onUpdate = vi.fn();
      const input = open(onUpdate);
      type(input, raw);
      expect(input).toHaveValue(raw);
      save();
      expect(await screen.findByText('Số tiền không hợp lệ.')).toBeInTheDocument();
      expect(onUpdate).not.toHaveBeenCalled();
      expect(screen.queryByText(/Đã cập nhật hạn mức/)).toBeNull();
    }
  );

  it('máy chủ từ chối: hiện nguyên văn, giữ ô đang sửa', async () => {
    const onUpdate = vi.fn().mockRejectedValue(apiError('Máy chủ từ chối hạn mức.'));
    const input = open(onUpdate);
    type(input, '2000000');
    expect(input).toHaveValue('2.000.000');
    save();
    expect(await screen.findByText('Máy chủ từ chối hạn mức.')).toBeInTheDocument();
    expect(onUpdate).toHaveBeenCalledWith('an_uong', 2000000);
    expect(screen.getByLabelText(/^Hạn mức cho /)).toHaveValue('2.000.000');
    expect(screen.queryByText(/Đã cập nhật hạn mức/)).toBeNull();
  });

  it('để trống là bỏ hạn mức', async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const input = open(onUpdate, { an_uong: 500000 });
    expect(input).toHaveValue('500.000');
    type(input, '');
    save();
    await waitFor(() => expect(onUpdate).toHaveBeenCalledWith('an_uong', 0));
  });
});

describe('GoalsTab: dự báo tính từ ngày nghiệp vụ hiện tại', () => {
  const forecast = (now: string, target: number) => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(now));
    const noop = vi.fn();
    const { container } = render(
      <GoalsTab
        expenses={[]} income={1000000}
        goals={[{ id: 'g1', name: 'Laptop', target, current: 0, createdAt: '2026-11-01' }]}
        onUpdateIncome={noop} onAddGoal={noop} onUpdateGoalProgress={noop} onDeleteGoal={noop}
      />
    );
    return container.textContent;
  };

  it('3 tháng kể từ 26/11/2026 là tháng 2 năm 2027', () => {
    expect(forecast('2026-11-26T05:00:00Z', 3000000)).toMatch(/3 tháng nữa \(tháng 2 năm 2027\)/);
  });

  it('cuối tháng 1 (giờ Việt Nam) cộng 1 tháng không nhảy sang tháng 3', () => {
    // 18:00 UTC ngày 30/01 = 01:00 ngày 31/01 giờ Việt Nam
    expect(forecast('2027-01-30T18:00:00Z', 1000000)).toMatch(/1 tháng nữa \(tháng 2 năm 2027\)/);
  });
});

describe('App: khoản định kỳ đến hạn hôm nay được ghi ngay sau khi lưu', () => {
  const app = () => (
    <ToastProvider>
      <LedgerApp />
    </ToastProvider>
  );
  const dueItem = (extra: Partial<RecurringExpense> = {}): RecurringExpense => ({
    id: 'r9', amount: 120000, categoryId: 'hoa_don', dayOfMonth: Number(today.slice(8, 10)),
    note: 'Netflix', frequency: 'monthly', startDate: today, nextPaymentDate: today, isActive: true, ...extra,
  });
  const syncResult = (syncedCount: number) => ({ syncedCount, skippedMissed: 0, failedCount: 0, message: 'ok' });
  const openRecurringTab = async () => {
    fireEvent.click((await screen.findAllByRole('button', { name: /Giao dịch định kỳ/ }))[0]);
    await screen.findByText(/Danh Sách Khoản Chi Định Kỳ/);
  };
  const addViaForm = async () => {
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm khoản định kỳ' }));
    type(screen.getByPlaceholderText('VD: Tiền thuê nhà, Tiền điện, Netflix'), 'Netflix');
    type(screen.getByLabelText('Số tiền định kỳ'), '120000');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu khoản định kỳ' }));
  };

  const loggedIn = async (items: RecurringExpense[] = []) => {
    auth.uid = 'u1';
    auth.state = 'AUTHENTICATED';
    vi.spyOn(apiClient, 'get').mockResolvedValue({ data: { success: true, data: [] } } as any);
    const getExpenses = vi.spyOn(expenseService, 'getExpenses').mockResolvedValue([]);
    vi.spyOn(recurringExpenseService, 'getRecurringExpenses').mockResolvedValue(items);
    const sync = vi.spyOn(recurringExpenseService, 'syncRecurring').mockResolvedValue(syncResult(0));
    render(app());
    await openRecurringTab();
    await flush();
    sync.mockClear();
    getExpenses.mockClear();
    return { sync, getExpenses };
  };

  it('tạo mới đến hạn hôm nay: đồng bộ, tải lại giao dịch, báo số đã ghi', async () => {
    const { sync, getExpenses } = await loggedIn();
    vi.spyOn(recurringExpenseService, 'addRecurringExpense').mockResolvedValue(dueItem());
    sync.mockResolvedValue(syncResult(1));
    await addViaForm();
    expect(await screen.findByText('Đã ghi 1 giao dịch định kỳ đến hạn.')).toBeInTheDocument();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(getExpenses).toHaveBeenCalledTimes(1);
  });

  it('kỳ tới ở tương lai: không gọi đồng bộ', async () => {
    const { sync } = await loggedIn();
    vi.spyOn(recurringExpenseService, 'addRecurringExpense').mockResolvedValue(
      dueItem({ nextPaymentDate: addDays(today, 3) })
    );
    await addViaForm();
    expect(await screen.findByText('Đã thêm khoản chi định kỳ!')).toBeInTheDocument();
    await flush();
    expect(sync).not.toHaveBeenCalled();
  });

  it('đồng bộ lỗi: thao tác lưu vẫn thành công, form đóng, không báo lỗi', async () => {
    const { sync } = await loggedIn();
    vi.spyOn(recurringExpenseService, 'addRecurringExpense').mockResolvedValue(dueItem());
    sync.mockRejectedValue(apiError('Hỏng đồng bộ'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await addViaForm();
    expect(await screen.findByText('Đã thêm khoản chi định kỳ!')).toBeInTheDocument();
    await flush();
    expect(sync).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalled();
    expect(screen.queryByText(/Hỏng đồng bộ/)).toBeNull();
    expect(screen.queryByText('Thêm giao dịch định kỳ')).toBeNull();
  });

  it('bật lại khoản đến hạn hôm nay thì đồng bộ; tạm dừng thì không', async () => {
    const paused = dueItem({ isActive: false, nextPaymentDate: undefined });
    const { sync } = await loggedIn([paused]);
    const update = vi.spyOn(recurringExpenseService, 'updateRecurringExpense');
    update.mockResolvedValueOnce(dueItem()).mockResolvedValueOnce(paused);
    fireEvent.click(screen.getByRole('button', { name: 'Đã tạm dừng' }));
    await waitFor(() => expect(sync).toHaveBeenCalledTimes(1));
    await flush();
    // Danh sách tải lại sau đồng bộ trả dữ liệu mock cũ (đang tạm dừng); bấm lại -> kết quả tạm dừng
    fireEvent.click(await screen.findByRole('button', { name: /Đang kích hoạt|Đã tạm dừng/ }));
    await flush();
    expect(update).toHaveBeenCalledTimes(2);
    expect(sync).toHaveBeenCalledTimes(1);
  });

  const stored = () => JSON.parse(window.localStorage.getItem('so_tay_ledger_data')!);
  const guest = async (items: RecurringExpense[]) => {
    window.localStorage.setItem(
      'so_tay_ledger_data',
      JSON.stringify({
        expenses: [], goals: [], income: 0, categoryLimits: {}, budgetTemplate: 'none',
        generatedRecurringMonths: [], recurringExpenses: items,
      })
    );
    const sync = vi.spyOn(recurringExpenseService, 'syncRecurring');
    render(app());
    fireEvent.click(screen.getByRole('button', { name: 'Xem demo' }));
    await openRecurringTab();
    return sync;
  };
  const persisted = () => act(async () => new Promise((r) => setTimeout(r, 600)));

  it('khách tạo khoản đến hạn hôm nay: ghi ngay một lần, không gọi API', async () => {
    const sync = await guest([]);
    await addViaForm();
    expect(await screen.findByText('Đã ghi 1 giao dịch định kỳ đến hạn.')).toBeInTheDocument();
    await persisted();
    expect(stored().expenses).toHaveLength(1);
    expect(stored().expenses[0]).toMatchObject({ date: today, amount: 120000, recurringDueDate: today });
    expect(stored().recurringExpenses[0].nextPaymentDate > today).toBe(true);
    expect(sync).not.toHaveBeenCalled();
  });

  it('khách bật lại khoản đến hạn hôm nay: ghi ngay', async () => {
    await guest([dueItem({ isActive: false })]);
    fireEvent.click(screen.getByRole('button', { name: 'Đã tạm dừng' }));
    expect(await screen.findByText('Đã ghi 1 giao dịch định kỳ đến hạn.')).toBeInTheDocument();
    await persisted();
    expect(stored().expenses).toHaveLength(1);
  });
});
