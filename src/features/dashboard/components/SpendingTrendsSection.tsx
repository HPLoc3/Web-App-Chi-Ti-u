import React, { useState } from 'react';
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
  Cell
} from 'recharts';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency } from '../../../utils/format';
import { TrendingUp, PieChart as PieIcon, BarChart3, ChevronRight } from 'lucide-react';

interface SpendingTrendsSectionProps {
  filteredExpenses: { categoryId: string; amount: number; date: string }[];
  allExpenses: { categoryId: string; amount: number; date: string }[];
  totalExpenseThisMonth: number;
  onNavigateToExpenses?: () => void;
}

export const SpendingTrendsSection: React.FC<SpendingTrendsSectionProps> = ({
  filteredExpenses,
  allExpenses,
  totalExpenseThisMonth,
  onNavigateToExpenses,
}) => {
  const [chartView, setChartView] = useState<'7days' | 'byCategory'>('7days');

  // Calculate Category breakdown
  const categoryTotals: Record<string, number> = {};
  filteredExpenses.forEach((exp) => {
    categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount;
  });

  const categoryData = CATEGORIES.map((cat) => ({
    id: cat.id,
    name: cat.name,
    value: categoryTotals[cat.id] || 0,
    color: cat.color,
  }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value);

  // Calculate 7-day daily spending trend
  const today = new Date();
  const last7DaysData = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const displayLabel = `${d.getDate()}/${d.getMonth() + 1}`;

    const daySum = allExpenses
      .filter((exp) => exp.date === dateStr)
      .reduce((sum, exp) => sum + exp.amount, 0);

    last7DaysData.push({
      date: dateStr,
      label: displayLabel,
      'Số tiền': daySum,
    });
  }

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs space-y-4">
      {/* Header with Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-stone-200/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
            <TrendingUp size={18} />
          </div>
          <div>
            <h3 className="font-serif text-base font-bold text-emerald-950">
              Cơ cấu chi tiêu & Xu hướng biến động
            </h3>
            <p className="text-[11px] text-stone-500 font-sans">
              Top danh mục chiếm tỷ trọng lớn & tốc độ chi tiêu 7 ngày
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 bg-white border border-[#E6DEC9] p-1 rounded-lg self-start sm:self-auto">
          <button
            onClick={() => setChartView('7days')}
            className={`px-3 py-1 text-xs font-serif font-bold rounded transition cursor-pointer flex items-center gap-1 ${
              chartView === '7days' 
                ? 'bg-emerald-950 text-amber-300 shadow-2xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <BarChart3 size={13} />
            <span>Xu hướng 7 ngày</span>
          </button>
          <button
            onClick={() => setChartView('byCategory')}
            className={`px-3 py-1 text-xs font-serif font-bold rounded transition cursor-pointer flex items-center gap-1 ${
              chartView === 'byCategory' 
                ? 'bg-emerald-950 text-amber-300 shadow-2xs' 
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <PieIcon size={13} />
            <span>Tỷ trọng danh mục</span>
          </button>
        </div>
      </div>

      {/* 2-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Top Spending Categories List (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-serif uppercase tracking-wider text-stone-500 font-bold">
              Top danh mục chi tiêu nhiều nhất
            </span>
            {onNavigateToExpenses && (
              <button 
                onClick={onNavigateToExpenses}
                className="text-[11px] font-medium text-emerald-900 hover:underline flex items-center gap-0.5"
              >
                <span>Xem tất cả</span>
                <ChevronRight size={12} />
              </button>
            )}
          </div>

          {categoryData.length > 0 ? (
            <div className="space-y-2.5 max-h-[260px] overflow-y-auto pr-1">
              {categoryData.map((cat, idx) => {
                const percentage = totalExpenseThisMonth > 0 ? (cat.value / totalExpenseThisMonth) * 100 : 0;
                return (
                  <div key={cat.id} className="bg-white border border-[#E6DEC9] p-2.5 rounded-xl text-xs space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-5 h-5 rounded-md bg-stone-100 font-mono font-bold text-[10px] text-stone-600 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                        <span className="font-serif font-bold text-stone-800 truncate">
                          {cat.name}
                        </span>
                      </div>

                      <div className="font-mono text-right">
                        <span className="font-extrabold text-stone-900 block">
                          {formatCurrency(cat.value)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-stone-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-stone-500 w-10 text-right">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-6 text-center text-stone-400 text-xs font-sans bg-white rounded-xl border border-dashed border-stone-200">
              Chưa phát sinh giao dịch chi tiêu trong tháng này.
            </div>
          )}
        </div>

        {/* Right Column: Visual Chart (7 Cols) */}
        <div className="lg:col-span-7 bg-white border border-[#E6DEC9] p-4 rounded-xl shadow-2xs">
          {chartView === '7days' ? (
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-stone-100">
                <span className="text-xs font-serif font-bold text-emerald-950">
                  Biểu đồ tốc độ chi tiêu 7 ngày qua
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  Đơn vị: VNĐ
                </span>
              </div>

              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={last7DaysData} margin={{ top: 10, right: 5, left: -25, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0ECE1" vertical={false} />
                    <XAxis 
                      dataKey="label" 
                      tick={{ fill: '#78716c', fontSize: 11 }} 
                      axisLine={{ stroke: '#E6DEC9' }}
                      tickLine={false}
                    />
                    <YAxis 
                      tickFormatter={(val) => `${val >= 1000000 ? (val / 1000000).toFixed(1) + 'M' : val >= 1000 ? (val / 1000).toFixed(0) + 'k' : val}`}
                      tick={{ fill: '#78716c', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                      axisLine={{ stroke: '#E6DEC9' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatCurrency(value), 'Chi tiêu']}
                      labelFormatter={(label, items) => {
                        if (items && items[0]) {
                          const payload = items[0].payload;
                          return `Ngày ${payload.label}`;
                        }
                        return label;
                      }}
                      contentStyle={{ 
                        backgroundColor: '#FAF7F0', 
                        borderColor: '#E6DEC9', 
                        borderRadius: '8px', 
                        fontFamily: 'JetBrains Mono',
                        fontSize: '12px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
                      }}
                    />
                    <Bar dataKey="Số tiền" fill="#064e3b" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-3 pb-1 border-b border-stone-100">
                <span className="text-xs font-serif font-bold text-emerald-950">
                  Cơ cấu tỷ trọng danh mục (Pie Chart)
                </span>
                <span className="text-[11px] font-mono text-stone-500">
                  Tổng: {formatCurrency(totalExpenseThisMonth)}
                </span>
              </div>

              {categoryData.length > 0 ? (
                <div className="h-56 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="#FAF7F0" strokeWidth={2} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [formatCurrency(value), 'Số tiền']}
                        contentStyle={{ 
                          backgroundColor: '#FAF7F0', 
                          borderColor: '#E6DEC9', 
                          borderRadius: '8px', 
                          fontFamily: 'JetBrains Mono',
                          fontSize: '12px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-56 flex items-center justify-center text-stone-400 text-xs">
                  Chưa có dữ liệu
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default SpendingTrendsSection;
