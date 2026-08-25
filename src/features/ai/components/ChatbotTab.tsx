import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  User,
  HelpCircle,
  LogIn,
  Edit2,
  Bot,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Trash2,
  ArrowRight,
  Zap,
  RotateCcw,
  Calendar,
  Layers,
  CheckCheck,
} from 'lucide-react';
import { Expense, Goal, RecurringExpense } from '../../../types';
import { formatCurrency, formatDateVietnamese } from '../../../utils/format';
import { getBusinessDate } from '../../../utils/dateParser';
import { CATEGORIES } from '../../../constants/categories';
import { AppUser } from '../../../context/AuthContext';
import {
  sendToAIAssistant,
  fetchAiQuota,
  StructuredAction,
  FinancialSummary,
  FinancialIntent,
} from '../../../utils/aiService';

export interface PendingActionState {
  id: string;
  type: 'CREATE_EXPENSE' | 'UPDATE_EXPENSE' | 'DELETE_EXPENSE';
  amount: number;
  currency?: string;
  category: string;
  categoryName: string;
  date: string; // YYYY-MM-DD
  dateExpression?: string;
  dateType?: string;
  note: string;
  targetExpenseId?: string;
  targetSummary?: string;
  originalExpense?: {
    id: string;
    amount: number;
    category: string;
    categoryName: string;
    date: string;
    note: string;
  };
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
  intent?: FinancialIntent;
  isWarning?: boolean;
  isThinking?: boolean;
  pendingActions?: PendingActionState[];
  pendingAction?: PendingActionState; // for backward compatibility
  financialSummary?: FinancialSummary;
  isFallback?: boolean;
}

interface ChatbotTabProps {
  expenses: Expense[];
  categoryLimits: Record<string, number>;
  goals?: Goal[];
  income?: number;
  recurringExpenses?: RecurringExpense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<void> | void;
  onAddBulkExpenses?: (expenses: Omit<Expense, 'id'>[]) => Promise<void> | void;
  onUpdateExpense?: (expense: Expense) => Promise<void> | void;
  onDeleteExpense?: (id: string) => Promise<void> | void;
  currentUser: AppUser | null;
  onOpenAuthModal: () => void;
}

