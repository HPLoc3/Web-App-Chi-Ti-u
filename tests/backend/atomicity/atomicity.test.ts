import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { prisma } from '../../../src/lib/prisma';
import { Prisma } from '@prisma/client';

describe('Database Transaction Atomicity Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should execute wallet update and transaction creation in a single atomic database transaction', async () => {
    let transactionCallbackCalled = false;
    let walletUpdateCalled = false;
    let txCreateCalled = false;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      transactionCallbackCalled = true;
      const fakeTx = {
        wallet: {
          update: vi.fn().mockImplementation(async () => {
            walletUpdateCalled = true;
            return {
              id: 'wallet-1',
              name: 'Ví Chính',
              balance: new Prisma.Decimal(950000),
            };
          }),
        },
        transaction: {
          create: vi.fn().mockImplementation(async () => {
            txCreateCalled = true;
            return {
              id: 'tx-1',
              amount: new Prisma.Decimal(50000),
              type: 'EXPENSE',
              walletId: 'wallet-1',
            };
          }),
        },
      };
      return callback(fakeTx);
    });

    const result = await TransactionsRepository.createWithWalletUpdate(
      {
        amount: new Prisma.Decimal(50000),
        type: 'EXPENSE',
        note: 'Tiền xăng',
        date: new Date(),
      } as any,
      'wallet-1',
      new Prisma.Decimal(-50000)
    );

    expect(transactionCallbackCalled).toBe(true);
    expect(walletUpdateCalled).toBe(true);
    expect(txCreateCalled).toBe(true);
    expect(result.wallet.balance.toNumber()).toBe(950000);
  });

  it('should rollback and throw error when transaction creation fails inside atomic block', async () => {
    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const fakeTx = {
        wallet: {
          update: vi.fn().mockResolvedValue({ id: 'wallet-1', balance: new Prisma.Decimal(950000) }),
        },
        transaction: {
          create: vi.fn().mockRejectedValue(new Error('DATABASE_CONSTRAINT_VIOLATION')),
        },
      };
      return callback(fakeTx);
    });

    await expect(
      TransactionsRepository.createWithWalletUpdate(
        { amount: new Prisma.Decimal(50000), type: 'EXPENSE' } as any,
        'wallet-1',
        new Prisma.Decimal(-50000)
      )
    ).rejects.toThrow('DATABASE_CONSTRAINT_VIOLATION');
  });

  it('should atomically revert wallet balance when deleting a transaction', async () => {
    let walletIncrementCalledWith: any = null;

    vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
      const fakeTx = {
        wallet: {
          update: vi.fn().mockImplementation(async ({ data }: any) => {
            walletIncrementCalledWith = data.balance.increment;
            return { id: 'wallet-1', balance: new Prisma.Decimal(1000000) };
          }),
        },
        transaction: {
          delete: vi.fn().mockResolvedValue({ id: 'tx-to-delete' }),
        },
      };
      return callback(fakeTx);
    });

    // Reverting an expense of 50k means incrementing wallet by +50k
    await TransactionsRepository.deleteWithWalletAdjustment(
      'tx-to-delete',
      'wallet-1',
      new Prisma.Decimal(50000)
    );

    expect(walletIncrementCalledWith.toNumber()).toBe(50000);
  });
});
