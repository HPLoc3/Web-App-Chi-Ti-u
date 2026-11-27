import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import AuthModal from '../../../src/features/auth/components/AuthModal';
import { ToastProvider } from '../../../src/context/ToastContext';
import { ReportsTab } from '../../../src/features/reports/components/ReportsTab';
import { getBusinessDate } from '../../../src/utils/dateParser';
import { AppState } from '../../../src/types';

const auth = {
  loginWithEmail: vi.fn(),
  registerWithEmail: vi.fn(),
  loginWithGoogle: vi.fn(),
  resetPassword: vi.fn(),
  resetPasswordWithToken: vi.fn(),
};
vi.mock('../../../src/hooks/useAuth', () => ({ useAuth: () => auth }));

let googleError: (msg: string) => void = () => {};
vi.mock('../../../src/features/auth/components/GoogleAuthButton', () => ({
  GoogleAuthButton: ({ onError }: { onError: (msg: string) => void }) => {
    googleError = onError;
    return null;
  },
}));

beforeEach(() => vi.resetAllMocks());
afterEach(cleanup);

type Tab = 'login' | 'register' | 'forgot' | 'reset';

/** Giống App.tsx: đóng modal là unmount, ToastProvider vẫn còn */
const Host = ({ tab }: { tab: Tab }) => {
  const [open, setOpen] = React.useState(true);
  return (
    <ToastProvider>
      {open && <AuthModal isOpen defaultTab={tab} onClose={() => setOpen(false)} />}
    </ToastProvider>
  );
};

const type = (placeholder: string, value: string, index = 0) =>
  fireEvent.change(screen.getAllByPlaceholderText(placeholder)[index], { target: { value } });

const flows: Array<{ tab: Tab; mock: keyof typeof auth; submit: () => void }> = [
  {
    tab: 'login',
    mock: 'loginWithEmail',
    submit: () => {
      type('tenban@domain.com', 'a@b.vn');
      type('••••••••', 'saimatkhau1');
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập vào sổ tay/ }));
    },
  },
  {
    tab: 'register',
    mock: 'registerWithEmail',
    submit: () => {
      type('Nguyễn Văn A', 'An');
      type('tenban@domain.com', 'a@b.vn');
      type('••••••••', 'matkhau123');
      type('Nhập lại chính xác mật khẩu', 'matkhau123');
      fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/ }));
    },
  },
  {
    tab: 'forgot',
    mock: 'resetPassword',
    submit: () => {
      type('nhap.email@domain.com', 'a@b.vn');
      fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    },
  },
  {
    tab: 'reset',
    mock: 'resetPasswordWithToken',
    submit: () => {
      type('Dán mã Token từ email', 'tok');
      type('••••••••', 'matkhau123');
      type('Nhập lại mật khẩu mới', 'matkhau123');
      fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    },
  },
];

const expectOnce = (msg: string) => expect(screen.getAllByText(msg)).toHaveLength(1);
const expectInlineOnly = (msg: string) => {
  expectOnce(msg);
  expect(screen.getByRole('alert')).toHaveTextContent(msg);
};

describe('AuthModal: mỗi lỗi chỉ hiện một chỗ', () => {
  it.each(flows)('$tab: server trả lỗi', async ({ tab, mock, submit }) => {
    auth[mock].mockRejectedValue(new Error('Lỗi từ server.'));
    render(<Host tab={tab} />);
    await act(async () => submit());
    expectInlineOnly('Lỗi từ server.');
  });

  it('đăng nhập bỏ trống', async () => {
    const { container } = render(<Host tab="login" />);
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expectInlineOnly('Vui lòng nhập đầy đủ Email và Mật khẩu.');
  });

  it('lỗi Google', async () => {
    render(<Host tab="login" />);
    await act(async () => googleError('Google lỗi.'));
    expectInlineOnly('Google lỗi.');
  });

  it.each(flows)('$tab: đóng modal khi đang gửi thì lỗi hiện bằng toast', async ({ tab, mock, submit }) => {
    let reject!: (e: Error) => void;
    auth[mock].mockReturnValue(new Promise((_r, j) => (reject = j)));
    render(<Host tab={tab} />);
    await act(async () => submit());
    fireEvent.click(screen.getByTitle('Đóng modal'));
    await act(async () => reject(new Error('Lỗi đến muộn.')));
    expectOnce('Lỗi đến muộn.');
  });

  it('lỗi Google đến sau khi đóng modal vẫn hiện bằng toast', async () => {
    render(<Host tab="login" />);
    const lateError = googleError;
    fireEvent.click(screen.getByTitle('Đóng modal'));
    await act(async () => lateError('Google lỗi muộn.'));
    expectOnce('Google lỗi muộn.');
  });
});

describe('ReportsTab: Phân bổ dòng tiền', () => {
  const month = getBusinessDate().slice(0, 7);
  const makeState = (amount: number, income: number) =>
    ({
      expenses: [{ id: 'e', amount, categoryId: 'khac', note: 'x', date: `${month}-01` }],
      goals: [], income, budgetTemplate: 'none', categoryLimits: {}, recurringExpenses: [], generatedRecurringMonths: [],
    }) as unknown as AppState;

  it('thâm hụt ghi phần trăm vượt thu nhập khai báo, thanh không tràn', () => {
    const { container } = render(<ReportsTab state={makeState(1_565_000, 1_000_000)} />);
    expect(screen.getByText('Thâm hụt (vượt 56,5%)')).toBeInTheDocument();
    expect(container.textContent).not.toContain('Thâm hụt (0,0%)');
    for (const bar of container.querySelectorAll<HTMLElement>('[style*="width"]')) {
      expect(parseFloat(bar.style.width)).toBeLessThanOrEqual(100);
    }
  });

  it('vượt rất ít không ghi thành 0,0%', () => {
    const { container } = render(<ReportsTab state={makeState(1_000_001, 1_000_000)} />);
    expect(screen.getByText('Thâm hụt (vượt <0,1%)')).toBeInTheDocument();
    expect(container.textContent).not.toContain('vượt 0,0%');
  });

  it('còn dư vẫn ghi tỷ lệ tích lũy', () => {
    render(<ReportsTab state={makeState(750_000, 1_000_000)} />);
    expect(screen.getByText('Dư tích lũy (25,0%)')).toBeInTheDocument();
  });

  it('thu nhập 0: chưa đánh giá, không NaN', () => {
    const { container } = render(<ReportsTab state={makeState(750_000, 0)} />);
    expect(container.textContent).toContain('Chưa đánh giá — hãy nhập thu nhập tháng');
    expect(container.textContent).not.toMatch(/NaN|Infinity/);
  });
});
