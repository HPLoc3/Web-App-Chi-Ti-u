import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act } from '@testing-library/react';
import { ToastProvider } from '../../../src/context/ToastContext';
import ExpensesTab from '../../../src/features/transactions/components/ExpensesTab';
import { EditExpenseModal } from '../../../src/features/transactions/components/EditExpenseModal';
import { QuickAddExpenseModal } from '../../../src/features/transactions/components/QuickAddExpenseModal';
import { ImportStatementModal } from '../../../src/features/transactions/components/ImportStatementModal';
import { DashboardHero } from '../../../src/features/dashboard/components/DashboardHero';
import { GoalsSummarySection } from '../../../src/features/dashboard/components/GoalsSummarySection';
import GoalsTab from '../../../src/features/goals/components/GoalsTab';
import { WalletsTab } from '../../../src/features/wallets/components/WalletsTab';
import { walletService } from '../../../src/services/api/walletService';

const authMock = vi.hoisted(() => ({ isAuthenticated: false }));
vi.mock('../../../src/context/AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: authMock.isAuthenticated,
    user: authMock.isAuthenticated ? { id: 'u1' } : null,
  }),
}));

const apiError = (message: string) =>
  Object.assign(new Error('Request failed with status code 400'), { response: { data: { message } } });
const type = (el: Element, value: string) => fireEvent.change(el, { target: { value } });
const input = (placeholder: string | RegExp) => screen.getByPlaceholderText(placeholder) as HTMLInputElement;
const click = async (el: Element) => {
  await act(async () => {
    fireEvent.click(el);
  });
};
const button = (name: string | RegExp) => screen.getByRole('button', { name });
const withToast = (ui: React.ReactElement) => render(<ToastProvider>{ui}</ToastProvider>);
const expense = { id: 'e1', amount: 20000, categoryId: 'an_uong', note: 'Cũ', date: '2026-11-01' };

