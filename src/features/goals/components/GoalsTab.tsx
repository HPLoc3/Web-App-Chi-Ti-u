import React, { useState, useMemo } from 'react';
import { Expense, Goal } from '../../../types';
import { formatCurrency } from '../../../utils/format';
import { 
  Plus, 
  Trash2, 
  PiggyBank, 
  TrendingUp, 
  Calendar, 
  AlertTriangle,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  Check,
  Coins
} from 'lucide-react';

interface GoalsTabProps {
  expenses: Expense[];
  goals: Goal[];
  income: number;
  onUpdateIncome: (amount: number) => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoalProgress: (id: string, current: number) => void;
  onDeleteGoal: (id: string) => void;
}

export default function GoalsTab({
  expenses,
  goals,
  income,
  onUpdateIncome,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal
}: GoalsTabProps) {
  // Income edit states
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(income.toString());

  // Form states for new goal
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');

  const handleSaveIncome = () => {
    const val = parseFloat(tempIncome.replace(/[.,\s]/g, ''));
    if (!isNaN(val) && val >= 0) {
      onUpdateIncome(val);
      setIsEditingIncome(false);
    }
  };

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget.replace(/[.,\s]/g, ''));
    const current = parseFloat(newGoalCurrent.replace(/[.,\s]/g, '') || '0');
    if (newGoalName.trim() && !isNaN(target) && target > 0) {
      onAddGoal({
        name: newGoalName.trim(),
        target,
        current: isNaN(current) ? 0 : current
      });
      setNewGoalName('');
      setNewGoalTarget('');
      setNewGoalCurrent('');
      setIsAddingGoal(false);
    }
  };

  // 1. Calculate average monthly expense based on all history
  const averageMonthlyExpense = useMemo(() => {
    if (expenses.length === 0) return 0;
    
    // Extract unique YYYY-MM
    const months = new Set<string>();
    expenses.forEach(exp => {
      if (exp.date) {
        months.add(exp.date.substring(0, 7));
      }
    });

    const numMonths = Math.max(1, months.size);
    const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    return totalExpenses / numMonths;
  }, [expenses]);

  // 2. Monthly savings = income - averageMonthlyExpense
  const monthlySavings = income - averageMonthlyExpense;

  // Quick top-up helpers
  const handleQuickAdd = (goalId: string, current: number, addAmount: number) => {
    onUpdateGoalProgress(goalId, current + addAmount);
  };

  // Helper to compute time remaining
  const getGoalStatus = (goal: Goal) => {
    const remainingNeeded = goal.target - goal.current;
    if (remainingNeeded <= 0) {
      return {
        status: 'completed',
        text: '🎉 Đã hoàn thành mục tiêu!',
        badgeClass: 'bg-emerald-50 text-emerald-900 border-emerald-200'
      };
    }

    if (monthlySavings <= 0) {
      return {
        status: 'warning',
        text: '⚠️ Không thể tích lũy (Tốc độ tiết kiệm hằng tháng đang âm hoặc bằng 0)',
        badgeClass: 'bg-red-50 text-red-900 border-red-200'
      };
    }

    // Months left
    const monthsLeft = remainingNeeded / monthlySavings;
    const roundedMonths = Math.ceil(monthsLeft);

    // Calculate target date
    // Current date from ADDITIONAL_METADATA is 2026-07-15
    const today = new Date('2026-07-15');
    today.setMonth(today.getMonth() + roundedMonths);
    const options: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'long' };
    const dateStr = today.toLocaleDateString('vi-VN', options);

    return {
      status: 'saving',
      text: `Dự kiến: khoảng ${roundedMonths} tháng nữa (${dateStr})`,
      badgeClass: 'bg-amber-50 text-amber-900 border-amber-200'
    };
  };

  return (
    <div className="space-y-6">
      
      {/* Upper Block: Financial Health Board & Income Settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Monthly Income Setting */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Coins size={14} className="text-amber-600" />
                Thu nhập hằng tháng
              </span>
              {!isEditingIncome && (
                <button 
                  onClick={() => {
                    setTempIncome(income.toString());
                    setIsEditingIncome(true);
                  }}
                  className="text-emerald-800 hover:text-emerald-900 text-xs font-bold cursor-pointer"
                >
                  Sửa
                </button>
              )}
            </div>
            {isEditingIncome ? (
              <div className="flex gap-1.5 mt-1">
                <input
                  type="text"
                  value={tempIncome}
                  onChange={(e) => setTempIncome(e.target.value)}
                  placeholder="Nhập thu nhập..."
                  className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-2.5 sm:py-1 text-sm font-mono focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
                <button
                  onClick={handleSaveIncome}
                  className="bg-emerald-900 text-white px-3 py-2.5 sm:py-1 rounded hover:bg-emerald-850 cursor-pointer text-sm sm:text-xs min-h-[44px] sm:min-h-0 flex items-center justify-center"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <div className="font-mono text-xl font-bold text-emerald-950 mt-1">
                {formatCurrency(income)}
              </div>
            )}
          </div>
          <div className="text-[10px] text-stone-400 mt-2 italic leading-snug">
            Cơ sở để tính toán dòng tiền tích lũy ròng hằng tháng.
          </div>
        </div>

        {/* Calculated Monthly Average Expense */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingDown size={14} className="text-stone-500" />
              Chi tiêu TB hằng tháng
            </span>
            <div className="font-mono text-xl font-bold text-stone-800 mt-1">
              {formatCurrency(Math.round(averageMonthlyExpense))}
            </div>
          </div>
          <div className="text-[10px] text-stone-400 mt-2 leading-snug">
            Tính trung bình dựa trên tổng chi trong lịch sử chia cho số tháng đã ghi nhận.
          </div>
        </div>

        {/* Calculated Net Monthly Savings */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-emerald-700" />
              Tiền tích lũy TB/tháng
            </span>
            <div className={`font-mono text-xl font-bold mt-1 ${monthlySavings > 0 ? 'text-emerald-855' : 'text-red-700'}`}>
              {formatCurrency(Math.round(monthlySavings))}
            </div>
          </div>
          <div className="text-[10px] text-stone-400 mt-2 leading-snug">
            {monthlySavings > 0 
              ? 'Tốc độ tích lũy thực tế giúp dự báo chính xác tiến độ đạt mục tiêu.' 
              : 'Cảnh báo: Chi tiêu đang vượt quá thu nhập của bạn!'}
          </div>
        </div>
      </div>

      {/* Main Goal Section */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-[#E6DEC9] mb-4">
          <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
            Mục tiêu tích lũy & Ước tính thời gian đạt được
          </h3>
          {!isAddingGoal && (
            <button
              onClick={() => setIsAddingGoal(true)}
              className="px-3 py-1.5 bg-emerald-900 hover:bg-emerald-850 text-white text-xs font-bold rounded flex items-center gap-1 cursor-pointer transition shadow-sm"
            >
              <Plus size={14} /> Thêm mục tiêu
            </button>
          )}
        </div>

        {/* Goal Add Form */}
        {isAddingGoal && (
          <form onSubmit={handleSaveGoal} className="bg-white border border-[#E6DEC9] p-4 rounded-lg mb-6 space-y-4">
            <h4 className="font-serif text-sm font-bold text-stone-800">Thêm mục tiêu tiết kiệm mới</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">TÊN MỤC TIÊU *</label>
                <input
                  type="text"
                  required
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="Ví dụ: Đổi xe mới, Quỹ khẩn cấp..."
                  className="w-full bg-stone-50/50 border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN CẦN ĐẠT *</label>
                <input
                  type="text"
                  required
                  value={newGoalTarget}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '');
                    setNewGoalTarget(digits ? parseInt(digits, 10).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Ví dụ: 15.000.000"
                  className="w-full bg-stone-50/50 border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN ĐÃ CÓ SẴN (TÙY CHỌN)</label>
                <input
                  type="text"
                  value={newGoalCurrent}
                  onChange={(e) => {
                    const digits = e.target.value.replace(/[^\d]/g, '');
                    setNewGoalCurrent(digits ? parseInt(digits, 10).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Ví dụ: 3.000.000"
                  className="w-full bg-stone-50/50 border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  setNewGoalName('');
                  setNewGoalTarget('');
                  setNewGoalCurrent('');
                  setIsAddingGoal(false);
                }}
                className="px-4 py-3 sm:py-1.5 border border-stone-200 hover:bg-stone-50 text-stone-600 rounded font-medium cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-3 sm:py-1.5 bg-emerald-900 hover:bg-emerald-850 text-white font-semibold rounded cursor-pointer min-h-[44px] sm:min-h-0 flex items-center justify-center"
              >
                Lưu mục tiêu
              </button>
            </div>
          </form>
        )}

        {/* Goals List with predictions */}
        {goals.length > 0 ? (
          <div className="space-y-4">
            {goals.map(goal => {
              const pct = Math.min(100, Math.max(0, (goal.current / goal.target) * 100));
              const remainingNeeded = goal.target - goal.current;
              const estimate = getGoalStatus(goal);

              return (
                <div key={goal.id} className="border border-[#E6DEC9] p-4 rounded-lg bg-white space-y-4 shadow-sm">
                  {/* Goal header info */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-stone-100 pb-2">
                    <div>
                      <h4 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-1.5">
                        <PiggyBank size={18} className="text-amber-600 shrink-0" />
                        {goal.name}
                      </h4>
                      <p className="text-[10px] text-stone-400">Thiết lập ngày: {goal.createdAt}</p>
                    </div>

                    <button
                      onClick={() => {
                        if (confirm(`Bạn chắc chắn muốn xóa mục tiêu "${goal.name}"?`)) {
                          onDeleteGoal(goal.id);
                        }
                      }}
                      className="p-1 text-stone-300 hover:text-red-700 hover:bg-red-50 rounded transition self-end sm:self-center cursor-pointer"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  {/* Estimations & calculations */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    
                    {/* Progress Slider block */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-stone-500 font-medium">Tiến độ tích lũy</span>
                        <span className="font-mono font-bold text-emerald-900">{pct.toFixed(1)}%</span>
                      </div>
                      
                      {/* Clean flat progress bar */}
                      <div className="w-full bg-stone-100 h-3 rounded-full overflow-hidden border border-stone-200">
                        <div 
                          className="bg-emerald-900 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        ></div>
                      </div>

                      <div className="flex justify-between text-xs font-mono text-stone-500 pt-0.5">
                        <span>Đã có: <strong className="text-stone-800">{formatCurrency(goal.current)}</strong></span>
                        <span>Mục tiêu: <strong className="text-stone-800">{formatCurrency(goal.target)}</strong></span>
                      </div>
                    </div>

                    {/* Timeline estimator */}
                    <div className="md:col-span-5 p-3 rounded-lg border border-[#E6DEC9] bg-[#FAF9F6] flex flex-col justify-center min-h-[72px]">
                      <span className="text-[9px] font-bold text-stone-400 uppercase tracking-widest block mb-1">
                        DỰ BÁO THỜI GIAN ĐẠT ĐƯỢC
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border inline-block ${estimate.badgeClass}`}>
                        {estimate.text}
                      </span>
                      {remainingNeeded > 0 && monthlySavings > 0 && (
                        <p className="text-[10px] text-stone-400 mt-1 leading-snug">
                          Tích lũy nốt: <strong>{formatCurrency(remainingNeeded)}</strong> dựa trên {formatCurrency(Math.round(monthlySavings))}/tháng.
                        </p>
                      )}
                    </div>

                  </div>

                  {/* Add Money quick actions buttons */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-stone-100">
                    <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider shrink-0">
                      NẠP TIỀN NHANH VÀO MỤC TIÊU:
                    </span>
                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => handleQuickAdd(goal.id, goal.current, 100000)}
                        className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1 bg-amber-55 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded cursor-pointer transition shadow-sm min-h-[44px] sm:min-h-0 flex items-center justify-center whitespace-nowrap"
                      >
                        +100.000₫
                      </button>
                      <button
                        onClick={() => handleQuickAdd(goal.id, goal.current, 500000)}
                        className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1 bg-amber-55 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded cursor-pointer transition shadow-sm min-h-[44px] sm:min-h-0 flex items-center justify-center whitespace-nowrap"
                      >
                        +500.000₫
                      </button>
                      <button
                        onClick={() => handleQuickAdd(goal.id, goal.current, 1000000)}
                        className="flex-1 sm:flex-none px-3 py-2.5 sm:py-1 bg-amber-55 hover:bg-amber-100 border border-amber-200 text-amber-900 text-xs font-bold rounded cursor-pointer transition shadow-sm min-h-[44px] sm:min-h-0 flex items-center justify-center whitespace-nowrap"
                      >
                        +1M ₫
                      </button>
                      <div className="h-6 w-[1px] bg-stone-200 mx-1 hidden sm:block"></div>
                      
                      {/* Manual arbitrary input */}
                      <input
                        type="text"
                        placeholder="Số khác, vd: 200k..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const inputVal = (e.currentTarget as HTMLInputElement).value;
                            let cleanVal = inputVal.toLowerCase().replace(/\s/g, '');
                            
                            let factor = 1;
                            if (cleanVal.endsWith('k')) {
                              factor = 1000;
                              cleanVal = cleanVal.slice(0, -1);
                            } else if (cleanVal.endsWith('tr')) {
                              factor = 1000000;
                              cleanVal = cleanVal.slice(0, -2);
                            }
                            
                            cleanVal = cleanVal.replace(/[.,\s]/g, '');
                            const num = parseFloat(cleanVal);
                            if (!isNaN(num) && num > 0) {
                              handleQuickAdd(goal.id, goal.current, num * factor);
                              (e.currentTarget as HTMLInputElement).value = '';
                            }
                          }
                        }}
                        className="w-full sm:w-32 px-3 py-2.5 sm:py-1 border border-stone-200 bg-[#FAF9F6] rounded text-sm sm:text-xs font-mono text-stone-700 focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                      />
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-400 font-sans text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-stone-200 rounded-lg bg-white">
            <div className="p-3 rounded-full bg-stone-50 border border-stone-100">
              <PiggyBank size={24} className="text-stone-300" />
            </div>
            Chưa có mục tiêu tiết kiệm nào. Hãy tạo mục tiêu để lên kế hoạch tiết kiệm cụ thể!
          </div>
        )}
      </div>

    </div>
  );
}
