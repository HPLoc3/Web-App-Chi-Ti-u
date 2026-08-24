import { Prisma } from '@prisma/client';
import { prisma } from '../../lib/prisma';
import { SyncRepository } from './sync.repository';
import { SyncClientStateInput, SyncClientStateResult } from './sync.types';
import { resolveCategoryId } from '../../services/category.helper';
import { FinancialMath } from '../../utils/financialMath';
import { FinancialAuditLogger } from '../../utils/financialAudit';

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
    const expenseTxList: Prisma.TransactionCreateManyInput[] = [];
    let netExpenseAmount = new Prisma.Decimal(0);

    if (Array.isArray(input.expenses) && input.expenses.length > 0) {
      for (const exp of input.expenses) {
        const numAmt = FinancialMath.toDecimal(exp.amount);
        if (numAmt.lessThanOrEqualTo(0)) continue;

        const validCatId = await resolveCategoryId(exp.categoryId, userId, 'EXPENSE');
        const expDate = exp.date ? new Date(exp.date) : new Date();

        expenseTxList.push({
          amount: numAmt,
          type: 'EXPENSE',
          note: exp.note ? String(exp.note).slice(0, 500) : '',
          date: isNaN(expDate.getTime()) ? new Date() : expDate,
          walletId: wallet.id,
          categoryId: validCatId,
          userId,
        });

        netExpenseAmount = netExpenseAmount.add(numAmt);
      }
    }

    // Atomic execution for transactions creation and wallet balance adjustment
    if (expenseTxList.length > 0) {
      await SyncRepository.createTransactionsWithWalletAdjustment(
        wallet.id,
        expenseTxList,
        netExpenseAmount.negated()
      );
      insertedExpensesCount = expenseTxList.length;

      FinancialAuditLogger.log({
        userId,
        action: 'TRANSACTION_BULK_CREATE',
        entity: 'Transaction',
        entityId: `sync-${insertedExpensesCount}`,
        walletId: wallet.id,
        amount: netExpenseAmount,
        delta: netExpenseAmount.negated(),
      });
    }

    let insertedGoalsCount = 0;
    if (Array.isArray(input.goals) && input.goals.length > 0) {
      for (const g of input.goals) {
        if (!g.name) continue;
        await SyncRepository.createGoal({
          name: String(g.name).trim(),
          targetAmount: FinancialMath.toDecimal(g.target || g.targetAmount),
          currentAmount: FinancialMath.toDecimal(g.current || g.currentAmount),
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
        const numAmt = FinancialMath.toDecimal(r.amount);
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
