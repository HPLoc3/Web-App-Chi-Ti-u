import React, { useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Utensils,
  ShoppingBag,
  Car,
  Gamepad2,
  Receipt,
  HeartPulse,
  Plus,
  ArrowDownLeft,
  ArrowUpRight,
  Sparkles,
  Calendar,
  Filter,
} from 'lucide-react';

export type TransactionType = 'INCOME' | 'EXPENSE';

export interface TransactionItem {
  id: string;
  title: string;
  category: string;
  amount: number;
  type: TransactionType;
  date: string;
  iconName?: string;
}

export interface CategoryExpenseData {
  name: string;
  value: number;
  color: string;
  iconName?: string;
}

export interface MonthlyComparisonData {
  month: string;
  income: number;
  expense: number;
}

export interface FinancialOverviewProps {
  summary?: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    incomeChangePercent?: number;
    expenseChangePercent?: number;
  };
  categoryData?: CategoryExpenseData[];
  monthlyData?: MonthlyComparisonData[];
  recentTransactions?: TransactionItem[];
  onAddTransactionClick?: () => void;
  className?: string;
}

const defaultSummary = {
  totalIncome: 28500000,
  totalExpense: 14250000,
  balance: 14250000,
  incomeChangePercent: 12.5,
  expenseChangePercent: -4.2,
};

const defaultCategoryData: CategoryExpenseData[] = [
  { name: 'Ăn uống', value: 5200000, color: '#f59e0b', iconName: 'Utensils' },
  { name: 'Mua sắm', value: 3400000, color: '#ec4899', iconName: 'ShoppingBag' },
  { name: 'Di chuyển', value: 1800000, color: '#3b82f6', iconName: 'Car' },
  { name: 'Giải trí', value: 1500000, color: '#8b5cf6', iconName: 'Gamepad2' },
  { name: 'Hóa đơn', value: 1350000, color: '#10b981', iconName: 'Receipt' },
  { name: 'Sức khỏe', value: 1000000, color: '#06b6d4', iconName: 'HeartPulse' },
];

const defaultMonthlyData: MonthlyComparisonData[] = [
  { month: 'Thg 3', income: 24000000, expense: 13500000 },
  { month: 'Thg 4', income: 25000000, expense: 15000000 },
  { month: 'Thg 5', income: 26000000, expense: 12800000 },
  { month: 'Thg 6', income: 27500000, expense: 16200000 },
  { month: 'Thg 7', income: 26800000, expense: 13900000 },
  { month: 'Thg 8', income: 28500000, expense: 14250000 },
];

const defaultRecentTransactions: TransactionItem[] = [
  {
    id: 'tx-1',
    title: 'Nhận lương tháng 8',
    category: 'Lương & Thưởng',
    amount: 25000000,
    type: 'INCOME',
    date: 'Hôm nay, 09:15',
    iconName: 'Wallet',
  },
  {
    id: 'tx-2',
    title: 'Ăn trưa & Cà phê',
    category: 'Ăn uống',
    amount: 145000,
    type: 'EXPENSE',
    date: 'Hôm nay, 12:30',
    iconName: 'Utensils',
  },
  {
    id: 'tx-3',
    title: 'Mua tai nghe không dây',
    category: 'Mua sắm',
    amount: 1290000,
    type: 'EXPENSE',
    date: 'Hôm qua, 18:45',
    iconName: 'ShoppingBag',
  },
  {
    id: 'tx-4',
    title: 'Đổ xăng ô tô',
    category: 'Di chuyển',
    amount: 500000,
    type: 'EXPENSE',
    date: '10/08/2026',
    iconName: 'Car',
  },
  {
    id: 'tx-5',
    title: 'Thưởng dự án AI',
    category: 'Thưởng',
    amount: 3500000,
    type: 'INCOME',
    date: '08/08/2026',
    iconName: 'Sparkles',
  },
];

const formatVND = (amount: number): string => {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
};

const renderCategoryIcon = (iconName?: string) => {
  switch (iconName) {
    case 'Utensils':
      return <Utensils className="w-4 h-4" />;
    case 'ShoppingBag':
      return <ShoppingBag className="w-4 h-4" />;
    case 'Car':
      return <Car className="w-4 h-4" />;
    case 'Gamepad2':
      return <Gamepad2 className="w-4 h-4" />;
    case 'Receipt':
      return <Receipt className="w-4 h-4" />;
    case 'HeartPulse':
      return <HeartPulse className="w-4 h-4" />;
    case 'Sparkles':
      return <Sparkles className="w-4 h-4" />;
    default:
      return <Wallet className="w-4 h-4" />;
  }
};

const CustomPieTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-1">
        <div className="flex items-center gap-2 font-semibold">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block"
            style={{ backgroundColor: data.payload.color }}
          />
          <span>{data.name}</span>
        </div>
        <p className="text-slate-300">
          Số tiền: <span className="font-bold text-white">{formatVND(data.value)}</span>
        </p>
        <p className="text-slate-400 text-[11px]">
          Tỷ lệ: <span className="font-semibold text-amber-400">{(data.percent * 100).toFixed(1)}%</span>
        </p>
      </div>
    );
  }
  return null;
};

const CustomBarTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-xl shadow-xl border border-slate-700/50 text-xs space-y-2">
        <p className="font-bold text-slate-200 border-b border-slate-700 pb-1">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={`item-${index}`} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: entry.color }}
              />
              {entry.name}:
            </span>
            <span className="font-semibold" style={{ color: entry.color }}>
              {formatVND(entry.value)}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  summary = defaultSummary,
  categoryData = defaultCategoryData,
  monthlyData = defaultMonthlyData,
  recentTransactions = defaultRecentTransactions,
  onAddTransactionClick,
  className = '',
}) => {
  const [activeCategoryIndex, setActiveCategoryIndex] = useState<number | null>(null);

  const totalCategoryExpense = categoryData.reduce((acc, item) => acc + item.value, 0);
  const savingsRate = summary.totalIncome > 0
    ? Math.max(0, Math.round((summary.balance / summary.totalIncome) * 100))
    : 0;

  return (
    <div className={`space-y-6 text-slate-800 dark:text-slate-100 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Tổng Quan Tài Chính
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-800/50">
              Tháng 8/2026
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Theo dõi dòng tiền, phân tích chi tiêu và tình hình số dư còn lại
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onAddTransactionClick && (
            <button
              onClick={onAddTransactionClick}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 transition-colors rounded-xl shadow-sm hover:shadow"
            >
              <Plus className="w-4 h-4" />
              Thêm giao dịch
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng Thu Nhập
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-200/50 dark:border-emerald-800/50">
              <ArrowDownLeft className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatVND(summary.totalIncome)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>
              {summary.incomeChangePercent && summary.incomeChangePercent > 0 ? '+' : ''}
              {summary.incomeChangePercent ?? 0}% so với tháng trước
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full blur-2xl group-hover:bg-rose-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Tổng Chi Tiêu
            </span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-800/50">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {formatVND(summary.totalExpense)}
          </div>
          <div className="mt-3 flex items-center gap-1.5 text-xs text-rose-600 dark:text-rose-400 font-medium">
            <TrendingDown className="w-3.5 h-3.5" />
            <span>
              {summary.expenseChangePercent && summary.expenseChangePercent > 0 ? '+' : ''}
              {summary.expenseChangePercent ?? 0}% so với tháng trước
            </span>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Số Dư Còn Lại
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200/50 dark:border-indigo-800/50">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-indigo-600 dark:text-indigo-400 tracking-tight">
            {formatVND(summary.balance)}
          </div>
          <div className="mt-3 flex items-center justify-between text-xs font-medium">
            <span className="text-slate-500 dark:text-slate-400">Tỷ lệ tích lũy</span>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-300 font-bold">
              {savingsRate}% thu nhập
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Phân Bổ Chi Tiêu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Tỷ lệ % chi tiêu theo từng danh mục
                </p>
              </div>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                <Filter className="w-4 h-4" />
              </div>
            </div>

            <div className="h-[220px] relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={62}
                    outerRadius={88}
                    paddingAngle={4}
                    dataKey="value"
                    onMouseEnter={(_, index) => setActiveCategoryIndex(index)}
                    onMouseLeave={() => setActiveCategoryIndex(null)}
                  >
                    {categoryData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        stroke="transparent"
                        className="transition-all duration-200 hover:opacity-80"
                        style={{
                          filter:
                            activeCategoryIndex === index
                              ? 'drop-shadow(0px 4px 8px rgba(0,0,0,0.2))'
                              : 'none',
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomPieTooltip />} />
                </PieChart>
              </ResponsiveContainer>

              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-[11px] font-medium text-slate-400">Tổng chi</span>
                <span className="text-sm font-bold text-slate-900 dark:text-white">
                  {formatVND(totalCategoryExpense)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-2 max-h-[140px] overflow-y-auto custom-scrollbar">
            {categoryData.map((item, idx) => {
              const percent = totalCategoryExpense > 0
                ? ((item.value / totalCategoryExpense) * 100).toFixed(1)
                : '0';
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-300 truncate">
                      {item.name}
                    </span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-white ml-1 shrink-0">
                    {percent}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="lg:col-span-7 bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  So Sánh Thu Nhập & Chi Tiêu
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Biến động dòng tiền qua 6 tháng gần nhất
                </p>
              </div>
              <div className="flex items-center gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-emerald-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300">Thu nhập</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-md bg-rose-500 inline-block" />
                  <span className="text-slate-600 dark:text-slate-300">Chi tiêu</span>
                </div>
              </div>
            </div>

            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    vertical={false}
                    stroke="#e2e8f0"
                    className="dark:opacity-10"
                  />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 12 }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#94a3b8', fontSize: 11 }}
                    tickFormatter={(val) => `${val / 1000000}M`}
                  />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar
                    name="Thu nhập"
                    dataKey="income"
                    fill="#10b981"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Bar
                    name="Chi tiêu"
                    dataKey="expense"
                    fill="#f43f5e"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-2 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>Đơn vị: VNĐ (Triệu)</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
              Tỷ lệ thặng dư bình quân: ~48%
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Giao Dịch Gần Đây
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (5 phát sinh mới nhất)
              </span>
            </h3>
          </div>
          <button className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors">
            Xem tất cả ➔
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                <th className="py-2.5 px-3">Nội dung</th>
                <th className="py-2.5 px-3">Danh mục</th>
                <th className="py-2.5 px-3">Thời gian</th>
                <th className="py-2.5 px-3 text-right">Số tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-xs">
              {recentTransactions.slice(0, 5).map((tx) => {
                const isExpense = tx.type === 'EXPENSE';
                return (
                  <tr
                    key={tx.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            isExpense
                              ? 'bg-rose-50 text-rose-600 border-rose-200/50 dark:bg-rose-950/50 dark:text-rose-400 dark:border-rose-800/50'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-200/50 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-800/50'
                          }`}
                        >
                          {renderCategoryIcon(tx.iconName)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {tx.title}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3">
                      <span className="inline-block px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {tx.category}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{tx.date}</span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      <span
                        className={`font-bold text-sm ${
                          isExpense
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {isExpense ? '-' : '+'} {formatVND(tx.amount)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default FinancialOverview;
