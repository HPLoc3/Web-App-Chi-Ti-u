import React from 'react';
import { 
  Heart, 
  ShieldCheck, 
  Sparkles,
  ArrowUp
} from 'lucide-react';

export default function LandingFooter() {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="bg-emerald-950 text-emerald-100 border-t border-emerald-900/80 py-10 sm:py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-8 border-b border-emerald-900/60 text-center md:text-left">
          
          {/* Logo & Brand Info */}
          <div className="space-y-2">
            <div className="flex items-center justify-center md:justify-start gap-3">
              <div className="w-8 h-8 bg-amber-500 text-emerald-950 rounded-lg flex items-center justify-center font-serif font-black text-base shadow-sm">
                📔
              </div>
              <span className="font-serif text-lg font-bold text-amber-50 tracking-wide">
                SỔ TAY CHI TIÊU THÔNG MINH
              </span>
            </div>
            <p className="text-xs text-emerald-300/80 max-w-sm">
              Nền tảng quản lý tài chính cá nhân & ngân sách 50/30/20 có trợ lý AI tiếng Việt đồng hành.
            </p>
          </div>

          {/* Quick Links */}
          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs text-emerald-200">
            <a href="#problems" className="hover:text-amber-300 transition-colors">Vấn đề & Giải pháp</a>
            <a href="#benefits" className="hover:text-amber-300 transition-colors">Lợi ích</a>
            <a href="#how-it-works" className="hover:text-amber-300 transition-colors">Cách hoạt động</a>
            <a href="#features" className="hover:text-amber-300 transition-colors">Tính năng</a>
            <a href="#ai-copilot" className="hover:text-amber-300 transition-colors">AI Copilot</a>
            <a href="#budget" className="hover:text-amber-300 transition-colors">Ngân sách 50/30/20</a>
            <a href="#security" className="hover:text-amber-300 transition-colors">Bảo mật</a>
          </div>

          {/* Back to top button */}
          <button
            onClick={scrollToTop}
            className="p-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-850 text-amber-300 border border-emerald-800 transition cursor-pointer flex items-center gap-1.5 text-xs font-semibold shrink-0"
            aria-label="Cuộn lên đầu trang"
          >
            <ArrowUp size={14} />
            <span>Lên đầu trang</span>
          </button>
        </div>

        {/* Bottom copyright line */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-emerald-400/70 font-mono">
          <p>© 2026 Sổ Tay Chi Tiêu Thông Minh. Bản quyền thuộc về Hồ Phú Lộc.</p>
          <div className="flex items-center gap-2">
            <span>Nền tảng Quản lý Tài chính Cá nhân Hiện Đại</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
