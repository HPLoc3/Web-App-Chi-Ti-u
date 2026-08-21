import React from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Play, 
  Wallet, 
  Receipt, 
  SlidersHorizontal, 
  Bot, 
  Target, 
  RefreshCw, 
  BarChart3, 
  ShieldCheck, 
  CheckCircle2, 
  Lock, 
  Zap, 
  PieChart, 
  HelpCircle, 
  TrendingUp, 
  Clock,
  Compass,
  Layers,
  Code2,
  Database,
  Cpu
} from 'lucide-react';
import ProblemSection from '../../../components/landing/ProblemSection';
import SolutionSection from '../../../components/landing/SolutionSection';
import BenefitsSection from '../../../components/landing/BenefitsSection';
import HowItWorksSection from '../../../components/landing/HowItWorksSection';
import CoreFeaturesSection from '../../../components/landing/CoreFeaturesSection';
import AiCopilotSection from '../../../components/landing/AiCopilotSection';
import ProductShowcaseSection from '../../../components/landing/ProductShowcaseSection';
import BudgetDeepDiveSection from '../../../components/landing/BudgetDeepDiveSection';
import SecuritySection from '../../../components/landing/SecuritySection';
import TechStackSection from '../../../components/landing/TechStackSection';

interface AboutTabProps {
  onGoToApp?: () => void;
  onGoToChatbot?: () => void;
}

export default function AboutTab({ onGoToApp, onGoToChatbot }: AboutTabProps) {
  return (
    <div className="space-y-12 font-sans antialiased text-stone-800 pb-16">
      
      {/* ---------------------------------------------------- 1. HERO SECTION (IN-APP PRODUCT OVERVIEW) */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 border-4 border-amber-500/80 shadow-xl relative overflow-hidden">
        
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-700/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-5">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            <Sparkles size={13} className="text-amber-400" />
            <span>SỔ TAY CHI TIÊU THÔNG MINH • BẢNG GIỚI THIỆU SẢN PHẨM</span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-black text-amber-50 tracking-tight leading-[1.15]">
            Quản lý tiền dễ hơn. <br className="hidden sm:inline" />
            <span className="text-amber-400 underline decoration-amber-400/60 decoration-wavy decoration-2 underline-offset-8">
              Hiểu chi tiêu rõ hơn.
            </span>
          </h1>

          <p className="text-emerald-100/90 text-sm sm:text-base sm:leading-relaxed font-normal">
            Theo dõi thu chi, lập ngân sách và nhận phân tích tài chính bằng AI trong một nơi.
          </p>

          {/* Quick Jump Buttons */}
          <div className="pt-3 flex flex-wrap items-center gap-3 sm:gap-4">
            {onGoToApp && (
              <button
                onClick={onGoToApp}
                className="px-6 py-3.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 min-h-[44px]"
              >
                <span>Vào bảng điều khiển Tổng quan</span>
                <ArrowRight size={16} />
              </button>
            )}

            {onGoToChatbot && (
              <button
                onClick={onGoToChatbot}
                className="px-5 py-3.5 bg-emerald-900/90 hover:bg-emerald-850 text-amber-300 border border-amber-500/40 font-semibold text-xs sm:text-sm rounded-xl transition cursor-pointer flex items-center gap-2 min-h-[44px]"
              >
                <Bot size={16} className="text-amber-400" />
                <span>Trải nghiệm Trợ lý AI ngay</span>
              </button>
            )}
          </div>

          {/* Micro-Pills */}
          <div className="pt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-emerald-300">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-amber-400" />
              <span>Ghi chép bằng AI &lt; 10 giây</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-amber-400" />
              <span>Quy tắc Ngân sách 50/30/20</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-amber-400" />
              <span>Bảo mật dữ liệu cá nhân</span>
            </div>
          </div>

        </div>

      </div>

      {/* ---------------------------------------------------- 2. PROBLEM SECTION */}
      <ProblemSection />

      {/* ---------------------------------------------------- 3. SOLUTION SECTION */}
      <SolutionSection />

      {/* ---------------------------------------------------- 4. CORE VALUE / BENEFITS */}
      <BenefitsSection />

      {/* ---------------------------------------------------- 5. HOW IT WORKS */}
      <HowItWorksSection />

      {/* ---------------------------------------------------- 6. CORE FEATURES */}
      <CoreFeaturesSection />

      {/* ---------------------------------------------------- 7. AI COPILOT */}
      <AiCopilotSection onTryChatbot={onGoToChatbot} />

      {/* ---------------------------------------------------- 8. PRODUCT SHOWCASE */}
      <ProductShowcaseSection />

      {/* ---------------------------------------------------- 9. BUDGET 50/30/20 DEEP DIVE */}
      <BudgetDeepDiveSection />

      {/* ---------------------------------------------------- 10. SECURITY & TRUST */}
      <SecuritySection />

      {/* ---------------------------------------------------- 11. TECH STACK (CONDENSED) */}
      <TechStackSection />

      {/* ---------------------------------------------------- 12. FINAL CALLOUT */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-10 border-2 border-emerald-800 text-center space-y-5 relative overflow-hidden">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-semibold">
            <Sparkles size={13} className="text-amber-400" />
            <span>Sẵn sàng trải nghiệm</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-bold text-amber-50">
            Đã đến lúc kiểm soát chi tiêu của bạn tốt hơn.
          </h2>

          <p className="text-emerald-200/90 text-xs sm:text-sm">
            Tận dụng trọn vẹn sức mạnh của mô hình 50/30/20 và Trợ lý AI để duy trì kỷ luật tài chính bền vững.
          </p>

          <div className="pt-3 flex flex-wrap justify-center gap-3">
            {onGoToApp && (
              <button
                onClick={onGoToApp}
                className="px-7 py-3.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm rounded-xl shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <span>Bắt đầu ghi chép ngay</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
