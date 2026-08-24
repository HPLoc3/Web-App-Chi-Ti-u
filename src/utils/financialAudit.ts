import { Logger } from './logger';
import { Prisma } from '@prisma/client';

export type FinancialActionType =
  | 'TRANSACTION_CREATE'
  | 'TRANSACTION_UPDATE'
  | 'TRANSACTION_DELETE'
  | 'TRANSACTION_BULK_CREATE'
  | 'TRANSACTION_BULK_DELETE'
  | 'WALLET_CREATE'
  | 'WALLET_UPDATE'
  | 'WALLET_DELETE'
  | 'WALLET_TRANSFER'
  | 'RECURRING_SYNC'
  | 'BUDGET_UPDATE'
  | 'GOAL_UPDATE';

export interface FinancialAuditEvent {
  userId: string;
  action: FinancialActionType;
  entity: 'Transaction' | 'Wallet' | 'Budget' | 'Goal' | 'RecurringTransaction';
  entityId: string;
  walletId?: string;
  targetWalletId?: string;
  amount?: number | string | Prisma.Decimal;
  previousBalance?: number | string | Prisma.Decimal;
  newBalance?: number | string | Prisma.Decimal;
  delta?: number | string | Prisma.Decimal;
  currency?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

export class FinancialAuditLogger {
  /**
   * Records a structured financial transaction audit entry
   */
  static log(event: FinancialAuditEvent): void {
    const formattedMeta: Record<string, any> = {
      auditType: 'FINANCIAL_INTEGRITY_AUDIT',
      userId: event.userId,
      action: event.action,
      entity: event.entity,
      entityId: event.entityId,
      timestamp: new Date().toISOString(),
      ...(event.walletId ? { walletId: event.walletId } : {}),
      ...(event.targetWalletId ? { targetWalletId: event.targetWalletId } : {}),
      ...(event.amount !== undefined ? { amount: event.amount.toString() } : {}),
      ...(event.delta !== undefined ? { delta: event.delta.toString() } : {}),
      ...(event.previousBalance !== undefined ? { previousBalance: event.previousBalance.toString() } : {}),
      ...(event.newBalance !== undefined ? { newBalance: event.newBalance.toString() } : {}),
      currency: event.currency || 'VND',
      ...(event.metadata || {}),
    };

    Logger.info(
      `[FINANCIAL_AUDIT] User ${event.userId} performed ${event.action} on ${event.entity}:${event.entityId}`,
      formattedMeta,
      event.requestId
    );
  }
}
