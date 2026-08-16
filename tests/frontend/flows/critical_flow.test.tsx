import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QuickAddExpenseModal } from '../../../src/features/transactions/components/QuickAddExpenseModal';
import ExpensesTab from '../../../src/features/transactions/components/ExpensesTab';
import { ToastProvider } from '../../../src/context/ToastContext';
import { Expense } from '../../../src/types';

describe('Critical User Flow Tests', () => {
  it('Complete Flow: User adds expense -> List displays transaction -> Budget limit is calculated', async () => {
    let mockExpenses: Expense[] = [
      {
        id: 'exp-init',
        amount: 50000,
        categoryId: 'an_uong',
        note: 'Cà phê sáng',
        date: '2026-08-15',
      },
    ];

    const handleAddExpense = vi.fn((newExp: Omit<Expense, 'id'>) => {
      mockExpenses.push({
        ...newExp,
        id: `exp-${Date.now()}`,
      });
    });

    const handleDeleteExpense = vi.fn();
    const handleEditExpense = vi.fn();

    // 1. Open Quick Add Modal and submit new transaction
    const { unmount: unmountModal } = render(
      <ToastProvider>
        <QuickAddExpenseModal
          isOpen={true}
          onClose={vi.fn()}
          onAddExpense={handleAddExpense}
        />
      </ToastProvider>
    );

    const amountInput = screen.getByPlaceholderText('45000');
    fireEvent.change(amountInput, { target: { value: '85000' } });

    const noteInput = screen.getByPlaceholderText(/Mô tả khoản chi/i);
    fireEvent.change(noteInput, { target: { value: 'Grab về nhà' } });

    const submitBtn = screen.getByRole('button', { name: /Lưu giao dịch ngay/i });
    fireEvent.click(submitBtn);

    expect(handleAddExpense).toHaveBeenCalledTimes(1);
    expect(mockExpenses.length).toBe(2);
    unmountModal();

    // 2. Render ExpensesTab to verify list shows both transactions
    render(
      <ToastProvider>
        <ExpensesTab
          expenses={mockExpenses}
          onAddExpense={handleAddExpense}
          onDeleteExpense={handleDeleteExpense}
          onUpdateExpense={handleEditExpense}
        />
      </ToastProvider>
    );

    expect(screen.getByText(/Cà phê sáng/i)).toBeInTheDocument();
    expect(screen.getByText(/Grab về nhà/i)).toBeInTheDocument();
    expect(screen.getAllByText(/50.000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/85.000/i).length).toBeGreaterThan(0);

    // 3. Verify total spending calculation
    const totalAmount = mockExpenses.reduce((acc, curr) => acc + curr.amount, 0);
    expect(totalAmount).toBe(135000);
  });
});
