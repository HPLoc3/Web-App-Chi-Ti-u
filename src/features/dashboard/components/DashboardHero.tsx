import React, { useState } from 'react';
import { 
  Plus, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  TrendingDown, 
  PiggyBank, 
  Coins, 
  Calendar, 
  Edit3, 
  Check, 
  X,
  Wallet,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

interface DashboardHeroProps {
  totalBalance: number;
  income: number;
  monthlyExpense: number;
  monthlySavings: number;
  savingsRate: number;
  dailyBurnRate: number;
  selectedMonth: string;
  availableMonths: string[];
  onChangeMonth: (month: string) => void;
  onUpdateIncome: (income: number) => void;
  onOpenQuickAdd: () => void;
  onOpenAiChat?: () => void;
}

export const DashboardHero: React.FC<DashboardHeroProps> = ({
  totalBalance,
  income,
  monthlyExpense,
  monthlySavings,
  savingsRate,
  dailyBurnRate,
  selectedMonth,
  availableMonths,
  onChangeMonth,
  onUpdateIncome,
  onOpenQuickAdd,
  onOpenAiChat,
}) => {
  const [showBalance, setShowBalance] = useState(() => {
    return localStorage.getItem('so_tay_show_balance') !== 'false';
  });

  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(income.toString());

  const toggleBalancePrivacy = () => {
    const next = !showBalance;
    setShowBalance(next);
    localStorage.setItem('so_tay_show_balance', String(next));
  };

  const handleSaveIncome = () => {
    const val = parseFloat(tempIncome.replace(/[.,\s]/g, ''));
    if (!isNaN(val) && val >= 0) {
      onUpdateIncome(val);
      setIsEditingIncome(false);
    }
  };

  const [yearStr, monthStr] = selectedMonth.split('-');
  const expensePercentageOfIncome = income > 0 ? (monthlyExpense / income) * 100 : 0;
  const isHealthySavings = savingsRate >= 20;

  return (
    <div className="space-y-4">
      {/* Top Header Bar: Month Picker + Quick Add CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#FAF7F0] border border-[#E6DEC9] p-3 sm:p-4 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-950 text-amber-300 flex items-center justify-center font-serif font-bold text-lg shrink-0 shadow-xs">
            ST
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-lg sm:text-xl font-bold text-emerald-950 tracking-tight">
                Sổ Tay Chi Tiêu
              </h1>
              <span className="text-[10px] font-sans font-semibold px-2 py-0.5 rounded-full bg-emerald-100/80 text-emerald-900 border border-emerald-200">
                Tháng {monthStr}/{yearStr}
              </span>
            </div>
            <p className="text-xs text-stone-500 font-sans">
              Nắm bắt tài chính trong 5 giây • Quản lý & Tối ưu dòng tiền
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-stretch sm:self-auto">
          {/* Month Selector */}
          <div className="relative flex-1 sm:flex-none">
            <select
              value={selectedMonth}
              onChange={(e) => onChangeMonth(e.target.value)}
              className="w-full sm:w-auto bg-white border border-[#E6DEC9] rounded-lg px-3 py-2 text-xs font-serif font-bold text-emerald-900 focus:outline-none focus:border-emerald-700 cursor-pointer min-h-[40px]"
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
          </div>

          {/* Quick Add CTA Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-900 to-emerald-950 hover:from-emerald-850 hover:to-emerald-900 text-amber-300 rounded-lg font-serif font-bold text-xs sm:text-sm tracking-wide shadow-sm hover:shadow active:scale-98 transition cursor-pointer min-h-[40px]"
            title="Thêm khoản chi mới (Phím tắt hoặc chạm)"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span>+ Ghi chép nhanh</span>
          </button>
        </div>
      </div>

      {/* Main Hero Card: Total Balance & 4 Core Metric Pillars */}
      <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-2xl p-5 sm:p-6 shadow-md border border-emerald-800/80 relative overflow-hidden">
        {/* Subtle decorative background watermark */}
        <div className="absolute right-0 bottom-0 translate-x-8 translate-y-8 opacity-5 pointer-events-none text-white">
          <Wallet size={200} />
        </div>

        <div className="relative z-10 space-y-5">
          {/* Row 1: "Tôi có bao nhiêu tiền?" - Total Balance */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-800/60 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-serif uppercase tracking-widest text-emerald-200/80 font-bold">
                  1. TỔNG SỐ DƯ TÀI CHÍNH HIỆN HỮU
                </span>
                <button
                  onClick={toggleBalancePrivacy}
                  className="text-emerald-300 hover:text-white p-1 rounded transition cursor-pointer"
                  title={showBalance ? 'Ẩn số dư' : 'Hiện số dư'}
                >
                  {showBalance ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
                  {showBalance ? formatCurrency(totalBalance) : '•••••••• ₫'}
                </span>
                <span className="text-xs text-emerald-300/80 font-sans">
                  (Khả dụng & tích lũy)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                monthlySavings >= 0 
                  ? 'bg-emerald-800/80 text-emerald-200 border border-emerald-600/50' 
                  : 'bg-rose-900/80 text-rose-200 border border-rose-700/50'
              }`}>
                <span className={`w-2 h-2 rounded-full ${monthlySavings >= 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}`} />
                {monthlySavings >= 0 ? 'Dòng tiền thặng dư' : 'Đang thâm hụt'}
              </span>

              {onOpenAiChat && (
                <button
                  onClick={onOpenAiChat}
                  className="px-3 py-1 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40 rounded-full text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Sparkles size={13} />
                  <span>Hỏi Trợ lý AI</span>
                </button>
              )}
            </div>
          </div>

          {/* Row 2: 4 Financial Core Pillars */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Pillar 1: Monthly Income */}
            <div className="bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-700/50 rounded-xl p-3 sm:p-3.5 transition">
              <div className="flex items-center justify-between text-xs text-emerald-200/90 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <Coins size={14} className="text-amber-300" />
                  Thu nhập tháng
                </span>
                {!isEditingIncome && (
                  <button
                    onClick={() => {
                      setTempIncome(income.toString());
                      setIsEditingIncome(true);
                    }}
                    className="text-emerald-300 hover:text-white p-0.5 rounded cursor-pointer"
                    title="Chỉnh sửa thu nhập"
                  >
                    <Edit3 size={12} />
                  </button>
                )}
              </div>

              {isEditingIncome ? (
                <div className="flex items-center gap-1 mt-1">
                  <input
                    type="text"
                    value={tempIncome}
                    onChange={(e) => setTempIncome(e.target.value)}
                    className="w-full bg-emerald-950 border border-emerald-500 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                    placeholder="25000000"
                    autoFocus
                  />
                  <button
                    onClick={handleSaveIncome}
                    className="p-1 bg-amber-400 text-emerald-950 rounded hover:bg-amber-300 cursor-pointer"
                  >
                    <Check size={12} />
                  </button>
                  <button
                    onClick={() => setIsEditingIncome(false)}
                    className="p-1 bg-emerald-800 text-emerald-200 rounded hover:bg-emerald-700 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5">
                  <div className="font-mono text-lg sm:text-xl font-bold text-white">
                    {showBalance ? formatCurrency(income) : '•••••• ₫'}
                  </div>
                  <div className="text-[11px] text-emerald-300/80 font-sans flex items-center gap-1">
                    <ArrowUpRight size={12} className="text-emerald-400" />
                    Định mức ngân sách
                  </div>
                </div>
              )}
            </div>

            {/* Pillar 2: Monthly Expense */}
            <div className="bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-700/50 rounded-xl p-3 sm:p-3.5 transition">
              <div className="flex items-center justify-between text-xs text-emerald-200/90 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <TrendingDown size={14} className="text-rose-300" />
                  Đã chi tiêu
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-emerald-950/60 rounded text-emerald-300">
                  {expensePercentageOfIncome.toFixed(0)}% thu nhập
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="font-mono text-lg sm:text-xl font-bold text-amber-200">
                  {showBalance ? formatCurrency(monthlyExpense) : '•••••• ₫'}
                </div>
                <div className="text-[11px] text-emerald-300/80 font-sans">
                  TB: <span className="font-mono font-semibold text-emerald-100">{formatCurrency(Math.round(dailyBurnRate))}</span>/ngày
                </div>
              </div>
            </div>

            {/* Pillar 3: Monthly Saving */}
            <div className={`border rounded-xl p-3 sm:p-3.5 transition ${
              monthlySavings >= 0 
                ? 'bg-emerald-900/50 border-emerald-700/50' 
                : 'bg-rose-950/40 border-rose-700/60'
            }`}>
              <div className="flex items-center justify-between text-xs text-emerald-200/90 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <PiggyBank size={14} className={monthlySavings >= 0 ? 'text-emerald-300' : 'text-rose-300'} />
                  Tiền tích lũy
                </span>
                <span className={`text-[10px] font-bold ${monthlySavings >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {monthlySavings >= 0 ? 'Thặng dư' : 'Thâm hụt'}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className={`font-mono text-lg sm:text-xl font-bold ${monthlySavings >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                  {showBalance ? formatCurrency(monthlySavings) : '•••••• ₫'}
                </div>
                <div className="text-[11px] text-emerald-300/80 font-sans">
                  {monthlySavings >= 0 ? 'Sẵn sàng chuyển quỹ' : 'Cần thắt chặt chi tiêu'}
                </div>
              </div>
            </div>

            {/* Pillar 4: Saving Rate */}
            <div className="bg-emerald-900/50 hover:bg-emerald-900/70 border border-emerald-700/50 rounded-xl p-3 sm:p-3.5 transition">
              <div className="flex items-center justify-between text-xs text-emerald-200/90 font-medium mb-1">
                <span className="flex items-center gap-1">
                  <TrendingUp size={14} className="text-amber-300" />
                  Tỷ lệ tiết kiệm
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.2 rounded ${
                  isHealthySavings 
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                }`}>
                  {isHealthySavings ? 'Đạt chuẩn' : 'Mục tiêu ≥20%'}
                </span>
              </div>
              <div className="space-y-0.5">
                <div className="font-mono text-lg sm:text-xl font-bold text-white flex items-baseline gap-1">
                  <span>{savingsRate.toFixed(1)}%</span>
                </div>
                {/* Visual mini progress bar for saving rate */}
                <div className="w-full bg-emerald-950/80 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${isHealthySavings ? 'bg-emerald-400' : 'bg-amber-400'}`}
                    style={{ width: `${Math.min(100, Math.max(0, savingsRate))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardHero;
