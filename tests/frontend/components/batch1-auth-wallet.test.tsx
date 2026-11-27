import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup, act, renderHook } from '@testing-library/react';
import axios, { AxiosError } from 'axios';
import {
  apiClient,
  getApiErrorMessage,
  ACCESS_TOKEN_KEY,
  REFRESH_TOKEN_KEY,
} from '../../../src/lib/apiClient';
import { AuthProvider, useAuth } from '../../../src/context/AuthContext';
import { ToastProvider } from '../../../src/context/ToastContext';
import { LedgerApp } from '../../../src/app/App';
import { WalletsTab } from '../../../src/features/wallets/components/WalletsTab';
import { SettingsTab } from '../../../src/features/settings/components/SettingsTab';
import AuthModal from '../../../src/features/auth/components/AuthModal';
import { useBackupRestore } from '../../../src/hooks/useBackupRestore';

vi.mock('../../../src/features/auth/components/GoogleAuthButton', () => ({
  GoogleAuthButton: () => null,
}));
vi.mock('../../../src/components/layout/LandingPage', () => ({
  default: ({ onOpenRegister, onOpenLogin, onStartDemo }: any) => (
    <div>
      <button onClick={onOpenRegister}>mo-dang-ky</button>
      <button onClick={onOpenLogin}>mo-dang-nhap</button>
      <button onClick={onStartDemo}>dung-thu</button>
    </div>
  ),
}));

// ---------- Server giả đặt ở tầng transport: interceptor thật vẫn chạy ----------
type Reply = [number, any] | 'network';
type Handler = (config: any, body: any) => Reply | Promise<Reply>;
let routes: Record<string, Handler> = {};
let calls: Array<{ key: string; body: any; headers: any }> = [];

const adapter = async (config: any) => {
  const path = String(config.url).replace(/^https?:\/\/[^/]+/, '');
  const key = `${String(config.method).toUpperCase()} ${path}`;
  const body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data;
  calls.push({ key, body, headers: { ...config.headers } });
  const handler = routes[key];
  const reply: Reply = handler ? await handler(config, body) : [200, { success: true, data: [] }];
  if (reply === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config);
  const [status, data] = reply;
  const response = { data, status, statusText: String(status), headers: {}, config };
  if (status >= 400) {
    throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config, {}, response as any);
  }
  return response;
};
const count = (key: string) => calls.filter((c) => c.key === key).length;

const fail = (status: number, code: string, message: string): Reply => [
  status,
  { success: false, error: { code, message }, code, message },
];
const USER = { id: 'u1', email: 'a@b.vn', name: 'An', provider: 'local' };
const asGuest = () => {
  routes['GET /api/v1/auth/me'] = () => fail(401, 'UNAUTHORIZED', 'Chưa đăng nhập.');
  routes['POST /api/v1/auth/refresh'] = () => fail(401, 'MISSING_REFRESH_TOKEN', 'Thiếu Refresh Token.');
};
const asUser = (user: any = USER) => {
  routes['GET /api/v1/auth/me'] = () => [200, { success: true, user }];
};

const originalAxiosAdapter = axios.defaults.adapter;
const originalClientAdapter = apiClient.defaults.adapter;

beforeEach(() => {
  routes = {};
  calls = [];
  window.localStorage.clear();
  window.localStorage.setItem('so_tay_onboarding_completed', '1');
  axios.defaults.adapter = adapter as any;
  apiClient.defaults.adapter = adapter as any;
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  axios.defaults.adapter = originalAxiosAdapter;
  apiClient.defaults.adapter = originalClientAdapter;
});

const Probe = () => {
  const { authState, user, isLoading, logout, logoutAll } = useAuth() as any;
  return (
    <div>
      <span data-testid="state">{authState}</span>
      <span data-testid="email">{user?.email || ''}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <button onClick={() => logout()}>probe-logout</button>
      <button onClick={() => logoutAll().catch(() => {})}>probe-logout-all</button>
    </div>
  );
};
const withProviders = (node: React.ReactNode) =>
  render(
    <AuthProvider>
      <ToastProvider>{node}</ToastProvider>
    </AuthProvider>
  );
const waitState = (s: string) => waitFor(() => expect(screen.getByTestId('state')).toHaveTextContent(s));
const type = (el: HTMLElement, value: string) => fireEvent.change(el, { target: { value } });
const tick = (ms = 30) => act(() => new Promise<void>((r) => setTimeout(r, ms)));

