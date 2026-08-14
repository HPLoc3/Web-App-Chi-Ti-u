import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  BarChart3, 
  Zap, 
  LogIn, 
  UserPlus, 
  Bot,
  ShieldCheck,
  PieChart,
  Target
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
      <header className="sticky top-0 z-40 bg-emerald-950/95 backdrop-blur-md text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-xl shadow font-serif font-black shrink-0">
              📔
            </div>
            <div>
              <h1 className="font-serif text-lg sm:text-xl font-black tracking-wide text-amber-50 flex items-center gap-2">
                SỔ TAY CHI TIÊU THÔNG MINH
              </h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-300/90 font-mono tracking-widest uppercase font-semibold">
                Nền tảng Quản lý Tài chính Cá nhân AI
              </p>
            </div>
          </div>

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
                  onClick={onStartDemo}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer min-h-[40px]"
                  title="Dùng thử trực tiếp với dữ liệu mẫu không cần tài khoản"
                >
                  <Sparkles size={15} className="text-amber-400" />
                  <span className="hidden sm:inline">Dùng thử Demo</span>
                </button>
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
                  <span>Đăng ký</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="h-2 bg-[#F3ECE0] border-y border-[#E6DEC9] w-full flex justify-center gap-8 sm:gap-12 overflow-hidden shrink-0">
        {[...Array(16)].map((_, i) => (
          <span key={i} className="w-2 bg-emerald-900/25 h-full inline-block"></span>
        ))}
      </div>

      <main className="flex-1 max-w-5xl mx-auto px-4 py-12 space-y-16">
        <section className="text-center space-y-6 pt-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 border border-emerald-300 text-emerald-900 text-xs font-semibold">
            <Sparkles size={14} className="text-amber-600" />
            <span>Tích hợp Trợ lý Trí tuệ Nhân tạo AI Tiếng Việt</span>
          </div>

          <h2 className="font-serif text-3xl sm:text-5xl font-black text-emerald-950 leading-tight">
            Quản Lý Chi Tiêu Tự Động <br className="hidden sm:inline" />
            <span className="text-amber-700">Chỉ Trong 10 Giây Mỗi Ngày</span>
          </h2>

          <p className="text-stone-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            Nhập liệu bằng câu nói tự nhiên qua Chatbot AI, theo dõi phân bổ ngân sách 50/30/20, và tự động đồng bộ đám mây an toàn.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onStartDemo}
              className="px-6 py-3.5 bg-emerald-900 hover:bg-emerald-850 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl transition cursor-pointer flex items-center gap-2 min-h-[48px]"
            >
              <span>Bắt đầu trải nghiệm ngay</span>
              <ArrowRight size={18} />
            </button>

            {!isLoggedIn && (
              <button
                onClick={onOpenRegister}
                className="px-6 py-3.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-800 font-bold text-sm rounded-xl transition cursor-pointer min-h-[48px]"
              >
                Tạo tài khoản miễn phí
              </button>
            )}
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-6 rounded-2xl space-y-3 shadow-xs">
            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl w-fit text-amber-700">
              <Bot size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-emerald-950">Chatbot AI Tiếng Việt</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Gõ câu nói như "Ăn sáng 45k, đổ xăng 50k", AI tự động bóc tách danh mục và lưu vào sổ chi tiêu.
            </p>
          </div>

          <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-6 rounded-2xl space-y-3 shadow-xs">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl w-fit text-emerald-800">
              <PieChart size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-emerald-950">Mô hình Ngân sách 50/30/20</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Tự động phân bổ thu nhập cho Nhu cầu thiết yếu, Sở thích và Tiết kiệm giúp kiểm soát tài chính.
            </p>
          </div>

          <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-6 rounded-2xl space-y-3 shadow-xs">
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl w-fit text-blue-800">
              <ShieldCheck size={24} />
            </div>
            <h3 className="font-serif text-lg font-bold text-emerald-950">Lưu trữ Đám mây Bảo mật</h3>
            <p className="text-xs text-stone-600 leading-relaxed">
              Dữ liệu đồng bộ realtime với Firebase Firestore hoặc mã hóa an toàn trên LocalStorage.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#E6DEC9] bg-[#FAF7F0] py-6 text-center text-xs text-stone-500">
        <p>© 2026 Sổ Tay Chi Tiêu Thông Minh. All rights reserved.</p>
      </footer>
    </div>
  );
}