export default function ChatbotTab({
  expenses,
  categoryLimits,
  goals = [],
  income = 15000000,
  recurringExpenses = [],
  onAddExpense,
  onAddBulkExpenses,
  onUpdateExpense,
  onDeleteExpense,
  currentUser,
  onOpenAuthModal,
}: ChatbotTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${currentUser?.displayName || currentUser?.email || 'bạn'}! 🤖 Mình là **Financial Copilot** của Sổ Tay Chi Tiêu.\n\n🔒 **Cam kết bảo mật & Chuẩn xác**: Copilot **không bao giờ tự ý ghi/sửa/xóa dữ liệu** mà luôn hiển thị thẻ **[Xác nhận]** để bạn phê duyệt, hỗ trợ nhận diện nhiều giao dịch ("Hôm nay mua sữa 15k, mua cafe 25k") và ngày thông minh ("hôm qua", "thứ 2 tuần trước", "15/08").\n\nBạn có thể thử:\n• ✍️ **Ghi nhanh 1 hoặc nhiều giao dịch**: *"Hôm nay mua sữa 15k, mua cafe 25k"*, *"Hôm qua ăn cơm 15k, đổ xăng 50k"*\n• 📊 **Truy vấn**: *"Tháng này tôi tiêu bao nhiêu?"*, *"Tôi có vượt ngân sách không?"*\n• 🔮 **Dự báo**: *"Dự báo dòng tiền cuối tháng"*, *"Bao lâu nữa mua được Laptop?"*`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [quota, setQuota] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial quota on mount if user is logged in
  useEffect(() => {
    if (currentUser) {
      fetchAiQuota().then((q) => {
        if (q) setQuota(q);
      });
    }
  }, [currentUser]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  const handleSend = async (e?: React.FormEvent, customText?: string) => {
    if (e) e.preventDefault();
    const userMsgText = (customText || input).trim();
    if (!userMsgText || isProcessing) return;

    const userMsgId = Date.now().toString();

    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customText) setInput('');
    setIsProcessing(true);

    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      sender: 'bot',
      text: '🤖 Financial Copilot đang phân tích số liệu tài chính & chuẩn hóa thời gian...',
      timestamp: new Date(),
      isThinking: true,
    };

    setMessages((prev) => [...prev, thinkingMessage]);

    // Use safe business date in Asia/Ho_Chi_Minh
    const currentDate = getBusinessDate();
    const context = {
      currentDate,
      expenses,
      goals,
      categoryLimits,
      income,
      recurringExpenses,
    };

    const aiResult = await sendToAIAssistant(userMsgText, context, !!currentUser);

    // Update quota if returned from server
    if (aiResult.quota) {
      setQuota({
        used: aiResult.quota.usedToday,
        limit: aiResult.quota.limitToday,
        remaining: aiResult.quota.remainingToday,
      });
    }

    setMessages((prev) => prev.filter((m) => m.id !== thinkingId));
    setIsProcessing(false);

    const botMessageId = `bot-${Date.now()}`;

    // Extract list of structured actions (supporting multiple actions)
    const rawActionList: StructuredAction[] = Array.isArray(aiResult.actions) && aiResult.actions.length > 0
      ? aiResult.actions
      : aiResult.action && aiResult.action.type !== 'NONE' && aiResult.action.expense
      ? [aiResult.action]
      : [];

    if (rawActionList.length > 0) {
      const pendingActions: PendingActionState[] = rawActionList.map((act, index) => {
        const exp = act.expense!;
        return {
          id: `action-${Date.now()}-${index}`,
          type: act.type as any,
          amount: exp.amount,
          currency: exp.currency || 'VND',
          category: exp.category,
          categoryName: exp.categoryName,
          date: exp.date,
          dateExpression: exp.dateExpression,
          dateType: exp.dateType,
          note: exp.note,
          targetExpenseId: act.targetExpenseId || exp.id,
          targetSummary: act.targetSummary,
          originalExpense: exp.originalExpense,
          confidence: Math.round((act.confidence || 0.9) * 100),
          explanation: act.explanation,
          status: 'pending',
          isEditing: false,
        };
      });

      let promptTitle = '';
      if (pendingActions.length === 1) {
        const single = pendingActions[0];
        promptTitle =
          single.type === 'CREATE_EXPENSE'
            ? 'Bạn muốn thêm giao dịch này vào sổ?'
            : single.type === 'UPDATE_EXPENSE'
            ? 'Bạn muốn cập nhật giao dịch này?'
            : 'Bạn có chắc chắn muốn xóa giao dịch này?';
      } else {
        const total = pendingActions.reduce((sum, a) => sum + a.amount, 0);
        promptTitle = `Tôi đã nhận diện được **${pendingActions.length} giao dịch** (Tổng: **${formatCurrency(total)}**). Bạn có muốn lưu vào sổ không?`;
      }

      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        intent: aiResult.intent,
        text: promptTitle,
        timestamp: new Date(),
        pendingActions,
        pendingAction: pendingActions[0],
        financialSummary: aiResult.financialSummary,
        isFallback: aiResult.isFallback,
      };

      setMessages((prev) => [...prev, botMessage]);
    } else {
      // Query / Analysis / Forecast / General Chat
      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        intent: aiResult.intent,
        text: aiResult.reply,
        timestamp: new Date(),
        financialSummary: aiResult.financialSummary,
        isFallback: aiResult.isFallback,
      };

      setMessages((prev) => [...prev, botMessage]);
    }
  };

  // Confirm Single Action within a batch
  const handleConfirmSingleAction = async (msgId: string, actionId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    const act = (targetMsg.pendingActions || (targetMsg.pendingAction ? [targetMsg.pendingAction] : [])).find(
      (a) => a.id === actionId
    );
    if (!act || act.status !== 'pending') return;

    try {
      if (act.type === 'CREATE_EXPENSE') {
        await onAddExpense({
          amount: act.amount,
          categoryId: act.category,
          note: act.note,
          date: act.date,
        });
      } else if (act.type === 'UPDATE_EXPENSE') {
        if (act.targetExpenseId && onUpdateExpense) {
          await onUpdateExpense({
            id: act.targetExpenseId,
            amount: act.amount,
            categoryId: act.category,
            note: act.note,
            date: act.date,
          });
        } else {
          await onAddExpense({
            amount: act.amount,
            categoryId: act.category,
            note: act.note,
            date: act.date,
          });
        }
      } else if (act.type === 'DELETE_EXPENSE') {
        if (act.targetExpenseId && onDeleteExpense) {
          await onDeleteExpense(act.targetExpenseId);
        }
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) =>
              a.id === actionId ? { ...a, status: 'confirmed' as const, isEditing: false } : a
            );
            return {
              ...m,
              pendingActions: updatedActions,
              pendingAction: updatedActions[0],
            };
          }
          return m;
        })
      );

      // Check budget limit alert
      checkBudgetLimitAlert(act.category, act.categoryName, act.amount, act.date);
    } catch (err: any) {
      console.error('Error confirming transaction:', err);
    }
  };

  // Cancel Single Action within a batch
  const handleCancelSingleAction = (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) =>
            a.id === actionId ? { ...a, status: 'cancelled' as const, isEditing: false } : a
          );
          return {
            ...m,
            pendingActions: updatedActions,
            pendingAction: updatedActions[0],
          };
        }
        return m;
      })
    );
  };

  // Remove Single Action from the list
  const handleRemoveSingleAction = (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).filter(
            (a) => a.id !== actionId
          );
          return {
            ...m,
            pendingActions: updatedActions,
            pendingAction: updatedActions[0] || undefined,
          };
        }
        return m;
      })
    );
  };

  // Toggle Edit for Single Action
  const handleToggleEditSingleAction = (msgId: string, actionId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) =>
            a.id === actionId ? { ...a, isEditing: !a.isEditing } : a
          );
          return {
            ...m,
            pendingActions: updatedActions,
            pendingAction: updatedActions[0],
          };
        }
        return m;
      })
    );
  };

  // Update Field for Single Action
  const handleUpdateSingleActionField = (
    msgId: string,
    actionId: string,
    field: keyof PendingActionState,
    value: any
  ) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) => {
            if (a.id === actionId) {
              const updated = { ...a, [field]: value };
              if (field === 'category') {
                const catObj = CATEGORIES.find((c) => c.id === value);
                if (catObj) updated.categoryName = catObj.name;
              }
              return updated;
            }
            return a;
          });
          return {
            ...m,
            pendingActions: updatedActions,
            pendingAction: updatedActions[0],
          };
        }
        return m;
      })
    );
  };

  // Confirm All Pending Actions in a Message (Bulk Creation Support)
  const handleConfirmAllActions = async (msgId: string) => {
    const targetMsg = messages.find((m) => m.id === msgId);
    if (!targetMsg) return;

    const actionList = targetMsg.pendingActions || (targetMsg.pendingAction ? [targetMsg.pendingAction] : []);
    const pendingList = actionList.filter((a) => a.status === 'pending');
    if (pendingList.length === 0) return;

    try {
      const creates = pendingList.filter((a) => a.type === 'CREATE_EXPENSE');
      const updates = pendingList.filter((a) => a.type === 'UPDATE_EXPENSE');
      const deletes = pendingList.filter((a) => a.type === 'DELETE_EXPENSE');

      // 1. Process Creates (using bulk API if multiple)
      if (creates.length > 1 && onAddBulkExpenses) {
        const payload = creates.map((c) => ({
          amount: c.amount,
          categoryId: c.category,
          note: c.note,
          date: c.date,
        }));
        await onAddBulkExpenses(payload);
      } else if (creates.length > 0) {
        for (const c of creates) {
          await onAddExpense({
            amount: c.amount,
            categoryId: c.category,
            note: c.note,
            date: c.date,
          });
        }
      }

      // 2. Process Updates
      for (const u of updates) {
        if (u.targetExpenseId && onUpdateExpense) {
          await onUpdateExpense({
            id: u.targetExpenseId,
            amount: u.amount,
            categoryId: u.category,
            note: u.note,
            date: u.date,
          });
        } else {
          await onAddExpense({
            amount: u.amount,
            categoryId: u.category,
            note: u.note,
            date: u.date,
          });
        }
      }

      // 3. Process Deletes
      for (const d of deletes) {
        if (d.targetExpenseId && onDeleteExpense) {
          await onDeleteExpense(d.targetExpenseId);
        }
      }

      // Update message state
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId) {
            const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) =>
              a.status === 'pending' ? { ...a, status: 'confirmed' as const, isEditing: false } : a
            );
            return {
              ...m,
              pendingActions: updatedActions,
              pendingAction: updatedActions[0],
            };
          }
          return m;
        })
      );

      // Check budget warnings
      for (const c of creates) {
        checkBudgetLimitAlert(c.category, c.categoryName, c.amount, c.date);
      }
    } catch (err: any) {
      console.error('Error confirming all transactions:', err);
    }
  };

  // Cancel All Actions in a Message
  const handleCancelAllActions = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId) {
          const updatedActions = (m.pendingActions || (m.pendingAction ? [m.pendingAction] : [])).map((a) =>
            a.status === 'pending' ? { ...a, status: 'cancelled' as const, isEditing: false } : a
          );
          return {
            ...m,
            pendingActions: updatedActions,
            pendingAction: updatedActions[0],
          };
        }
        return m;
      })
    );
  };

  const checkBudgetLimitAlert = (category: string, categoryName: string, amount: number, date: string) => {
    const limit = categoryLimits[category] || 0;
    if (limit > 0) {
      const currentMonthStr = date.slice(0, 7);
      const spentBefore = expenses
        .filter((e) => e.categoryId === category && e.date && e.date.startsWith(currentMonthStr))
        .reduce((sum, e) => sum + e.amount, 0);

      const totalSpent = spentBefore + amount;

      if (totalSpent > limit) {
        setTimeout(() => {
          const warningMsg: ChatMessage = {
            id: `warn-${Date.now()}`,
            sender: 'bot',
            isWarning: true,
            text: `🚨 **CẢNH BÁO VƯỢT HẠN MỨC!**\n\nBạn đã đặt hạn mức cho danh mục "${categoryName}" là **${formatCurrency(limit)}/tháng**.\nGiao dịch vừa lưu đã đẩy tổng chi tiêu danh mục lên **${formatCurrency(totalSpent)}** (vượt **${formatCurrency(totalSpent - limit)}**).`,
            timestamp: new Date(),
          };
          setMessages((p) => [...p, warningMsg]);
        }, 300);
      } else if (totalSpent >= limit * 0.85) {
        setTimeout(() => {
          const warningMsg: ChatMessage = {
            id: `warn-${Date.now()}`,
            sender: 'bot',
            isWarning: true,
            text: `⚠️ **LƯU Ý: GẦN CHẠM HẠN MỨC!**\n\nDanh mục "${categoryName}" đã đạt **${formatCurrency(totalSpent)} / ${formatCurrency(limit)}** (${Math.round((totalSpent / limit) * 100)}%). Hãy chú ý chi tiêu tiết kiệm trong những ngày tới nhé!`,
            timestamp: new Date(),
          };
          setMessages((p) => [...p, warningMsg]);
        }, 300);
      }
    }
  };

  const quickChips = [
    { text: 'Hôm nay mua sữa 15k, mua cafe 25k', type: 'tx', label: '⚡ Đa giao dịch (sữa 15k, cafe 25k)' },
    { text: 'Hôm qua ăn cơm 15k', type: 'tx', label: '✍️ Hôm qua ăn cơm 15k' },
    { text: 'Thứ 2 tuần trước ăn lẩu 200k', type: 'tx', label: '✍️ T2 tuần trước 200k' },
    { text: 'Đi Grab 85 nghìn hôm kia', type: 'tx', label: '✍️ Grab 85k hôm kia' },
    { text: 'Tháng này tôi tiêu bao nhiêu?', type: 'query', label: '📊 Tổng chi tiêu tháng' },
    { text: 'Tôi có vượt ngân sách ở đâu không?', type: 'query', label: '🛡️ Kiểm tra ngân sách' },
    { text: 'Dự báo dòng tiền cuối tháng', type: 'query', label: '🔮 Dự báo dòng tiền' },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-210px)] min-h-[520px] max-h-[760px] bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl overflow-hidden shadow-md">
      {/* Copilot Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 px-4 py-3.5 border-b border-[#E6DEC9] flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/90 border border-amber-300/40 flex items-center justify-center text-emerald-950 font-serif font-black shadow-inner">
            <Bot size={22} className="text-emerald-950" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide">
                Financial Copilot
              </h3>
              <span className="bg-amber-400 text-emerald-950 text-[10px] font-bold px-1.5 py-0.5 rounded font-mono uppercase tracking-wider">
                Multi-Tx & Date AI
              </span>
            </div>
            <span className="text-[11px] text-emerald-200/90 font-sans flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {currentUser ? 'Zero Unconfirmed Writes • Hỗ trợ Đa giao dịch' : 'Chế độ Trợ lý cục bộ (Đăng nhập để bật Gemini)'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentUser ? (
            <div className="flex items-center gap-1.5 text-xs text-amber-200 font-mono bg-emerald-950/70 px-2.5 py-1.5 rounded-lg border border-emerald-800">
              <Zap size={13} className="text-amber-400 animate-pulse" />
              <span>{quota ? `Quota: ${quota.remaining}/${quota.limit}` : '50 lượt/ngày'}</span>
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center gap-1 text-xs bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold px-2.5 py-1 rounded-lg transition cursor-pointer"
            >
              <LogIn size={13} />
              <span>Đăng nhập</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1 text-xs text-stone-300 font-mono bg-emerald-950/40 px-2 py-1 rounded-lg border border-emerald-800/60">
            <ShieldCheck size={13} className="text-emerald-400" />
            <span>Bảo mật</span>
          </div>
        </div>
      </div>

      {/* Guest Notice Callout (if anonymous) */}
      {!currentUser && (
        <div className="bg-amber-50/90 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900">
          <div className="flex items-center gap-2">
            <Sparkles size={14} className="text-amber-700 shrink-0" />
            <span>Đăng nhập tài khoản để sử dụng Gemini Financial Copilot với phân tích chuyên sâu & hạn mức 50 lượt/ngày.</span>
          </div>
          <button
            onClick={onOpenAuthModal}
            className="text-xs font-bold text-amber-950 underline hover:text-amber-800 cursor-pointer shrink-0 ml-2"
          >
            Đăng nhập ngay
          </button>
        </div>
      )}

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F6]">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          const actionList = msg.pendingActions || (msg.pendingAction ? [msg.pendingAction] : []);
          const hasActions = actionList.length > 0;
          const hasPending = actionList.some((a) => a.status === 'pending');
          const totalPendingAmount = actionList
            .filter((a) => a.status === 'pending')
            .reduce((sum, a) => sum + (a.type === 'DELETE_EXPENSE' ? 0 : a.amount), 0);

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[95%] sm:max-w-[88%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border text-xs font-serif shadow-xs ${
                  msg.isWarning
                    ? 'bg-amber-100 text-amber-900 border-amber-300 animate-bounce'
                    : isBot
                    ? 'bg-emerald-900 text-amber-300 border-emerald-950'
                    : 'bg-amber-500 text-emerald-950 border-amber-600 font-bold'
                }`}
              >
                {msg.isWarning ? '🚨' : isBot ? <Sparkles size={16} /> : <User size={15} />}
              </div>

              <div className="space-y-1.5 flex-1 min-w-0">
                {msg.isThinking ? (
                  <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-medium flex items-center gap-2.5 shadow-xs animate-pulse">
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-2 h-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></span>
                    </div>
                    <span>{msg.text}</span>
                  </div>
                ) : (
                  <div
                    className={`p-3.5 rounded-2xl border text-sm shadow-xs ${
                      msg.isWarning
                        ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                        : isBot
                        ? 'bg-[#FAF7F0] border-[#E6DEC9] text-stone-800'
                        : 'bg-emerald-900 border-emerald-950 text-white font-sans'
                    }`}
                  >
                    {/* Main text / Markdown message */}
                    {msg.text && (
                      <div className="whitespace-pre-line leading-relaxed font-sans text-xs sm:text-sm">
                        {msg.text}
                      </div>
                    )}

                    {/* Prescriptive Financial Summary Card */}
                    {msg.financialSummary && (
                      <div className="mt-3 bg-amber-50/80 border border-amber-200 rounded-xl p-3 text-xs space-y-2 text-amber-950 font-sans">
                        {msg.financialSummary.currentStatus && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-emerald-900 shrink-0">📊 Hiện trạng:</span>
                            <span>{msg.financialSummary.currentStatus}</span>
                          </div>
                        )}
                        {msg.financialSummary.riskOrInsight && (
                          <div className="flex items-start gap-1.5">
                            <span className="font-bold text-amber-800 shrink-0">⚠️ Điểm lưu ý:</span>
                            <span>{msg.financialSummary.riskOrInsight}</span>
                          </div>
                        )}
                        {msg.financialSummary.recommendedAction && (
                          <div className="flex items-start gap-1.5 bg-white p-2 rounded-lg border border-amber-300 shadow-2xs font-medium text-emerald-950">
                            <span className="font-bold text-amber-700 shrink-0">💡 "Tôi nên làm gì?":</span>
                            <span>{msg.financialSummary.recommendedAction}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* STRUCTURED ACTION PREVIEW CARDS (Multi-Transaction Support) */}
                    {hasActions && (
                      <div className="mt-3 space-y-2.5">
                        {/* Batch Header Bar if multiple transactions */}
                        {actionList.length > 1 && (
                          <div className="bg-emerald-900 text-white px-3 py-2 rounded-xl flex items-center justify-between text-xs shadow-xs font-sans">
                            <div className="flex items-center gap-1.5">
                              <Layers size={15} className="text-amber-300" />
                              <span className="font-bold">Danh sách {actionList.length} giao dịch được tách</span>
                            </div>
                            <span className="font-mono text-amber-200 font-bold">
                              Tổng: {formatCurrency(totalPendingAmount)}
                            </span>
                          </div>
                        )}

                        {/* Render each transaction card */}
                        {actionList.map((act, index) => (
                          <div
                            key={act.id}
                            className="bg-white border-2 border-emerald-800/30 rounded-xl overflow-hidden shadow-xs transition"
                          >
                            {/* Header bar */}
                            <div
                              className={`px-3.5 py-1.5 border-b flex items-center justify-between text-xs font-semibold ${
                                act.status === 'confirmed'
                                  ? 'bg-emerald-800 text-white border-emerald-900'
                                  : act.status === 'cancelled'
                                  ? 'bg-stone-200 text-stone-600 border-stone-300'
                                  : act.type === 'DELETE_EXPENSE'
                                  ? 'bg-red-50 text-red-950 border-red-200'
                                  : 'bg-emerald-50 text-emerald-950 border-emerald-200'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 font-mono">
                                {actionList.length > 1 && (
                                  <span className="w-4 h-4 rounded-full bg-emerald-900 text-white text-[10px] flex items-center justify-center font-bold">
                                    {index + 1}
                                  </span>
                                )}
                                {act.type === 'DELETE_EXPENSE' ? (
                                  <Trash2 size={13} className="text-red-600" />
                                ) : (
                                  <Sparkles
                                    size={13}
                                    className={act.status === 'confirmed' ? 'text-amber-300' : 'text-emerald-700'}
                                  />
                                )}
                                <span className="font-bold">
                                  {act.type === 'CREATE_EXPENSE'
                                    ? `Khoản chi ${actionList.length > 1 ? `#${index + 1}` : 'mới'}`
                                    : act.type === 'UPDATE_EXPENSE'
                                    ? 'Cập nhật khoản chi'
                                    : 'Xóa khoản chi'}
                                </span>
                              </div>

                              <div className="flex items-center gap-1 font-mono text-[11px]">
                                <span className="text-stone-500">Tin cậy:</span>
                                <span className="font-bold text-emerald-800">{act.confidence}%</span>
                              </div>
                            </div>

                            {/* Card Content */}
                            <div className="p-3 space-y-2.5 text-xs text-stone-800 bg-stone-50/40">
                              {/* If Update: Show Before vs After */}
                              {act.type === 'UPDATE_EXPENSE' && act.originalExpense && (
                                <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] space-y-1 mb-1">
                                  <div className="text-stone-500 font-medium">Giao dịch gốc hiện tại:</div>
                                  <div className="flex items-center gap-2 text-stone-700 font-mono">
                                    <span>{act.originalExpense.note}</span>
                                    <span>•</span>
                                    <span className="font-bold">{formatCurrency(act.originalExpense.amount)}</span>
                                    <span>•</span>
                                    <span>{act.originalExpense.categoryName}</span>
                                  </div>
                                </div>
                              )}

                              {!act.isEditing ? (
                                <div className="grid grid-cols-2 gap-2 font-sans">
                                  <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Danh mục</span>
                                    <span className="font-semibold text-emerald-950 text-xs block truncate">
                                      {act.categoryName}
                                    </span>
                                  </div>

                                  <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Số tiền</span>
                                    <span
                                      className={`font-mono font-bold text-xs block ${
                                        act.type === 'DELETE_EXPENSE' ? 'text-red-700 line-through' : 'text-emerald-800'
                                      }`}
                                    >
                                      {formatCurrency(act.amount)}
                                    </span>
                                  </div>

                                  <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs col-span-2 sm:col-span-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-stone-400 uppercase block">Ngày</span>
                                      {act.dateExpression && (
                                        <span className="text-[10px] bg-amber-100 text-amber-900 font-bold px-1.5 py-0.2 rounded font-sans">
                                          {act.dateExpression}
                                        </span>
                                      )}
                                    </div>
                                    <span className="font-semibold text-emerald-950 text-xs block">
                                      {formatDateVietnamese(act.date)}
                                    </span>
                                    <span className="font-mono text-[10px] text-stone-500 block">
                                      ({act.date})
                                    </span>
                                  </div>

                                  <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs col-span-2 sm:col-span-1">
                                    <span className="text-[10px] font-bold text-stone-400 uppercase block">Ghi chú</span>
                                    <span className="text-stone-800 text-xs font-medium block truncate">
                                      "{act.note}"
                                    </span>
                                  </div>
                                </div>
                              ) : (
                                /* Inline Edit Mode */
                                <div className="space-y-2 bg-white p-2.5 rounded-lg border border-amber-300 text-xs shadow-2xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Danh mục</label>
                                      <select
                                        value={act.category}
                                        onChange={(e) =>
                                          handleUpdateSingleActionField(msg.id, act.id, 'category', e.target.value)
                                        }
                                        className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                                      >
                                        {CATEGORIES.map((c) => (
                                          <option key={c.id} value={c.id}>
                                            {c.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 block mb-1">
                                        Số tiền (VNĐ)
                                      </label>
                                      <input
                                        type="number"
                                        value={act.amount || ''}
                                        onChange={(e) =>
                                          handleUpdateSingleActionField(
                                            msg.id,
                                            act.id,
                                            'amount',
                                            Number(e.target.value)
                                          )
                                        }
                                        className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 font-mono focus:outline-none"
                                        placeholder="15000"
                                      />
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Ngày (YYYY-MM-DD)</label>
                                      <input
                                        type="date"
                                        value={act.date}
                                        onChange={(e) =>
                                          handleUpdateSingleActionField(msg.id, act.id, 'date', e.target.value)
                                        }
                                        className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                                      />
                                    </div>

                                    <div>
                                      <label className="text-[10px] font-bold text-stone-500 block mb-1">Ghi chú</label>
                                      <input
                                        type="text"
                                        value={act.note}
                                        onChange={(e) =>
                                          handleUpdateSingleActionField(msg.id, act.id, 'note', e.target.value)
                                        }
                                        className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                                        placeholder="Nội dung khoản chi"
                                      />
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Individual Item Buttons if multiple */}
                              {act.status === 'pending' && actionList.length > 1 && (
                                <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-stone-200/60">
                                  <button
                                    onClick={() => handleConfirmSingleAction(msg.id, act.id)}
                                    className="bg-emerald-800 hover:bg-emerald-900 text-white font-medium py-1 px-2.5 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px]"
                                  >
                                    <CheckCircle2 size={12} />
                                    <span>Lưu riêng mục này</span>
                                  </button>

                                  <button
                                    onClick={() => handleToggleEditSingleAction(msg.id, act.id)}
                                    className={`py-1 px-2 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] border ${
                                      act.isEditing
                                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                                        : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                                    }`}
                                  >
                                    <Edit2 size={11} />
                                    <span>{act.isEditing ? 'Đóng sửa' : 'Sửa'}</span>
                                  </button>

                                  <button
                                    onClick={() => handleRemoveSingleAction(msg.id, act.id)}
                                    className="bg-stone-100 hover:bg-red-50 text-stone-600 hover:text-red-700 py-1 px-2 rounded-lg transition cursor-pointer flex items-center gap-1 text-[11px] border border-stone-300"
                                    title="Xóa mục này khỏi danh sách lưu"
                                  >
                                    <Trash2 size={11} />
                                    <span>Bỏ</span>
                                  </button>
                                </div>
                              )}

                              {/* Single item action buttons (if only 1 item) */}
                              {act.status === 'pending' && actionList.length === 1 && (
                                <div className="flex items-center gap-2 pt-1 border-t border-stone-200/80">
                                  <button
                                    onClick={() => handleConfirmSingleAction(msg.id, act.id)}
                                    className={`flex-1 text-white font-bold py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-xs ${
                                      act.type === 'DELETE_EXPENSE'
                                        ? 'bg-red-700 hover:bg-red-800'
                                        : 'bg-emerald-800 hover:bg-emerald-900'
                                    }`}
                                  >
                                    <CheckCircle2 size={15} />
                                    <span>
                                      {act.type === 'CREATE_EXPENSE'
                                        ? '✓ Xác nhận lưu vào sổ'
                                        : act.type === 'UPDATE_EXPENSE'
                                        ? '✓ Xác nhận cập nhật'
                                        : '🗑️ Xác nhận xóa'}
                                    </span>
                                  </button>

                                  <button
                                    onClick={() => handleCancelSingleAction(msg.id, act.id)}
                                    className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-xs border border-stone-300"
                                  >
                                    <XCircle size={15} className="text-stone-500" />
                                    <span>✕ Hủy</span>
                                  </button>

                                  {act.type !== 'DELETE_EXPENSE' && (
                                    <button
                                      onClick={() => handleToggleEditSingleAction(msg.id, act.id)}
                                      className={`py-2 px-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-xs border ${
                                        act.isEditing
                                          ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                                          : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                                      }`}
                                      title={act.isEditing ? 'Đóng chỉnh sửa' : 'Chỉnh sửa'}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                  )}
                                </div>
                              )}

                              {/* Status Badges */}
                              {act.status === 'confirmed' && (
                                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                                  <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                                  <span>
                                    {act.type === 'CREATE_EXPENSE'
                                      ? `Đã lưu thành công (${act.note} - ${formatCurrency(act.amount)})!`
                                      : act.type === 'UPDATE_EXPENSE'
                                      ? 'Đã cập nhật giao dịch thành công!'
                                      : 'Đã xóa giao dịch khỏi Sổ Tay!'}
                                  </span>
                                </div>
                              )}

                              {act.status === 'cancelled' && (
                                <div className="bg-stone-100 border border-stone-300 text-stone-600 p-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                                  <XCircle size={15} className="text-stone-400 shrink-0" />
                                  <span>Đã hủy bỏ mục này.</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}

                        {/* Batch Action Buttons (Confirm All / Cancel All) */}
                        {actionList.length > 1 && hasPending && (
                          <div className="flex items-center gap-2 pt-2">
                            <button
                              onClick={() => handleConfirmAllActions(msg.id)}
                              className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-3.5 rounded-xl transition cursor-pointer flex items-center justify-center gap-2 text-xs sm:text-sm shadow-md"
                            >
                              <CheckCheck size={16} className="text-amber-300" />
                              <span>✓ Xác nhận lưu tất cả ({actionList.filter((a) => a.status === 'pending').length} giao dịch)</span>
                            </button>

                            <button
                              onClick={() => handleCancelAllActions(msg.id)}
                              className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2 px-3 rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 text-xs border border-stone-300 shadow-2xs"
                            >
                              <XCircle size={15} className="text-stone-500" />
                              <span>✕ Hủy tất cả</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className={`text-[10px] text-stone-400 font-sans ${isBot ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Quick Prompt Chips */}
      <div className="px-4 py-2.5 bg-stone-100/80 border-t border-[#E6DEC9] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400 font-mono shrink-0">
          Gợi ý:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSend(undefined, chip.text)}
            className="shrink-0 text-xs bg-white hover:bg-emerald-50 text-stone-700 hover:text-emerald-900 font-medium px-2.5 py-1 rounded-lg border border-stone-200 transition shadow-2xs cursor-pointer"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <form onSubmit={handleSend} className="p-3 bg-[#FAF7F0] border-t border-[#E6DEC9] flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          aria-label="Nhập yêu cầu cho Financial Copilot"
          placeholder='Nhập chi tiêu (VD: "Hôm nay mua sữa 15k, mua cafe 25k", "Hôm qua ăn cơm 15k")...'
          className="flex-1 bg-white border border-stone-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700/50"
          disabled={isProcessing}
        />
        <button
          type="submit"
          aria-label="Gửi yêu cầu"
          disabled={!input.trim() || isProcessing}
          className="bg-emerald-900 hover:bg-emerald-950 disabled:opacity-40 text-amber-300 font-bold px-4 py-2 rounded-xl transition flex items-center gap-1.5 text-xs sm:text-sm shadow-xs cursor-pointer disabled:cursor-not-allowed"
        >
          <Send size={15} />
          <span className="hidden sm:inline">Gửi</span>
        </button>
      </form>
    </div>
  );
}