// ---------- 1. AuthModal không bị unmount khi đang gửi ----------
describe('AuthModal giữ thông báo (AuthProvider thật)', () => {
  const openLogin = async () => {
    withProviders(<LedgerApp />);
    fireEvent.click(await screen.findByText('mo-dang-nhap'));
  };
  const submitLogin = (container: HTMLElement = document.body) => {
    type(screen.getByPlaceholderText('tenban@domain.com'), 'a@b.vn');
    type(screen.getByPlaceholderText('••••••••'), 'saimatkhau1');
    fireEvent.click(screen.getByRole('button', { name: /Đăng nhập vào sổ tay/ }));
  };

  it('sai mật khẩu 401: lỗi còn hiện, email còn, không gọi refresh thêm', async () => {
    asGuest();
    routes['POST /api/v1/auth/login'] = () => fail(401, 'INVALID_CREDENTIALS', 'Sai email hoặc mật khẩu (server).');
    await openLogin();
    const refreshBefore = count('POST /api/v1/auth/refresh');
    submitLogin();
    await waitFor(() => expect(screen.getAllByText('Sai email hoặc mật khẩu (server).').length).toBeGreaterThan(0));
    await tick();
    expect(screen.getAllByText('Sai email hoặc mật khẩu (server).').length).toBeGreaterThan(0);
    expect(screen.getByDisplayValue('a@b.vn')).toBeInTheDocument();
    expect(count('POST /api/v1/auth/refresh')).toBe(refreshBefore);
    expect(count('POST /api/v1/auth/login')).toBe(1);
  });

  it('đang gửi: modal không mất, nút bị khóa (chống gửi đúp)', async () => {
    asGuest();
    let release!: (r: Reply) => void;
    routes['POST /api/v1/auth/login'] = () => new Promise<Reply>((r) => (release = r));
    await openLogin();
    submitLogin();
    const busy = await screen.findByRole('button', { name: 'Đang đăng nhập...' });
    expect(busy).toBeDisabled();
    fireEvent.click(busy);
    expect(screen.queryByText('Đang xác thực tài khoản...')).toBeNull();
    await waitFor(() => expect(count('POST /api/v1/auth/login')).toBe(1));
    await act(async () => release(fail(401, 'INVALID_CREDENTIALS', 'Sai rồi.')));
  });

  it('email trùng khi đăng ký: lỗi còn hiện, form còn dữ liệu', async () => {
    asGuest();
    routes['POST /api/v1/auth/register'] = () => fail(400, 'REGISTER_FAILED', 'Email này đã được đăng ký.');
    withProviders(<LedgerApp />);
    fireEvent.click(await screen.findByText('mo-dang-ky'));
    type(screen.getByPlaceholderText('Nguyễn Văn A'), 'An');
    type(screen.getByPlaceholderText('tenban@domain.com'), 'a@b.vn');
    type(screen.getByPlaceholderText('••••••••'), 'matkhau123');
    type(screen.getByPlaceholderText('Nhập lại chính xác mật khẩu'), 'matkhau123');
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/ }));
    await screen.findByText('Email này đã được đăng ký.');
    await tick();
    expect(screen.getByText('Email này đã được đăng ký.')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@b.vn')).toBeInTheDocument();
  });

  it('quên mật khẩu thành công: hiện thông báo', async () => {
    asGuest();
    routes['POST /api/v1/auth/forgot-password'] = () => [200, { success: true, message: 'Đã gửi liên kết (server).' }];
    await openLogin();
    fireEvent.click(screen.getByRole('button', { name: 'Quên mật khẩu?' }));
    type(screen.getByPlaceholderText('nhap.email@domain.com'), 'a@b.vn');
    fireEvent.click(screen.getByRole('button', { name: 'Gửi yêu cầu' }));
    await screen.findByText('Đã gửi liên kết (server).');
    await tick();
    expect(screen.getByText('Đã gửi liên kết (server).')).toBeInTheDocument();
    expect(screen.getByDisplayValue('a@b.vn')).toBeInTheDocument();
  });

  it('đăng nhập thành công: vào app, đóng modal', async () => {
    asGuest();
    routes['POST /api/v1/auth/login'] = () => [200, { success: true, user: USER, accessToken: 'A1', refreshToken: 'R1' }];
    await openLogin();
    submitLogin();
    await screen.findByText('Đăng nhập thành công!');
    await waitFor(() => {
      expect(screen.queryByTitle('Đóng modal')).toBeNull();
      expect(screen.queryByText('mo-dang-nhap')).toBeNull();
    });
    // Modal đóng xong chưa chắc màn Tổng quan đã vẽ (máy chậm)
    expect(await screen.findByText('Tổng quan tài chính', {}, { timeout: 5000 })).toBeInTheDocument();
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R1');
  });

  it('đăng ký thành công: thông báo vẫn còn sau khi chuyển vào app rồi tự đóng', async () => {
    asGuest();
    routes['POST /api/v1/auth/register'] = () => [201, { success: true, user: USER }];
    withProviders(<LedgerApp />);
    fireEvent.click(await screen.findByText('mo-dang-ky'));
    type(screen.getByPlaceholderText('Nguyễn Văn A'), 'An');
    type(screen.getByPlaceholderText('tenban@domain.com'), 'a@b.vn');
    type(screen.getByPlaceholderText('••••••••'), 'matkhau123');
    type(screen.getByPlaceholderText('Nhập lại chính xác mật khẩu'), 'matkhau123');
    fireEvent.click(screen.getByRole('button', { name: /Đăng ký tài khoản/ }));
    await screen.findByText('Tổng quan tài chính');
    expect(screen.getByText('Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.')).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByTitle('Đóng modal')).toBeNull(), { timeout: 3000 });
  });

  it('ô mật khẩu mới khi đặt lại yêu cầu tối thiểu 8 ký tự', () => {
    asGuest();
    withProviders(<AuthModal isOpen onClose={() => {}} defaultTab="reset" />);
    expect(screen.getByText(/Mật khẩu mới \(tối thiểu 8 ký tự/)).toBeInTheDocument();
    expect(screen.getAllByPlaceholderText('••••••••')[0]).toHaveAttribute('minlength', '8');
  });
});

