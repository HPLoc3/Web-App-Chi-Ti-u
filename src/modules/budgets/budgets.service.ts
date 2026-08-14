import { Prisma } from '@prisma/client';
import { BudgetsRepository } from './budgets.repository';
import { BudgetDTO, UpdateBudgetInput } from './budgets.types';
import { resolveCategoryId } from '../../services/category.helper';

export class BudgetsService {
  private static formatBudget(budget: any): BudgetDTO {
    const template = budget.budgetTemplate || '50_30_20';
    let needsPercent = 50;
    let wantsPercent = 30;
    let savingsPercent = 20;

    if (template === '70_20_10') {
      needsPercent = 70;
      wantsPercent = 20;
      savingsPercent = 10;
    } else if (template === '60_20_20') {
      needsPercent = 60;
      wantsPercent = 20;
      savingsPercent = 20;
    }

    const categoryLimitsMap: Record<string, number> = {};
    const limitsList: Array<{ categoryId: string; categoryName: string; amount: number }> = [];

    if (budget.budgetLimits && Array.isArray(budget.budgetLimits)) {
      budget.budgetLimits.forEach((lim: any) => {
        const amt = Number(lim.amount);
        categoryLimitsMap[lim.categoryId] = amt;
        limitsList.push({
          categoryId: lim.categoryId,
          categoryName: lim.category?.name || 'Khác',
          amount: amt,
        });
      });
    }

    return {
      id: budget.id,
      income: Number(budget.income || 25000000),
      budgetTemplate: template,
      needsPercent,
      wantsPercent,
      savingsPercent,
      categoryLimits: categoryLimitsMap,
      limits: limitsList,
    };
  }

  static async getBudget(userId: string): Promise<BudgetDTO> {
    let budget = await BudgetsRepository.findByUserId(userId);
    if (!budget) {
      budget = (await BudgetsRepository.createDefault(userId)) as any;
      budget = await BudgetsRepository.findByUserId(userId);
    }
    return this.formatBudget(budget);
  }

  static async updateBudget(userId: string, input: UpdateBudgetInput): Promise<BudgetDTO> {
    const updateData: Prisma.BudgetUpdateInput = {};
    const createData: Prisma.BudgetCreateInput = {
      income: new Prisma.Decimal(25000000),
      budgetTemplate: '50_30_20',
      user: { connect: { id: userId } },
    };

    if (input.income !== undefined) {
      const numIncome = new Prisma.Decimal(Math.max(Number(input.income) || 0, 0));
      updateData.income = numIncome;
      createData.income = numIncome;
    }

    if (input.budgetTemplate !== undefined) {
      updateData.budgetTemplate = input.budgetTemplate;
      createData.budgetTemplate = input.budgetTemplate;
    }

    await BudgetsRepository.updateBudgetAndLimits(
      userId,
      updateData,
      createData,
      input.categoryLimits,
      resolveCategoryId
    );

    const reloaded = await BudgetsRepository.findByUserId(userId);
    return this.formatBudget(reloaded);
  }
}