beforeEach(() => {
  window.localStorage.clear();
  authMock.isAuthenticated = false;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('QuickAddExpenseModal', () => {
  it('"45.000" lưu thành 45000; đóng sau khi lưu xong', async () => {
    const onAdd = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    withToast(<QuickAddExpenseModal isOpen onClose={onClose} onAddExpense={onAdd} />);
    type(input('45000'), '45.000');
    await click(button(/Lưu giao dịch ngay/));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ amount: 45000 }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lỗi server: giữ form và số, hiện message, không đóng', async () => {
    const onAdd = vi.fn().mockRejectedValue(apiError('Ví không tồn tại'));
    const onClose = vi.fn();
    withToast(<QuickAddExpenseModal isOpen onClose={onClose} onAddExpense={onAdd} />);
    type(input('45000'), '45000');
    await click(button(/Lưu giao dịch ngay/));
    expect(screen.getByRole('alert')).toHaveTextContent('Ví không tồn tại');
    expect(input('45000').value).toBe('45.000');
    expect(onClose).not.toHaveBeenCalled();
  });

  it.each([
    ['', /nhập số tiền/i],
    ['45.5', /không hợp lệ/i],
    ['0', /lớn hơn 0/i],
  ])('chặn nội dung %j và báo lỗi', async (raw, message) => {
    const onAdd = vi.fn();
    withToast(<QuickAddExpenseModal isOpen onClose={vi.fn()} onAddExpense={onAdd} />);
    type(input('45000'), '12');
    type(input('45000'), raw);
    await act(async () => {
      fireEvent.submit(input('45000').closest('form')!);
    });
    expect(screen.getByRole('alert').textContent).toMatch(message);
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('đang lưu thì không gửi lần hai', async () => {
    const onAdd = vi.fn(() => new Promise<void>(() => {}));
    withToast(<QuickAddExpenseModal isOpen onClose={vi.fn()} onAddExpense={onAdd} />);
    type(input('45000'), '1000');
    const form = input('45000').closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    expect(onAdd).toHaveBeenCalledTimes(1);
  });
});

describe('EditExpenseModal', () => {
  const amountBox = () => screen.getByLabelText('Số tiền (VNĐ)') as HTMLInputElement;

  it('"45.000" lưu thành 45000', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    render(<EditExpenseModal isOpen expense={expense} onClose={onClose} onSave={onSave} />);
    expect(amountBox().value).toBe('20.000');
    type(amountBox(), '45.000');
    await click(button(/Lưu thay đổi/));
    expect(onSave).toHaveBeenCalledWith({ ...expense, amount: 45000 });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('lỗi: giữ modal và số vừa gõ', async () => {
    const onClose = vi.fn();
    render(
      <EditExpenseModal isOpen expense={expense} onClose={onClose} onSave={vi.fn().mockRejectedValue(apiError('Hỏng'))} />
    );
    type(amountBox(), '99000');
    await click(button(/Lưu thay đổi/));
    expect(screen.getByRole('alert')).toHaveTextContent('Hỏng');
    expect(amountBox().value).toBe('99.000');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('xóa trống ô: lưu đúng null, chặn khi gửi', async () => {
    const onSave = vi.fn();
    render(<EditExpenseModal isOpen expense={expense} onClose={vi.fn()} onSave={onSave} />);
    type(amountBox(), '');
    expect(amountBox().value).toBe('');
    await act(async () => {
      fireEvent.submit(amountBox().closest('form')!);
    });
    expect(screen.getByRole('alert').textContent).toMatch(/nhập số tiền/i);
    expect(onSave).not.toHaveBeenCalled();
  });
});

describe('ExpensesTab', () => {
  it('thêm lỗi: giữ số và ghi chú, toast message server', async () => {
    const onAdd = vi.fn().mockRejectedValue(apiError('Máy chủ từ chối'));
    withToast(<ExpensesTab expenses={[]} onAddExpense={onAdd} onDeleteExpense={vi.fn()} />);
    type(input(/Ví dụ: 50.000/), '45000');
    type(input(/Ăn bún chả/), 'phở');
    await click(button(/Lưu khoản chi ngay/));
    expect(screen.getByText('Máy chủ từ chối')).toBeInTheDocument();
    expect(input(/Ví dụ: 50.000/).value).toBe('45.000');
    expect(input(/Ăn bún chả/).value).toBe('phở');
  });

  it('sửa lỗi: modal còn mở, không báo thành công', async () => {
    const onUpdate = vi.fn().mockRejectedValue(apiError('Không sửa được'));
    withToast(
      <ExpensesTab expenses={[expense]} onAddExpense={vi.fn()} onDeleteExpense={vi.fn()} onUpdateExpense={onUpdate} />
    );
    fireEvent.click(screen.getByTitle('Sửa'));
    await click(button(/Lưu thay đổi/));
    expect(screen.getByText('Chỉnh sửa giao dịch')).toBeInTheDocument();
    expect(screen.getByText('Không sửa được')).toBeInTheDocument();
    expect(screen.queryByText(/Đã cập nhật giao dịch/)).toBeNull();
  });

  it('hoàn tác xóa mà thêm lại lỗi: báo lỗi, không rơi promise', async () => {
    const onAdd = vi.fn().mockRejectedValue(apiError('Không hoàn tác được'));
    withToast(<ExpensesTab expenses={[expense]} onAddExpense={onAdd} onDeleteExpense={vi.fn().mockResolvedValue(undefined)} />);
    await click(screen.getByTitle('Xóa'));
    await click(button(/Hoàn tác/));
    expect(screen.getByText('Không hoàn tác được')).toBeInTheDocument();
  });

  it('xuất CSV không đổi thứ tự mảng props và chống công thức', async () => {
    const list = [
      { ...expense, id: 'a', date: '2026-11-01', note: '=1+1' },
      { ...expense, id: 'b', date: '2026-11-05', note: 'thường' },
    ];
    let blob: Blob | undefined;
    vi.spyOn(URL, 'createObjectURL').mockImplementation((b: any) => {
      blob = b;
      return 'blob:x';
    });
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    withToast(<ExpensesTab expenses={list} onAddExpense={vi.fn()} onDeleteExpense={vi.fn()} />);
    fireEvent.click(button(/Xuất CSV/));
    expect(list.map((e) => e.id)).toEqual(['a', 'b']);
    const text = await blob!.text();
    expect(text).toContain("'=1+1");
    expect(text.indexOf('2026-11-05')).toBeLessThan(text.indexOf('2026-11-01'));
  });
});

describe('ImportStatementModal', () => {
  const upload = async (content: string) => {
    const file = new File([content], 'sk.csv', { type: 'text/csv' });
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } });
  };
  const csv = 'Ngày,Nội dung,Ghi nợ,Ghi có\n01/11/2026,Ăn phở,45000,\n02/11/2026,Lương,,9000000\n99/99/2026,x,1,\n';

  it('preview: bỏ tiền vào có đếm, liệt kê dòng lỗi; xác nhận gọi đúng 1 lần', async () => {
    let release!: () => void;
    const onImport = vi.fn(() => new Promise<void>((r) => (release = r)));
    render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={onImport} />);
    expect(screen.getByText(/Nhập sao kê ngân hàng \(CSV \/ TXT\)/)).toBeInTheDocument();
    await upload(csv);
    await screen.findByText('Bỏ qua 1 dòng tiền vào');
    expect(screen.getByText(/Dòng 4:/)).toBeInTheDocument();
    const confirm = button(/Xác nhận nhập \(1 giao dịch\)/);
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(onImport).toHaveBeenCalledTimes(1);
    expect(onImport).toHaveBeenCalledWith([
      { amount: 45000, categoryId: 'an_uong', note: 'Ăn phở', date: '2026-11-01' },
    ]);
    expect(screen.queryByText('Nhập dữ liệu thành công!')).toBeNull();
    await act(async () => release());
    expect(screen.getByText('Nhập dữ liệu thành công!')).toBeInTheDocument();
  });

  it('lỗi khi nhập: ở lại preview, hiện message', async () => {
    const onImport = vi.fn().mockRejectedValue(apiError('Lô bị từ chối'));
    render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={onImport} />);
    await upload(csv);
    await screen.findByText('Ăn phở');
    await click(button(/Xác nhận nhập/));
    expect(screen.getByRole('alert')).toHaveTextContent('Lô bị từ chối');
    expect(screen.getByText('Ăn phở')).toBeInTheDocument();
    expect(screen.queryByText('Nhập dữ liệu thành công!')).toBeNull();
  });

  it('file toàn số dương: hiện rõ giả định coi là chi', async () => {
    render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={vi.fn()} />);
    await upload('Ngày,Nội dung,Số tiền\n01/11/2026,a,1000\n');
    await screen.findByText(/toàn bộ được coi là khoản chi/i);
  });

  it('không dò được cột: lỗi rõ, không sang preview', async () => {
    render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={vi.fn()} />);
    await upload('Ăn sáng 45k');
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/cột/i));
    expect(screen.queryByRole('button', { name: /Xác nhận nhập/ })).toBeNull();
  });

  it('trên 500 dòng: báo giới hạn, khóa xác nhận, không tự chia lô', async () => {
    const onImport = vi.fn();
    render(<ImportStatementModal isOpen onClose={vi.fn()} onImport={onImport} />);
    await upload('Ngày,Nội dung,Số tiền\n' + '01/11/2026,a,1000\n'.repeat(501));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toMatch(/tối đa 500/i));
    expect(button(/Xác nhận nhập/)).toBeDisabled();
    expect(onImport).not.toHaveBeenCalled();
  });
});

