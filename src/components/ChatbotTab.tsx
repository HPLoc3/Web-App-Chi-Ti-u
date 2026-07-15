import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, BookOpen, User, HelpCircle } from 'lucide-react';
import { parseTransactionText } from '../utils/parser';
import { Expense } from '../types';
import { formatCurrency } from '../utils/format';
import { CATEGORIES } from '../constants/categories';

interface Message {
  id: string;
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isWarning?: boolean;
  parsedResult?: {
    success: boolean;
    amount?: number;
    categoryName?: string;
    note?: string;
    dateLabel?: string;
  };
}

interface ChatbotTabProps {
  expenses: Expense[];
  categoryLimits: Record<string, number>;
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
}

export default function ChatbotTab({ expenses, categoryLimits, onAddExpense }: ChatbotTabProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'bot',
      text: 'Chào mừng bạn đến với mục Ghi nhanh! 📔 Mình là Trợ lý Sổ tay chi tiêu. Bạn chỉ cần gõ nội dung chi tiêu hằng ngày bằng ngôn ngữ tự nhiên, mình sẽ tự động phân tích và ghi vào sổ cho bạn ngay.',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim()) return;

    const userMessageText = input.trim();
    const userMessageId = Date.now().toString();
    
    // Add user message
    const userMsg: Message = {
      id: userMessageId,
      sender: 'user',
      text: userMessageText,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    // Parse transaction
    setTimeout(() => {
      const parsed = parseTransactionText(userMessageText);
      
      const botMessageId = (Date.now() + 1).toString();
      let botMsg: Message;

      if (parsed.success) {
        // Add expense
        onAddExpense({
          amount: parsed.amount,
          categoryId: parsed.categoryId,
          note: parsed.note,
          date: parsed.date
        });

        botMsg = {
          id: botMessageId,
          sender: 'bot',
          text: `✅ ${parsed.message}`,
          timestamp: new Date(),
          parsedResult: {
            success: true,
            amount: parsed.amount,
            categoryName: parsed.categoryName,
            note: parsed.note,
            dateLabel: parsed.dateLabel
          }
        };

        // Budget limit warnings checks
        const limit = categoryLimits[parsed.categoryId] || 0;
        if (limit > 0) {
          const today = new Date();
          const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
          
          // Calculate total for this category *this month*, including the new one
          const spentBefore = expenses
            .filter(exp => exp.categoryId === parsed.categoryId && exp.date && exp.date.startsWith(currentMonthStr))
            .reduce((sum, exp) => sum + exp.amount, 0);
          const totalSpent = spentBefore + parsed.amount;

          if (totalSpent > limit) {
            setTimeout(() => {
              const warningMsg: Message = {
                id: `warn-${Date.now()}`,
                sender: 'bot',
                isWarning: true,
                text: `🚨 CẢNH BÁO CHI TIÊU VƯỢT HẠN MỨC!\n\nBạn đã đặt hạn mức chi tiêu cho danh mục "${parsed.categoryName}" là ${formatCurrency(limit)}/tháng.\nGiao dịch này đẩy tổng chi tiêu danh mục lên ${formatCurrency(totalSpent)}, tức là đã vượt quá hạn mức ${formatCurrency(totalSpent - limit)} hằng tháng.`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, warningMsg]);
            }, 300);
          } else if (totalSpent >= limit * 0.9) {
            setTimeout(() => {
              const warningMsg: Message = {
                id: `warn-${Date.now()}`,
                sender: 'bot',
                isWarning: true,
                text: `⚠️ CẢNH BÁO GẦN CHẠM HẠN MỨC!\n\nDanh mục "${parsed.categoryName}" có hạn mức là ${formatCurrency(limit)}/tháng.\nTổng chi tiêu hiện tại đã đạt ${formatCurrency(totalSpent)} (${((totalSpent / limit) * 100).toFixed(0)}%). Hãy chú ý chi tiêu tiết kiệm hơn nhé!`,
                timestamp: new Date()
              };
              setMessages(prev => [...prev, warningMsg]);
            }, 300);
          }
        }
      } else {
        botMsg = {
          id: botMessageId,
          sender: 'bot',
          text: `❓ Mình chưa bóc tách được chi tiêu từ câu vừa rồi. Bạn viết rõ hơn chút nhé!\nVí dụ: "ăn sáng 35k", "đổ xăng 50 nghìn hôm qua", "mua quần áo 350k hôm kia"`,
          timestamp: new Date(),
          parsedResult: {
            success: false
          }
        };
      }

      setMessages(prev => [...prev, botMsg]);
    }, 450); // Small realistic delay
  };

  // Quick prompt chips
  const quickChips = [
    'ăn bún bò 45k hôm nay',
    'đổ xăng 50 nghìn hôm qua',
    'mua giày chạy bộ 1.2 tr',
    'đóng tiền mạng 250k',
    'vé xem phim rạp 120k hôm kia'
  ];

  const handleChipClick = (chipText: string) => {
    setInput(chipText);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-220px)] min-h-[480px] max-h-[650px] bg-[#FAF7F0] border border-[#E6DEC9] rounded-lg overflow-hidden shadow-sm">
      {/* Bot Chat Header */}
      <div className="bg-emerald-900 px-4 py-3 border-b border-[#E6DEC9] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-emerald-950 font-serif font-black shadow-inner">
            📔
          </div>
          <div>
            <h3 className="font-serif text-sm font-bold text-white tracking-wide">Trợ lý Sổ tay</h3>
            <span className="text-[10px] text-emerald-100 uppercase tracking-widest font-sans flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              Sẵn sàng phân tích câu nói
            </span>
          </div>
        </div>
        <div className="text-emerald-100 text-xs font-sans">
          Nội ngoại tuyến
        </div>
      </div>

      {/* Message List area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#FAF9F6]">
        {messages.map((msg) => {
          const isBot = msg.sender === 'bot';
          return (
            <div
              key={msg.id}
              className={`flex gap-2.5 max-w-[85%] ${isBot ? 'mr-auto' : 'ml-auto flex-row-reverse'}`}
            >
              {/* Avatar indicator */}
              <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center border text-xs font-serif ${
                msg.isWarning
                  ? 'bg-amber-100 text-amber-900 border-amber-300 animate-bounce'
                  : isBot 
                    ? 'bg-emerald-50 text-emerald-900 border-emerald-100' 
                    : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}>
                {msg.isWarning ? '🚨' : isBot ? <BookOpen size={14} /> : <User size={14} />}
              </div>

              {/* Message bubble */}
              <div className="space-y-1">
                <div className={`p-3 rounded-lg border text-sm shadow-sm ${
                  msg.isWarning
                    ? 'bg-amber-50 border-amber-300 text-amber-950 font-medium'
                    : isBot
                      ? 'bg-[#FAF7F0] border-[#E6DEC9] text-stone-800'
                      : 'bg-emerald-900 border-emerald-950 text-white'
                }`}>
                  <p className="whitespace-pre-line leading-relaxed">{msg.text}</p>
                  
                  {/* Custom card for successfully parsed logs */}
                  {msg.parsedResult?.success && (
                    <div className="mt-2 pt-2 border-t border-stone-200/50 flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-800">Danh mục:</span>
                        <span className="px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-100 text-[11px] text-emerald-900 font-medium">
                          {msg.parsedResult.categoryName}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-800">Ghi chú:</span>
                        <span className="text-stone-600 italic">"{msg.parsedResult.note}"</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-emerald-800">Số tiền:</span>
                        <span className="font-mono font-bold text-stone-800">
                          {formatCurrency(msg.parsedResult.amount || 0)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                
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
      <div className="px-4 py-2 border-t border-stone-100 bg-[#FAF7F0] overflow-x-auto whitespace-nowrap scrollbar-hide flex gap-2">
        <span className="text-[10px] font-bold text-stone-400 self-center uppercase mr-1 flex items-center gap-0.5 shrink-0">
          <HelpCircle size={10} /> Gợi ý gõ:
        </span>
        {quickChips.map((chip, idx) => (
          <button
            key={idx}
            onClick={() => handleChipClick(chip)}
            className="px-2.5 py-1 bg-white hover:bg-emerald-50 border border-stone-200 hover:border-emerald-700 text-stone-700 hover:text-emerald-900 text-xs rounded-full cursor-pointer transition whitespace-nowrap shrink-0"
          >
            "{chip}"
          </button>
        ))}
      </div>

      {/* Input Form area */}
      <form onSubmit={handleSend} className="p-3 border-t border-[#E6DEC9] bg-[#FAF7F0] flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ví dụ: 'ăn sáng 30k', 'đổ xăng xe 50k hôm qua'..."
          className="flex-1 bg-white border border-[#E6DEC9] rounded px-3 py-2 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700"
        />
        <button
          type="submit"
          className="bg-emerald-900 hover:bg-emerald-850 text-white px-4 py-2 rounded flex items-center justify-center gap-1 text-sm font-semibold cursor-pointer transition shadow-sm shrink-0"
        >
          <Send size={15} />
          Ghi
        </button>
      </form>
    </div>
  );
}