// ---------- 2. Refresh token ----------
describe('apiClient: luồng refresh chung', () => {
  const meOnceExpired = () => {
    let n = 0;
    routes['GET /api/v1/auth/me'] = () =>
      ++n === 1 ? fail(401, 'TOKEN_EXPIRED', 'Hết hạn.') : [200, { success: true, user: USER }];
  };

  it('/auth/me 401 -> refresh 200 -> me 200: AUTHENTICATED (người dùng cookie)', async () => {
    meOnceExpired();
    routes['POST /api/v1/auth/refresh'] = () => [200, { success: true, accessToken: 'A2', refreshToken: 'R2' }];
    withProviders(<Probe />);
    await waitState('AUTHENTICATED');
    expect(count('GET /api/v1/auth/me')).toBe(2);
    const refresh = calls.find((c) => c.key === 'POST /api/v1/auth/refresh')!;
    // server dùng zod string().optional(): gửi null sẽ bị 400
    expect(refresh.body ?? {}).toEqual({});
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R2');
  });

  it('refresh 401: ẩn danh và xóa token', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'A1');
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    asGuest();
    withProviders(<Probe />);
    await waitState('ANONYMOUS');
    expect(count('POST /api/v1/auth/refresh')).toBe(1);
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
  });

  it.each([
    ['lỗi mạng', 'network' as Reply],
    ['lỗi 503', fail(503, 'X', 'Bảo trì')],
  ])('refresh gặp %s: không xóa token', async (_n, reply) => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    routes['GET /api/v1/auth/me'] = () => fail(401, 'TOKEN_EXPIRED', 'Hết hạn.');
    routes['POST /api/v1/auth/refresh'] = () => reply;
    withProviders(<Probe />);
    await waitState('ANONYMOUS');
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R1');
  });

  it('409 REFRESH_IN_PROGRESS: chờ rồi thử lại request gốc 1 lần, không xóa token', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    meOnceExpired();
    routes['POST /api/v1/auth/refresh'] = () => fail(409, 'REFRESH_IN_PROGRESS', 'Đang làm mới.');
    const started = Date.now();
    withProviders(<Probe />);
    await waitState('AUTHENTICATED');
    expect(Date.now() - started).toBeGreaterThanOrEqual(250);
    expect(count('GET /api/v1/auth/me')).toBe(2);
    expect(count('POST /api/v1/auth/refresh')).toBe(1);
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R1');
  });

  it('409 rồi request gốc vẫn 401: chỉ thử lại 1 lần, không xóa token', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    routes['GET /api/v1/auth/me'] = () => fail(401, 'TOKEN_EXPIRED', 'Hết hạn.');
    routes['POST /api/v1/auth/refresh'] = () => fail(409, 'REFRESH_IN_PROGRESS', 'Đang làm mới.');
    withProviders(<Probe />);
    await waitState('ANONYMOUS');
    expect(count('GET /api/v1/auth/me')).toBe(2);
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R1');
  });

  it('tab khác đã xoay token trong lúc chờ khóa: không gọi refresh, retry bằng token mới', async () => {
    window.localStorage.setItem(ACCESS_TOKEN_KEY, 'A1');
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    const request = vi.fn(async (_name: string, cb: () => Promise<any>) => {
      window.localStorage.setItem(ACCESS_TOKEN_KEY, 'A-tab2');
      window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R-tab2');
      return cb();
    });
    vi.stubGlobal('navigator', { locks: { request } });
    routes['GET /api/v1/wallets'] = (config) =>
      config.headers.Authorization === 'Bearer A-tab2'
        ? [200, { success: true, data: [] }]
        : fail(401, 'TOKEN_EXPIRED', 'Hết hạn.');
    await apiClient.get('/api/v1/wallets');
    expect(request).toHaveBeenCalledWith('qlct-auth-refresh', expect.any(Function));
    expect(count('POST /api/v1/auth/refresh')).toBe(0);
    expect(count('GET /api/v1/wallets')).toBe(2);
  });

  it('nhiều 401 đồng thời chỉ refresh 1 lần', async () => {
    let refreshed = false;
    routes['GET /api/v1/wallets'] = () =>
      refreshed ? [200, { success: true, data: [] }] : fail(401, 'TOKEN_EXPIRED', 'Hết hạn.');
    routes['POST /api/v1/auth/refresh'] = () => {
      refreshed = true;
      return [200, { success: true }];
    };
    await Promise.all([apiClient.get('/api/v1/wallets'), apiClient.get('/api/v1/wallets')]);
    expect(count('POST /api/v1/auth/refresh')).toBe(1);
  });

  it.each(['/api/v1/auth/login', '/api/v1/auth/register', '/api/v1/auth/refresh'])(
    '401 của %s không kích hoạt refresh và giữ nguyên lỗi',
    async (url) => {
      routes[`POST ${url}`] = () => fail(401, 'X', 'Giữ lỗi này');
      const err = await apiClient.post(url, {}).catch((e) => e);
      expect(getApiErrorMessage(err)).toBe('Giữ lỗi này');
      expect(calls).toHaveLength(1);
    }
  );
});

