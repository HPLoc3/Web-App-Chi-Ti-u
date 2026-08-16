import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Award, 
  HelpCircle, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle,
  Activity
} from 'lucide-react';
import { HealthScoreBreakdown } from '../../../types';

interface FinancialHealthCardProps {
  healthScore: HealthScoreBreakdown;
  onNavigateToInsights?: () => void;
}

export const FinancialHealthCard: React.FC<FinancialHealthCardProps> = ({
  healthScore,
  onNavigateToInsights,
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const score = healthScore.totalScore || 0;

  const getScoreGrade = (s: number) => {
    if (s >= 80) return { label: 'Xuất sắc', color: 'text-emerald-700', bg: 'bg-emerald-100', border: 'border-emerald-300', ring: '#059669' };
    if (s >= 65) return { label: 'Tốt', color: 'text-teal-700', bg: 'bg-teal-100', border: 'border-teal-300', ring: '#0d9488' };
    if (s >= 50) return { label: 'Cần chú ý', color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-300', ring: '#d97706' };
    return { label: 'Báo động', color: 'text-rose-700', bg: 'bg-rose-100', border: 'border-rose-300', ring: '#e11d48' };
  };

  const grade = getScoreGrade(score);

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
              <Activity size={18} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-emerald-950">
                4. Chỉ số sức khỏe tài chính
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Đánh giá mức độ tích lũy & an toàn tài chính
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold font-serif px-2.5 py-1 rounded-full border ${grade.bg} ${grade.color} ${grade.border}`}>
            {grade.label}
          </span>
        </div>

        {/* Score Display Area */}
        <div className="flex items-center gap-4 bg-white border border-[#E6DEC9] p-4 rounded-xl mb-4">
          {/* Radial score badge */}
          <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 36 36">
              <path
                className="text-stone-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                strokeWidth="3.5"
                strokeDasharray={`${score}, 100`}
                strokeLinecap="round"
                stroke={grade.ring}
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="font-mono text-2xl font-extrabold text-stone-900 leading-none">
                {score}
              </span>
              <span className="text-[9px] font-mono text-stone-400">/ 100</span>
            </div>
          </div>

          {/* Quick evaluation text */}
          <div className="space-y-1 text-xs">
            <div className="font-serif font-bold text-stone-900">
              {score >= 80 ? 'Bạn đang kiểm soát rất tốt!' : score >= 60 ? 'Tài chính đang đi đúng hướng' : 'Cần tối ưu ngân sách ngay'}
            </div>
            <p className="text-stone-600 text-[11px] leading-relaxed">
              {healthScore.savingsRatePercent >= 20 
                ? `Tỷ lệ tiết kiệm (${healthScore.savingsRatePercent}%) đạt chuẩn an toàn.` 
                : `Tỷ lệ tiết kiệm (${healthScore.savingsRatePercent}%) thấp hơn chuẩn 20%.`}
              {healthScore.overspendingCount > 0 && ` Có ${healthScore.overspendingCount} mục vượt ngân sách.`}
            </p>
          </div>
        </div>

        {/* 5 Core Pillars Breakdown */}
        <div className="space-y-2.5 text-xs">
          {/* Pillar 1 */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-600 font-medium">Tỷ lệ tích lũy (Max 30đ)</span>
              <span className="font-mono font-bold text-emerald-950">{healthScore.savingsRateScore}/30</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-800 h-full rounded-full transition-all duration-300"
                style={{ width: `${(healthScore.savingsRateScore / 30) * 100}%` }}
              />
            </div>
          </div>

          {/* Pillar 2 */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-600 font-medium">Tuân thủ ngân sách (Max 25đ)</span>
              <span className="font-mono font-bold text-emerald-950">{healthScore.budgetAdherenceScore}/25</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-amber-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${(healthScore.budgetAdherenceScore / 25) * 100}%` }}
              />
            </div>
          </div>

          {/* Pillar 3 */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-600 font-medium">Tiến độ mục tiêu (Max 15đ)</span>
              <span className="font-mono font-bold text-emerald-950">{healthScore.goalsProgressScore}/15</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-teal-700 h-full rounded-full transition-all duration-300"
                style={{ width: `${(healthScore.goalsProgressScore / 15) * 100}%` }}
              />
            </div>
          </div>

          {/* Pillar 4 */}
          <div>
            <div className="flex justify-between text-[11px] mb-1">
              <span className="text-stone-600 font-medium">Chi phí cố định định kỳ (Max 10đ)</span>
              <span className="font-mono font-bold text-emerald-950">{healthScore.recurringRatioScore}/10</span>
            </div>
            <div className="w-full bg-stone-200 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-stone-700 h-full rounded-full transition-all duration-300"
                style={{ width: `${(healthScore.recurringRatioScore / 10) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Footer link */}
      {onNavigateToInsights && (
        <button
          onClick={onNavigateToInsights}
          className="mt-4 pt-3 border-t border-stone-200/70 text-xs font-semibold text-emerald-900 hover:text-emerald-950 flex items-center justify-between transition cursor-pointer w-full"
        >
          <span>Xem báo cáo phân tích chi tiết</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
export default FinancialHealthCard;
