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
} from 'lucide-react';
import { Expense, Goal, RecurringExpense } from '../../../types';
import { formatCurrency } from '../../../utils/format';
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
  category: string;
  categoryName: string;
  date: string;
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
  pendingAction?: PendingActionState;
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
  onUpdateExpense,
  onDeleteExpense,
  currentUser,
  onOpenAuthModal,
}: ChatbotTabProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${currentUser?.displayName || currentUser?.email || 'bạn'}! 🤖 Mình là **Financial Copilot** của Sổ Tay Chi Tiêu.\n\n🔒 **Cam kết bảo mật**: Copilot **không bao giờ tự ý ghi/sửa/xóa dữ liệu** mà luôn hiển thị thẻ **[Xác nhận]** để bạn phê duyệt.\n\nBạn có thể thử:\n• ✍️ **Ghi nhanh**: *"Ăn sáng 35k"*, *"Đi Grab 85k hôm qua"*\n• 📊 **Truy vấn**: *"Tháng này tôi tiêu bao nhiêu?"*, *"Tôi có vượt ngân sách không?"*\n• 🔮 **Dự báo**: *"Dự báo dòng tiền cuối tháng"*, *"Bao lâu nữa mua được Laptop?"*`,
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
      text: '🤖 Financial Copilot đang phân tích số liệu tài chính & tổng hợp facts...',
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

    // Handle Structured Action (Mutations: CREATE / UPDATE / DELETE)
    if (aiResult.action && aiResult.action.type !== 'NONE' && aiResult.action.expense) {
      const act = aiResult.action;
      const exp = act.expense!;

      const pendingAction: PendingActionState = {
        id: `action-${Date.now()}`,
        type: act.type as any,
        amount: exp.amount,
        category: exp.category,
        categoryName: exp.categoryName,
        date: exp.date,
        note: exp.note,
        targetExpenseId: act.targetExpenseId || exp.id,
        targetSummary: act.targetSummary,
        originalExpense: exp.originalExpense,
        confidence: Math.round((act.confidence || 0.85) * 100),
        explanation: act.explanation,
        status: 'pending',
        isEditing: false,
      };

      const promptTitle =
        act.type === 'CREATE_EXPENSE'
          ? 'Bạn muốn thêm giao dịch này?'
          : act.type === 'UPDATE_EXPENSE'
          ? 'Bạn muốn cập nhật giao dịch này?'
          : 'Bạn có chắc chắn muốn xóa giao dịch này?';

      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        intent: aiResult.intent,
        text: promptTitle,
        timestamp: new Date(),
        pendingAction,
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

  // Execution Handlers on User Confirmation
  const handleConfirmAction = async (msgId: string, action: PendingActionState) => {
    try {
      if (action.type === 'CREATE_EXPENSE') {
        await onAddExpense({
          amount: action.amount,
          categoryId: action.category,
          note: action.note,
          date: action.date,
        });
      } else if (action.type === 'UPDATE_EXPENSE') {
        if (action.targetExpenseId && onUpdateExpense) {
          await onUpdateExpense({
            id: action.targetExpenseId,
            amount: action.amount,
            categoryId: action.category,
            note: action.note,
            date: action.date,
          });
        } else {
          // Fallback to add if no ID
          await onAddExpense({
            amount: action.amount,
            categoryId: action.category,
            note: action.note,
            date: action.date,
          });
        }
      } else if (action.type === 'DELETE_EXPENSE') {
        if (action.targetExpenseId && onDeleteExpense) {
          await onDeleteExpense(action.targetExpenseId);
        }
      }

      setMessages((prev) =>
        prev.map((m) => {
          if (m.id === msgId && m.pendingAction) {
            return {
              ...m,
              pendingAction: {
                ...m.pendingAction,
                status: 'confirmed',
                isEditing: false,
              },
            };
          }
          return m;
        })
      );

      // Check budget limit alert
      if (action.type !== 'DELETE_EXPENSE') {
        const limit = categoryLimits[action.category] || 0;
        if (limit > 0) {
          const today = new Date();
          const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

          const spentBefore = expenses
            .filter((e) => e.categoryId === action.category && e.date && e.date.startsWith(currentMonthStr))
            .reduce((sum, e) => sum + e.amount, 0);

          const totalSpent = spentBefore + action.amount;

          if (totalSpent > limit) {
            setTimeout(() => {
              const warningMsg: ChatMessage = {
                id: `warn-${Date.now()}`,
                sender: 'bot',
                isWarning: true,
                text: `🚨 **CẢNH BÁO VƯỢT HẠN MỨC!**\n\nBạn đã đặt hạn mức cho danh mục "${action.categoryName}" là **${formatCurrency(limit)}/tháng**.\nGiao dịch vừa lưu đã đẩy tổng chi tiêu danh mục lên **${formatCurrency(totalSpent)}** (vượt **${formatCurrency(totalSpent - limit)}**).`,
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
                text: `⚠️ **LƯU Ý: GẦN CHẠM HẠN MỨC!**\n\nDanh mục "${action.categoryName}" đã đạt **${formatCurrency(totalSpent)} / ${formatCurrency(limit)}** (${Math.round((totalSpent / limit) * 100)}%). Hãy chú ý chi tiêu tiết kiệm trong những ngày tới nhé!`,
                timestamp: new Date(),
              };
              setMessages((p) => [...p, warningMsg]);
            }, 300);
          }
        }
      }
    } catch (err: any) {
      console.error('Error confirming transaction:', err);
    }
  };

  const handleCancelAction = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          return {
            ...m,
            pendingAction: {
              ...m.pendingAction,
              status: 'cancelled',
              isEditing: false,
            },
          };
        }
        return m;
      })
    );
  };

  const handleToggleEdit = (msgId: string) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          return {
            ...m,
            pendingAction: {
              ...m.pendingAction,
              isEditing: !m.pendingAction.isEditing,
            },
          };
        }
        return m;
      })
    );
  };

  const handleUpdatePendingField = (msgId: string, field: keyof PendingActionState, value: any) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id === msgId && m.pendingAction) {
          const updated = { ...m.pendingAction, [field]: value };
          if (field === 'category') {
            const catObj = CATEGORIES.find((c) => c.id === value);
            if (catObj) updated.categoryName = catObj.name;
          }
          return {
            ...m,
            pendingAction: updated,
          };
        }
        return m;
      })
    );
  };

  const quickChips = [
    { text: 'Ăn sáng 35k phở bò', type: 'tx', label: '✍️ Ăn sáng 35k' },
    { text: 'Đi Grab 85 nghìn hôm qua', type: 'tx', label: '✍️ Grab 85k' },
    { text: 'Tháng này tôi tiêu bao nhiêu?', type: 'query', label: '📊 Tổng chi tiêu tháng' },
    { text: 'Tôi có vượt ngân sách ở đâu không?', type: 'query', label: '🛡️ Kiểm tra ngân sách' },
    { text: 'Dự báo dòng tiền cuối tháng', type: 'query', label: '🔮 Dự báo dòng tiền' },
    { text: 'Bao lâu nữa mua được Laptop?', type: 'query', label: '🎯 Tiến độ mục tiêu' },
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
                Gemini 3.7 Flash
              </span>
            </div>
            <span className="text-[11px] text-emerald-200/90 font-sans flex items-center gap-1.5 mt-0.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              {currentUser ? 'Zero Unconfirmed Writes • Sổ Tay Thông Minh' : 'Chế độ Trợ lý cục bộ (Đăng nhập để bật Gemini)'}
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
            <span>Đăng nhập tài khoản để sử dụng Gemini 3.7 Financial Copilot với phân tích chuyên sâu & hạn mức 50 lượt/ngày.</span>
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
          const act = msg.pendingAction;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[92%] sm:max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
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

                    {/* Prescriptive Financial Summary Card ("Vậy tôi nên làm gì?") */}
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

                    {/* STRUCTURED ACTION PREVIEW CARD (Zero Unconfirmed Writes) */}
                    {act && (
                      <div className="mt-3 bg-white border-2 border-emerald-800/40 rounded-xl overflow-hidden shadow-sm">
                        {/* Header bar */}
                        <div
                          className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-semibold ${
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
                            {act.type === 'DELETE_EXPENSE' ? (
                              <Trash2 size={14} className="text-red-600" />
                            ) : (
                              <Sparkles
                                size={14}
                                className={act.status === 'confirmed' ? 'text-amber-300' : 'text-emerald-700'}
                              />
                            )}
                            <span className="font-bold">
                              {act.type === 'CREATE_EXPENSE'
                                ? 'Thêm khoản chi mới'
                                : act.type === 'UPDATE_EXPENSE'
                                ? 'Cập nhật khoản chi'
                                : 'Xóa khoản chi'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-stone-500">Độ tin cậy:</span>
                            <span className="font-bold text-emerald-800">{act.confidence}%</span>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-3.5 space-y-3 text-xs text-stone-800 bg-stone-50/40">
                          {/* If Update: Show Before vs After */}
                          {act.type === 'UPDATE_EXPENSE' && act.originalExpense && (
                            <div className="bg-amber-50 p-2 rounded-lg border border-amber-200 text-[11px] space-y-1 mb-2">
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
                              <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Danh mục</span>
                                <span className="font-semibold text-emerald-950 text-xs block">
                                  {act.categoryName}
                                </span>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Số tiền</span>
                                <span
                                  className={`font-mono font-bold text-xs block ${
                                    act.type === 'DELETE_EXPENSE' ? 'text-red-700 line-through' : 'text-emerald-800'
                                  }`}
                                >
                                  {formatCurrency(act.amount)}
                                </span>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Ngày ghi</span>
                                <span className="font-mono text-stone-700 text-xs block">{act.date}</span>
                              </div>

                              <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-0.5 shadow-2xs">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Nội dung</span>
                                <span className="text-stone-800 text-xs font-medium block truncate">
                                  "{act.note}"
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* Inline Edit Mode */
                            <div className="space-y-2.5 bg-white p-3 rounded-lg border border-amber-300 text-xs shadow-2xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-1">Danh mục</label>
                                  <select
                                    value={act.category}
                                    onChange={(e) => handleUpdatePendingField(msg.id, 'category', e.target.value)}
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
                                      handleUpdatePendingField(msg.id, 'amount', Number(e.target.value))
                                    }
                                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 font-mono focus:outline-none"
                                    placeholder="35000"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-1">Ngày</label>
                                  <input
                                    type="date"
                                    value={act.date}
                                    onChange={(e) => handleUpdatePendingField(msg.id, 'date', e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-1">Ghi chú</label>
                                  <input
                                    type="text"
                                    value={act.note}
                                    onChange={(e) => handleUpdatePendingField(msg.id, 'note', e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded-lg p-1.5 text-xs text-stone-800 focus:outline-none"
                                    placeholder="Nội dung khoản chi"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons: [Hủy] [Xác nhận] */}
                          {act.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-200/80">
                              <button
                                onClick={() => handleConfirmAction(msg.id, act)}
                                className={`flex-1 text-white font-bold py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-xs ${
                                  act.type === 'DELETE_EXPENSE'
                                    ? 'bg-red-700 hover:bg-red-800'
                                    : 'bg-emerald-800 hover:bg-emerald-900'
                                }`}
                              >
                                <CheckCircle2 size={15} />
                                <span>
                                  {act.type === 'CREATE_EXPENSE'
                                    ? '✓ Xác nhận thêm'
                                    : act.type === 'UPDATE_EXPENSE'
                                    ? '✓ Xác nhận cập nhật'
                                    : '🗑️ Xác nhận xóa'}
                                </span>
                              </button>

                              <button
                                onClick={() => handleCancelAction(msg.id)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-xs border border-stone-300"
                              >
                                <XCircle size={15} className="text-stone-500" />
                                <span>✕ Hủy</span>
                              </button>

                              {act.type !== 'DELETE_EXPENSE' && (
                                <button
                                  onClick={() => handleToggleEdit(msg.id)}
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

                          {/* Confirmed / Cancelled Status Badges */}
                          {act.status === 'confirmed' && (
                            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded-lg text-xs flex items-center gap-2 font-medium">
                              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                              <span>
                                {act.type === 'CREATE_EXPENSE'
                                  ? 'Đã xác nhận & lưu giao dịch vào Sổ Tay!'
                                  : act.type === 'UPDATE_EXPENSE'
                                  ? 'Đã cập nhật giao dịch thành công!'
                                  : 'Đã xóa giao dịch khỏi Sổ Tay!'}
                              </span>
                            </div>
                          )}

                          {act.status === 'cancelled' && (
                            <div className="bg-stone-100 border border-stone-300 text-stone-600 p-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                              <XCircle size={16} className="text-stone-400 shrink-0" />
                              <span>Đã hủy bỏ thao tác này.</span>
                            </div>
                          )}
                        </div>
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

      {/* Quick Action Suggestion Chips */}
      <div className="px-3.5 py-2 border-t border-stone-200 bg-[#FAF7F0] overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center gap-2">
        <span className="text-[10px] font-bold text-stone-400 uppercase mr-1 flex items-center gap-1 shrink-0 font-mono">
          <HelpCircle size={12} className="text-amber-600" /> Gợi ý:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            disabled={isProcessing}
            onClick={() => handleSend(undefined, chip.text)}
            className={`px-3 py-1.5 bg-white hover:bg-emerald-50 border text-xs rounded-full cursor-pointer transition whitespace-nowrap shrink-0 flex items-center gap-1 shadow-2xs ${
              chip.type === 'query'
                ? 'border-amber-300 hover:border-amber-500 text-amber-950 font-medium'
                : 'border-stone-200 hover:border-emerald-700 text-stone-700 hover:text-emerald-950'
            }`}
          >
            {chip.type === 'query' ? (
              <TrendingUp size={12} className="text-amber-600" />
            ) : (
              <Sparkles size={12} className="text-emerald-600" />
            )}
            <span>{chip.label}</span>
          </button>
        ))}
      </div>

      {/* Input Message Form */}
      <form onSubmit={(e) => handleSend(e)} className="p-3 border-t border-[#E6DEC9] bg-[#FAF7F0] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
          placeholder="Nhập 'Ăn sáng 35k', 'Tháng này tiêu bao nhiêu?', hoặc 'Dự báo dòng tiền'..."
          className="flex-1 bg-white border border-[#E6DEC9] rounded-xl px-3.5 py-3 sm:py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 disabled:opacity-50 min-h-[44px] sm:min-h-0"
        />
        <button
          type="submit"
          disabled={isProcessing || !input.trim()}
          className="bg-emerald-900 hover:bg-emerald-850 disabled:bg-stone-300 text-white px-4 py-3 sm:py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-sm font-semibold cursor-pointer transition shadow-sm shrink-0 min-h-[44px] sm:min-h-0"
        >
          {isProcessing ? (
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Send size={15} />
          )}
          <span>Gửi</span>
        </button>
      </form>
    </div>
  );
}