// ---------- 3. getApiErrorMessage ----------
describe('getApiErrorMessage', () => {
  it('đọc đúng các hình dạng lỗi của server', () => {
    expect(getApiErrorMessage({ response: { data: { error: { message: 'A' }, message: 'B' } } })).toBe('A');
    expect(getApiErrorMessage({ response: { data: { code: 'VALIDATION_ERROR', message: 'B' } } })).toBe('B');
    expect(getApiErrorMessage(new Error('C'))).toBe('C');
  });
  it('fallback tiếng Việt, không lộ câu tiếng Anh của axios', () => {
    expect(getApiErrorMessage(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatch(/Không thể kết nối máy chủ/);
    expect(
      getApiErrorMessage({ message: 'Request failed with status code 500', response: { data: '<html>' } })
    ).toMatch(/Đã xảy ra lỗi/);
    expect(getApiErrorMessage(undefined, 'Riêng')).toBe('Riêng');
  });
});

// ---------- 4 & 5. SettingsTab ----------
const emptyState: any = {
  expenses: [],
  goals: [],
  recurringExpenses: [],
  income: 0,
  categoryLimits: {},
  budgetTemplate: 'none',
  generatedRecurringMonths: [],
};

describe('SettingsTab: đổi mật khẩu và đăng xuất tất cả', () => {
  const renderSettings = (user: any = USER, onLogoutAll = vi.fn().mockResolvedValue(undefined)) => {
    render(
      <ToastProvider>
        <SettingsTab currentUser={user} state={emptyState} onLogout={vi.fn()} onLogoutAll={onLogoutAll} />
      </ToastProvider>
    );
    fireEvent.click(screen.getByText('Bảo mật & Phiên'));
    return onLogoutAll;
  };
  const fill = (cur: string, next: string, confirm: string) => {
    fireEvent.click(screen.getByRole('button', { name: 'Đổi mật khẩu' }));
    type(screen.getByLabelText('Mật khẩu hiện tại'), cur);
    type(screen.getByLabelText('Mật khẩu mới'), next);
    type(screen.getByLabelText('Xác nhận mật khẩu'), confirm);
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
  };

  it('mật khẩu yếu hoặc không khớp: báo trong form, không gọi API', async () => {
    renderSettings();
    fill('cu12345678', 'abcdefghij', 'abcdefghij');
    expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu phải chứa ít nhất một chữ cái và một chữ số');
    type(screen.getByLabelText('Mật khẩu mới'), 'matkhau123');
    fireEvent.click(screen.getByRole('button', { name: 'Cập nhật mật khẩu' }));
    expect(screen.getByRole('alert')).toHaveTextContent('không khớp');
    expect(calls).toHaveLength(0);
  });

  it('server từ chối: lỗi hiện trong form, giữ form và dữ liệu, không báo thành công', async () => {
    routes['POST /api/v1/users/change-password'] = () =>
      fail(400, 'INVALID_PASSWORD', 'Mật khẩu hiện tại không chính xác.');
    renderSettings();
    fill('saimatkhau1', 'matkhau123', 'matkhau123');
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Mật khẩu hiện tại không chính xác.'));
    expect(screen.getByLabelText('Mật khẩu hiện tại')).toHaveValue('saimatkhau1');
    expect(screen.queryByText(/Đổi mật khẩu thành công/)).toBeNull();
  });

  it('thành công: gửi đúng trường, lưu token mới, đóng form', async () => {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'cu');
    routes['POST /api/v1/users/change-password'] = () => [200, { success: true, accessToken: 'AN', refreshToken: 'RN' }];
    renderSettings();
    fill('matkhaucu1', 'matkhau123', 'matkhau123');
    const btn = screen.queryByRole('button', { name: 'Đang cập nhật...' });
    if (btn) fireEvent.click(btn);
    await screen.findByText('Đổi mật khẩu thành công.');
    expect(count('POST /api/v1/users/change-password')).toBe(1);
    expect(calls[0].body).toEqual({ currentPassword: 'matkhaucu1', newPassword: 'matkhau123' });
    expect(window.localStorage.getItem(ACCESS_TOKEN_KEY)).toBe('AN');
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('RN');
    expect(screen.queryByLabelText('Mật khẩu hiện tại')).toBeNull();
  });

  it('tài khoản Google: ẩn form, hiện ghi chú', () => {
    renderSettings({ ...USER, provider: 'google' });
    expect(screen.queryByRole('button', { name: 'Đổi mật khẩu' })).toBeNull();
    expect(screen.getByText(/đăng nhập bằng Google/i)).toBeInTheDocument();
  });

  it('đăng xuất tất cả: hỏi xác nhận; hủy thì không gọi', () => {
    const onLogoutAll = renderSettings();
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất tất cả' }));
    expect(onLogoutAll).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(onLogoutAll).not.toHaveBeenCalled();
    expect(screen.queryByText(/Đã đăng xuất khỏi tất cả thiết bị/)).toBeNull();
  });

  it.each([
    ['thành công', true],
    ['thất bại', false],
  ])('đăng xuất tất cả %s', async (_n, ok) => {
    const onLogoutAll = renderSettings(
      USER,
      ok ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new Error('Máy chủ lỗi'))
    );
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất tất cả' }));
    fireEvent.click(screen.getByRole('button', { name: 'Đăng xuất mọi thiết bị' }));
    await screen.findByText(ok ? 'Đã đăng xuất khỏi tất cả thiết bị.' : 'Máy chủ lỗi');
    expect(onLogoutAll).toHaveBeenCalledTimes(1);
    if (!ok) expect(screen.queryByText('Đã đăng xuất khỏi tất cả thiết bị.')).toBeNull();
  });
});

