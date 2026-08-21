import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  Wallet, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  CheckCircle2, 
  ShieldCheck, 
  Zap,
  ArrowUpRight,
  Bot,
  Receipt,
  PiggyBank
} from 'lucide-react';

interface HeroSectionProps {
  onStart: () => void;
  onDemo: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function HeroSection({
  onStart,
  onDemo,
  isLoggedIn,
  userName,
}: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden pt-6 sm:pt-10 pb-16 lg:pb-24 border-b border-stone-200/80 bg-gradient-to-b from-[#FAF7F0] via-[#FAF9F6] to-[#FAF9F6]">
      
      {/* Background Soft Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-emerald-100/40 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-72 h-72 bg-amber-100/60 rounded-full blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Hero Header */}
        <div className="text-center max-w-3xl mx-auto space-y-5">
          
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/10 border border-emerald-800/20 text-emerald-950 text-xs font-semibold shadow-xs">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="font-serif">Sổ Tay Chi Tiêu Thông Minh</span>
            <span className="text-stone-400">•</span>
            <span className="text-amber-800 font-bold flex items-center gap-1">
              <Sparkles size={12} className="text-amber-600" /> Trợ lý AI Tiếng Việt
            </span>
          </div>

          {/* Headline - exact requested */}
          <h1 className="font-serif text-3xl sm:text-5xl lg:text-6xl font-black text-emerald-950 tracking-tight leading-[1.15]">
            Quản lý tiền dễ hơn. <br className="hidden sm:inline" />
            <span className="text-amber-700 underline decoration-amber-400/60 decoration-wavy decoration-2 underline-offset-8">
              Hiểu chi tiêu rõ hơn.
            </span>
          </h1>

          {/* Subheadline - exact requested */}
          <p className="text-stone-600 text-base sm:text-lg sm:leading-relaxed max-w-2xl mx-auto font-normal">
            Theo dõi thu chi, lập ngân sách và nhận phân tích tài chính bằng AI trong một nơi.
          </p>

          {/* CTA Buttons */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
            <button
              onClick={onStart}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-950 hover:bg-emerald-900 text-amber-50 font-bold text-sm sm:text-base rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2.5 min-h-[48px] focus:ring-4 focus:ring-emerald-900/30 group"
            >
              <span>{isLoggedIn ? `Vào ứng dụng (${userName || 'User'})` : 'Bắt đầu sử dụng'}</span>
              <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
            </button>

            <button
              onClick={onDemo}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-stone-50 text-stone-800 border border-stone-300 font-semibold text-sm sm:text-base rounded-xl shadow-xs hover:shadow transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 min-h-[48px] focus:ring-2 focus:ring-stone-300"
            >
              <Play size={16} className="text-amber-600 fill-amber-600" />
              <span>Xem demo</span>
            </button>
          </div>

          {/* Key Value Micro-Pills */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-stone-600">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>Ghi chép bằng AI &lt; 10 giây</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>Quy tắc Ngân sách 50/30/20</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-700" />
              <span>Hoạt động Offline & Đồng bộ Cloud</span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------- PRODUCT VISUAL (REAL APPLICATION DASHBOARD MOCKUP) */}
        <div className="mt-10 sm:mt-14 relative max-w-5xl mx-auto">
          
          {/* Mockup Frame / Container with Leather-stitch Accent */}
          <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl sm:rounded-3xl p-3 sm:p-6 shadow-2xl relative overflow-hidden ring-1 ring-black/5">
            
            {/* Top Window Bar */}
            <div className="flex items-center justify-between pb-3 sm:pb-4 border-b border-stone-200/80 mb-4 sm:mb-6">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400/80" />
                  <div className="w-3 h-3 rounded-full bg-amber-400/80" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400/80" />
                </div>
                <span className="text-[11px] font-mono text-stone-400 ml-2 hidden sm:inline">
                  sotaychitieuthongminh.app/dashboard
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-md font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Live Sync
                </span>
                <span className="text-xs font-serif font-bold text-stone-600 hidden sm:inline">
                  Kỳ tài chính: Tháng 8/2026
                </span>
              </div>
            </div>

            {/* Mockup Content Grid: Real Dashboard Experience */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
              
              {/* Left 2 Cols: Financial Overview Metrics + 50/30/20 Progress */}
              <div className="lg:col-span-2 space-y-4">
                
                {/* 3 Metric Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  
                  {/* Total Balance */}
                  <div className="bg-emerald-950 text-white rounded-xl p-3.5 sm:p-4 shadow-sm border border-emerald-800 relative overflow-hidden">
                    <div className="flex items-center justify-between text-xs text-emerald-200">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Tổng Số Dư Ví</span>
                      <Wallet size={14} className="text-amber-400" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono text-amber-300 mt-1">
                      30.000.000 ₫
                    </div>
                    <div className="text-[10px] text-emerald-300 flex items-center gap-1 mt-1 font-medium">
                      <TrendingUp size={11} className="text-emerald-400" />
                      <span>+12.5% so với tháng trước</span>
                    </div>
                  </div>

                  {/* Monthly Income */}
                  <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Thu Nhập Tháng</span>
                      <TrendingUp size={14} className="text-emerald-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono text-emerald-800 mt-1">
                      25.000.000 ₫
                    </div>
                    <div className="text-[10px] text-stone-400 mt-1">
                      Lương cứng & Thưởng dự án
                    </div>
                  </div>

                  {/* Monthly Expense */}
                  <div className="bg-white rounded-xl p-3.5 sm:p-4 border border-stone-200/80 shadow-xs">
                    <div className="flex items-center justify-between text-xs text-stone-500">
                      <span className="font-semibold uppercase tracking-wider text-[10px]">Đã Chi Tiêu</span>
                      <TrendingDown size={14} className="text-amber-600" />
                    </div>
                    <div className="text-lg sm:text-xl font-bold font-mono text-stone-900 mt-1">
                      8.450.000 ₫
                    </div>
                    <div className="text-[10px] text-emerald-600 font-semibold mt-1">
                      Còn lại: 16.550.000 ₫ (66%)
                    </div>
                  </div>

                </div>

                {/* 50/30/20 Allocation Visual Bar */}
                <div className="bg-white rounded-xl p-4 border border-stone-200/80 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart size={16} className="text-emerald-800" />
                      <h4 className="font-serif font-bold text-xs sm:text-sm text-emerald-950">
                        Phân Bổ Ngân Sách Chuẩn 50/30/20
                      </h4>
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      An toàn 85/100
                    </span>
                  </div>

                  {/* Multi-segmented Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-full bg-stone-100 rounded-full overflow-hidden flex shadow-inner">
                      <div className="bg-emerald-600 h-full transition-all" style={{ width: '45%' }} title="Nhu cầu thiết yếu: 45%" />
                      <div className="bg-amber-500 h-full transition-all" style={{ width: '22%' }} title="Chi tiêu linh hoạt: 22%" />
                      <div className="bg-blue-600 h-full transition-all" style={{ width: '33%' }} title="Tích lũy & Tiết kiệm: 33%" />
                    </div>

                    <div className="grid grid-cols-3 text-[11px] pt-1">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-stone-700 block">Thiết yếu (50%)</span>
                          <span className="font-mono text-stone-500 text-[10px]">5.6M / 12.5M</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                        <div>
                          <span className="font-semibold text-stone-700 block">Sở thích (30%)</span>
                          <span className="font-mono text-stone-500 text-[10px]">2.85M / 7.5M</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-stone-700 block">Tiết kiệm (20%)</span>
                          <span className="font-mono text-stone-500 text-[10px]">5.0M / 5.0M ✓</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mini Transaction Feed in Mockup */}
                <div className="bg-white rounded-xl p-3 sm:p-4 border border-stone-200/80 space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pb-1 border-b border-stone-100">
                    <span className="font-serif font-bold text-emerald-950">Giao dịch gần đây</span>
                    <span className="text-[11px] text-stone-400 font-mono">Tự động nhận diện</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 hover:bg-stone-100/80 transition text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-sm">
                          🍜
                        </div>
                        <div>
                          <div className="font-bold text-stone-800">Phở bò tái nạm & Cafe</div>
                          <div className="text-[10px] text-stone-500">Ăn uống • Ví Tiền Mặt • Hôm nay, 12:30</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-stone-900">-75.000 ₫</span>
                    </div>

                    <div className="flex items-center justify-between p-2 rounded-lg bg-stone-50 hover:bg-stone-100/80 transition text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-sm">
                          🚗
                        </div>
                        <div>
                          <div className="font-bold text-stone-800">Grab Car đi gặp khách hàng</div>
                          <div className="text-[10px] text-stone-500">Di chuyển • Thẻ Ngân hàng • Hôm nay, 09:15</div>
                        </div>
                      </div>
                      <span className="font-mono font-bold text-stone-900">-85.000 ₫</span>
                    </div>
                  </div>
                </div>

              </div>

              {/* Right Col: AI Copilot Live Assistant Card */}
              <div className="bg-emerald-950 text-white rounded-xl p-4 sm:p-5 flex flex-col justify-between border border-emerald-800 relative shadow-md">
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-emerald-800/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500 text-emerald-950 flex items-center justify-center">
                        <Bot size={18} />
                      </div>
                      <div>
                        <div className="font-serif font-bold text-xs text-amber-100">AI Copilot Tiếng Việt</div>
                        <div className="text-[10px] text-emerald-300 font-mono">Bóc tách tự nhiên 100%</div>
                      </div>
                    </div>
                    <span className="text-[10px] bg-emerald-900 text-amber-300 px-2 py-0.5 rounded font-mono border border-emerald-700">
                      Sẵn sàng
                    </span>
                  </div>

                  {/* Simulated Conversation Bubble */}
                  <div className="space-y-2.5 pt-1 text-xs">
                    <div className="bg-emerald-900/90 rounded-xl p-2.5 text-emerald-100 border border-emerald-800/80 text-[11px] space-y-1">
                      <span className="text-[10px] font-mono text-amber-300 font-bold block">Bạn:</span>
                      <p className="italic">"Hôm nay ăn trưa 120k và 80k tiền Grab"</p>
                    </div>

                    <div className="bg-emerald-900/50 rounded-xl p-2.5 text-emerald-50 border border-amber-500/30 text-[11px] space-y-2">
                      <div className="flex items-center gap-1 text-amber-400 font-bold text-[10px] font-mono">
                        <Sparkles size={11} />
                        <span>AI đã bóc tách 2 giao dịch:</span>
                      </div>
                      <div className="space-y-1 pl-1 border-l-2 border-amber-400/60 font-mono text-[10px]">
                        <div className="flex justify-between">
                          <span>• Ăn uống:</span>
                          <span className="text-amber-300 font-bold">120.000 ₫</span>
                        </div>
                        <div className="flex justify-between">
                          <span>• Di chuyển:</span>
                          <span className="text-amber-300 font-bold">80.000 ₫</span>
                        </div>
                      </div>
                      <div className="text-[10px] text-emerald-300 pt-0.5 flex items-center gap-1 font-sans">
                        <CheckCircle2 size={11} className="text-emerald-400" />
                        <span>Đã lưu vào ví và trừ hạn mức 50/30/20!</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Copilot Footer Prompt */}
                <div className="pt-3 border-t border-emerald-800/80 mt-3">
                  <div className="bg-emerald-900/90 rounded-lg px-3 py-2 text-[11px] text-emerald-300 font-mono flex items-center justify-between">
                    <span>Nhập câu tự nhiên...</span>
                    <ArrowRight size={13} className="text-amber-400" />
                  </div>
                </div>

              </div>

            </div>

          </div>

          {/* Floating Trust Callout Pill */}
          <div className="hidden sm:flex absolute -bottom-5 left-1/2 -translate-x-1/2 bg-white/95 backdrop-blur-sm border border-stone-200 shadow-lg px-4 py-2 rounded-full items-center gap-3 text-xs text-stone-700 font-semibold">
            <span className="flex items-center gap-1 text-emerald-800">
              <ShieldCheck size={15} className="text-emerald-600" />
              <span>Bảo mật HttpOnly & Mã hóa Bcrypt</span>
            </span>
            <span className="text-stone-300">|</span>
            <span className="flex items-center gap-1 text-amber-800">
              <Zap size={14} className="text-amber-600" />
              <span>Tốc độ phản hồi &lt; 0.1s</span>
            </span>
          </div>

        </div>

      </div>

    </section>
  );
}
