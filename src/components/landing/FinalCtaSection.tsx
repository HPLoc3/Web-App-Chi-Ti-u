import React from 'react';
import { 
  ArrowRight, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2,
  Lock
} from 'lucide-react';

interface FinalCtaSectionProps {
  onStart: () => void;
  onExploreFeatures: () => void;
  isLoggedIn: boolean;
  userName?: string | null;
}

export default function FinalCtaSection({
  onStart,
  onExploreFeatures,
  isLoggedIn,
  userName,
}: FinalCtaSectionProps) {
  return (
    <section className="py-16 sm:py-24 bg-emerald-950 text-white relative overflow-hidden">
      
      {/* Subtle Background Glows */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10 space-y-6">
        
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-900/90 border border-amber-500/30 text-amber-300 text-xs font-semibold">
          <Sparkles size={13} className="text-amber-400" />
          <span>Bắt đầu hành trình tự do tài chính</span>
        </div>

        {/* Headline */}
        <h2 className="font-serif text-3xl sm:text-5xl font-black text-amber-50 tracking-tight leading-[1.2]">
          Đã đến lúc kiểm soát chi tiêu của bạn tốt hơn.
        </h2>

        {/* Subheadline */}
        <p className="text-emerald-200/90 text-sm sm:text-base max-w-2xl mx-auto font-normal leading-relaxed">
          Tạm biệt cảm giác lo âu về tiền bạc cuối tháng. Trải nghiệm phương pháp quản lý tài chính thông minh, trực quan và có AI đồng hành ngay hôm nay.
        </p>

        {/* CTAs */}
        <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button
            onClick={onStart}
            className="w-full sm:w-auto px-8 py-4 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm sm:text-base rounded-xl shadow-xl transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 min-h-[48px] focus:ring-4 focus:ring-amber-300/40 group"
          >
            <span>{isLoggedIn ? `Vào ứng dụng (${userName || 'User'})` : 'Bắt đầu sử dụng miễn phí'}</span>
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onExploreFeatures}
            className="w-full sm:w-auto px-6 py-4 bg-emerald-900/80 hover:bg-emerald-900 text-emerald-100 border border-emerald-700/80 font-semibold text-sm sm:text-base rounded-xl transition cursor-pointer min-h-[48px]"
          >
            Khám phá tính năng
          </button>
        </div>

        {/* Trust Badges under CTA */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-emerald-300/80 font-medium">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span>Không yêu cầu thẻ tín dụng</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-amber-400" />
            <span>Miễn phí trọn đời cho cá nhân</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Lock size={14} className="text-amber-400" />
            <span>Bảo vệ quyền riêng tư dữ liệu</span>
          </div>
        </div>

      </div>
    </section>
  );
}
