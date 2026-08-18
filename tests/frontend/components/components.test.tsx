import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QuickAddExpenseModal } from '../../../src/features/transactions/components/QuickAddExpenseModal';
import BudgetTab from '../../../src/features/budgets/components/BudgetTab';
import ChatbotTab from '../../../src/features/ai/components/ChatbotTab';
import { ToastProvider } from '../../../src/context/ToastContext';

describe('Frontend Component Tests', () => {
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
    it('should render Financial Copilot welcome message and suggestions', () => {
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
      expect(screen.getByPlaceholderText(/Nhập chi tiêu hoặc câu hỏi/i)).toBeInTheDocument();
    });
  });
});
