import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, 
  Sparkles, 
  BookOpen, 
  User, 
  HelpCircle, 
  LogIn, 
  Check, 
  X, 
  Edit2, 
  Bot, 
  AlertTriangle, 
  TrendingUp, 
  PieChart, 
  Target, 
  RotateCcw, 
  CheckCircle2, 
  XCircle,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { Expense, Goal } from '../types';
import { formatCurrency } from '../utils/format';
import { CATEGORIES } from '../constants/categories';
import { User as FirebaseUser } from '../firebase';
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

interface ChatbotTabProps {
  expenses: Expense[];
  categoryLimits: Record<string, number>;
  goals?: Goal[];
  income?: number;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  currentUser: FirebaseUser | null;
  onOpenAuthModal: () => void;
}

export default function ChatbotTab({ 
  expenses, 
  categoryLimits, 
  goals = [], 
  income = 15000000, 
  onAddExpense, 
  currentUser, 
  onOpenAuthModal 
}: ChatbotTabProps) {
  // Unauthenticated Guard
  if (!currentUser) {
    return (
      <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-[#FAF7F0] border-2 border-dashed border-[#E6DEC9] rounded-2xl min-h-[420px] shadow-sm my-auto">
        <div className="w-16 h-16 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center mb-4 shadow-xs border border-amber-200 animate-pulse">
          <Sparkles size={32} />
        </div>
        <h3 className="font-serif text-xl font-bold text-stone-800 mb-2">
          Trợ lý AI Sổ tay Chi tiêu
        </h3>
        <p className="text-stone-600 text-sm max-w-md mb-6 leading-relaxed font-sans">
          Vui lòng đăng nhập để sử dụng Trợ lý AI phân tích ngôn ngữ tự nhiên và thông kê tài chính cá nhân.
        </p>
        <button
          onClick={onOpenAuthModal}
          className="px-6 py-3 bg-emerald-900 hover:bg-emerald-850 text-white font-semibold rounded-xl transition cursor-pointer shadow-md flex items-center gap-2 text-sm min-h-[44px]"
        >
          <LogIn size={18} />
          <span>Đăng nhập ngay</span>
        </button>
      </div>
    );
  }

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: `Xin chào ${currentUser.displayName || currentUser.email || 'bạn'}! 🤖 Mình là Trợ lý AI Tài chính Sổ Tay.\n\nBạn có thể nhắn tự nhiên để ghi chi tiêu (ví dụ: "ăn sáng 35k", "đi Grab 85k hôm qua") hoặc hỏi phân tích tài chính (ví dụ: "Tháng này tôi tiêu bao nhiêu?", "Top 3 khoản chi lớn nhất?").`,
      timestamp: new Date()
    }
  ]);

  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  // Handle message submit
  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsgText = input.trim();
    const userMsgId = Date.now().toString();

    // 1. Add user message
    const userMessage: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: userMsgText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsProcessing(true);

    // 2. Add thinking indicator message
    const thinkingId = `thinking-${Date.now()}`;
    const thinkingMessage: ChatMessage = {
      id: thinkingId,
      sender: 'bot',
      text: '🤖 AI đang suy nghĩ & phân tích câu nói của bạn...',
      timestamp: new Date(),
      isThinking: true
    };

    setMessages(prev => [...prev, thinkingMessage]);

    // Build context
    const currentDate = new Date().toISOString().split('T')[0];
    const context = {
      currentDate,
      expenses,
      goals,
      categoryLimits,
      income
    };

    // 3. Call AI Assistant
    const aiResult = await sendToAIAssistant(userMsgText, context);

    // Remove thinking message and add actual response
    setMessages(prev => prev.filter(m => m.id !== thinkingId));
    setIsProcessing(false);

    const botMessageId = `bot-${Date.now()}`;

    if (aiResult.intent === 'create_expense' && aiResult.amount && aiResult.amount > 0) {
      const catObj = CATEGORIES.find(c => c.id === aiResult.category) || CATEGORIES[CATEGORIES.length - 1];

      const pendingTx: PendingTransaction = {
        id: `tx-${Date.now()}`,
        amount: aiResult.amount,
        category: catObj.id,
        categoryName: catObj.name,
        date: aiResult.date || currentDate,
        note: aiResult.note || catObj.name,
        confidence: Math.round((aiResult.confidence || 0.85) * 100),
        explanation: aiResult.explanation,
        status: 'pending',
        isEditing: false
      };

      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        text: `✨ AI đã bóc tách thông tin giao dịch của bạn. Vui lòng xác nhận để lưu vào sổ:`,
        timestamp: new Date(),
        pendingTransaction: pendingTx,
        isFallback: aiResult.isFallback
      };

      setMessages(prev => [...prev, botMessage]);
    } else if (aiResult.intent === 'financial_query' || aiResult.intent === 'general_chat') {
      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        text: aiResult.reply || 'Dưới đây là thông tin phân tích tài chính của bạn:',
        timestamp: new Date(),
        financialReply: aiResult.reply,
        isFallback: aiResult.isFallback
      };

      setMessages(prev => [...prev, botMessage]);
    } else {
      const botMessage: ChatMessage = {
        id: botMessageId,
        sender: 'bot',
        text: `❓ Chưa bóc tách được số tiền hợp lệ. Bạn hãy gõ rõ hơn chút nhé!\nVí dụ: "ăn sáng 35k", "đi xe buýt 10 nghìn hôm qua".`,
        timestamp: new Date(),
        isFallback: true
      };

      setMessages(prev => [...prev, botMessage]);
    }
  };

  // Handle Confirm Transaction
  const handleConfirmTransaction = (msgId: string, tx: PendingTransaction) => {
    // 1. Save expense to database / state
    onAddExpense({
      amount: tx.amount,
      categoryId: tx.category,
      note: tx.note,
      date: tx.date
    });

    // 2. Update status of message's pendingTransaction
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.pendingTransaction) {
          return {
            ...m,
            pendingTransaction: {
              ...m.pendingTransaction,
              status: 'confirmed',
              isEditing: false
            }
          };
        }
        return m;
      })
    );

    // 3. Check budget limits for warnings
    const limit = categoryLimits[tx.category] || 0;
    if (limit > 0) {
      const today = new Date();
      const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

      const spentBefore = expenses
        .filter(e => e.categoryId === tx.category && e.date && e.date.startsWith(currentMonthStr))
        .reduce((sum, e) => sum + e.amount, 0);

      const totalSpent = spentBefore + tx.amount;

      if (totalSpent > limit) {
        setTimeout(() => {
          const warningMsg: ChatMessage = {
            id: `warn-${Date.now()}`,
            sender: 'bot',
            isWarning: true,
            text: `🚨 CẢNH BÁO CHI TIÊU VƯỢT HẠN MỨC!\n\nBạn đã đặt hạn mức cho danh mục "${tx.categoryName}" là ${formatCurrency(limit)}/tháng.\nGiao dịch này đẩy tổng chi tiêu danh mục lên ${formatCurrency(totalSpent)}, vượt quá ${formatCurrency(totalSpent - limit)}.`,
            timestamp: new Date()
          };
          setMessages(p => [...p, warningMsg]);
        }, 300);
      } else if (totalSpent >= limit * 0.9) {
        setTimeout(() => {
          const warningMsg: ChatMessage = {
            id: `warn-${Date.now()}`,
            sender: 'bot',
            isWarning: true,
            text: `⚠️ CẢNH BÁO GẦN CHẠM HẠN MỨC!\n\nDanh mục "${tx.categoryName}" đạt ${formatCurrency(totalSpent)} / ${formatCurrency(limit)} (${((totalSpent / limit) * 100).toFixed(0)}%). Hãy chú ý chi tiêu tiết kiệm hơn nhé!`,
            timestamp: new Date()
          };
          setMessages(p => [...p, warningMsg]);
        }, 300);
      }
    }
  };

  // Handle Cancel Transaction
  const handleCancelTransaction = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.pendingTransaction) {
          return {
            ...m,
            pendingTransaction: {
              ...m.pendingTransaction,
              status: 'cancelled',
              isEditing: false
            }
          };
        }
        return m;
      })
    );
  };

  // Toggle inline editing mode
  const handleToggleEdit = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.pendingTransaction) {
          return {
            ...m,
            pendingTransaction: {
              ...m.pendingTransaction,
              isEditing: !m.pendingTransaction.isEditing
            }
          };
        }
        return m;
      })
    );
  };

  // Update pending transaction state while editing
  const handleUpdatePendingTxField = (msgId: string, field: keyof PendingTransaction, value: any) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.pendingTransaction) {
          const updatedTx = { ...m.pendingTransaction, [field]: value };
          if (field === 'category') {
            const catObj = CATEGORIES.find(c => c.id === value);
            if (catObj) updatedTx.categoryName = catObj.name;
          }
          return {
            ...m,
            pendingTransaction: updatedTx
          };
        }
        return m;
      })
    );
  };

  // Quick Chips
  const quickChips = [
    { text: 'ăn sáng 35k phở bò', type: 'tx' },
    { text: 'hôm qua đi Grab 85 nghìn', type: 'tx' },
    { text: 'Tháng này tôi tiêu bao nhiêu?', type: 'query' },
    { text: 'Tôi đang tiêu nhiều nhất vào đâu?', type: 'query' },
    { text: 'Tôi có vượt ngân sách không?', type: 'query' },
    { text: 'Top 3 khoản chi lớn nhất tháng này?', type: 'query' }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] max-h-[700px] bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl overflow-hidden shadow-md">
      {/* Bot Chat Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 px-4 py-3.5 border-b border-[#E6DEC9] flex items-center justify-between text-white shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/90 border border-amber-300/40 flex items-center justify-center text-emerald-950 font-serif font-black shadow-inner">
            <Bot size={20} className="text-emerald-950" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif text-sm sm:text-base font-bold text-white tracking-wide">
                Trợ lý AI Sổ Tay Chi Tiêu
              </h3>
              <span className="bg-amber-400 text-emerald-950 text-[10px] font-bold px-1.5 py-0.2 rounded font-mono uppercase">
                Gemini 3.6
              </span>
            </div>
            <span className="text-[10px] text-emerald-200/90 font-sans flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Đã kết nối Gemini API • Bóc tách ngôn ngữ tự nhiên
            </span>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-200 font-mono bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800">
          <ShieldCheck size={14} className="text-amber-400" />
          <span>Bảo mật Server-side</span>
        </div>
      </div>

      {/* Message List area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F6]">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          const tx = msg.pendingTransaction;

          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[92%] sm:max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar indicator */}
              <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center border text-xs font-serif shadow-xs ${
                msg.isWarning
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-bounce'
                  : isBot 
                    ? 'bg-emerald-900 text-amber-300 border-emerald-950' 
                    : 'bg-amber-500 text-emerald-950 border-amber-600 font-bold'
              }`}>
                {msg.isWarning ? '🚨' : isBot ? <Sparkles size={16} /> : <User size={15} />}
              </div>

              {/* Message content container */}
              <div className="space-y-1.5 flex-1 min-w-0">
                {/* Thinking indicator */}
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
                  <div className={`p-3.5 rounded-2xl border text-sm shadow-xs ${
                    msg.isWarning
                      ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                      : isBot
                        ? 'bg-[#FAF7F0] border-[#E6DEC9] text-stone-800'
                        : 'bg-emerald-900 border-emerald-950 text-white font-sans'
                  }`}>
                    {/* Message text */}
                    {msg.text && (
                      <p className="whitespace-pre-line leading-relaxed font-sans">
                        {msg.text}
                      </p>
                    )}

                    {/* Financial Query Response formatting */}
                    {msg.financialReply && !tx && (
                      <div className="mt-2 text-xs leading-relaxed text-stone-800 space-y-2">
                        {msg.isFallback && (
                          <div className="text-[10px] text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 font-mono inline-block mb-1">
                            ⚡ Phân tích qua Bộ lọc dự phòng
                          </div>
                        )}
                      </div>
                    )}

                    {/* Transaction Preview Card (Requirement 6) */}
                    {tx && (
                      <div className="mt-3 bg-white border-2 border-emerald-800/30 rounded-xl overflow-hidden shadow-sm">
                        {/* Card Header */}
                        <div className={`px-3.5 py-2 border-b flex items-center justify-between text-xs font-semibold ${
                          tx.status === 'confirmed'
                            ? 'bg-emerald-800 text-white border-emerald-900'
                            : tx.status === 'cancelled'
                              ? 'bg-stone-200 text-stone-600 border-stone-300'
                              : 'bg-emerald-50 text-emerald-950 border-emerald-200'
                        }`}>
                          <div className="flex items-center gap-1.5 font-mono">
                            <Sparkles size={14} className={tx.status === 'confirmed' ? 'text-amber-300' : 'text-emerald-700'} />
                            <span>AI Nhận diện giao dịch</span>
                          </div>
                          <div className="flex items-center gap-1 font-mono text-[11px]">
                            <span className="text-stone-500">Độ tin cậy:</span>
                            <span className={`font-bold ${tx.confidence >= 80 ? 'text-emerald-700' : 'text-amber-600'}`}>
                              {tx.confidence}%
                            </span>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-3.5 space-y-3 text-xs text-stone-800 bg-emerald-50/20">
                          {!tx.isEditing ? (
                            /* READ ONLY PREVIEW MODE */
                            <div className="grid grid-cols-2 gap-2 font-sans">
                              <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Danh mục</span>
                                <span className="font-semibold text-emerald-950 text-xs block">
                                  {tx.categoryName}
                                </span>
                              </div>

                              <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Số tiền</span>
                                <span className="font-mono font-bold text-emerald-800 text-xs block">
                                  {formatCurrency(tx.amount)}
                                </span>
                              </div>

                              <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Ngày ghi</span>
                                <span className="font-mono text-stone-700 text-xs block">
                                  {tx.date}
                                </span>
                              </div>

                              <div className="bg-white p-2 rounded-lg border border-stone-200 space-y-0.5">
                                <span className="text-[10px] font-bold text-stone-400 uppercase block">Ghi chú</span>
                                <span className="text-stone-800 text-xs font-medium block truncate">
                                  "{tx.note}"
                                </span>
                              </div>
                            </div>
                          ) : (
                            /* EDITING MODE */
                            <div className="space-y-2 bg-white p-2.5 rounded-lg border border-amber-300 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-0.5">Danh mục</label>
                                  <select
                                    value={tx.category}
                                    onChange={(e) => handleUpdatePendingTxField(msg.id, 'category', e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded p-1.5 text-xs text-stone-800 focus:outline-none"
                                  >
                                    {CATEGORIES.map(c => (
                                      <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-0.5">Số tiền (VNĐ)</label>
                                  <input
                                    type="number"
                                    value={tx.amount || ''}
                                    onChange={(e) => handleUpdatePendingTxField(msg.id, 'amount', Number(e.target.value))}
                                    className="w-full bg-stone-50 border border-stone-300 rounded p-1.5 text-xs text-stone-800 font-mono focus:outline-none"
                                    placeholder="35000"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-0.5">Ngày</label>
                                  <input
                                    type="date"
                                    value={tx.date}
                                    onChange={(e) => handleUpdatePendingTxField(msg.id, 'date', e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded p-1.5 text-xs text-stone-800 focus:outline-none"
                                  />
                                </div>

                                <div>
                                  <label className="text-[10px] font-bold text-stone-500 block mb-0.5">Ghi chú</label>
                                  <input
                                    type="text"
                                    value={tx.note}
                                    onChange={(e) => handleUpdatePendingTxField(msg.id, 'note', e.target.value)}
                                    className="w-full bg-stone-50 border border-stone-300 rounded p-1.5 text-xs text-stone-800 focus:outline-none"
                                    placeholder="Nội dung chi tiêu"
                                  />
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Action Buttons */}
                          {tx.status === 'pending' && (
                            <div className="flex items-center gap-2 pt-1 border-t border-stone-200/80">
                              <button
                                onClick={() => handleConfirmTransaction(msg.id, tx)}
                                className="flex-1 bg-emerald-800 hover:bg-emerald-900 text-white font-bold py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 text-xs shadow-xs"
                              >
                                <CheckCircle2 size={15} />
                                <span>✓ Xác nhận & Lưu</span>
                              </button>

                              <button
                                onClick={() => handleCancelTransaction(msg.id)}
                                className="bg-stone-100 hover:bg-stone-200 text-stone-700 font-medium py-2 px-3 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-xs border border-stone-300"
                              >
                                <XCircle size={15} className="text-red-700" />
                                <span>✕ Hủy</span>
                              </button>

                              <button
                                onClick={() => handleToggleEdit(msg.id)}
                                className={`py-2 px-2.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1 text-xs border ${
                                  tx.isEditing
                                    ? 'bg-amber-100 border-amber-400 text-amber-900 font-bold'
                                    : 'bg-white border-stone-300 text-stone-700 hover:bg-stone-50'
                                }`}
                                title={tx.isEditing ? "Đóng chỉnh sửa" : "Chỉnh sửa thông tin"}
                              >
                                <Edit2 size={14} />
                              </button>
                            </div>
                          )}

                          {/* Confirmed / Cancelled Status banner */}
                          {tx.status === 'confirmed' && (
                            <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                              <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
                              <span>Đã lưu thành công vào sổ tay chi tiêu!</span>
                            </div>
                          )}

                          {tx.status === 'cancelled' && (
                            <div className="bg-stone-100 border border-stone-300 text-stone-600 p-2 rounded-lg text-xs flex items-center gap-2 font-medium">
                              <XCircle size={16} className="text-stone-400 shrink-0" />
                              <span>Đã hủy bỏ giao dịch này.</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Time indicator */}
                <div className={`text-[10px] text-stone-400 font-sans ${isBot ? 'text-left' : 'text-right'}`}>
                  {msg.timestamp.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={chatEndRef} />
      </div>

      {/* Suggestion Quick Chips */}
      <div className="px-3.5 py-2 border-t border-stone-200 bg-[#FAF7F0] overflow-x-auto whitespace-nowrap scrollbar-hide flex items-center gap-2">
        <span className="text-[10px] font-bold text-stone-400 uppercase mr-1 flex items-center gap-1 shrink-0 font-mono">
          <HelpCircle size={12} className="text-amber-600" /> Gợi ý:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            disabled={isProcessing}
            onClick={() => {
              setInput(chip.text);
            }}
            className={`px-3 py-1 bg-white hover:bg-emerald-50 border text-xs rounded-full cursor-pointer transition whitespace-nowrap shrink-0 flex items-center gap-1 shadow-2xs ${
              chip.type === 'query' 
                ? 'border-amber-300 hover:border-amber-500 text-amber-950 font-medium' 
                : 'border-stone-200 hover:border-emerald-700 text-stone-700 hover:text-emerald-950'
            }`}
          >
            {chip.type === 'query' ? <TrendingUp size={12} className="text-amber-600" /> : <Sparkles size={12} className="text-emerald-600" />}
            <span>"{chip.text}"</span>
          </button>
        ))}
      </div>

      {/* Input Form area */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#E6DEC9] bg-[#FAF7F0] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isProcessing}
          placeholder="Nhập chi tiêu ('ăn sáng 35k') hoặc truy vấn ('Tháng này tiêu bao nhiêu?')..."
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
