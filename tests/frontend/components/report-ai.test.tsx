import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { MonthlyReportModal } from '../../../src/components/common/MonthlyReportModal';
import { ReportsTab } from '../../../src/features/reports/components/ReportsTab';
import ChatbotTab from '../../../src/features/ai/components/ChatbotTab';
import { getBusinessDate } from '../../../src/utils/dateParser';
import { AppState } from '../../../src/types';

const month = getBusinessDate().slice(0, 7);
const state = {
  expenses: [{ id: 'e', amount: 1245001, categoryId: 'khac', note: 'x', date: `${month}-01` }],
  goals: [], income: 1000000, budgetTemplate: 'none', categoryLimits: {}, recurringExpenses: [], generatedRecurringMonths: [],
} as unknown as AppState;

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('Báo cáo khớp nhau khi thâm hụt', () => {
  it.each([
    ['modal', () => <MonthlyReportModal isOpen state={state} onClose={() => {}} />],
    ['tab', () => <ReportsTab state={state} />],
  ])('%s hiện -245.001 với nhãn Thâm hụt', (_n, el) => {
    const { container } = render(el());
    expect(container.textContent).toContain('Thâm hụt');
    expect(container.textContent).toContain('-245.001₫');
    expect(container.textContent).toContain('0,0%');
  });

  it('tháng mặc định theo giờ Việt Nam (01:00 ngày 1 đã là tháng mới)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-30T18:00:00Z'));
    const { container } = render(<MonthlyReportModal isOpen state={state} onClose={() => {}} />);
    expect(container.textContent).toContain('Kỳ báo cáo: 12/2026');
  });

  it('tháng 3 so đúng tháng 2', () => {
    const s = {
      ...state,
      expenses: [
        { id: 'a', amount: 100, categoryId: 'khac', note: 'a', date: '2026-02-10' },
        { id: 'b', amount: 150, categoryId: 'khac', note: 'b', date: '2026-03-10' },
        { id: 'c', amount: 600, categoryId: 'khac', note: 'c', date: '2026-01-10' },
      ],
    } as AppState;
    const { container } = render(<MonthlyReportModal isOpen state={s} onClose={() => {}} />);
    fireEvent.change(container.querySelector('input[type="month"]')!, { target: { value: '2026-03' } });
    expect(container.textContent).toContain('+50% MoM');
  });
});

const send = (text: string) => {
  fireEvent.change(screen.getByLabelText('Nhập yêu cầu cho Financial Copilot'), { target: { value: text } });
  fireEvent.click(screen.getByLabelText('Gửi yêu cầu'));
};
const chat = (props: Record<string, unknown>) =>
  render(<ChatbotTab expenses={[]} categoryLimits={{}} onAddExpense={vi.fn()} {...(props as any)} />);

describe('ChatbotTab lưu đề xuất', () => {
  it('ô tiền không hợp lệ chặn lưu; lưu lỗi hiện thông báo thật và giữ thẻ chờ', async () => {
    const onAdd = vi.fn().mockRejectedValue({ response: { data: { message: 'Ví không đủ số dư' } } });
    vi.spyOn(console, 'error').mockImplementation(() => {});
    chat({ onAddExpense: onAdd });
    send('ăn phở 45k');
    fireEvent.click(await screen.findByTitle('Chỉnh sửa'));
    const money = screen.getByPlaceholderText('15000') as HTMLInputElement;
    expect(money.value).toBe('45.000');

    fireEvent.change(money, { target: { value: '' } });
    fireEvent.click(screen.getByText('✓ Xác nhận lưu vào sổ'));
    expect(onAdd).not.toHaveBeenCalled();
    expect(await screen.findByRole('alert')).toHaveTextContent('Số tiền');

    fireEvent.change(money, { target: { value: '50000' } });
    fireEvent.click(screen.getByText('✓ Xác nhận lưu vào sổ'));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Ví không đủ số dư'));
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ amount: 50000 }));
    expect(screen.getByText('✓ Xác nhận lưu vào sổ')).toBeInTheDocument();
    expect(screen.queryByText(/Đã lưu thành công/)).toBeNull();
  });

  it('bấm hai lần khi đang lưu chỉ gọi một lần', async () => {
    let finish: () => void = () => {};
    const onAdd = vi.fn(() => new Promise<void>((resolve) => { finish = resolve; }));
    chat({ onAddExpense: onAdd });
    send('ăn phở 45k');
    const button = await screen.findByText('✓ Xác nhận lưu vào sổ');
    fireEvent.click(button);
    fireEvent.click(button);
    expect(onAdd).toHaveBeenCalledTimes(1);
    finish();
    await waitFor(() => expect(screen.getByText(/Đã lưu thành công/)).toBeInTheDocument());
  });

  it('lưu hết đề xuất: thẻ không hiện Tổng: 0₫', async () => {
    const { container } = chat({ onAddBulkExpenses: vi.fn() });
    send('mua sữa 15k, mua cafe 25k');
    fireEvent.click(await screen.findByText(/Xác nhận lưu tất cả/));
    await waitFor(() => expect(container.textContent).toContain('Đã lưu: 40.000₫'));
    expect(container.textContent).not.toContain('Tổng: 0₫');
  });
});