describe('AuthContext: logout và logoutAll', () => {
  const seed = async () => {
    asUser();
    window.localStorage.setItem(REFRESH_TOKEN_KEY, 'R1');
    window.localStorage.setItem('so_tay_wallets_data', '[]');
    withProviders(<Probe />);
    await waitState('AUTHENTICATED');
  };

  it('logoutAll gọi đúng route, thành công mới xóa phiên và cache ví', async () => {
    await seed();
    fireEvent.click(screen.getByText('probe-logout-all'));
    await waitState('ANONYMOUS');
    expect(count('POST /api/v1/auth/logout-all')).toBe(1);
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBeNull();
    expect(window.localStorage.getItem('so_tay_wallets_data')).toBeNull();
  });

  it('logoutAll lỗi: giữ phiên', async () => {
    await seed();
    routes['POST /api/v1/auth/logout-all'] = () => fail(500, 'X', 'Lỗi');
    fireEvent.click(screen.getByText('probe-logout-all'));
    await tick();
    expect(screen.getByTestId('state')).toHaveTextContent('AUTHENTICATED');
    expect(window.localStorage.getItem(REFRESH_TOKEN_KEY)).toBe('R1');
  });

  it('logout xóa cache ví, không bật lại isLoading', async () => {
    await seed();
    fireEvent.click(screen.getByText('probe-logout'));
    expect(screen.getByTestId('loading')).toHaveTextContent('false');
    await waitState('ANONYMOUS');
    expect(window.localStorage.getItem('so_tay_wallets_data')).toBeNull();
  });
});

