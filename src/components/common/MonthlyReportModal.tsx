import React, { useState } from 'react';
import { AppState } from '../../types';
import { CATEGORIES } from '../../constants/categories';
import { formatVND } from '../../utils/format';
import { calculateHealthScore } from '../../utils/healthScore';
import { generateFinancialInsights } from '../../utils/insightsEngine';
import { X, Printer, TrendingUp, TrendingDown, Award, Calendar, DollarSign, ArrowUpRight } from 'lucide-react';

interface MonthlyReportModalProps {
  isOpen: boolean;
  state: AppState;
  onClose: () => void;
}

export const MonthlyReportModal: React.FC<MonthlyReportModalProps> = ({
  isOpen,
  state,
  onClose,
}) => {
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  if (!isOpen) return null;

  const { expenses, income } = state;

  const monthExpenses = expenses.filter((e) => e.date.startsWith(selectedMonth));
  const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);

  const [yearStr, monthNumStr] = selectedMonth.split('-');
  const yearNum = parseInt(yearStr, 10);
  const monthNum = parseInt(monthNumStr, 10);
  const prevDate = new Date(yearNum, monthNum - 2, 1);
  const prevMonthStr = prevDate.toISOString().slice(0, 7);
  const prevExpenses = expenses.filter((e) => e.date.startsWith(prevMonthStr));
  const totalPrevExpenses = prevExpenses.reduce((sum, e) => sum + e.amount, 0);

  const netSavings = Math.max(0, income - totalExpenses);
  const savingsRate = income > 0 ? Math.round((netSavings / income) * 100) : 0;
  const momChangePct =
    totalPrevExpenses > 0
      ? Math.round(((totalExpenses - totalPrevExpenses) / totalPrevExpenses) * 100)
      : 0;

  const health = calculateHealthScore(state);
  const insights = generateFinancialInsights(state);

  const categoryTotals: Record<string, number> = {};
  monthExpenses.forEach((e) => {
    categoryTotals[e.categoryId] = (categoryTotals[e.categoryId] || 0) + e.amount;
  });

  const topCategories = Object.entries(categoryTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([catId, amount]) => {
      const cat = CATEGORIES.find((c) => c.id === catId);
      return {
        name: cat?.name || catId,
        amount,
        percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 100) : 0,
      };
    });

  const topTransactions = [...monthExpenses].sort((a, b) => b.amount - a.amount).slice(0, 5);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs overflow-y-auto print:bg-white print:p-0">
      <div className="bg-emerald-950 border border-emerald-800/80 rounded-2xl max-w-3xl w-full shadow-2xl p-6 sm:p-8 text-emerald-50 max-h-[92vh] overflow-y-auto print:max-h-none print:border-none print:shadow-none print:bg-white print:text-gray-900 print:w-full">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/60 mb-6 print:hidden">
          <div className="flex items-center gap-2">
            <Calendar size={20} className="text-amber-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-emerald-300">
              Chọn tháng báo cáo:
            </span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-emerald-900/60 border border-emerald-700/80 text-amber-300 text-sm font-mono px-3 py-1 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs shadow-sm transition-all"
            >
              <Printer size={14} />
              <span>Xuất PDF / In báo cáo</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-900/60 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="text-center mb-8 pb-6 border-b border-emerald-800/60 print:border-gray-200">
          <p className="text-xs font-mono uppercase tracking-widest text-emerald-400 print:text-emerald-800 font-bold mb-1">
            BÁO CÁO TÀI CHÍNH CÁ NHÂN HÀNG THÁNG
          </p>
          <h2 className="text-2xl sm:text-3xl font-serif font-black text-amber-200 print:text-gray-900">
            SỔ TAY CHI TIÊU THÔNG MINH
          </h2>
          <p className="text-sm font-mono text-emerald-300 print:text-gray-600 mt-1">
            Kỳ báo cáo: {selectedMonth}
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mb-8">
          <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <p className="text-[10px] font-mono text-emerald-300 print:text-gray-600 uppercase">Thu nhập hàng tháng</p>
            <p className="text-base sm:text-lg font-mono font-bold text-amber-300 print:text-gray-900 mt-1">
              {formatVND(income)}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <p className="text-[10px] font-mono text-emerald-300 print:text-gray-600 uppercase">Tổng chi tiêu</p>
            <p className="text-base sm:text-lg font-mono font-bold text-red-300 print:text-red-700 mt-1">
              {formatVND(totalExpenses)}
            </p>
            <p className="text-[10px] text-emerald-400/80 print:text-gray-500 mt-0.5 flex items-center gap-1">
              {momChangePct >= 0 ? <TrendingUp size={12} className="text-red-400" /> : <TrendingDown size={12} className="text-emerald-400" />}
              <span>{momChangePct >= 0 ? `+${momChangePct}% MoM` : `${momChangePct}% MoM`}</span>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <p className="text-[10px] font-mono text-emerald-300 print:text-gray-600 uppercase">Tiết kiệm ròng</p>
            <p className="text-base sm:text-lg font-mono font-bold text-emerald-300 print:text-emerald-700 mt-1">
              {formatVND(netSavings)}
            </p>
            <p className="text-[10px] text-emerald-400/80 print:text-gray-500 mt-0.5">
              Tỷ lệ: <strong className="text-amber-300 print:text-gray-900">{savingsRate}%</strong>
            </p>
          </div>

          <div className="p-4 rounded-xl bg-emerald-900/40 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <p className="text-[10px] font-mono text-emerald-300 print:text-gray-600 uppercase">Điểm sức khỏe tài chính</p>
            <p className="text-base sm:text-lg font-mono font-bold text-amber-400 print:text-amber-600 mt-1 flex items-center gap-1">
              <Award size={18} />
              <span>{health.totalScore} / 100</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="p-5 rounded-2xl bg-emerald-900/30 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 print:text-gray-800 font-bold mb-4 flex items-center gap-2">
              <DollarSign size={16} />
              <span>Top 5 Danh mục chi tiêu nhiều nhất</span>
            </h4>
            <div className="space-y-3">
              {topCategories.length > 0 ? (
                topCategories.map((cat, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="font-semibold text-emerald-100 print:text-gray-800">{cat.name}</span>
                      <span className="font-mono text-amber-300 print:text-gray-900">
                        {formatVND(cat.amount)} ({cat.percentage}%)
                      </span>
                    </div>
                    <div className="w-full bg-emerald-950/80 rounded-full h-1.5 overflow-hidden print:bg-gray-200">
                      <div
                        className="bg-amber-400 h-1.5 rounded-full"
                        style={{ width: `${Math.min(100, cat.percentage)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-emerald-300/60 italic">Chưa phát sinh chi tiêu trong tháng này.</p>
              )}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-emerald-900/30 border border-emerald-800/60 print:border-gray-300 print:bg-gray-50">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 print:text-gray-800 font-bold mb-4 flex items-center gap-2">
              <ArrowUpRight size={16} />
              <span>Top giao dịch giá trị cao nhất</span>
            </h4>
            <div className="space-y-2.5">
              {topTransactions.length > 0 ? (
                topTransactions.map((exp) => (
                  <div
                    key={exp.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/40 print:border-gray-200 print:bg-white text-xs"
                  >
                    <div>
                      <p className="font-medium text-emerald-100 print:text-gray-800">{exp.note}</p>
                      <p className="text-[10px] text-emerald-400/80 print:text-gray-500 font-mono">{exp.date}</p>
                    </div>
                    <span className="font-mono font-bold text-red-300 print:text-red-700">
                      -{formatVND(exp.amount)}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-xs text-emerald-300/60 italic">Không có giao dịch.</p>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/20 print:border-gray-300 print:bg-gray-50">
          <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 print:text-gray-800 font-bold mb-3">
            Khuyến nghị tối ưu tài chính từ AI
          </h4>
          <div className="space-y-2">
            {insights.slice(0, 3).map((ins) => (
              <div key={ins.id} className="text-xs text-emerald-100 print:text-gray-800 flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <div>
                  <strong className="text-amber-200 print:text-gray-900">{ins.title}: </strong>
                  <span>{ins.message} </span>
                  {ins.actionableStep && (
                    <span className="text-emerald-300 print:text-gray-600 block mt-0.5 italic">
                      Hành động: {ins.actionableStep}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
