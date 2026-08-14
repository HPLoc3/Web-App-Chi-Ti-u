import { useState, useCallback, useRef } from 'react';
import { Expense, Goal } from '../types';
import { sendToAIAssistant, AIResponseData } from '../utils/aiService';

export interface PendingTransaction {
  id: string;
  amount: number;
  category: string;
  categoryName: string;
  date: string;
  note: string;
  confidence: number;
  status: 'pending' | 'confirmed' | 'cancelled';
  isEditing?: boolean;
  explanation?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isWarning?: boolean;
  isThinking?: boolean;
  pendingTransaction?: PendingTransaction;
  financialReply?: string;
  isFallback?: boolean;
}

interface UseAIAssistantOptions {
  expenses: Expense[];
  categoryLimits: Record<string, number>;
  goals?: Goal[];
  income?: number;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  userName?: string;
}

export function useAIAssistant({
  expenses,
  categoryLimits,
  goals = [],
  income = 15000000,
  onAddExpense,
  userName = 'bạn',
}: UseAIAssistantOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${userName}! 🤖 Mình là Trợ lý AI Tài chính Sổ Tay.\n\nBạn có thể nhắn tự nhiên để ghi chi tiêu (ví dụ: "ăn sáng 35k", "đi Grab 85k hôm qua") hoặc hỏi phân tích tài chính (ví dụ: "Tháng này tôi tiêu bao nhiêu?", "Top 3 khoản chi lớn nhất?").`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = useCallback(
    async (textToSend?: string) => {
      const msgText = (textToSend || input).trim();
      if (!msgText || isProcessing) return;

      const userMsgId = Date.now().toString();
      const userMessage: ChatMessage = {
        id: userMsgId,
        sender: 'user',
        text: msgText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInput('');
      setIsProcessing(true);

      const thinkingId = `thinking-${Date.now()}`;
      const thinkingMessage: ChatMessage = {
        id: thinkingId,
        sender: 'bot',
        text: '🤖 AI đang suy nghĩ & phân tích câu nói của bạn...',
        timestamp: new Date(),
        isThinking: true,
      };

      setMessages((prev) => [...prev, thinkingMessage]);

      const currentDate = new Date().toISOString().split('T')[0];
      const context = {
        currentDate,
        expenses,
        goals,
        categoryLimits,
        income,
      };

      try {
        const aiResult: AIResponseData = await sendToAIAssistant(msgText, context);

        setMessages((prev) => prev.filter((m) => m.id !== thinkingId));

        if (aiResult.intent === 'create_expense' && aiResult.amount && aiResult.amount > 0) {
          const pendingTx: PendingTransaction = {
            id: `pending-${Date.now()}`,
            amount: aiResult.amount,
            category: aiResult.category || 'khac',
            categoryName: aiResult.categoryName || 'Khác',
            date: aiResult.date || currentDate,
            note: aiResult.note || aiResult.categoryName || 'Chi tiêu',
            confidence: aiResult.confidence || 0.85,
            status: 'pending',
            explanation: aiResult.explanation,
          };

          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: aiResult.isLowConfidence
              ? `⚠️ Mình nhận diện được chi tiêu nhưng độ tin cậy chưa cao. Vui lòng kiểm tra và xác nhận lại nhé:`
              : `✨ Đã bóc tách được giao dịch từ tin nhắn của bạn. Bạn xác nhận ghi chép này nhé:`,
            timestamp: new Date(),
            pendingTransaction: pendingTx,
            isWarning: aiResult.isLowConfidence,
            isFallback: aiResult.isFallback,
          };

          setMessages((prev) => [...prev, botMsg]);
        } else if (aiResult.intent === 'financial_query') {
          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: aiResult.reply || 'Dưới đây là thống kê tài chính của bạn:',
            timestamp: new Date(),
            financialReply: aiResult.reply,
            isFallback: aiResult.isFallback,
          };
          setMessages((prev) => [...prev, botMsg]);
        } else {
          const botMsg: ChatMessage = {
            id: `bot-${Date.now()}`,
            sender: 'bot',
            text: aiResult.reply || 'Xin chào! Bạn muốn ghi chép chi tiêu hay hỏi đáp thống kê tài chính?',
            timestamp: new Date(),
            isFallback: aiResult.isFallback,
          };
          setMessages((prev) => [...prev, botMsg]);
        }
      } catch (err) {
        console.error('Error handling AI message:', err);
        setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
        setMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            sender: 'bot',
            text: '❌ Có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau giây lát!',
            timestamp: new Date(),
            isWarning: true,
          },
        ]);
      } finally {
        setIsProcessing(false);
      }
    },
    [input, isProcessing, expenses, goals, categoryLimits, income]
  );

  const confirmTransaction = useCallback(
    (messageId: string, tx: PendingTransaction) => {
      onAddExpense({
        amount: tx.amount,
        categoryId: tx.category,
        date: tx.date,
        note: tx.note,
      });

      setMessages((prev) =>
        prev.map((msg) => {
          if (msg.id === messageId && msg.pendingTransaction) {
            return {
              ...msg,
              text: `✅ Đã lưu giao dịch: **${tx.note}** — **${tx.amount.toLocaleString('vi-VN')}₫** vào sổ tay!`,
              pendingTransaction: {
                ...msg.pendingTransaction,
                status: 'confirmed',
              },
            };
          }
          return msg;
        })
      );
    },
    [onAddExpense]
  );

  const cancelTransaction = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((msg) => {
        if (msg.id === messageId && msg.pendingTransaction) {
          return {
            ...msg,
            text: `🚫 Đã hủy bỏ ghi chép giao dịch này.`,
            pendingTransaction: {
              ...msg.pendingTransaction,
              status: 'cancelled',
            },
          };
        }
        return msg;
      })
    );
  }, []);

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: 'welcome',
        sender: 'bot',
        text: `Xin chào ${userName}! 🤖 Mình là Trợ lý AI Tài chính Sổ Tay. Bắt đầu phiên trò chuyện mới.`,
        timestamp: new Date(),
      },
    ]);
  }, [userName]);

  return {
    messages,
    setMessages,
    input,
    setInput,
    isProcessing,
    sendMessage,
    confirmTransaction,
    cancelTransaction,
    clearChat,
  };
}
