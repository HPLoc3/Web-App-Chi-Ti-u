import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  CheckCircle2, 
  Receipt, 
  Wallet, 
  Calendar, 
  TrendingDown,
  ArrowRight,
  Zap,
  Play
} from 'lucide-react';

interface ParsedItem {
  name: string;
  category: string;
  categoryType: 'NEEDS' | 'WANTS' | 'SAVINGS';
  amount: number;
  wallet: string;
  date: string;
  budgetImpact: string;
  icon: string;
}

interface DemoScenario {
  userInput: string;
  aiMessage: string;
  items: ParsedItem[];
}

export default function AiCopilotSection({
  onTryChatbot
}: {
  onTryChatbot?: () => void;
}) {
  const scenarios: DemoScenario[] = [
    {
      userInput: "Tôi vừa chi 120.000 tiền ăn trưa và 80.000 tiền Grab.",
      aiMessage: "Đã bóc tách chính xác 2 khoản giao dịch phát sinh từ câu nói của bạn:",
      items: [
        {
          name: "Ăn trưa văn phòng",
          category: "Ăn uống",
          categoryType: "NEEDS",
          amount: 120000,
          wallet: "Ví Tiền Mặt",
          date: "Hôm nay",
          budgetImpact: "Chiếm 0.96% hạn mức Nhu cầu thiết yếu",
          icon: "🍜"
        },
        {
          name: "Grab di chuyển",
          category: "Di chuyển",
          categoryType: "NEEDS",
          amount: 80000,
          wallet: "Ví Tiền Mặt",
          date: "Hôm nay",
          budgetImpact: "Chiếm 0.64% hạn mức Nhu cầu thiết yếu",
          icon: "🚗"
        }
      ]
    },
    {
      userInput: "Mua áo sơ mi 350k và uống trà sữa 55k bằng thẻ ngân hàng.",
      aiMessage: "Đã nhận diện 2 khoản chi thuộc nhóm Sở thích (Wants):",
      items: [
        {
          name: "Áo sơ mi mới",
          category: "Mua sắm",
          categoryType: "WANTS",
          amount: 350000,
          wallet: "Thẻ Ngân hàng",
          date: "Hôm nay",
          budgetImpact: "Chiếm 4.6% hạn mức Chi tiêu linh hoạt",
          icon: "🛍️"
        },
        {
          name: "Trà sữa bạn bè",
          category: "Ăn uống / Cafe",
          categoryType: "WANTS",
          amount: 55000,
          wallet: "Thẻ Ngân hàng",
          date: "Hôm nay",
          budgetImpact: "Chiếm 0.73% hạn mức Chi tiêu linh hoạt",
          icon: "🧋"
        }
      ]
    },
    {
      userInput: "Đóng tiền điện 850k và tiền nước 120k kỳ này.",
      aiMessage: "Đã tự động gom nhóm vào hóa đơn sinh hoạt định kỳ:",
      items: [
        {
          name: "Hóa đơn tiền điện",
          category: "Hóa đơn & Tiện ích",
          categoryType: "NEEDS",
          amount: 850000,
          wallet: "Thẻ Ngân hàng",
          date: "Hôm nay",
          budgetImpact: "Chiếm 6.8% hạn mức Nhu cầu thiết yếu",
          icon: "⚡"
        },
        {
          name: "Hóa đơn tiền nước",
          category: "Hóa đơn & Tiện ích",
          categoryType: "NEEDS",
          amount: 120000,
          wallet: "Thẻ Ngân hàng",
          date: "Hôm nay",
          budgetImpact: "Chiếm 0.96% hạn mức Nhu cầu thiết yếu",
          icon: "💧"
        }
      ]
    }
  ];

  const [activeScenarioIdx, setActiveScenarioIdx] = useState(0);
  const [customInput, setCustomInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const currentScenario = scenarios[activeScenarioIdx];

  const handleSelectScenario = (idx: number) => {
    setIsProcessing(true);
    setTimeout(() => {
      setActiveScenarioIdx(idx);
      setIsProcessing(false);
    }, 250);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customInput.trim()) return;
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setCustomInput("");
      // select scenario closest or toggle
      setActiveScenarioIdx((prev) => (prev + 1) % scenarios.length);
    }, 400);
  };

  return (
    <section id="ai-copilot" className="py-16 sm:py-24 bg-gradient-to-b from-[#FAF9F6] via-[#F4F0E4] to-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-900 text-xs font-semibold">
            <Sparkles size={14} className="text-amber-700" />
            <span>Đột phá Trải nghiệm Người dùng</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-black text-emerald-950 tracking-tight">
            Trợ lý tài chính hiểu tiếng Việt
          </h2>

          <p className="text-stone-700 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Không còn ma sát gõ số hay chọn form thủ công. Chỉ cần gõ hoặc nói một câu tự nhiên như nhắn tin với bạn bè, AI sẽ tự động phân tích và lưu trữ.
          </p>
        </div>

        {/* Live Interactive Simulation Container */}
        <div className="max-w-4xl mx-auto bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl sm:rounded-3xl shadow-xl overflow-hidden">
          
          {/* Top Bar of Chat Window */}
          <div className="bg-emerald-950 text-white px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-3 border-b border-amber-500/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center font-bold shadow-xs">
                <Bot size={22} />
              </div>
              <div>
                <div className="font-serif font-bold text-sm sm:text-base text-amber-100 flex items-center gap-2">
                  AI Copilot • Bóc Tách Tự Nhiên
                  <span className="text-[10px] font-sans font-bold bg-emerald-800 text-emerald-200 px-2 py-0.5 rounded-full">
                    Online
                  </span>
                </div>
                <div className="text-[11px] text-emerald-300 font-mono">
                  Phản hồi trong &lt; 0.2s • Chuẩn ngữ pháp Tiếng Việt
                </div>
              </div>
            </div>

            {onTryChatbot && (
              <button
                onClick={onTryChatbot}
                className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>Mở trong app</span>
                <ArrowRight size={13} />
              </button>
            )}
          </div>

          {/* Prompt Selector Pills */}
          <div className="p-4 sm:p-5 bg-stone-100/70 border-b border-stone-200/80 space-y-2">
            <span className="text-[11px] font-mono uppercase font-bold text-stone-500 block">
              Bấm vào câu mẫu để xem AI xử lý trực tiếp:
            </span>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((sc, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectScenario(idx)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeScenarioIdx === idx
                      ? 'bg-emerald-950 text-amber-300 shadow-sm border border-emerald-900'
                      : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
                  }`}
                >
                  <Play size={11} className={activeScenarioIdx === idx ? 'fill-amber-300 text-amber-300' : 'text-stone-400'} />
                  <span>"{sc.userInput}"</span>
                </button>
              ))}
            </div>
          </div>

          {/* Conversation Body */}
          <div className="p-4 sm:p-6 space-y-5">
            
            {/* User Message Bubble */}
            <div className="flex items-start justify-end gap-2.5">
              <div className="bg-emerald-900 text-white rounded-2xl rounded-tr-xs px-4 py-3 max-w-lg shadow-sm space-y-1">
                <span className="text-[10px] font-mono text-emerald-300 uppercase tracking-wider block">
                  Người dùng (User)
                </span>
                <p className="text-sm sm:text-base font-medium">
                  "{currentScenario.userInput}"
                </p>
              </div>
              <div className="w-8 h-8 rounded-full bg-stone-300 text-stone-700 font-bold text-xs flex items-center justify-center shrink-0">
                U
              </div>
            </div>

            {/* AI Assistant Message Bubble & Detailed Breakdown */}
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-full bg-amber-500 text-emerald-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                <Bot size={16} />
              </div>
              
              <div className="space-y-4 max-w-2xl w-full">
                
                {/* AI Text Bubble */}
                <div className="bg-white border border-stone-200 rounded-2xl rounded-tl-xs p-4 shadow-sm space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-950">
                    <Sparkles size={14} className="text-amber-600" />
                    <span>AI Copilot phản hồi:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700">
                    {currentScenario.aiMessage}
                  </p>
                </div>

                {/* Parsed Cards Output */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-mono uppercase font-bold text-stone-500 flex items-center gap-1">
                    <Receipt size={13} className="text-emerald-700" />
                    <span>Dữ liệu thực thể đã bóc tách:</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {currentScenario.items.map((item, i) => (
                      <div 
                        key={i}
                        className="bg-white border border-stone-200/90 rounded-xl p-3.5 space-y-2 shadow-xs hover:border-amber-400 transition-colors"
                      >
                        {/* Top: Icon + Name + Amount */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xl p-1.5 bg-stone-50 rounded-lg border border-stone-100">{item.icon}</span>
                            <div>
                              <div className="font-bold text-stone-900 text-xs sm:text-sm">{item.name}</div>
                              <div className="text-[11px] font-medium text-emerald-800">{item.category}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-stone-900 text-sm">
                              -{item.amount.toLocaleString('vi-VN')} ₫
                            </div>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-stone-100 text-stone-600">
                              {item.categoryType === 'NEEDS' ? 'Thiết yếu 50%' : 'Sở thích 30%'}
                            </span>
                          </div>
                        </div>

                        {/* Metadata Grid */}
                        <div className="pt-2 border-t border-stone-100 grid grid-cols-2 text-[10px] font-mono text-stone-500 gap-1">
                          <div className="flex items-center gap-1">
                            <Wallet size={11} className="text-stone-400" />
                            <span>{item.wallet}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar size={11} className="text-stone-400" />
                            <span>{item.date}</span>
                          </div>
                        </div>

                        {/* Budget Impact pill */}
                        <div className="text-[10px] bg-emerald-50 text-emerald-800 p-1.5 rounded-lg border border-emerald-100 flex items-center gap-1 font-sans">
                          <CheckCircle2 size={11} className="text-emerald-600 shrink-0" />
                          <span>{item.budgetImpact}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* Interactive Input Box at Bottom */}
          <form onSubmit={handleCustomSubmit} className="p-4 bg-stone-50 border-t border-stone-200/80 flex items-center gap-2">
            <input
              type="text"
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Gõ thử câu của bạn (VD: Ăn tối 150k và mua sách 80k)..."
              className="flex-1 bg-white border border-stone-300 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-700"
            />
            <button
              type="submit"
              disabled={isProcessing}
              className="px-4 py-2.5 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs min-h-[42px]"
            >
              <span>{isProcessing ? 'Đang phân tích...' : 'Thử ngay'}</span>
              <Send size={14} />
            </button>
          </form>

        </div>

      </div>
    </section>
  );
}
