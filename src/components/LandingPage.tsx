import React from 'react';
import { 
  Sparkles, 
  Wallet, 
  MessageSquare, 
  SlidersHorizontal, 
  PiggyBank, 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Zap, 
  LogIn, 
  UserPlus, 
  Bot,
  Brain,
  Lock,
  Globe
} from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onStartDemo: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function LandingPage({
  onOpenLogin,
  onOpenRegister,
  onStartDemo,
  isLoggedIn,
  userName
}: LandingPageProps) {
  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-emerald-950">
      
      {/* ---------------------------------------------------------------- border top band */}
      <header className="sticky top-0 z-40 bg-emerald-950/95 backdrop-blur-md text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-xl shadow font-serif font-black shrink-0">
              📔
            </div>
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-black tracking-wide text-amber-50 flex items-center gap-2">
                SỔ TAY CHI TIÊU THÔNG MINH
              </h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-300/90 font-mono tracking-widest uppercase font-semibold">
                hophuloc.online
              </p>
            </div>
          </div>

          {/* Nav Links & Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {isLoggedIn ? (
              <button
                onClick={onStartDemo}
                className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md min-h-[40px]"
              >
                <span>Vào ứng dụng ({userName || 'User'})</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button
                  onClick={onOpenLogin}
                  className="flex items-center gap-1.5 px-3.5 py-2 text-amber-100 hover:text-white hover:bg-emerald-900 border border-emerald-700/80 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer min-h-[40px]"
                >
                  <LogIn size={15} />
                  <span>Đăng nhập</span>
                </button>
                <button
                  onClick={onOpenRegister}
                  className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md min-h-[40px]"
                >
                  <UserPlus size={15} />
                  <span className="hidden sm:inline">Đăng ký ngay</span>
                  <span className="sm:hidden">Đăng ký</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Decorative Leather-Notebook Binding Line */}
      <div className="h-2 bg-[#F3ECE0] border-y border-[#E6DEC9] w-full flex justify-center gap-8 sm:gap-12 overflow-hidden shrink-0">
        {[...Array(16)].map((_, i) => (
          <span key={i} className="w-2 bg-emerald-900/25 h-full inline-block"></span>
        ))}
      </div>

      {/* ---------------------------------------------------------------- HERO SECTION */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 max-w-6xl mx-auto w-full flex flex-col items-center text-center">
        
        {/* Floating Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold mb-6 shadow-xs animate-in fade-in slide-in-from-bottom-2">
          <Sparkles size={14} className="text-amber-600 animate-spin-slow" />
          <span>Tích hợp Google AI Studio (Gemini API) • Quản lý tài chính cá nhân</span>
        </div>

        {/* Hero Title */}
        <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-black text-emerald-950 tracking-tight leading-[1.15] max-w-4xl mb-6">
          SỔ TAY CHI TIÊU THÔNG MINH
        </h2>

        {/* Hero Subtitle */}
        <p className="text-stone-600 text-base sm:text-lg md:text-xl max-w-2xl font-normal leading-relaxed mb-8">
          Giải pháp ghi chép chi tiêu bằng <strong className="text-emerald-900 font-semibold">AI tiếng Việt</strong>. Tự động bóc tách giao dịch, phân bổ ngân sách 50/30/20 và tích lũy mục tiêu thông minh chỉ trong vài giây.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md mb-12">
          <button
            onClick={isLoggedIn ? onStartDemo : onOpenRegister}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2.5 bg-emerald-900 hover:bg-emerald-850 text-white font-bold py-3.5 px-7 rounded-2xl shadow-lg hover:shadow-xl transition-all cursor-pointer min-h-[50px] text-base"
          >
            <Zap size={18} className="text-amber-400 fill-amber-400" />
            <span>Trải nghiệm ngay</span>
            <ArrowRight size={18} />
          </button>

          {!isLoggedIn && (
            <button
              onClick={onOpenLogin}
              className="w-full sm:w-auto flex-1 flex items-center justify-center gap-2 bg-white hover:bg-stone-50 border-2 border-[#E6DEC9] text-stone-800 font-semibold py-3.5 px-6 rounded-2xl shadow-sm transition-all cursor-pointer min-h-[50px] text-base"
            >
              <LogIn size={18} className="text-emerald-800" />
              <span>Đăng nhập</span>
            </button>
          )}
        </div>

        {/* Interactive App Mockup Preview Card */}
        <div className="w-full max-w-4xl bg-[#FCFAF4] border-4 border-double border-[#E6DEC9] rounded-2xl p-4 sm:p-6 shadow-xl text-left relative overflow-hidden">
          
          {/* Card Top Header */}
          <div className="flex items-center justify-between border-b border-[#E6DEC9] pb-3 mb-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-amber-400 inline-block"></span>
              <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block"></span>
              <span className="ml-2 font-serif text-xs font-bold text-stone-600 uppercase tracking-wider">
                Mô phỏng Trợ lý AI & Bảng điều khiển
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200">
              <Bot size={13} />
              <span>Gemini Pro Active</span>
            </div>
          </div>

          {/* Grid Preview: Left Chatbot + Right Overview Widget */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Left AI Chat Simulation */}
            <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-xl p-3.5 flex flex-col gap-3 font-sans">
              <div className="flex items-center gap-2 text-xs font-serif font-bold text-emerald-950 border-b border-stone-200/80 pb-2">
                <MessageSquare size={14} className="text-amber-600" />
                <span>Ghi nhanh bằng ngôn ngữ tự nhiên</span>
              </div>

              {/* User Prompt */}
              <div className="flex gap-2 items-start justify-end">
                <div className="bg-emerald-900 text-white text-xs px-3 py-2 rounded-2xl rounded-tr-xs shadow-xs max-w-[85%]">
                  Hôm nay ăn phở sáng 45k, cà phê 30k và đi chợ 150k nhé!
                </div>
              </div>

              {/* AI Response */}
              <div className="flex gap-2 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-emerald-950 flex items-center justify-center font-bold text-xs shrink-0">
                  🤖
                </div>
                <div className="bg-white border border-[#E6DEC9] text-stone-800 text-xs p-3 rounded-2xl rounded-tl-xs shadow-xs space-y-1.5">
                  <p className="font-semibold text-emerald-900">
                    ✅ Đã tự động bóc tách & lưu 3 khoản chi:
                  </p>
                  <ul className="list-disc list-inside text-stone-600 space-y-0.5 pl-1">
                    <li>Ăn sáng phở bò: <strong>45.000₫</strong> (Ăn uống)</li>
                    <li>Cà phê: <strong>30.000₫</strong> (Ăn uống)</li>
                    <li>Đi chợ thực phẩm: <strong>150.000₫</strong> (Ăn uống)</li>
                  </ul>
                  <p className="text-[10px] text-stone-500 pt-1 border-t border-stone-100">
                    💡 Tổng chi hôm nay: 225.000₫. Ngân sách tháng còn 68%.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Financial Overview Widget Simulation */}
            <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-xl p-3.5 flex flex-col justify-between gap-3 font-sans">
              <div className="flex items-center justify-between text-xs font-serif font-bold text-emerald-950 border-b border-stone-200/80 pb-2">
                <div className="flex items-center gap-1.5">
                  <BarChart3 size={14} className="text-amber-600" />
                  <span>Tổng quan tài chính tháng</span>
                </div>
                <span className="text-[10px] text-stone-400 font-mono">2026-08</span>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 uppercase block font-semibold">Thu nhập</span>
                  <span className="text-sm font-bold text-emerald-700 font-mono">18.000.000₫</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-stone-200">
                  <span className="text-[10px] text-stone-500 uppercase block font-semibold">Đã chi tiêu</span>
                  <span className="text-sm font-bold text-red-700 font-mono">5.650.000₫</span>
                </div>
              </div>

              {/* Progress Bar 50/30/20 */}
              <div className="bg-white p-2.5 rounded-lg border border-stone-200 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-semibold text-stone-700">Tiến độ Ngân sách 50/30/20</span>
                  <span className="font-bold text-emerald-800 font-mono">31.4%</span>
                </div>
                <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-600 h-full w-[31%]" title="Thiết yếu"></div>
                  <div className="bg-amber-500 h-full w-[15%]" title="Linh hoạt"></div>
                  <div className="bg-blue-600 h-full w-[20%]" title="Tích lũy"></div>
                </div>
                <div className="flex justify-between text-[10px] text-stone-400">
                  <span>Còn lại: 12.350.000₫</span>
                  <span className="text-emerald-700 font-medium">An toàn</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- FEATURE HIGHLIGHTS */}
      <section className="bg-[#FAF7F0] border-y border-[#E6DEC9] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-serif font-bold text-amber-700 uppercase tracking-widest block mb-2">
              TÍNH NĂNG NỔI BẬT
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 mb-3">
              Mọi công cụ bạn cần để quản lý tiền hiệu quả
            </h3>
            <p className="text-stone-600 text-sm sm:text-base">
              Kết hợp giữa sổ tay truyền thống đơn giản và trí tuệ nhân tạo Gemini hiện đại.
            </p>
          </div>

          {/* 4 Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Feature 1 */}
            <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-amber-100 border border-amber-300 text-amber-800 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-xs">
                  🤖
                </div>
                <h4 className="font-serif text-lg font-bold text-stone-800 mb-2">
                  Trợ lý AI Tiếng Việt
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  Gõ chi tiêu tự nhiên bằng câu nói thường ngày. Gemini tự động bóc tách số tiền, danh mục và lưu lại chỉ trong 1 giây.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Không cần chọn danh mục thủ công</span>
              </div>
            </div>

            {/* Feature 2 */}
            <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-xs">
                  📊
                </div>
                <h4 className="font-serif text-lg font-bold text-stone-800 mb-2">
                  Thống Kê Trực Quan
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  Biểu đồ phân bổ chi tiêu, xu hướng 7 ngày gần nhất và báo cáo thu chi chi tiết giúp bạn luôn chủ động nắm bắt dòng tiền.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Minh bạch mọi giao dịch</span>
              </div>
            </div>

            {/* Feature 3 */}
            <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-blue-100 border border-blue-300 text-blue-800 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-xs">
                  🎯
                </div>
                <h4 className="font-serif text-lg font-bold text-stone-800 mb-2">
                  Ngân Sách & Mục Tiêu
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  Tự động phân bổ thu nhập 50/30/20, thiết lập hạn mức cảnh báo chi tiêu và lập quỹ tiết kiệm cho dự định tương lai.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Cảnh báo khi sắp vượt hạn mức</span>
              </div>
            </div>

            {/* Feature 4 */}
            <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 shadow-xs hover:shadow-md transition flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 bg-purple-100 border border-purple-300 text-purple-800 rounded-xl flex items-center justify-center mb-4 text-2xl shadow-xs">
                  🔒
                </div>
                <h4 className="font-serif text-lg font-bold text-stone-800 mb-2">
                  Bảo Mật Firebase Auth
                </h4>
                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  Đăng nhập nhanh Google Sign-In hoặc Email. Dữ liệu cá nhân được lưu trữ an toàn, hỗ trợ xuất/nhập tệp JSON sao lưu.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-stone-200/80 text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Google OAuth 2.0 chuẩn bảo mật</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- CALL TO ACTION BANNER */}
      <section className="py-16 px-4 bg-emerald-950 text-white border-t-4 border-amber-500 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto relative z-10 space-y-6">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl text-emerald-950 flex items-center justify-center text-3xl font-serif font-bold mx-auto shadow-lg">
            📔
          </div>
          
          <h3 className="font-serif text-3xl sm:text-4xl font-black text-amber-50 tracking-tight">
            Bắt đầu quản lý tài chính thông minh ngay hôm nay
          </h3>

          <p className="text-emerald-200 text-sm sm:text-base max-w-xl mx-auto font-sans leading-relaxed">
            Đăng ký tài khoản miễn phí hoặc đăng nhập bằng Google để trải nghiệm trọn vẹn Trợ lý Sổ Tay Chi Tiêu THÔNG MINH của Hồ Phú Lộc.
          </p>

          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={isLoggedIn ? onStartDemo : onOpenRegister}
              className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-base rounded-2xl transition cursor-pointer shadow-lg min-h-[48px] flex items-center justify-center gap-2"
            >
              <span>{isLoggedIn ? 'Vào bảng điều khiển' : 'Đăng ký tài khoản miễn phí'}</span>
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
      </section>

      {/* ---------------------------------------------------------------- FOOTER */}
      <footer className="border-t border-[#E6DEC9] bg-[#FAF7F0] py-6 text-center text-xs text-stone-500 font-sans">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-serif font-bold text-stone-700">
            <span>📔 SỔ TAY CHI TIÊU THÔNG MINH</span>
            <span className="text-stone-300">•</span>
            <span className="text-xs font-mono font-normal text-emerald-800">hophuloc.online</span>
          </div>

          <p className="text-[11px] text-stone-400">
            Phát triển bởi <strong className="text-stone-700 font-semibold">Hồ Phú Lộc</strong> • Google AI Studio & Firebase Integration
          </p>
        </div>
      </footer>

    </div>
  );
}