// ---------- 6. Dữ liệu mẫu chỉ cho khách ----------
describe('Dữ liệu mẫu chỉ ở chế độ dùng thử', () => {
  it('có userId: toast, không đổi dữ liệu, không gọi API', async () => {
    const showToast = vi.fn();
    window.localStorage.setItem(
      'so_tay_ledger_data',
      JSON.stringify({ ...emptyState, income: 7 })
    );
    const { result } = renderHook(() => useBackupRestore('u1', showToast));
    await act(async () => {
      await result.current.handleLoadSampleData();
    });
    expect(showToast).toHaveBeenCalledWith('Chỉ dùng ở chế độ dùng thử', 'info');
    expect(result.current.localState.income).toBe(7);
    expect(calls).toHaveLength(0);
  });

  it('đã đăng nhập: không còn nút dữ liệu mẫu nào', async () => {
    asUser();
    withProviders(<LedgerApp />);
    await screen.findByText('Tổng quan tài chính');
    expect(screen.queryByText('Dữ liệu mẫu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    expect(screen.queryByText('Nạp 3 tuần dữ liệu mẫu')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng menu' }));
    fireEvent.click(screen.getAllByText('Cài đặt & Dữ liệu')[0] ?? screen.getAllByText('Cài đặt')[0]);
    fireEvent.click(await screen.findByText('Quản lý dữ liệu'));
    expect(screen.queryByRole('button', { name: 'Nạp dữ liệu mẫu' })).toBeNull();
  });

  it('khách dùng thử: vẫn có nút dữ liệu mẫu', async () => {
    asGuest();
    withProviders(<LedgerApp />);
    fireEvent.click(await screen.findByText('dung-thu'));
    expect(screen.getByText('Dữ liệu mẫu')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mở menu' }));
    expect(screen.getByText('Nạp 3 tuần dữ liệu mẫu')).toBeInTheDocument();
  });
});

