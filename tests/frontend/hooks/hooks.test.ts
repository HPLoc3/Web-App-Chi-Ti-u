import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAIAssistant } from '../../../src/hooks/useAIAssistant';
import * as aiService from '../../../src/utils/aiService';

describe('Frontend Hook Tests: useAIAssistant', () => {
  it('should initialize with welcome message and empty input', () => {
    const { result } = renderHook(() =>
      useAIAssistant({
        expenses: [],
        categoryLimits: {},
        onAddExpense: vi.fn(),
        userName: 'Lộc',
      })
    );

    expect(result.current.messages.length).toBeGreaterThan(0);
    expect(result.current.messages[0].text).toContain('Xin chào Lộc!');
    expect(result.current.input).toBe('');
    expect(result.current.isProcessing).toBe(false);
  });

  it('should handle sendMessage and trigger confirmation on create_expense structured action', async () => {
    const handleAddExpense = vi.fn();

    vi.spyOn(aiService, 'sendToAIAssistant').mockResolvedValue({
      intent: 'CREATE_EXPENSE',
      confidence: 0.95,
      reply: 'Bạn muốn thêm giao dịch này?',
      action: {
        type: 'CREATE_EXPENSE',
        confidence: 0.95,
        requiresConfirmation: true,
        expense: {
          amount: 45000,
          category: 'an_uong',
          categoryName: 'Ăn uống',
          note: 'Phở bò tái',
          date: '2026-08-15',
        },
      },
    });

    const { result } = renderHook(() =>
      useAIAssistant({
        expenses: [],
        categoryLimits: {},
        onAddExpense: handleAddExpense,
        userName: 'Lộc',
      })
    );

    await act(async () => {
      await result.current.sendMessage('Ăn sáng 45k phở bò tái');
    });

    // Should have user message, and bot message with pending transaction
    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.pendingTransaction).toBeDefined();
    expect(lastMsg.pendingTransaction?.amount).toBe(45000);
    expect(lastMsg.pendingTransaction?.note).toBe('Phở bò tái');

    // Confirm transaction
    act(() => {
      result.current.confirmTransaction(lastMsg.id, lastMsg.pendingTransaction!);
    });

    expect(handleAddExpense).toHaveBeenCalledWith({
      amount: 45000,
      categoryId: 'an_uong',
      note: 'Phở bò tái',
      date: '2026-08-15',
    });
  });

  it('should handle cancel transaction properly', async () => {
    const handleAddExpense = vi.fn();

    vi.spyOn(aiService, 'sendToAIAssistant').mockResolvedValue({
      intent: 'CREATE_EXPENSE',
      confidence: 0.9,
      reply: 'Xác nhận giao dịch',
      action: {
        type: 'CREATE_EXPENSE',
        confidence: 0.9,
        requiresConfirmation: true,
        expense: {
          amount: 80000,
          category: 'di_chuyen',
          categoryName: 'Di chuyển',
          note: 'Grab',
          date: '2026-08-15',
        },
      },
    });

    const { result } = renderHook(() =>
      useAIAssistant({
        expenses: [],
        categoryLimits: {},
        onAddExpense: handleAddExpense,
      })
    );

    await act(async () => {
      await result.current.sendMessage('Grab 80k');
    });

    const lastMsg = result.current.messages[result.current.messages.length - 1];
    expect(lastMsg.pendingTransaction?.status).toBe('pending');

    act(() => {
      result.current.cancelTransaction(lastMsg.id);
    });

    const updatedLastMsg = result.current.messages.find((m) => m.id === lastMsg.id);
    expect(updatedLastMsg?.pendingTransaction?.status).toBe('cancelled');
    expect(handleAddExpense).not.toHaveBeenCalled();
  });
});
