import { useBudget } from './useBudget';

export function useBudgets(userId: string | null) {
  const budgetState = useBudget(userId);

  return {
    ...budgetState,
    budgets: budgetState.categoryLimits,
  };
}
