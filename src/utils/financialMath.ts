import { Prisma } from '@prisma/client';

/**
 * Financial Calculation Engine for "Sổ Tay Chi Tiêu Thông Minh"
 * - Deterministic arithmetic preventing floating point inaccuracies (e.g. 0.1 + 0.2 != 0.3)
 * - Source-of-Truth math for Money, Percentage Allocations, Net Worth & Goals
 * - Zero external unsafe floating-point dependencies
 */

export class FinancialMath {
  /**
   * Safely converts any number, string, or Decimal into a Prisma.Decimal
   */
  static toDecimal(val: number | string | Prisma.Decimal | null | undefined): Prisma.Decimal {
    if (val === null || val === undefined) {
      return new Prisma.Decimal(0);
    }
    if (val instanceof Prisma.Decimal) {
      return val;
    }
    if (typeof val === 'number') {
      if (isNaN(val) || !isFinite(val)) {
        return new Prisma.Decimal(0);
      }
      return new Prisma.Decimal(val.toString());
    }
    const cleanStr = String(val).replace(/,/g, '').trim();
    if (!cleanStr || isNaN(Number(cleanStr))) {
      return new Prisma.Decimal(0);
    }
    return new Prisma.Decimal(cleanStr);
  }

  /**
   * Adds two monetary amounts deterministically
   */
  static add(a: number | string | Prisma.Decimal, b: number | string | Prisma.Decimal): Prisma.Decimal {
    return this.toDecimal(a).add(this.toDecimal(b));
  }

  /**
   * Subtracts monetary amounts (a - b) deterministically
   */
  static subtract(a: number | string | Prisma.Decimal, b: number | string | Prisma.Decimal): Prisma.Decimal {
    return this.toDecimal(a).sub(this.toDecimal(b));
  }

  /**
   * Multiplies monetary amount by a scalar factor
   */
  static multiply(amount: number | string | Prisma.Decimal, factor: number | string | Prisma.Decimal): Prisma.Decimal {
    return this.toDecimal(amount).mul(this.toDecimal(factor));
  }

  /**
   * Divides monetary amount by a divisor safely (returns 0 if divisor is 0)
   */
  static divide(amount: number | string | Prisma.Decimal, divisor: number | string | Prisma.Decimal): Prisma.Decimal {
    const d = this.toDecimal(divisor);
    if (d.isZero()) {
      return new Prisma.Decimal(0);
    }
    return this.toDecimal(amount).div(d);
  }

  /**
   * Rounds monetary amount to the nearest integer (Standard for VND)
   */
  static roundVND(amount: number | string | Prisma.Decimal): number {
    const dec = this.toDecimal(amount);
    return Math.round(dec.toNumber());
  }

  /**
   * Calculates exact percentage: (part / total) * 100
   * Clamped between 0 and 100, rounded to 1 decimal place or integer
   */
  static calculatePercentage(
    part: number | string | Prisma.Decimal,
    total: number | string | Prisma.Decimal,
    decimalPlaces: number = 1
  ): number {
    const decPart = this.toDecimal(part);
    const decTotal = this.toDecimal(total);

    if (decTotal.lessThanOrEqualTo(0) || decPart.lessThanOrEqualTo(0)) {
      return 0;
    }

    const rawPct = decPart.div(decTotal).mul(100).toNumber();
    if (rawPct <= 0) return 0;
    if (rawPct >= 100) return 100;

    const factor = Math.pow(10, decimalPlaces);
    return Math.round(rawPct * factor) / factor;
  }

  /**
   * Allocates total income across 50/30/20 or custom percentage rules with exact penny/dong balance
   * Guarantees: needs + wants + savings === totalIncome (0 discrepancy)
   */
  static allocateBudget(
    totalIncome: number | string | Prisma.Decimal,
    percentages: { needs: number; wants: number; savings: number } = { needs: 50, wants: 30, savings: 20 }
  ): { needs: Prisma.Decimal; wants: Prisma.Decimal; savings: Prisma.Decimal } {
    const income = this.toDecimal(totalIncome);
    if (income.lessThanOrEqualTo(0)) {
      return {
        needs: new Prisma.Decimal(0),
        wants: new Prisma.Decimal(0),
        savings: new Prisma.Decimal(0),
      };
    }

    const needsAmount = income.mul(percentages.needs).div(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    const wantsAmount = income.mul(percentages.wants).div(100).toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP);
    // Savings receives the exact remainder to prevent 1-dong drift
    const savingsAmount = income.sub(needsAmount).sub(wantsAmount);

    return {
      needs: needsAmount,
      wants: wantsAmount,
      savings: savingsAmount,
    };
  }

  /**
   * Calculates Goal progress deterministically
   */
  static calculateGoalProgress(
    currentAmount: number | string | Prisma.Decimal,
    targetAmount: number | string | Prisma.Decimal
  ): { percent: number; remaining: Prisma.Decimal; isCompleted: boolean } {
    const current = this.toDecimal(currentAmount);
    const target = this.toDecimal(targetAmount);

    if (target.lessThanOrEqualTo(0)) {
      return { percent: 100, remaining: new Prisma.Decimal(0), isCompleted: true };
    }

    const percent = Math.min(100, Math.max(0, current.div(target).mul(100).toDecimalPlaces(1).toNumber()));
    const remaining = target.sub(current);
    const isCompleted = remaining.lessThanOrEqualTo(0);

    return {
      percent,
      remaining: isCompleted ? new Prisma.Decimal(0) : remaining,
      isCompleted,
    };
  }

  /**
   * Calculates Net Savings and Savings Rate
   */
  static calculateSavings(
    income: number | string | Prisma.Decimal,
    expense: number | string | Prisma.Decimal
  ): { netSavings: Prisma.Decimal; savingsRatePercent: number } {
    const decIncome = this.toDecimal(income);
    const decExpense = this.toDecimal(expense);

    const netSavings = decIncome.sub(decExpense);
    const positiveSavings = netSavings.greaterThan(0) ? netSavings : new Prisma.Decimal(0);

    const savingsRatePercent = decIncome.greaterThan(0)
      ? Math.max(0, Math.round(positiveSavings.div(decIncome).mul(100).toNumber()))
      : 0;

    return {
      netSavings,
      savingsRatePercent,
    };
  }
}
