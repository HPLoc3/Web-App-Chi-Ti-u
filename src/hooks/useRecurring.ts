import { useRecurringExpenses } from './useRecurringExpenses';

export function useRecurring(userId: string | null) {
  const state = useRecurringExpenses(userId);

  return {
    ...state,
    recurringItems: state.recurringExpenses,
  };
}