// ---------- 7. WalletsTab ----------
describe('WalletsTab', () => {
  const w = (id: string, name: string, balance: number, isDefault = false) => ({
    id,
    name,
    balance,
    isDefault,
    type: 'cash',
    currency: 'VND',
  });
  let list: any[] = [];
  const server = () => {
    asUser();
    list = [w('a', 'Ví A', 500000, true), w('b', 'Ví B', 0)];
    routes['GET /api/v1/wallets'] = () => [200, { success: true, data: list }];
  };
  const setItemSpy = () => ({
    set: vi.spyOn(window.localStorage, 'setItem'),
    get: vi.spyOn(window.localStorage, 'getItem'),
  });
  const Gate = () => {
    const { authState } = useAuth();
    return authState === 'LOADING' ? null : <WalletsTab />;
  };
  const mount = async () => {
    withProviders(<Gate />);
    await screen.findByText('Ví A');
  };
  const addWallet = (name: string) => {
    fireEvent.click(screen.getByRole('button', { name: '+ Thêm ví mới' }));
    type(screen.getByPlaceholderText('VD: Vietcombank, Ví Tiền Mặt, MoMo'), name);
    type(screen.getByPlaceholderText('0'), '1000');
  };

  it('đã đăng nhập: không đọc/ghi cache, không hiện ví mẫu, có trạng thái đang tải', async () => {
    server();
    window.localStorage.setItem('so_tay_wallets_data', JSON.stringify([w('z', 'Ví Cache Cũ', 1)]));
    let release!: (r: Reply) => void;
    routes['GET /api/v1/wallets'] = () => new Promise<Reply>((r) => (release = r));
    const spy = setItemSpy();
    withProviders(<Gate />);
    await screen.findByText('Đang tải danh sách ví...');
    expect(screen.queryByText('Ví Cache Cũ')).toBeNull();
    expect(screen.queryByText('Vietcombank Digibank')).toBeNull();
    expect(screen.queryByText('Chưa có ví nào được tạo')).toBeNull();
    // Chữ "đang tải" hiện trước khi axios gọi tới handler (nơi gán release)
    await waitFor(() => expect(release).toBeDefined());
    await act(async () => release([200, { success: true, data: list }]));
    await screen.findByText('Ví A');
    expect(spy.set.mock.calls.filter((c) => c[0] === 'so_tay_wallets_data')).toHaveLength(0);
    expect(spy.get.mock.calls.filter((c) => c[0] === 'so_tay_wallets_data')).toHaveLength(0);
  });

  it('lỗi tải: hiện message và nút thử lại', async () => {
    server();
    routes['GET /api/v1/wallets'] = () => fail(500, 'X', 'Không tải được ví (server)');
    withProviders(<Gate />);
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Không tải được ví (server)'));
    expect(screen.queryByText('Vietcombank Digibank')).toBeNull();
    expect(screen.getByRole('button', { name: '+ Thêm ví mới' })).toBeDisabled();
    routes['GET /api/v1/wallets'] = () => [200, { success: true, data: list }];
    fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
    await screen.findByText('Ví A');
  });

  it('tạo ví lỗi: toast, giữ modal, không thêm ví', async () => {
    server();
    routes['POST /api/v1/wallets'] = () => fail(400, 'X', 'Tên ví bị từ chối');
    await mount();
    addWallet('Ví Mới');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo ví mới' }));
    await screen.findByText('Tên ví bị từ chối');
    expect(screen.getByDisplayValue('Ví Mới')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Ví Mới' })).toBeNull();
    expect(screen.queryByText('Đã thêm tài khoản tài chính mới!')).toBeNull();
  });

  it('tạo ví thành công: chống bấm đúp và tải lại danh sách', async () => {
    server();
    let release!: (r: Reply) => void;
    routes['POST /api/v1/wallets'] = () => new Promise<Reply>((r) => (release = r));
    await mount();
    addWallet('Ví Mới');
    const form = screen.getByRole('button', { name: 'Tạo ví mới' }).closest('form')!;
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(release).toBeDefined());
    list = [...list, w('c', 'Ví Từ Server', 1000)];
    await act(async () => release([201, { success: true, data: list[2] }]));
    await screen.findByText('Ví Từ Server');
    expect(count('POST /api/v1/wallets')).toBe(1);
    expect(count('GET /api/v1/wallets')).toBe(2);
    expect(screen.queryByDisplayValue('Ví Mới')).toBeNull();
  });

  it('sửa ví lỗi: giữ modal và tên cũ', async () => {
    server();
    routes['PUT /api/v1/wallets/a'] = () => fail(500, 'X', 'Không lưu được');
    await mount();
    fireEvent.click(screen.getAllByTitle('Sửa thông tin ví')[0]);
    type(screen.getByDisplayValue('Ví A'), 'Tên Khác');
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }));
    await screen.findByText('Không lưu được');
    expect(screen.getByDisplayValue('Tên Khác')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Ví A' })).toBeInTheDocument();
  });

  it('đặt mặc định lỗi: không đổi ví mặc định', async () => {
    server();
    routes['PUT /api/v1/wallets/b'] = () => fail(500, 'X', 'Không đặt được');
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Đặt mặc định' }));
    await screen.findByText('Không đặt được');
    expect(screen.getAllByText('Đang là mặc định')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Đặt mặc định' })).toBeInTheDocument();
    expect(screen.queryByText('Đã đặt làm ví thanh toán mặc định.')).toBeNull();
  });

  it('chuyển tiền lỗi: giữ modal, số dư không đổi', async () => {
    server();
    routes['POST /api/v1/wallets/transfer'] = () => fail(400, 'X', 'Số dư không đủ (server)');
    await mount();
    fireEvent.click(screen.getByRole('button', { name: 'Chuyển tiền' }));
    type(screen.getByPlaceholderText('500000'), '2000');
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận chuyển' }));
    await screen.findByText('Số dư không đủ (server)');
    expect(screen.getByText('Chuyển tiền giữa các ví')).toBeInTheDocument();
    expect(screen.queryByText(/Đã chuyển/)).toBeNull();
    expect(document.body.textContent!.replace(/\s/g, ' ')).toContain('500.000');
    expect(document.body.textContent).not.toContain('498.000');
  });

  it('xóa: xác nhận nêu tên và số dư; 409 hiện đúng message, ví còn nguyên', async () => {
    server();
    const msg = 'Ví đang có giao dịch nên không thể xóa.';
    routes['DELETE /api/v1/wallets/a'] = () => fail(409, 'WALLET_HAS_TRANSACTIONS', msg);
    await mount();
    fireEvent.click(screen.getAllByTitle('Xóa ví')[0]);
    const confirmText = await screen.findByText(/Bạn có chắc muốn xóa ví/);
    expect(confirmText.textContent).toContain('Ví A');
    expect(confirmText.textContent).toContain('500.000');
    expect(count('DELETE /api/v1/wallets/a')).toBe(0);
    const ok = screen.getByRole('button', { name: 'Xóa' });
    fireEvent.click(ok);
    await screen.findByText(msg);
    expect(count('DELETE /api/v1/wallets/a')).toBe(1);
    expect(screen.getByRole('heading', { name: 'Ví A' })).toBeInTheDocument();
  });

  it('xóa ví số dư 0: không nhắc số dư; hủy thì không gọi API', async () => {
    server();
    await mount();
    fireEvent.click(screen.getAllByTitle('Xóa ví')[1]);
    expect((await screen.findByText(/Bạn có chắc muốn xóa ví/)).textContent).not.toContain('Số dư');
    fireEvent.click(screen.getByRole('button', { name: 'Hủy bỏ' }));
    expect(calls.filter((c) => c.key.startsWith('DELETE'))).toHaveLength(0);
  });

  it('khách: giữ hành vi cục bộ, không gọi API ví, xóa cũng qua xác nhận', async () => {
    asGuest();
    withProviders(<Gate />);
    await screen.findByText('Vietcombank Digibank');
    addWallet('Ví Khách');
    fireEvent.click(screen.getByRole('button', { name: 'Tạo ví mới' }));
    await screen.findByRole('heading', { name: 'Ví Khách' });
    expect(window.localStorage.getItem('so_tay_wallets_data')).toContain('Ví Khách');
    fireEvent.click(screen.getAllByTitle('Xóa ví')[0]);
    expect(screen.getByRole('heading', { name: 'Ví Tiền Mặt' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Xóa' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Ví Tiền Mặt' })).toBeNull());
    expect(calls.filter((c) => c.key.includes('/wallets'))).toHaveLength(0);
  });
});

