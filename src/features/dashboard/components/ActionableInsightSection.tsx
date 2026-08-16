import React, { useState } from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  TrendingUp, 
  ArrowRight, 
  CheckCircle2, 
  Zap, 
  Compass, 
  Lightbulb, 
  HelpCircle,
  Clock
} from 'lucide-react';
import { FinancialInsight } from '../../../types';

interface ActionableInsightSectionProps {
  insights: FinancialInsight[];
  onNavigateTab: (tab: any) => void;
  onOpenChatbot: () => void;
}

export const ActionableInsightSection: React.FC<ActionableInsightSectionProps> = ({
  insights,
  onNavigateTab,
  onOpenChatbot,
}) => {
  const [activeInsightIndex, setActiveInsightIndex] = useState(0);

  if (!insights || insights.length === 0) {
    return (
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-5 rounded-2xl shadow-xs">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-stone-200/60">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-emerald-950">
              5. Trợ lý AI Quyết định tài chính
            </h3>
            <p className="text-xs text-stone-500 font-sans">
              Tôi cần làm gì tiếp theo để tối ưu hóa ngân sách?
            </p>
          </div>
        </div>
        <div className="text-center py-6 text-stone-500 text-xs font-sans">
          <CheckCircle2 size={24} className="mx-auto text-emerald-700 mb-2" />
          Kế hoạch tài chính tháng này đang vận hành rất ổn định! Hãy tiếp tục duy trì ghi chép hằng ngày.
        </div>
      </div>
    );
  }

  // Prioritize critical insights first, then warnings, then recommendations
  const sortedInsights = [...insights].sort((a, b) => {
    const score = { critical: 4, warning: 3, recommendation: 2, positive: 1 };
    return (score[b.severity] || 0) - (score[a.severity] || 0);
  });

  const currentInsight = sortedInsights[Math.min(activeInsightIndex, sortedInsights.length - 1)] || sortedInsights[0];

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          badge: 'bg-rose-100 text-rose-800 border-rose-200',
          border: 'border-rose-300',
          bg: 'bg-rose-50/60',
          accent: 'text-rose-900',
          icon: <AlertTriangle size={18} className="text-rose-700" />,
          actionBg: 'bg-rose-900 hover:bg-rose-850 text-white',
        };
      case 'warning':
        return {
          badge: 'bg-amber-100 text-amber-800 border-amber-200',
          border: 'border-amber-300',
          bg: 'bg-amber-50/60',
          accent: 'text-amber-950',
          icon: <Zap size={18} className="text-amber-700" />,
          actionBg: 'bg-amber-900 hover:bg-amber-850 text-white',
        };
      case 'positive':
        return {
          badge: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          border: 'border-emerald-300',
          bg: 'bg-emerald-50/60',
          accent: 'text-emerald-950',
          icon: <CheckCircle2 size={18} className="text-emerald-700" />,
          actionBg: 'bg-emerald-900 hover:bg-emerald-850 text-white',
        };
      default:
        return {
          badge: 'bg-blue-100 text-blue-800 border-blue-200',
          border: 'border-blue-300',
          bg: 'bg-blue-50/60',
          accent: 'text-blue-950',
          icon: <Compass size={18} className="text-blue-700" />,
          actionBg: 'bg-blue-900 hover:bg-blue-850 text-white',
        };
    }
  };

  const currentStyle = getSeverityStyle(currentInsight.severity);

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-stone-200/70">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-amber-100 text-amber-900 border border-amber-200 shadow-2xs">
            <Lightbulb size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-base font-bold text-emerald-950">
                5. Khuyến nghị hành động AI (Decision Making)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-200/80 text-stone-700">
                {activeInsightIndex + 1}/{sortedInsights.length}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans">
              Hệ thống phân tích & trả lời: <span className="font-semibold text-emerald-900">"Vậy tôi nên làm gì?"</span>
            </p>
          </div>
        </div>

        {/* Insight Tabs / Stepper */}
        {sortedInsights.length > 1 && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {sortedInsights.map((ins, idx) => (
              <button
                key={ins.id || idx}
                onClick={() => setActiveInsightIndex(idx)}
                className={`h-7 px-2.5 rounded-md text-xs font-serif font-bold transition cursor-pointer flex items-center gap-1 ${
                  activeInsightIndex === idx
                    ? 'bg-emerald-950 text-amber-300 shadow-xs'
                    : 'bg-white border border-[#E6DEC9] text-stone-600 hover:bg-stone-100'
                }`}
              >
                <span>#{idx + 1}</span>
                {ins.severity === 'critical' && <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main 3-Step Decision Making Card */}
      <div className={`border ${currentStyle.border} ${currentStyle.bg} rounded-xl p-4 sm:p-5 transition-all duration-200 space-y-4`}>
        {/* Title + Badges */}
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {currentStyle.icon}
            <h4 className={`font-serif text-base sm:text-lg font-bold ${currentStyle.accent}`}>
              {currentInsight.title}
            </h4>
          </div>

          <div className="flex items-center gap-2">
            {currentInsight.dailyImpact && (
              <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-white border border-stone-300 text-stone-800 shadow-2xs">
                ⚡ {currentInsight.dailyImpact}
              </span>
            )}
            <span className={`text-[11px] font-sans font-bold px-2.5 py-1 rounded-full border ${currentStyle.badge}`}>
              {currentInsight.severity === 'critical' ? 'Cần xử lý ngay' : currentInsight.severity === 'warning' ? 'Cảnh báo rủi ro' : 'Cơ hội tích lũy'}
            </span>
          </div>
        </div>

        {/* 3-Tier Step Breakdown: Observation -> Projection -> Action */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          {/* Step 1: Observation (Hiện trạng) */}
          <div className="bg-white/85 border border-stone-200/80 rounded-lg p-3 space-y-1">
            <span className="text-[10px] font-bold font-serif uppercase tracking-wider text-stone-500 block">
              1. Hiện trạng ghi nhận
            </span>
            <p className="text-stone-800 leading-relaxed font-sans font-medium">
              {currentInsight.observation || currentInsight.message}
            </p>
          </div>

          {/* Step 2: Projection (Dự báo rủi ro / Lợi ích) */}
          <div className="bg-white/85 border border-stone-200/80 rounded-lg p-3 space-y-1">
            <span className="text-[10px] font-bold font-serif uppercase tracking-wider text-stone-500 block">
              2. Dự báo xu hướng
            </span>
            <p className="text-stone-800 leading-relaxed font-sans font-medium">
              {currentInsight.projection || 'Cần kiểm soát định kỳ để không làm ảnh hưởng đến dòng tiền cuối tháng.'}
            </p>
          </div>

          {/* Step 3: Prescriptive Action ("Vậy tôi nên làm gì?") */}
          <div className="bg-amber-50/90 border border-amber-300/80 rounded-lg p-3 space-y-1 shadow-2xs">
            <span className="text-[10px] font-bold font-serif uppercase tracking-wider text-amber-900 flex items-center gap-1">
              <Sparkles size={11} className="text-amber-700" />
              3. Vậy tôi nên làm gì?
            </span>
            <p className="text-amber-950 font-bold leading-relaxed font-sans">
              {currentInsight.suggestedAction || currentInsight.actionableStep}
            </p>
          </div>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200/50">
          <div className="flex items-center gap-1.5 text-stone-500 text-xs font-sans">
            <Clock size={13} />
            <span>Áp dụng từ hôm nay để đạt hiệu quả tối ưu</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onOpenChatbot}
              className="px-3 py-2 bg-white hover:bg-stone-50 border border-stone-300 text-stone-700 text-xs font-semibold rounded-lg flex items-center gap-1 transition cursor-pointer"
            >
              <span>Hỏi sâu hơn về cách làm</span>
            </button>

            {currentInsight.targetTab && (
              <button
                onClick={() => onNavigateTab(currentInsight.targetTab)}
                className={`px-4 py-2 ${currentStyle.actionBg} text-xs font-bold font-serif rounded-lg flex items-center gap-1.5 shadow-xs hover:shadow transition cursor-pointer`}
              >
                <span>
                  {currentInsight.targetTab === 'budget' 
                    ? 'Điều chỉnh Ngân sách ngay' 
                    : currentInsight.targetTab === 'goals' 
                    ? 'Mở Mục tiêu tích lũy' 
                    : currentInsight.targetTab === 'expenses'
                    ? 'Xem Chi tiết giao dịch'
                    : 'Thực hiện ngay'}
                </span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ActionableInsightSection;
