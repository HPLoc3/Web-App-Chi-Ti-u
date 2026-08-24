import { describe, it, expect, beforeEach } from 'vitest';
import { TransactionsService } from '../../../src/modules/transactions/transactions.service';
import { WalletsService } from '../../../src/modules/wallets/wallets.service';
import { devFallbackStore } from '../../../src/lib/devFallbackStore';
import { FinancialMath } from '../../../src/utils/financialMath';

describe('Financial Integrity & Concurrency Safety Tests', () => {
  const userId = 'test-concurrency-user';

  beforeEach(() => {
    devFallbackStore.reset();
  });

  it('should maintain exact wallet balance under 20 concurrent transactions', async () => {
    // Initial wallet balance: 10,000,000 VND
    const wallet = await WalletsService.createWallet(userId, {
      name: 'Ví Tiền Lớn',
      balance: 10000000,
    });

    const expenseAmounts = [
      100000, 250000, 50000, 150000, 300000,
      120000, 80000, 200000, 450000, 90000,
      110000, 230000, 70000, 160000, 310000,
      130000, 95000, 210000, 440000, 85000,
    ];

    const totalExpense = expenseAmounts.reduce((sum, val) => sum + val, 0); // 3,630,000 VND

    // Execute 20 concurrent transactions
    await Promise.all(
      expenseAmounts.map((amt, idx) =>
        TransactionsService.createTransaction(userId, {
          amount: amt,
          type: 'EXPENSE',
          categoryId: 'an_uong',
          walletId: wallet.id,
          date: '2026-03-01',
          note: `Concurrent expense #${idx + 1}`,
        })
      )
    );

    // Verify balance matches exact expectation
    const updatedWallet = await WalletsService.getWalletById(wallet.id, userId);
    const expectedBalance = 10000000 - totalExpense;

    expect(updatedWallet.balance).toBe(expectedBalance);
  });

  it('should atomically update wallet balance when editing a transaction amount and type', async () => {
    // 1. Setup wallet with 5,000,000 VND
    const wallet = await WalletsService.createWallet(userId, {
      name: 'Ví Chính',
      balance: 5000000,
    });

    // 2. Create expense of 1,000,000 VND -> Balance becomes 4,000,000 VND
    const { transaction: tx } = await TransactionsService.createTransaction(userId, {
      amount: 1000000,
      type: 'EXPENSE',
      categoryId: 'an_uong',
      walletId: wallet.id,
      date: '2026-03-01',
      note: 'Initial expense',
    });

    let w = await WalletsService.getWalletById(wallet.id, userId);
    expect(w.balance).toBe(4000000);

    // 3. Update expense to 1,500,000 VND -> Balance becomes 3,500,000 VND
    await TransactionsService.updateTransaction(tx.id, userId, {
      amount: 1500000,
    });

    w = await WalletsService.getWalletById(wallet.id, userId);
    expect(w.balance).toBe(3500000);

    // 4. Update type from EXPENSE (1,500,000) to INCOME (2,000,000)
    // Wallet should be reverted (+1.5M) then credited (+2M) => 3.5M + 1.5M + 2M = 7.0M
    await TransactionsService.updateTransaction(tx.id, userId, {
      type: 'INCOME',
      amount: 2000000,
    });

    w = await WalletsService.getWalletById(wallet.id, userId);
    expect(w.balance).toBe(7000000);

    // 5. Delete transaction -> Balance is reverted by -2M => 5.0M
    await TransactionsService.deleteTransaction(tx.id, userId);
    w = await WalletsService.getWalletById(wallet.id, userId);
    expect(w.balance).toBe(5000000);
  });

  it('should atomically transfer money between wallets without deadlock or balance drift', async () => {
    const walletA = await WalletsService.createWallet(userId, { name: 'Ví Techcombank', balance: 5000000 });
    const walletB = await WalletsService.createWallet(userId, { name: 'Ví Momo', balance: 1000000 });

    const transferAmount = 2000000;
    const result = await WalletsService.transferBetweenWallets(userId, walletA.id, walletB.id, transferAmount, 'Chuyển tiền tiết kiệm');

    expect(result.fromWallet.balance).toBe(3000000);
    expect(result.toWallet.balance).toBe(3000000);

    const reloadedA = await WalletsService.getWalletById(walletA.id, userId);
    const reloadedB = await WalletsService.getWalletById(walletB.id, userId);

    expect(reloadedA.balance).toBe(3000000);
    expect(reloadedB.balance).toBe(3000000);
  });

  it('should reject transfers to the same wallet or with non-positive amounts', async () => {
    const wallet = await WalletsService.createWallet(userId, { name: 'Ví Độc Lập', balance: 2000000 });

    await expect(
      WalletsService.transferBetweenWallets(userId, wallet.id, wallet.id, 500000)
    ).rejects.toThrow('Ví nguồn và ví đích không được trùng nhau.');

    const targetWallet = await WalletsService.createWallet(userId, { name: 'Ví Khác', balance: 500000 });
    await expect(
      WalletsService.transferBetweenWallets(userId, wallet.id, targetWallet.id, -100)
    ).rejects.toThrow('Số tiền chuyển phải lớn hơn 0.');
  });
});
