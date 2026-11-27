import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { LedgerApp } from '../../../src/app/App';
import { ToastProvider } from '../../../src/context/ToastContext';

const auth: { currentUser: any; authState: string; logout: () => Promise<void>; logoutAll: () => Promise<void> } = {
  currentUser: null, authState: 'ANONYMOUS', logout: vi.fn(), logoutAll: vi.fn(),
};
vi.mock('../../../src/context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../../src/lib/apiClient', async (original) => ({
  ...(await original<typeof import('../../../src/lib/apiClient')>()),
  apiClient: {
    get: vi.fn(async () => ({ data: { success: true, data: [] } })),
    post: vi.fn(async () => ({ data: { success: true } })),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

beforeEach(() => {
  window.localStorage.clear();
  window.localStorage.setItem('so_tay_onboarding_completed', 'true');
  window.localStorage.setItem('so_tay_onboarding_completed_u1', 'true');
});
afterEach(cleanup);

const mount = () =>
  render(
    <ToastProvider>
      <LedgerApp />
    </ToastProvider>
  );
const openChatbot = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Mở app để thử câu của bạn' }));
  });
  return screen.findByLabelText('Nhập yêu cầu cho Financial Copilot', {}, { timeout: 10000 });
};

describe('Landing -> Trợ lý AI', () => {
  it('khách vào thẳng tab Trợ lý AI', async () => {
    auth.currentUser = null;
    auth.authState = 'ANONYMOUS';
    mount();
    expect(await openChatbot()).toBeInTheDocument();
  });

  it('đã đăng nhập: về trang giới thiệu rồi bấm cũng vào tab Trợ lý AI', async () => {
    auth.currentUser = { uid: 'u1', id: 'u1', email: 'a@b.vn', displayName: 'An' };
    auth.authState = 'AUTHENTICATED';
    mount();
    await act(async () => {
      fireEvent.click(screen.getByTitle('Quay lại Màn hình Giới thiệu'));
    });
    expect(await openChatbot()).toBeInTheDocument();
  });
});
