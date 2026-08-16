import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TransactionsService } from '../../../src/modules/transactions/transactions.service';
import { TransactionsRepository } from '../../../src/modules/transactions/transactions.repository';
import { AuthService } from '../../../src/modules/auth/auth.service';
import { BudgetsService } from '../../../src/modules/budgets/budgets.service';
import { GoalsService } from '../../../src/modules/goals/goals.service';
import { Prisma } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

describe('Unit Tests: Backend Services', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('TransactionsService', () => {
    it('should format transaction properly', () => {
      const rawTx = {
        id: 'tx-123',
        amount: new Prisma.Decimal(50000),
        categoryId: 'an-uong',
        category: { name: 'Ăn uống', icon: 'Utensils', color: '#10B981' },
        type: 'EXPENSE',
        note: 'Cơm trưa',
        date: new Date('2026-08-15T12:00:00Z'),
        walletId: 'wallet-1',
        wallet: { name: 'Ví Chính' },
        userId: 'user-1',
        createdAt: new Date('2026-08-15T12:00:00Z'),
        updatedAt: new Date('2026-08-15T12:00:00Z'),
      };

      const formatted = (TransactionsService as any).formatTransaction(rawTx);
      expect(formatted.id).toBe('tx-123');
      expect(formatted.amount).toBe(50000);
      expect(formatted.categoryName).toBe('Ăn uống');
      expect(formatted.icon).toBe('Utensils');
      expect(formatted.date).toBe('2026-08-15');
    });

    it('should throw error when creating transaction with non-positive amount', async () => {
      await expect(
        TransactionsService.createTransaction('user-1', {
          amount: 0,
          categoryId: 'an-uong',
          type: 'EXPENSE',
        })
      ).rejects.toThrow('Số tiền phải lớn hơn 0.');

      await expect(
        TransactionsService.createTransaction('user-1', {
          amount: -50000,
          categoryId: 'an-uong',
          type: 'EXPENSE',
        })
      ).rejects.toThrow('Số tiền phải lớn hơn 0.');
    });

    it('should successfully get transaction by ID if user is owner', async () => {
      const mockTx = {
        id: 'tx-owner-1',
        amount: new Prisma.Decimal(120000),
        categoryId: 'mua-sam',
        category: { name: 'Mua sắm', icon: 'ShoppingBag', color: '#F59E0B' },
        type: 'EXPENSE',
        note: 'Áo thun',
        date: new Date('2026-08-10'),
        walletId: 'wallet-1',
        wallet: { name: 'Ví Chính' },
        userId: 'user-owner',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.spyOn(TransactionsRepository, 'findById').mockResolvedValue(mockTx as any);

      const result = await TransactionsService.getTransactionById('tx-owner-1', 'user-owner');
      expect(result.id).toBe('tx-owner-1');
      expect(result.amount).toBe(120000);
      expect(result.categoryName).toBe('Mua sắm');
    });

    it('should throw 403 Forbidden when user attempts to get another user transaction', async () => {
      const mockTx = {
        id: 'tx-user-b',
        amount: new Prisma.Decimal(500000),
        userId: 'user-b-id',
      };

      vi.spyOn(TransactionsRepository, 'findById').mockResolvedValue(mockTx as any);

      await expect(
        TransactionsService.getTransactionById('tx-user-b', 'user-a-id')
      ).rejects.toMatchObject({
        statusCode: 403,
        code: 'FORBIDDEN_ACCESS',
      });
    });

    it('should throw 404 when transaction does not exist', async () => {
      vi.spyOn(TransactionsRepository, 'findById').mockResolvedValue(null);

      await expect(
        TransactionsService.getTransactionById('non-existent-id', 'user-1')
      ).rejects.toMatchObject({
        statusCode: 404,
        code: 'TRANSACTION_NOT_FOUND',
      });
    });
  });

  describe('AuthService Password & Token Logic', () => {
    it('should correctly hash password and verify with bcrypt', async () => {
      const password = 'SecurePassword123!';
      const salt = await bcrypt.genSalt(10);
      const hash = await bcrypt.hash(password, salt);

      const isMatch = await bcrypt.compare(password, hash);
      const isMismatch = await bcrypt.compare('WrongPassword', hash);

      expect(isMatch).toBe(true);
      expect(isMismatch).toBe(false);
    });

    it('should sign and verify JWT tokens securely', () => {
      const payload = { id: 'u-1', email: 'test@example.com', name: 'Tester' };
      const secret = 'test-secret-key-32-chars-minimum-length!';

      const token = jwt.sign(payload, secret, { expiresIn: '1h' });
      const decoded: any = jwt.verify(token, secret);

      expect(decoded.id).toBe('u-1');
      expect(decoded.email).toBe('test@example.com');
    });
  });
});
