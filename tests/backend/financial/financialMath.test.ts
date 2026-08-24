import { describe, it, expect } from 'vitest';
import { FinancialMath } from '../../../src/utils/financialMath';
import { Prisma } from '@prisma/client';

describe('Financial Math & Decimal Precision Engine Tests', () => {
  it('should eliminate standard JavaScript 64-bit floating point errors (e.g., 0.1 + 0.2 = 0.3)', () => {
    // Standard JS: 0.1 + 0.2 === 0.30000000000000004
    const result = FinancialMath.add(0.1, 0.2);
    expect(result.toString()).toBe('0.3');
  });

  it('should accurately handle large VND currency amounts without loss of precision', () => {
    const salary = '25000000';
    const bonus = '15500250.75';
    const expense = '8250125.25';

    const totalIncome = FinancialMath.add(salary, bonus);
    expect(totalIncome.toString()).toBe('40500250.75');

    const net = FinancialMath.subtract(totalIncome, expense);
    expect(net.toString()).toBe('32250125.5');
  });

  it('should allocate 50/30/20 budget with exact penny/dong balance (sum strictly equals total income)', () => {
    // Total income with odd divisions (e.g., 25,000,001 VND)
    const income = new Prisma.Decimal(25000001);
    const allocation = FinancialMath.allocateBudget(income, { needs: 50, wants: 30, savings: 20 });

    const totalAllocated = allocation.needs.add(allocation.wants).add(allocation.savings);
    expect(totalAllocated.toString()).toBe(income.toString());
  });

  it('should calculate exact goal progress percentages without division-by-zero or NaN', () => {
    const zeroTarget = FinancialMath.calculateGoalProgress(500000, 0);
    expect(zeroTarget.percent).toBe(100);
    expect(zeroTarget.isCompleted).toBe(true);

    const normalProgress = FinancialMath.calculateGoalProgress(15000000, 30000000);
    expect(normalProgress.percent).toBe(50);
    expect(normalProgress.remaining.toString()).toBe('15000000');
    expect(normalProgress.isCompleted).toBe(false);

    const exceededGoal = FinancialMath.calculateGoalProgress(35000000, 30000000);
    expect(exceededGoal.percent).toBe(100);
    expect(exceededGoal.remaining.toString()).toBe('0');
    expect(exceededGoal.isCompleted).toBe(true);
  });

  it('should calculate deterministic savings rate', () => {
    const { netSavings, savingsRatePercent } = FinancialMath.calculateSavings(25000000, 15000000);
    expect(netSavings.toString()).toBe('10000000');
    expect(savingsRatePercent).toBe(40);

    const deficit = FinancialMath.calculateSavings(10000000, 15000000);
    expect(deficit.netSavings.toString()).toBe('-5000000');
    expect(deficit.savingsRatePercent).toBe(0);
  });
});
