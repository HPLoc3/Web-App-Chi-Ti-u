import React, { useState } from 'react';
import { AppState, SeverityType } from '../../../types';
import { calculateHealthScore } from '../../../utils/healthScore';
import { generateFinancialInsights } from '../../../utils/insightsEngine';
import { 
  Award, 
  Sparkles, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  HelpCircle, 
  FileText, 
  TrendingUp,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { MonthlyReportModal } from '../../../components/common/MonthlyReportModal';

interface InsightsTabProps {
  state: AppState;
}

export const InsightsTab: React.FC<InsightsTabProps> = ({ state }) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | SeverityType>('all');
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const health = calculateHealthScore(state);
  const insights = generateFinancialInsights(state);

  const filteredInsights = insights.filter((ins) =>
    selectedFilter === 'all' ? true : ins.severity === selectedFilter
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Top Banner & Quick Report Action */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border border-emerald-800/80 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles size={20} className="text-amber-400 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-serif font-black text-amber-100">
              Phân Tích AI & Sức Khỏe Tài Chính
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-emerald-200/90 max-w-xl">
            Hệ thống tự động đánh giá chỉ số tích lũy, mức độ kiểm soát ngân sách và cảnh báo rủi ro theo thời gian thực.
          </p>
        </div>

        <button
          onClick={() => setIsReportOpen(true)}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs sm:text-sm shadow-lg transition-all shrink-0 cursor-pointer"
        >
          <FileText size={16} />
          <span>Xem báo cáo tháng đầy đủ</span>
        </button>
      </div>

      {/* Financial Health Score Gauge & Transparent Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Gauge Card */}
        <div className="lg:col-span-1 p-6 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 shadow-lg flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-3 right-3">
            <button
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="p-1.5 text-emerald-400/80 hover:text-amber-300 transition-colors"
              title="Xem công thức tính"
            >
              <HelpCircle size={18} />
            </button>
          </div>

          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <Award size={36} />
          </div>

          <p className="text-xs font-mono uppercase tracking-widest text-emerald-300">
            Chỉ số sức khỏe tài chính
          </p>

          <div className="my-3">
            <span className="text-5xl font-serif font-black text-amber-300">{health.totalScore}</span>
            <span className="text-lg font-mono text-emerald-400/80"> / 100</span>
          </div>

          <div className="w-full bg-emerald-900/60 rounded-full h-3 overflow-hidden border border-emerald-800/80 mb-3 max-w-xs">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${
                health.totalScore >= 80
                  ? 'bg-emerald-400'
                  : health.totalScore >= 60
                  ? 'bg-amber-400'
                  : 'bg-red-500'
              }`}
              style={{ width: `${health.totalScore}%` }}
            />
          </div>

          <p className="text-xs font-semibold text-amber-200">
            {health.totalScore >= 80
              ? 'Tài chính vững mạnh & An toàn cao'
              : health.totalScore >= 60
              ? 'Mức trung bình - Cần tối ưu thêm'
              : 'Cảnh báo - Chi tiêu vượt ngưỡng an toàn'}
          </p>
        </div>

        {/* Breakdown Metric Bars */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60">
            <h3 className="text-sm font-mono uppercase tracking-wider text-amber-200 font-bold flex items-center gap-2">
              <ShieldCheck size={18} className="text-amber-400" />
              <span>Minh bạch công thức tính điểm (100đ)</span>
            </h3>
            <span className="text-xs font-mono text-emerald-300">Tổng điểm: {health.totalScore}đ</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Savings Rate */}
            <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-emerald-100">1. Tỷ lệ tiết kiệm (Tối đa 30đ)</span>
                <span className="font-mono text-amber-300">{health.savingsRateScore}/30</span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full"
                  style={{ width: `${(health.savingsRateScore / 30) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-300/80">
                Thực tế: {health.savingsRatePercent}% thu nhập ròng
              </p>
            </div>

            {/* Budget Control */}
            <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-emerald-100">2. Kiểm soát hạn mức (Tối đa 25đ)</span>
                <span className="font-mono text-amber-300">{health.budgetAdherenceScore}/25</span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: `${(health.budgetAdherenceScore / 25) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-300/80">
                {health.overspendingCount === 0
                  ? 'Không có danh mục vượt hạn mức'
                  : `Phát hiện ${health.overspendingCount} danh mục vượt hạn mức`}
              </p>
            </div>

            {/* Spending Stability */}
            <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-emerald-100">3. Độ ổn định chi tiêu (Tối đa 20đ)</span>
                <span className="font-mono text-amber-300">{health.spendingStabilityScore}/20</span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className="bg-emerald-400 h-2 rounded-full"
                  style={{ width: `${(health.spendingStabilityScore / 20) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-300/80">Phân bổ dòng tiền đồng đều qua các ngày</p>
            </div>

            {/* Goals Progress */}
            <div className="p-3.5 rounded-xl bg-emerald-900/40 border border-emerald-800/60">
              <div className="flex justify-between text-xs font-semibold mb-1.5">
                <span className="text-emerald-100">4. Tiến độ mục tiêu (Tối đa 15đ)</span>
                <span className="font-mono text-amber-300">{health.goalsProgressScore}/15</span>
              </div>
              <div className="w-full bg-emerald-950 rounded-full h-2 mb-1.5 overflow-hidden">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: `${(health.goalsProgressScore / 15) * 100}%` }}
                />
              </div>
              <p className="text-[11px] text-emerald-300/80">Đang thực hiện các hũ tiết kiệm mục tiêu</p>
            </div>
          </div>
        </div>
      </div>

      {/* Formula Modal Info */}
      {showFormulaInfo && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-emerald-100 space-y-1.5">
          <p className="font-bold text-amber-300">Công thức tính điểm sức khỏe tài chính:</p>
          <p>• <strong>Tiết kiệm (30đ):</strong> Đạt 25%+ thu nhập = 30đ, 20% = 26đ, 10% = 18đ.</p>
          <p>• <strong>Ngân sách (25đ):</strong> 0 danh mục vượt = 25đ. Vượt 1 danh mục = 18đ. Thâm hụt tổng = -10đ.</p>
          <p>• <strong>Ổn định (20đ):</strong> Dòng tiền chi tiêu đều, không dồn cục đột biến vào 1 ngày duy nhất.</p>
          <p>• <strong>Mục tiêu (15đ):</strong> Tỷ lệ hoàn thành các hũ tích lũy dự phòng.</p>
          <p>• <strong>Hóa đơn định kỳ (10đ):</strong> Chi phí cố định &lt; 20% tổng thu nhập.</p>
        </div>
      )}

      {/* AI Insights Feed Section */}
      <div className="p-6 rounded-2xl bg-emerald-950/80 border border-emerald-800/80 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-800/60">
          <div className="flex items-center gap-2">
            <Zap size={20} className="text-amber-400" />
            <h3 className="text-lg font-serif font-bold text-amber-100">
              Khuyến Nghị & Cảnh Báo Thông Minh
            </h3>
          </div>

          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'all'
                  ? 'bg-amber-400 text-emerald-950 font-bold'
                  : 'bg-emerald-900/60 text-emerald-200 hover:bg-emerald-800/60'
              }`}
            >
              Tất cả ({insights.length})
            </button>
            <button
              onClick={() => setSelectedFilter('critical')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'critical'
                  ? 'bg-red-500 text-white font-bold'
                  : 'bg-emerald-900/60 text-red-300 hover:bg-emerald-800/60'
              }`}
            >
              Nghiêm trọng
            </button>
            <button
              onClick={() => setSelectedFilter('warning')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'warning'
                  ? 'bg-amber-500 text-emerald-950 font-bold'
                  : 'bg-emerald-900/60 text-amber-300 hover:bg-emerald-800/60'
              }`}
            >
              Cảnh báo
            </button>
            <button
              onClick={() => setSelectedFilter('recommendation')}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedFilter === 'recommendation'
                  ? 'bg-emerald-500 text-emerald-950 font-bold'
                  : 'bg-emerald-900/60 text-emerald-300 hover:bg-emerald-800/60'
              }`}
            >
              Gợi ý tối ưu
            </button>
          </div>
        </div>

        {/* Insights Grid */}
        <div className="space-y-3">
          {filteredInsights.length > 0 ? (
            filteredInsights.map((item) => (
              <div
                key={item.id}
                className={`p-4 rounded-xl border backdrop-blur-xs transition-all ${
                  item.severity === 'critical'
                    ? 'bg-red-950/40 border-red-700/60 text-red-100'
                    : item.severity === 'warning'
                    ? 'bg-amber-950/40 border-amber-700/60 text-amber-100'
                    : item.severity === 'positive'
                    ? 'bg-emerald-900/40 border-emerald-700/60 text-emerald-100'
                    : 'bg-emerald-900/30 border-emerald-700/50 text-emerald-100'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0 mt-0.5">
                    {item.severity === 'critical' && <AlertTriangle size={20} className="text-red-400" />}
                    {item.severity === 'warning' && <AlertTriangle size={20} className="text-amber-400" />}
                    {item.severity === 'positive' && <CheckCircle2 size={20} className="text-emerald-400" />}
                    {item.severity === 'recommendation' && <Info size={20} className="text-emerald-300" />}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="text-sm font-bold text-amber-100">{item.title}</h4>
                      {item.metricValue && (
                        <span className="text-xs font-mono px-2 py-0.5 rounded bg-black/30 font-bold text-amber-300">
                          {item.metricValue}
                        </span>
                      )}
                    </div>

                    <p className="text-xs leading-relaxed text-emerald-100/90">{item.message}</p>

                    {item.actionableStep && (
                      <div className="mt-2.5 pt-2 border-t border-white/10 flex items-center gap-1.5 text-xs font-medium text-amber-300">
                        <TrendingUp size={14} />
                        <span>Hành động gợi ý: {item.actionableStep}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-12 text-center text-xs text-emerald-300/60 italic">
              Không có cảnh báo hoặc nhận xét cho bộ lọc này.
            </div>
          )}
        </div>
      </div>

      {/* Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isReportOpen}
        state={state}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};

export default InsightsTab;
