import { useExpenses } from './useExpenses';
import { Expense } from '../types';

export function useTransactions(userId: string | null) {
  const expenseState = useExpenses(userId);

  return {
    transactions: expenseState.expenses,
    expenses: expenseState.expenses,
    loading: expenseState.loading,
    error: expenseState.error,
    isEmpty: expenseState.isEmpty,
    addTransaction: expenseState.addExpense,
    addExpense: expenseState.addExpense,
    updateTransaction: expenseState.updateExpense,
    updateExpense: expenseState.updateExpense,
    deleteTransaction: expenseState.deleteExpense,
    deleteExpense: expenseState.deleteExpense,
    deleteBulkTransactions: expenseState.deleteBulkExpenses,
    deleteBulkExpenses: expenseState.deleteBulkExpenses,
    addBulkTransactions: expenseState.addBulkExpenses,
    addBulkExpenses: expenseState.addBulkExpenses,
    refetchTransactions: expenseState.refetchExpenses,
    refetchExpenses: expenseState.refetchExpenses,
  };
}