describe('DashboardHero thu nhập', () => {
  const renderHero = (onUpdateIncome: (n: number) => Promise<unknown> | void) =>
    render(
      <DashboardHero
        totalBalance={0}
        income={1000000}
        monthlyExpense={0}
        monthlySavings={0}
        savingsRate={0}
        dailyBurnRate={0}
        selectedMonth="2026-11"
        availableMonths={['2026-11']}
        onChangeMonth={vi.fn()}
        onUpdateIncome={onUpdateIncome}
        onOpenQuickAdd={vi.fn()}
      />
    );

  it('Enter lưu "15.000.000" thành 15000000', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderHero(save);
    fireEvent.click(screen.getByTitle('Chỉnh sửa thu nhập'));
    type(input(/VD: 15.000.000/), '15.000.000');
    await act(async () => {
      fireEvent.keyDown(input(/VD: 15.000.000/), { key: 'Enter' });
    });
    expect(save).toHaveBeenCalledWith(15000000);
    expect(screen.queryByPlaceholderText(/VD: 15.000.000/)).toBeNull();
  });

  it('lỗi: giữ ô đang sửa, giữ số, hiện message', async () => {
    renderHero(vi.fn().mockRejectedValue(apiError('Không lưu được thu nhập')));
    fireEvent.click(screen.getByTitle('Chỉnh sửa thu nhập'));
    type(input(/VD: 15.000.000/), '2000000');
    await act(async () => {
      fireEvent.keyDown(input(/VD: 15.000.000/), { key: 'Enter' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Không lưu được thu nhập');
    expect(input(/VD: 15.000.000/).value).toBe('2.000.000');
  });
});

describe('Mục tiêu', () => {
  const goal = { id: 'g1', name: 'Laptop', target: 10000000, current: 0, createdAt: '2026-11-01' };
  const renderTab = (props: Partial<React.ComponentProps<typeof GoalsTab>> = {}) =>
    render(
      <GoalsTab
        expenses={[]}
        goals={[goal]}
        income={0}
        onUpdateIncome={vi.fn()}
        onAddGoal={vi.fn()}
        onUpdateGoalProgress={vi.fn()}
        onDeleteGoal={vi.fn()}
        {...props}
      />
    );

  it('GoalsTab: thêm mục tiêu lỗi thì giữ form và số', async () => {
    const add = vi.fn().mockRejectedValue(apiError('Trùng tên'));
    renderTab({ onAddGoal: add });
    fireEvent.click(button(/Thêm mục tiêu/));
    type(input(/Đổi xe mới/), 'Xe');
    type(input('Ví dụ: 15.000.000'), '15000000');
    await click(button('Lưu mục tiêu'));
    expect(add).toHaveBeenCalledWith({ name: 'Xe', target: 15000000, current: 0 });
    expect(screen.getByRole('alert')).toHaveTextContent('Trùng tên');
    expect(input('Ví dụ: 15.000.000').value).toBe('15.000.000');
  });

  it('GoalsTab: số tiền đã có không hợp lệ thì chặn, không coi là 0', async () => {
    const add = vi.fn();
    renderTab({ onAddGoal: add });
    fireEvent.click(button(/Thêm mục tiêu/));
    type(input(/Đổi xe mới/), 'Xe');
    type(input('Ví dụ: 15.000.000'), '15000000');
    type(input('Ví dụ: 3.000.000'), '3tr');
    await click(button('Lưu mục tiêu'));
    expect(add).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it.each([
    ['200k', 200000],
    ['1.5tr', 1500000],
    ['2,5tr', 2500000],
    ['250.000', 250000],
  ])('nạp số khác %j = %d', async (raw, amount) => {
    const update = vi.fn().mockResolvedValue(undefined);
    renderTab({ onUpdateGoalProgress: update });
    type(input(/Số khác/), raw);
    await act(async () => {
      fireEvent.keyDown(input(/Số khác/), { key: 'Enter' });
    });
    expect(update).toHaveBeenCalledWith('g1', amount);
    expect(input(/Số khác/).value).toBe('');
  });

  it.each(['1.500k', '12abc', '45.5'])('nạp số khác %j bị từ chối', async (raw) => {
    const update = vi.fn();
    renderTab({ onUpdateGoalProgress: update });
    type(input(/Số khác/), raw);
    await act(async () => {
      fireEvent.keyDown(input(/Số khác/), { key: 'Enter' });
    });
    expect(update).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(input(/Số khác/).value).toBe(raw);
  });

  it('nạp số khác lỗi server: giữ số, hiện message', async () => {
    renderTab({ onUpdateGoalProgress: vi.fn().mockRejectedValue(apiError('Không nạp được')) });
    type(input(/Số khác/), '200k');
    await act(async () => {
      fireEvent.keyDown(input(/Số khác/), { key: 'Enter' });
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Không nạp được');
    expect(input(/Số khác/).value).toBe('200k');
  });

  it('GoalsTab: sửa thu nhập, Enter lưu số đã định dạng', async () => {
    const save = vi.fn().mockResolvedValue(undefined);
    renderTab({ onUpdateIncome: save });
    fireEvent.click(button('Sửa'));
    type(input('Nhập thu nhập...'), '12.000.000');
    await act(async () => {
      fireEvent.keyDown(input('Nhập thu nhập...'), { key: 'Enter' });
    });
    expect(save).toHaveBeenCalledWith(12000000);
  });

  it('GoalsSummarySection: tạo lỗi giữ form; thành công gửi số', async () => {
    const add = vi.fn().mockRejectedValueOnce(apiError('Lỗi tạo')).mockResolvedValue(undefined);
    render(<GoalsSummarySection goals={[goal]} onAddGoal={add} onUpdateGoalProgress={vi.fn()} onNavigateToGoals={vi.fn()} />);
    fireEvent.click(button(/Thêm mục tiêu/));
    type(input(/Tên mục tiêu/), 'Quỹ');
    type(input(/Số tiền cần đạt/), '30.000.000');
    await click(button('Lưu mục tiêu'));
    expect(screen.getByRole('alert')).toHaveTextContent('Lỗi tạo');
    expect(input(/Số tiền cần đạt/).value).toBe('30.000.000');
    await click(button('Lưu mục tiêu'));
    expect(add).toHaveBeenLastCalledWith({ name: 'Quỹ', target: 30000000, current: 0 });
    expect(screen.queryByPlaceholderText(/Số tiền cần đạt/)).toBeNull();
  });

  it('GoalsSummarySection: nạp nhanh lỗi thì hiện message', async () => {
    render(
      <GoalsSummarySection
        goals={[goal]}
        onAddGoal={vi.fn()}
        onUpdateGoalProgress={vi.fn().mockRejectedValue(apiError('Nạp lỗi'))}
        onNavigateToGoals={vi.fn()}
      />
    );
    await click(button('+200k'));
    expect(screen.getByRole('alert')).toHaveTextContent('Nạp lỗi');
  });
});

describe('WalletsTab ô tiền', () => {
  it('khách: số dư "1.500.000" lưu 1500000; xóa trống thì chặn', async () => {
    withToast(<WalletsTab />);
    fireEvent.click(button('+ Thêm ví mới'));
    type(input(/VD: Vietcombank/), 'Ví Mới');
    const form = input('0').closest('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });
    expect(screen.getByText('Vui lòng nhập số dư.')).toBeInTheDocument();
    expect(window.localStorage.getItem('so_tay_wallets_data')).toBeNull();
    type(input('0'), '1.500.000');
    await click(button('Tạo ví mới'));
    const saved = JSON.parse(window.localStorage.getItem('so_tay_wallets_data')!);
    expect(saved[saved.length - 1].balance).toBe(1500000);
  });

  it('đăng nhập: số không hợp lệ không được gửi; chuyển tiền gửi số đã đọc', async () => {
    authMock.isAuthenticated = true;
    const w = (id: string, name: string) => ({ id, name, balance: 500000, isDefault: id === 'a', type: 'cash' }) as any;
    vi.spyOn(walletService, 'getWallets').mockResolvedValue([w('a', 'Ví A'), w('b', 'Ví B')]);
    const create = vi.spyOn(walletService, 'createWallet').mockResolvedValue({} as any);
    const transfer = vi.spyOn(walletService, 'transfer').mockResolvedValue({} as any);
    withToast(<WalletsTab />);
    await screen.findByText('Ví A');
    fireEvent.click(button('+ Thêm ví mới'));
    type(input(/VD: Vietcombank/), 'x');
    type(input('0'), '45.5');
    await click(button('Tạo ví mới'));
    expect(create).not.toHaveBeenCalled();
    fireEvent.click(button('Hủy'));
    fireEvent.click(button('Chuyển tiền'));
    type(input('500000'), '45.000');
    await click(button('Xác nhận chuyển'));
    expect(transfer).toHaveBeenCalledWith(expect.objectContaining({ amount: 45000 }));
  });
});