// ---------- Đổi tài khoản trên cùng trình duyệt ----------
describe('LedgerApp: đăng xuất rồi vào tài khoản khác', () => {
  it('quay về Tổng quan và onboarding tính riêng từng tài khoản', async () => {
    asGuest();
    let next: any = USER;
    routes['POST /api/v1/auth/login'] = () => [200, { success: true, user: next, accessToken: 'A', refreshToken: 'R' }];
    routes['POST /api/v1/auth/logout'] = () => [200, { success: true }];
    withProviders(<LedgerApp />);

    const login = async () => {
      fireEvent.click(await screen.findByText('mo-dang-nhap'));
      type(screen.getByPlaceholderText('tenban@domain.com'), next.email);
      type(screen.getByPlaceholderText('••••••••'), 'matkhau123');
      fireEvent.click(screen.getByRole('button', { name: /Đăng nhập vào sổ tay/ }));
      fireEvent.click(await screen.findByTitle('Bỏ qua hướng dẫn', {}, { timeout: 5000 }));
    };

    await login();
    expect(window.localStorage.getItem('so_tay_onboarding_completed_u1')).toBe('true');
    fireEvent.click(screen.getAllByRole('button', { name: /Ví tiền/ })[0]);
    await screen.findByText('Ví Tiền & Nguồn Tài Khoản');
    await act(async () => fireEvent.click(screen.getAllByTitle('Đăng xuất')[0]));
    await screen.findByText('mo-dang-nhap');

    // Tài khoản thứ hai vẫn được xem hướng dẫn, dù trình duyệt đã có cờ cũ
    next = { ...USER, id: 'u2', email: 'c@d.vn', name: 'Binh' };
    await login();
    expect(window.localStorage.getItem('so_tay_onboarding_completed_u2')).toBe('true');
    expect(screen.getByText('Tổng quan tài chính')).toBeInTheDocument();
    expect(screen.queryByText('Ví Tiền & Nguồn Tài Khoản')).toBeNull();
  });
});

// ---------- Đang tải ngân sách không được mượn dữ liệu khách ----------
describe('LedgerApp: đã đăng nhập, ngân sách đang tải', () => {
  it('không hiện hạn mức của chế độ khách, không ghi đè lên server; tải xong hiện dữ liệu server', async () => {
    asUser();
    window.localStorage.setItem(
      'so_tay_ledger_data',
      JSON.stringify({
        income: 123456, budgetTemplate: '6_jars', categoryLimits: { an_uong: 777000 },
        expenses: [], goals: [], recurringExpenses: [], generatedRecurringMonths: [],
      })
    );
    window.localStorage.setItem('so_tay_onboarding_completed_u1', 'true');
    let release!: (r: Reply) => void;
    routes['GET /api/budget'] = () => new Promise<Reply>((r) => (release = r));
    withProviders(<LedgerApp />);
    fireEvent.click((await screen.findAllByRole('button', { name: /Ngân sách/ }))[0]);
    await screen.findByText(/Hạn mức chi tiêu danh mục tháng/, {}, { timeout: 5000 });
    await tick();

    const text = () => document.body.textContent || '';
    expect(text()).not.toContain('777.000');
    expect(text()).not.toContain('123.456');
    expect(text()).not.toContain('Nhu cầu thiết yếu (NEC)');
    expect(calls.filter((c) => /^(PUT|POST|PATCH|DELETE) \/api\/budget/.test(c.key))).toHaveLength(0);

    await act(async () =>
      release([200, { success: true, data: { income: 9000000, budgetTemplate: '50_30_20', categoryLimits: { an_uong: 555000 } } }])
    );
    await waitFor(() => expect(text()).toContain('Hạn mức: 555.000₫'));
    expect(calls.filter((c) => /^(PUT|POST|PATCH|DELETE) \/api\/budget/.test(c.key))).toHaveLength(0);
  });
});
