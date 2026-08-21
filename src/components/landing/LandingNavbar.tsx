import React, { useState, useEffect } from 'react';
import { 
  Menu, 
  X, 
  ArrowRight, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  BookOpen,
  Bot,
  SlidersHorizontal,
  ShieldCheck,
  Zap,
  HelpCircle
} from 'lucide-react';

interface LandingNavbarProps {
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onStartDemo: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function LandingNavbar({
  onOpenLogin,
  onOpenRegister,
  onStartDemo,
  isLoggedIn,
  userName,
}: LandingNavbarProps) {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);

      const sections = ['problems', 'solution', 'benefits', 'how-it-works', 'features', 'ai-copilot', 'budget', 'security'];
      const scrollPos = window.scrollY + 200;

      for (const sectionId of sections) {
        const el = document.getElementById(sectionId);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveSection(sectionId);
            return;
          }
        }
      }
      if (window.scrollY < 300) {
        setActiveSection('hero');
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      const navOffset = 70;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - navOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <header 
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled 
          ? 'bg-emerald-950/95 backdrop-blur-md shadow-lg border-b border-emerald-800/80 py-2.5' 
          : 'bg-emerald-950 text-white border-b-4 border-amber-500 py-3.5'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <button 
          onClick={() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            setActiveSection('hero');
          }}
          className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none focus:ring-2 focus:ring-amber-400 rounded-xl p-1"
          aria-label="Về đầu trang Sổ Tay Chi Tiêu Thông Minh"
        >
          <div className="w-10 h-10 bg-amber-500 text-emerald-950 rounded-xl flex items-center justify-center text-xl shadow-md font-serif font-black shrink-0 group-hover:scale-105 transition-transform duration-200">
            📔
          </div>
          <div>
            <div className="font-serif text-base sm:text-lg font-black tracking-wide text-amber-50 group-hover:text-amber-300 transition-colors flex items-center gap-2">
              SỔ TAY CHI TIÊU
              <span className="hidden xl:inline-block text-[10px] uppercase font-sans font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-400/30">
                AI Copilot
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-emerald-300 font-mono tracking-wider uppercase font-semibold">
              Quản lý Tài chính Thông minh
            </p>
          </div>
        </button>

        {/* Desktop Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold text-emerald-100/90" aria-label="Menu chính">
          <button
            onClick={() => scrollToSection('problems')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'problems' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Vấn đề & Giải pháp
          </button>

          <button
            onClick={() => scrollToSection('benefits')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'benefits' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Lợi ích
          </button>

          <button
            onClick={() => scrollToSection('how-it-works')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'how-it-works' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Cách hoạt động
          </button>

          <button
            onClick={() => scrollToSection('features')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'features' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Tính năng
          </button>

          <button
            onClick={() => scrollToSection('ai-copilot')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 ${
              activeSection === 'ai-copilot' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'text-amber-300/90 hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            <Sparkles size={13} className="text-amber-400" />
            <span>AI Copilot</span>
          </button>

          <button
            onClick={() => scrollToSection('budget')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'budget' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Ngân sách 50/30/20
          </button>

          <button
            onClick={() => scrollToSection('security')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              activeSection === 'security' 
                ? 'text-amber-300 bg-emerald-900/90 font-bold' 
                : 'hover:text-amber-200 hover:bg-emerald-900/50'
            }`}
          >
            Bảo mật
          </button>
        </nav>

        {/* Action CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          {isLoggedIn ? (
            <button
              onClick={onStartDemo}
              className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md min-h-[40px] focus:ring-2 focus:ring-amber-300"
            >
              <span>Vào ứng dụng ({userName || 'User'})</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <>
              <button
                onClick={onStartDemo}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-2 bg-emerald-900/80 hover:bg-emerald-900 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-xl transition text-xs font-semibold cursor-pointer min-h-[40px] shadow-xs"
                title="Trải nghiệm trực tiếp không cần đăng ký"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Xem Demo</span>
              </button>

              <button
                onClick={onOpenLogin}
                className="flex items-center gap-1.5 px-3.5 py-2 text-emerald-100 hover:text-white hover:bg-emerald-900/80 border border-emerald-700/80 rounded-xl transition text-xs sm:text-sm font-semibold cursor-pointer min-h-[40px]"
              >
                <LogIn size={15} />
                <span>Đăng nhập</span>
              </button>

              <button
                onClick={onOpenRegister}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl transition cursor-pointer shadow-md min-h-[40px] focus:ring-2 focus:ring-amber-300"
              >
                <UserPlus size={15} />
                <span>Bắt đầu</span>
              </button>
            </>
          )}

          {/* Mobile menu trigger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl bg-emerald-900/80 text-emerald-100 hover:text-white border border-emerald-700/80 focus:outline-none focus:ring-2 focus:ring-amber-400 min-h-[40px] min-w-[40px] flex items-center justify-center"
            aria-label={mobileMenuOpen ? "Đóng menu" : "Mở menu điều hướng"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-emerald-950 border-b border-emerald-800 px-4 pt-3 pb-6 space-y-3 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="grid grid-cols-2 gap-2 pt-1 text-xs font-semibold text-emerald-100">
            <button
              onClick={() => scrollToSection('problems')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <HelpCircle size={14} className="text-amber-400" />
              <span>Vấn đề & Giải pháp</span>
            </button>
            <button
              onClick={() => scrollToSection('benefits')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <Zap size={14} className="text-amber-400" />
              <span>Lợi ích cốt lõi</span>
            </button>
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <BookOpen size={14} className="text-amber-400" />
              <span>Cách hoạt động</span>
            </button>
            <button
              onClick={() => scrollToSection('features')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <SlidersHorizontal size={14} className="text-amber-400" />
              <span>Tính năng chính</span>
            </button>
            <button
              onClick={() => scrollToSection('ai-copilot')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <Bot size={14} className="text-amber-400" />
              <span>Trợ lý AI Copilot</span>
            </button>
            <button
              onClick={() => scrollToSection('budget')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2"
            >
              <SlidersHorizontal size={14} className="text-amber-400" />
              <span>Ngân sách 50/30/20</span>
            </button>
            <button
              onClick={() => scrollToSection('security')}
              className="text-left px-3 py-2.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-900 flex items-center gap-2 col-span-2"
            >
              <ShieldCheck size={14} className="text-amber-400" />
              <span>Bảo mật & Quyền riêng tư</span>
            </button>
          </div>

          <div className="pt-2 border-t border-emerald-800/80 flex flex-col gap-2">
            {!isLoggedIn && (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onStartDemo();
                }}
                className="w-full py-2.5 px-4 bg-emerald-900 hover:bg-emerald-850 text-amber-300 border border-amber-500/40 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2"
              >
                <Sparkles size={14} className="text-amber-400" />
                <span>Xem Demo trải nghiệm ngay</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
