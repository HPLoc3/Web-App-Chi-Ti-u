import { Prisma } from '@prisma/client';
import { SyncRepository } from './sync.repository';
import { SyncClientStateInput, SyncClientStateResult } from './sync.types';
import { resolveCategoryId } from '../../services/category.helper';

export class SyncService {
  static async syncClientState(userId: string, input: SyncClientStateInput): Promise<SyncClientStateResult> {
    let wallet = await SyncRepository.findDefaultWallet(userId);
    if (!wallet) {
      wallet = await SyncRepository.createDefaultWallet(userId);
    }

    if (input.income !== undefined || input.budgetTemplate !== undefined || input.categoryLimits !== undefined) {
      await SyncRepository.upsertBudget(userId, input.income, input.budgetTemplate, input.categoryLimits);
    }

    let insertedExpensesCount = 0;
    if (Array.isArray(input.expenses) && input.expenses.length > 0) {
      for (const exp of input.expenses) {
        const numAmt = new Prisma.Decimal(exp.amount || 0);
        if (numAmt.lessThanOrEqualTo(0)) continue;

        const validCatId = await resolveCategoryId(exp.categoryId, userId, 'EXPENSE');
        const expDate = exp.date ? new Date(exp.date) : new Date();

        await SyncRepository.createTransaction({
          amount: numAmt,
          type: 'EXPENSE',
          note: exp.note ? String(exp.note).slice(0, 500) : '',
          date: expDate,
          wallet: { connect: { id: wallet.id } },
          category: { connect: { id: validCatId } },
          user: { connect: { id: userId } },
        });
        insertedExpensesCount++;
      }
    }

    let insertedGoalsCount = 0;
    if (Array.isArray(input.goals) && input.goals.length > 0) {
      for (const g of input.goals) {
        if (!g.name) continue;
        await SyncRepository.createGoal({
          name: String(g.name).trim(),
          targetAmount: new Prisma.Decimal(g.target || g.targetAmount || 0),
          currentAmount: new Prisma.Decimal(g.current || g.currentAmount || 0),
          deadline: g.deadline ? new Date(g.deadline) : null,
          color: g.color || '#F59E0B',
          user: { connect: { id: userId } },
        });
        insertedGoalsCount++;
      }
    }

    let insertedRecurringCount = 0;
    if (Array.isArray(input.recurringExpenses) && input.recurringExpenses.length > 0) {
      for (const r of input.recurringExpenses) {
        const numAmt = new Prisma.Decimal(r.amount || 0);
        if (numAmt.lessThanOrEqualTo(0)) continue;

        const validCatId = await resolveCategoryId(r.categoryId, userId, 'EXPENSE');
        await SyncRepository.createRecurring({
          amount: numAmt,
          category: { connect: { id: validCatId } },
          dayOfMonth: Math.min(Math.max(parseInt(String(r.dayOfMonth), 10) || 1, 1), 31),
          note: r.note ? String(r.note).slice(0, 500) : '',
          type: 'EXPENSE',
          isActive: r.isActive !== false,
          user: { connect: { id: userId } },
        });
        insertedRecurringCount++;
      }
    }

    return {
      expenses: insertedExpensesCount,
      goals: insertedGoalsCount,
      recurring: insertedRecurringCount,
    };
  }
}
