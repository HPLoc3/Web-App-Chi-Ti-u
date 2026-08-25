import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { QuickAddExpenseModal } from '../../../src/features/transactions/components/QuickAddExpenseModal';
import ExpensesTab from '../../../src/features/transactions/components/ExpensesTab';
import BudgetTab from '../../../src/features/budgets/components/BudgetTab';
import ChatbotTab from '../../../src/features/ai/components/ChatbotTab';
import { ToastProvider } from '../../../src/context/ToastContext';

describe('Frontend Component Tests', () => {
  describe('ExpensesTab Currency Input & Caret Management', () => {
    it('should maintain raw value on focus and format with vi-VN on blur', () => {
      const handleAdd = vi.fn();
      render(
        <ToastProvider>
          <ExpensesTab
            expenses={[]}
            onAddExpense={handleAdd}
            onUpdateExpense={vi.fn()}
            onDeleteExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByPlaceholderText(/Ví dụ: 50.000/i) as HTMLInputElement;

      // Focus -> shows raw input
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '15000' } });
      expect(input.value).toBe('15000');

      // Blur -> displays formatted currency
      fireEvent.blur(input);
      expect(input.value).toBe((15000).toLocaleString('vi-VN'));

      // Re-focus -> returns to raw 15000 for effortless caret editing
      fireEvent.focus(input);
      expect(input.value).toBe('15000');
    });

    it('should correctly handle incremental typing without injecting extra digits (15000 -> 115000 -> 1000000)', () => {
      const handleAdd = vi.fn();
      render(
        <ToastProvider>
          <ExpensesTab
            expenses={[]}
            onAddExpense={handleAdd}
            onUpdateExpense={vi.fn()}
            onDeleteExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByPlaceholderText(/Ví dụ: 50.000/i) as HTMLInputElement;
      fireEvent.focus(input);

      const sequence = ['1', '15', '150', '1500', '15000', '115000', '1000000', '999999999'];
      for (const val of sequence) {
        fireEvent.change(input, { target: { value: val } });
        expect(input.value).toBe(val);
      }

      fireEvent.blur(input);
      expect(input.value).toBe((999999999).toLocaleString('vi-VN'));
    });

    it('should sanitize pasted inputs containing dots, commas, spaces and currency symbols', () => {
      const handleAdd = vi.fn();
      render(
        <ToastProvider>
          <ExpensesTab
            expenses={[]}
            onAddExpense={handleAdd}
            onUpdateExpense={vi.fn()}
            onDeleteExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByPlaceholderText(/Ví dụ: 50.000/i) as HTMLInputElement;
      fireEvent.focus(input);

      // Paste "15.000"
      fireEvent.change(input, { target: { value: '15.000' } });
      expect(input.value).toBe('15000');

      // Paste "15,000"
      fireEvent.change(input, { target: { value: '15,000' } });
      expect(input.value).toBe('15000');

      // Paste "15 000"
      fireEvent.change(input, { target: { value: '15 000' } });
      expect(input.value).toBe('15000');

      // Paste "115.000 ₫"
      fireEvent.change(input, { target: { value: '115.000 ₫' } });
      expect(input.value).toBe('115000');
    });

    it('should submit exact numeric amount (number type, not formatted string)', async () => {
      const handleAdd = vi.fn().mockResolvedValue(undefined);
      render(
        <ToastProvider>
          <ExpensesTab
            expenses={[]}
            onAddExpense={handleAdd}
            onUpdateExpense={vi.fn()}
            onDeleteExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByPlaceholderText(/Ví dụ: 50.000/i) as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '115000' } });

      const submitBtn = screen.getByRole('button', { name: /Lưu khoản chi ngay/i });
      await act(async () => {
        fireEvent.click(submitBtn);
      });

      expect(handleAdd).toHaveBeenCalledTimes(1);
      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 115000,
        })
      );
    });

    it('should reject non-positive amounts and not trigger onAddExpense', () => {
      const handleAdd = vi.fn();
      render(
        <ToastProvider>
          <ExpensesTab
            expenses={[]}
            onAddExpense={handleAdd}
            onUpdateExpense={vi.fn()}
            onDeleteExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByPlaceholderText(/Ví dụ: 50.000/i) as HTMLInputElement;
      fireEvent.focus(input);
      fireEvent.change(input, { target: { value: '0' } });

      const submitBtn = screen.getByRole('button', { name: /Lưu khoản chi ngay/i });
      fireEvent.click(submitBtn);

      expect(handleAdd).not.toHaveBeenCalled();
    });
  });

  describe('QuickAddExpenseModal Component', () => {
    it('should render form fields when isOpen is true', () => {
      render(
        <ToastProvider>
          <QuickAddExpenseModal
            isOpen={true}
            onClose={vi.fn()}
            onAddExpense={vi.fn()}
          />
        </ToastProvider>
      );

      expect(screen.getByPlaceholderText(/VD: Phở bò 45k hôm qua/i)).toBeInTheDocument();
      expect(screen.getByText(/Thêm khoản chi tiêu nhanh/i)).toBeInTheDocument();
    });

    it('should not render anything when isOpen is false', () => {
      render(
        <ToastProvider>
          <QuickAddExpenseModal
            isOpen={false}
            onClose={vi.fn()}
            onAddExpense={vi.fn()}
          />
        </ToastProvider>
      );

      expect(screen.queryByText(/Thêm khoản chi tiêu nhanh/i)).toBeNull();
    });

    it('should parse natural text into amount and note', () => {
      render(
        <ToastProvider>
          <QuickAddExpenseModal
            isOpen={true}
            onClose={vi.fn()}
            onAddExpense={vi.fn()}
          />
        </ToastProvider>
      );

      const naturalInput = screen.getByPlaceholderText(/VD: Phở bò 45k hôm qua/i);
      fireEvent.change(naturalInput, { target: { value: 'Ăn sáng 45k phở' } });

      const parseBtn = screen.getByRole('button', { name: /Bóc tách/i });
      fireEvent.click(parseBtn);

      const amountInput = screen.getByPlaceholderText('45000') as HTMLInputElement;
      expect(amountInput.value).toBe('45000');
    });

    it('should call onAddExpense with correct data on submit', () => {
      const handleAdd = vi.fn();
      const handleClose = vi.fn();

      render(
        <ToastProvider>
          <QuickAddExpenseModal
            isOpen={true}
            onClose={handleClose}
            onAddExpense={handleAdd}
          />
        </ToastProvider>
      );

      const amountInput = screen.getByPlaceholderText('45000');
      fireEvent.change(amountInput, { target: { value: '150000' } });

      const noteInput = screen.getByPlaceholderText(/Mô tả khoản chi/i);
      fireEvent.change(noteInput, { target: { value: 'Tiền chợ' } });

      const submitBtn = screen.getByRole('button', { name: /Lưu giao dịch ngay/i });
      fireEvent.click(submitBtn);

      expect(handleAdd).toHaveBeenCalledTimes(1);
      expect(handleAdd).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 150000,
          note: 'Tiền chợ',
        })
      );
      expect(handleClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('BudgetTab Component', () => {
    it('should render category budgets and calculate totals', () => {
      const mockExpenses = [
        {
          id: 'exp-1',
          amount: 1500000,
          categoryId: 'an_uong',
          note: 'Ăn uống',
          date: new Date().toISOString().slice(0, 10),
        },
      ];

      const mockLimits = {
        an_uong: 3000000,
      };

      render(
        <ToastProvider>
          <BudgetTab
            expenses={mockExpenses}
            categoryLimits={mockLimits}
            onUpdateCategoryLimit={vi.fn()}
            recurringExpenses={[]}
          />
        </ToastProvider>
      );

      expect(screen.getByText(/Chi phí Cố định/i)).toBeInTheDocument();
      expect(screen.getAllByText(/Ăn uống/i).length).toBeGreaterThan(0);
    });
  });

  describe('ChatbotTab Component', () => {
    it('should render Financial Copilot welcome message and accessible input', () => {
      render(
        <ToastProvider>
          <ChatbotTab
            expenses={[]}
            categoryLimits={{}}
            onAddExpense={vi.fn()}
            currentUser={{ id: 'u1', email: 'test@user.com', displayName: 'Test User' } as any}
            onOpenAuthModal={vi.fn()}
          />
        </ToastProvider>
      );

      expect(screen.getAllByText(/Financial Copilot/i).length).toBeGreaterThan(0);
      const input = screen.getByRole('textbox', {
        name: /financial copilot|nhập yêu cầu/i,
      });
      expect(input).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /gửi yêu cầu/i })).toBeInTheDocument();
    });

    it('should parse multi-transaction input and render multiple pending action cards', async () => {
      render(
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

      const input = screen.getByRole('textbox', {
        name: /financial copilot|nhập yêu cầu/i,
      });

      fireEvent.change(input, { target: { value: 'Hôm nay mua sữa hết 15k, mua cafe hết 25k' } });
      const submitBtn = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/Danh sách 2 giao dịch/i)).toBeInTheDocument();
      });

      expect(screen.getAllByText(/15\.000/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/25\.000/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/mua sữa/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/mua cafe/i).length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: /xác nhận lưu tất cả/i })).toBeInTheDocument();
    });

    it('should confirm all multi-transactions when clicking confirm all button', async () => {
      const handleAddBulk = vi.fn();
      const handleAddSingle = vi.fn();

      render(
        <ToastProvider>
          <ChatbotTab
            expenses={[]}
            categoryLimits={{}}
            onAddExpense={handleAddSingle}
            onAddBulkExpenses={handleAddBulk}
            currentUser={null}
            onOpenAuthModal={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByRole('textbox', {
        name: /financial copilot|nhập yêu cầu/i,
      });

      fireEvent.change(input, { target: { value: 'Hôm nay mua sữa hết 15k, mua cafe hết 25k' } });
      const submitBtn = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitBtn);

      const confirmAllBtn = await screen.findByRole('button', { name: /xác nhận lưu tất cả/i });
      fireEvent.click(confirmAllBtn);

      await waitFor(() => {
        expect(handleAddBulk).toHaveBeenCalledTimes(1);
      });

      const calledWith = handleAddBulk.mock.calls[0][0];
      expect(calledWith).toHaveLength(2);
      expect(calledWith[0].amount).toBe(15000);
      expect(calledWith[0].note).toMatch(/mua sữa/i);
      expect(calledWith[1].amount).toBe(25000);
      expect(calledWith[1].note).toMatch(/mua cafe/i);
    });

    it('should handle single transaction backward compatibility', async () => {
      const handleAddSingle = vi.fn();

      render(
        <ToastProvider>
          <ChatbotTab
            expenses={[]}
            categoryLimits={{}}
            onAddExpense={handleAddSingle}
            currentUser={null}
            onOpenAuthModal={vi.fn()}
          />
        </ToastProvider>
      );

      const input = screen.getByRole('textbox', {
        name: /financial copilot|nhập yêu cầu/i,
      });

      fireEvent.change(input, { target: { value: 'Hôm nay ăn cơm 15k' } });
      const submitBtn = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitBtn);

      const confirmBtn = await screen.findByRole('button', { name: /xác nhận lưu vào sổ/i });
      expect(confirmBtn).toBeInTheDocument();
      expect(screen.getAllByText(/15\.000/i).length).toBeGreaterThan(0);

      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(handleAddSingle).toHaveBeenCalledTimes(1);
      });

      expect(handleAddSingle).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 15000,
          note: expect.stringMatching(/ăn cơm/i),
        })
      );
    });

    it('should handle query regression without creating pending transactions', async () => {
      render(
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

      const input = screen.getByRole('textbox', {
        name: /financial copilot|nhập yêu cầu/i,
      });

      fireEvent.change(input, { target: { value: 'Tháng này tôi tiêu bao nhiêu?' } });
      const submitBtn = screen.getByRole('button', { name: /gửi yêu cầu/i });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText(/tổng chi tiêu/i)).toBeInTheDocument();
      });

      expect(screen.queryByRole('button', { name: /xác nhận lưu/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /xác nhận lưu tất cả/i })).not.toBeInTheDocument();
    });
  });
});
