import React, { useState, useMemo } from 'react';
import { AppState, SeverityType, Expense } from '../../../types';
import { calculateHealthScore } from '../../../utils/healthScore';
import { generateFinancialInsights } from '../../../utils/insightsEngine';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency } from '../../../utils/format';
import { MonthlyReportModal } from '../../../components/common/MonthlyReportModal';
import { StatCard } from '../../../components/common/StatCard';
import { CategoryIcon } from '../../transactions/components/ExpensesTab';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { 
  BarChart3, 
  PieChart as PieIcon, 
  TrendingUp, 
  FileText, 
  Sparkles, 
  Award, 
  ShieldCheck, 
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface ReportsTabProps {
  state: AppState;
}

export const ReportsTab: React.FC<ReportsTabProps> = ({ state }) => {
  const [reportSubTab, setReportSubTab] = useState<'overview' | 'categories' | 'trends' | 'budget_vs_actual' | 'ai_insights'>('overview');
  const [isMonthlyReportModalOpen, setIsMonthlyReportModalOpen] = useState(false);

  const now = new Date();
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);

  // Available months
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthKey);
    state.expenses.forEach((e) => {
      if (e.date && e.date.length >= 7) {
        months.add(e.date.slice(0, 7));
      }
    });
    return Array.from(months).sort().reverse();
  }, [state.expenses, currentMonthKey]);

  // Filtered monthly expenses
  const monthlyExpenses = useMemo(() => {
    return state.expenses.filter((e) => e.date && e.date.startsWith(selectedMonth));
  }, [state.expenses, selectedMonth]);

  const totalMonthlyExpense = useMemo(() => {
    return monthlyExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [monthlyExpenses]);

  const monthlySavings = state.income - totalMonthlyExpense;
  const savingsRate = state.income > 0 ? (Math.max(0, monthlySavings) / state.income) * 100 : 0;

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const totals: Record<string, number> = {};
    monthlyExpenses.forEach((e) => {
      totals[e.categoryId] = (totals[e.categoryId] || 0) + e.amount;
    });

    return CATEGORIES.map((cat) => {
      const spent = totals[cat.id] || 0;
      const limit = state.categoryLimits[cat.id] || 0;
      const pctOfTotal = totalMonthlyExpense > 0 ? (spent / totalMonthlyExpense) * 100 : 0;
      const pctOfLimit = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        ...cat,
        spent,
        limit,
        pctOfTotal,
        pctOfLimit,
      };
    })
      .filter((c) => c.spent > 0 || c.limit > 0)
      .sort((a, b) => b.spent - a.spent);
  }, [monthlyExpenses, totalMonthlyExpense, state.categoryLimits]);

  // Pie chart data
  const pieData = useMemo(() => {
    return categoryBreakdown
      .filter((c) => c.spent > 0)
      .map((c) => ({
        name: c.name,
        value: c.spent,
        color: c.color,
      }));
  }, [categoryBreakdown]);

  // 7-day daily trend
  const dailyTrends = useMemo(() => {
    const map = new Map<string, number>();
    monthlyExpenses.forEach((e) => {
      if (e.date) {
        map.set(e.date, (map.get(e.date) || 0) + e.amount);
      }
    });

    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const label = `${d.getDate()}/${d.getMonth() + 1}`;
      result.push({
        date: dateStr,
        label,
        'Chi tiêu': map.get(dateStr) || 0,
      });
    }
    return result;
  }, [monthlyExpenses, now]);

  // Health Score & AI Insights
  const health = useMemo(() => calculateHealthScore(state), [state]);
  const insights = useMemo(() => generateFinancialInsights(state), [state]);

  const [yearStr, monthStr] = selectedMonth.split('-');

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Month Filter and Full Report CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6DEC9]">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">
            Báo Cáo & Phân Tích Tài Chính
          </h2>
          <p className="text-xs text-stone-500 font-sans">
            Thống kê trực quan dòng tiền, cơ cấu chi tiêu và đánh giá sức khỏe tài chính
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Month Selector */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-white border border-[#E6DEC9] rounded-xl px-3 py-2 text-xs font-serif font-bold text-emerald-950 focus:outline-none focus:border-emerald-700 cursor-pointer shadow-2xs"
          >
            {availableMonths.map((m) => {
              const [y, mm] = m.split('-');
              return (
                <option key={m} value={m}>
                  Tháng {mm}/{y}
                </option>
              );
            })}
          </select>

          <button
            onClick={() => setIsMonthlyReportModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <FileText size={15} />
            <span>Xuất báo cáo tháng</span>
          </button>
        </div>
      </div>

      {/* Sub-tab Navigation */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-stone-200 scrollbar-none">
        {[
          { key: 'overview', label: 'Tổng quan', icon: Layers },
          { key: 'categories', label: 'Cơ cấu danh mục', icon: PieIcon },
          { key: 'trends', label: 'Xu hướng theo ngày', icon: TrendingUp },
          { key: 'budget_vs_actual', label: 'Ngân sách vs Thực tế', icon: BarChart3 },
          { key: 'ai_insights', label: 'Đánh giá AI', icon: Sparkles },
        ].map((tab) => {
          const isActive = reportSubTab === tab.key;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              onClick={() => setReportSubTab(tab.key as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                isActive
                  ? 'bg-emerald-950 text-amber-300 font-bold shadow-2xs'
                  : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW */}
      {reportSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Tổng Thu Nhập Tháng"
              value={formatCurrency(state.income)}
              subtitle="Nguồn thu cố định"
              icon={<ArrowDownRight size={18} />}
              variant="emerald"
            />
            <StatCard
              title="Tổng Chi Tiêu Tháng"
              value={formatCurrency(totalMonthlyExpense)}
              subtitle={`${monthlyExpenses.length} giao dịch trong tháng`}
              icon={<ArrowUpRight size={18} />}
              variant="amber"
            />
            <StatCard
              title="Tích Lũy / Dư Dòng Tiền"
              value={formatCurrency(monthlySavings)}
              subtitle={`Tỷ lệ tiết kiệm: ${savingsRate.toFixed(1)}%`}
              icon={<TrendingUp size={18} />}
              variant={monthlySavings >= 0 ? 'blue' : 'amber'}
            />
            <StatCard
              title="Chỉ Số Sức Khỏe Tài Chính"
              value={`${health.totalScore}/100`}
              subtitle={health.totalScore >= 80 ? 'Rất tốt • Đạt chuẩn' : 'Cần tối ưu chi phí'}
              icon={<Award size={18} />}
              variant={health.totalScore >= 80 ? 'emerald' : 'default'}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Visual Breakdown of Income Allocation */}
            <div className="lg:col-span-2 bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs space-y-4">
              <h3 className="font-serif text-base font-bold text-emerald-950">
                Phân bổ dòng tiền Tháng {monthStr}/{yearStr}
              </h3>
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                    <span>Đã chi tiêu ({state.income > 0 ? ((totalMonthlyExpense / state.income) * 100).toFixed(1) : 0}%)</span>
                    <span className="font-mono text-amber-700">{formatCurrency(totalMonthlyExpense)}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-amber-600 h-3 rounded-full"
                      style={{
                        width: `${state.income > 0 ? Math.min(100, (totalMonthlyExpense / state.income) * 100) : 0}%`,
                      }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs font-semibold text-stone-700 mb-1">
                    <span>Dư tích lũy ({savingsRate.toFixed(1)}%)</span>
                    <span className="font-mono text-emerald-800">{formatCurrency(Math.max(0, monthlySavings))}</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-emerald-600 h-3 rounded-full"
                      style={{ width: `${Math.min(100, savingsRate)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Health Summary */}
            <div className="bg-emerald-950 text-white rounded-2xl p-5 shadow-xs border border-emerald-900 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-300">
                  Đánh Giá Tổng Quan
                </span>
                <h4 className="font-serif text-lg font-bold text-amber-100 mt-1 mb-3">
                  Sức khỏe tài chính: {health.totalScore}/100
                </h4>
                <p className="text-xs text-emerald-200/90 leading-relaxed font-sans">
                  {health.totalScore >= 80
                    ? 'Bạn đang kiểm soát chi tiêu rất xuất sắc. Tỷ lệ tích lũy duy trì ở ngưỡng an toàn trên 20% thu nhập.'
                    : 'Hãy rà soát lại các danh mục chi tiêu vượt hạn mức và tăng tỷ lệ tích lũy để bảo vệ dòng tiền.'}
                </p>
              </div>

              <div className="pt-4 border-t border-emerald-800/80 mt-4 flex items-center justify-between text-xs">
                <span className="text-emerald-300">Gợi ý AI có sẵn:</span>
                <span className="font-bold text-amber-300">{insights.length} đề xuất</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CATEGORIES */}
      {reportSubTab === 'categories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Donut Chart */}
          <div className="lg:col-span-1 bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col items-center justify-center min-w-0">
            <h3 className="font-serif text-base font-bold text-emerald-950 mb-3 text-center">
              Biểu Đồ Cơ Cấu Chi Tiêu
            </h3>
            {pieData.length > 0 ? (
              <div className="w-full h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-xs text-stone-400 py-12">Chưa có dữ liệu chi tiêu tháng này</p>
            )}
          </div>

          {/* Table Breakdown */}
          <div className="lg:col-span-2 bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs">
            <h3 className="font-serif text-base font-bold text-emerald-950 mb-4">
              Chi Tiết Tỷ Trọng Danh Mục
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500 font-semibold text-left">
                    <th className="pb-2">Danh mục</th>
                    <th className="pb-2 text-right">Đã chi (VNĐ)</th>
                    <th className="pb-2 text-right">Tỷ trọng (%)</th>
                    <th className="pb-2 text-right">Hạn mức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {categoryBreakdown.map((c) => (
                    <tr key={c.id} className="hover:bg-stone-50 transition">
                      <td className="py-2.5 flex items-center gap-2">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${c.bgColor}`}>
                          <CategoryIcon name={c.iconName} size={14} className={c.textColor} />
                        </div>
                        <span className="font-bold text-emerald-950">{c.name}</span>
                      </td>
                      <td className="py-2.5 text-right font-mono font-bold text-stone-800">
                        {formatCurrency(c.spent)}
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-emerald-900">
                        {c.pctOfTotal.toFixed(1)}%
                      </td>
                      <td className="py-2.5 text-right font-mono text-stone-500">
                        {c.limit > 0 ? formatCurrency(c.limit) : 'Chưa đặt'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TRENDS */}
      {reportSubTab === 'trends' && (
        <div className="bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs space-y-4 min-w-0">
          <h3 className="font-serif text-base font-bold text-emerald-950">
            Biến Động Chi Tiêu 7 Ngày Gần Nhất
          </h3>
          <div className="w-full h-72 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyTrends}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0ece1" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  tick={{ fontSize: 10, fill: '#78716c' }}
                  tickFormatter={(val) => `${(val / 1000).toLocaleString()}k`}
                />
                <Tooltip formatter={(val: any) => formatCurrency(Number(val))} />
                <Bar dataKey="Chi tiêu" fill="#022c22" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* TAB 4: BUDGET VS ACTUAL */}
      {reportSubTab === 'budget_vs_actual' && (
        <div className="bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs space-y-4">
          <h3 className="font-serif text-base font-bold text-emerald-950">
            So Sánh Ngân Sách Hạn Mức & Thực Tế
          </h3>
          <div className="space-y-4 pt-2">
            {categoryBreakdown.map((c) => {
              const isOver = c.limit > 0 && c.spent > c.limit;
              const isNear = c.limit > 0 && c.spent >= c.limit * 0.8 && !isOver;

              return (
                <div key={c.id} className="space-y-1.5 p-3 rounded-xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <CategoryIcon name={c.iconName} size={14} className={c.textColor} />
                      <span className="font-bold text-emerald-950">{c.name}</span>
                    </div>
                    <div className="font-mono">
                      <span className={isOver ? 'text-red-600 font-bold' : isNear ? 'text-amber-600 font-bold' : 'text-stone-800'}>
                        {formatCurrency(c.spent)}
                      </span>
                      <span className="text-stone-400"> / {c.limit > 0 ? formatCurrency(c.limit) : 'Chưa đặt'}</span>
                    </div>
                  </div>

                  <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full ${
                        isOver ? 'bg-red-600' : isNear ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${Math.min(100, c.pctOfLimit || (c.spent > 0 ? 100 : 0))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 5: AI INSIGHTS */}
      {reportSubTab === 'ai_insights' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {insights.map((ins) => (
              <div
                key={ins.id}
                className="bg-white border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col justify-between space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${
                        ins.severity === 'critical'
                          ? 'bg-red-500'
                          : ins.severity === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <h4 className="font-serif font-bold text-sm text-emerald-950">
                      {ins.title}
                    </h4>
                  </div>
                  <p className="text-xs text-stone-600 leading-relaxed font-sans">
                    {ins.message}
                  </p>
                </div>

                {ins.actionableStep && (
                  <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-900 text-[11px] font-semibold flex items-center gap-2">
                    <Sparkles size={13} className="text-emerald-700 shrink-0" />
                    <span>{ins.actionableStep}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full Monthly Report Modal */}
      <MonthlyReportModal
        isOpen={isMonthlyReportModalOpen}
        onClose={() => setIsMonthlyReportModalOpen(false)}
        state={state}
      />
    </div>
  );
};
