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
  Cpu,
  Layers,
  Database,
  Award,
  CreditCard,
  FileSpreadsheet,
  Server
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
      
      {/* Header Band */}
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

      {/* Decorative Leather Binding Line */}
      <div className="h-2 bg-[#F3ECE0] border-y border-[#E6DEC9] w-full flex justify-center gap-8 sm:gap-12 overflow-hidden shrink-0">
        {[...Array(16)].map((_, i) => (
          <span key={i} className="w-2 bg-emerald-900/25 h-full inline-block"></span>
        ))}
      </div>

      {/* HERO SECTION */}
      <section className="relative pt-10 pb-16 sm:pt-16 sm:pb-24 px-4 max-w-6xl mx-auto w-full flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-100/80 border border-amber-300 text-amber-900 text-xs font-semibold mb-6 shadow-xs">
          <Sparkles size={14} className="text-amber-600 animate-pulse" />
          <span>Production-Ready Fullstack Portfolio Project • AI Assistant & Firestore Realtime Sync</span>
        </div>

        <h2 className="font-serif text-3xl sm:text-5xl md:text-6xl font-black text-emerald-950 tracking-tight leading-[1.15] max-w-4xl mb-6">
          SỔ TAY CHI TIÊU THÔNG MINH
        </h2>

        <p className="text-stone-600 text-base sm:text-lg md:text-xl max-w-2xl font-normal leading-relaxed mb-8">
          Giải pháp quản lý tài chính cá nhân toàn diện kết hợp <strong className="text-emerald-900 font-semibold">Trợ lý AI Tiếng Việt</strong>, thuật toán đánh giá sức khỏe tài chính 0-100, ngân sách 50/30/20 và đồng bộ đám mây Firestore thời gian thực.
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

        {/* Product Metrics Grid */}
        <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mb-12">
          <div className="p-4 rounded-xl bg-white border border-[#E6DEC9] shadow-2xs">
            <p className="text-2xl font-serif font-black text-emerald-900">5+</p>
            <p className="text-xs text-stone-500 font-medium">Phân hệ quản lý tài chính</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#E6DEC9] shadow-2xs">
            <p className="text-2xl font-serif font-black text-amber-600">100%</p>
            <p className="text-xs text-stone-500 font-medium">Bóc tách Tiếng Việt tự nhiên</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#E6DEC9] shadow-2xs">
            <p className="text-2xl font-serif font-black text-emerald-900">0 - 100</p>
            <p className="text-xs text-stone-500 font-medium">Điểm sức khỏe tài chính AI</p>
          </div>
          <div className="p-4 rounded-xl bg-white border border-[#E6DEC9] shadow-2xs">
            <p className="text-2xl font-serif font-black text-amber-600">Realtime</p>
            <p className="text-xs text-stone-500 font-medium">Đồng bộ Firebase Firestore</p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS SECTION */}
      <section className="bg-[#FAF7F0] border-y border-[#E6DEC9] py-16 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-serif font-bold text-amber-700 uppercase tracking-widest block mb-2">
              QUY TRÌNH HOẠT ĐỘNG
            </span>
            <h3 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 mb-3">
              3 bước để làm chủ tài chính cá nhân
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-bold font-mono text-lg flex items-center justify-center mb-4">
                01
              </div>
              <h4 className="font-serif font-bold text-stone-800 text-base mb-2">Ghi chép giao dịch siêu tốc</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Nhập bằng Tiếng Việt tự nhiên qua Trợ lý AI, nhập tay hoặc tải tệp sao kê ngân hàng CSV/Excel để AI tự bóc tách.
              </p>
            </div>

            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-500 text-emerald-950 font-bold font-mono text-lg flex items-center justify-center mb-4">
                02
              </div>
              <h4 className="font-serif font-bold text-stone-800 text-base mb-2">Phân bổ ngân sách & Cảnh báo</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Hệ thống tự động theo dõi hạn mức chi tiêu theo công thức 50/30/20 và nhắc nhở khi có nguy cơ vượt ngân sách.
              </p>
            </div>

            <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-900 text-amber-300 font-bold font-mono text-lg flex items-center justify-center mb-4">
                03
              </div>
              <h4 className="font-serif font-bold text-stone-800 text-base mb-2">Phân tích & Tích lũy mục tiêu</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Đánh giá chỉ số sức khỏe tài chính, xuất báo cáo tháng PDF và tối ưu hóa tốc độ đạt các mục tiêu dự phòng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* TECHNICAL STACK & ARCHITECTURE FOR RECRUITERS */}
      <section className="py-16 px-4 max-w-6xl mx-auto w-full">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-serif font-bold text-amber-700 uppercase tracking-widest block mb-2">
            TECHNICAL ARCHITECTURE & RECRUITER INFO
          </span>
          <h3 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 mb-3">
            Kiến trúc hệ thống Full-stack Production
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Tech Stack */}
          <div className="bg-emerald-950 text-emerald-50 border border-emerald-800/80 p-6 rounded-2xl shadow-xl space-y-4">
            <h4 className="text-sm font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-2">
              <Cpu size={18} />
              <span>Công nghệ sử dụng (Tech Stack)</span>
            </h4>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
                <strong className="text-amber-200 block mb-0.5">Frontend:</strong>
                <span>React 19 + TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Recharts</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
                <strong className="text-amber-200 block mb-0.5">Backend & AI Gateway:</strong>
                <span>Node.js Express + `@google/genai` TypeScript SDK (Server Proxy for Security)</span>
              </div>
              <div className="p-3 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
                <strong className="text-amber-200 block mb-0.5">Database & Security:</strong>
                <span>Firebase Auth + Firestore Cloud Database with Isolated Security Rules per UID</span>
              </div>
            </div>
          </div>

          {/* Architecture Diagram Box */}
          <div className="bg-white border border-[#E6DEC9] p-6 rounded-2xl shadow-md space-y-4">
            <h4 className="text-sm font-serif font-bold text-stone-800 flex items-center gap-2">
              <Layers size={18} className="text-amber-600" />
              <span>Sơ đồ luôn đồng bộ (Architecture Flow)</span>
            </h4>

            <div className="space-y-2.5 font-mono text-xs">
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span className="font-bold text-stone-700">Client React SPA</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">UI Layer</span>
              </div>
              <div className="text-center text-stone-400 font-bold">↓ API Requests & Rules Validation ↓</div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span className="font-bold text-stone-700">Express /api/ai/assistant</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Gemini API Proxy</span>
              </div>
              <div className="text-center text-stone-400 font-bold">↓ Realtime Collection Sync ↓</div>
              <div className="p-3 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                <span className="font-bold text-stone-700">Firestore (`users/{`uid`}/expenses`)</span>
                <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Realtime DB</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#E6DEC9] bg-[#FAF7F0] py-6 text-center text-xs text-stone-500 font-sans">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-serif font-bold text-stone-700">
            <span>📔 SỔ TAY CHI TIÊU THÔNG MINH</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Phát triển bởi Hồ Phú Lộc • Full-stack AI Finance Platform
          </p>
        </div>
      </footer>
    </div>
  );
}
