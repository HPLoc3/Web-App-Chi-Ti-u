import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { Expense, Goal, Category } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/format';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Plus, 
  Trash2, 
  Edit3, 
  Check, 
  PiggyBank, 
  ChevronRight, 
  Coins 
} from 'lucide-react';

interface OverviewTabProps {
  expenses: Expense[];
  goals: Goal[];
  income: number;
  onUpdateIncome: (amount: number) => void;
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoalProgress: (id: string, current: number) => void;
  onDeleteGoal: (id: string) => void;
}

export default function OverviewTab({
  expenses,
  goals,
  income,
  onUpdateIncome,
  onAddGoal,
  onUpdateGoalProgress,
  onDeleteGoal
}: OverviewTabProps) {
  // Stats calculation
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonthNum = today.getMonth() + 1; // 1-indexed
  const currentMonthStr = `${currentYear}-${String(currentMonthNum).padStart(2, '0')}`; // e.g. 2026-07

  // Active month selector (default to current month)
  const [selectedMonth, setSelectedMonth] = useState(currentMonthStr);

  // Available months from expenses
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    months.add(currentMonthStr); // Always show current month
    expenses.forEach(exp => {
      if (exp.date) {
        months.add(exp.date.substring(0, 7));
      }
    });
    return Array.from(months).sort().reverse(); // Decending
  }, [expenses, currentMonthStr]);

  // Expenses filtered by selected month
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.date && exp.date.startsWith(selectedMonth));
  }, [expenses, selectedMonth]);

  // Total this month
  const totalExpenseThisMonth = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  // Average per day
  const dailyAverage = useMemo(() => {
    if (filteredExpenses.length === 0) return 0;
    
    // If selected month is current month, divide by current day of month
    // Otherwise, divide by total days in that month
    const [year, month] = selectedMonth.split('-').map(Number);
    const totalDaysInMonth = new Date(year, month, 0).getDate();
    
    let daysToDivide = totalDaysInMonth;
    if (year === currentYear && month === currentMonthNum) {
      daysToDivide = today.getDate();
    }
    
    return totalExpenseThisMonth / daysToDivide;
  }, [filteredExpenses, totalExpenseThisMonth, selectedMonth, currentYear, currentMonthNum, today]);

  // Transaction count
  const transactionCount = filteredExpenses.length;

  // Remaining budget
  const remainingBudget = income - totalExpenseThisMonth;
  const savingsRate = income > 0 ? (remainingBudget / income) * 100 : 0;

  // Income update state
  const [isEditingIncome, setIsEditingIncome] = useState(false);
  const [tempIncome, setTempIncome] = useState(income.toString());

  const handleSaveIncome = () => {
    const val = parseFloat(tempIncome.replace(/[.,\s]/g, ''));
    if (!isNaN(val) && val >= 0) {
      onUpdateIncome(val);
      setIsEditingIncome(false);
    }
  };

  // Goal adding state
  const [isAddingGoal, setIsAddingGoal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalCurrent, setNewGoalCurrent] = useState('');

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

  // Recharts: Category Pie Chart Data
  const pieData = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    
    // Initialize
    CATEGORIES.forEach(cat => {
      categoryTotals[cat.id] = 0;
    });

    // Sum
    filteredExpenses.forEach(exp => {
      const catId = exp.categoryId;
      if (categoryTotals[catId] !== undefined) {
        categoryTotals[catId] += exp.amount;
      } else {
        categoryTotals['khac'] += exp.amount;
      }
    });

    // Format
    return CATEGORIES.map(cat => ({
      name: cat.name,
      value: categoryTotals[cat.id],
      color: cat.color
    })).filter(item => item.value > 0);
  }, [filteredExpenses]);

  // Recharts: 7-day Bar Chart Data
  const last7DaysData = useMemo(() => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(today.getDate() - i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const displayLabel = `${d.getDate()}/${d.getMonth() + 1}`;
      
      const daySum = expenses
        .filter(exp => exp.date === dateStr)
        .reduce((sum, exp) => sum + exp.amount, 0);

      data.push({
        date: dateStr,
        label: displayLabel,
        'Số tiền': daySum
      });
    }
    return data;
  }, [expenses]);

  return (
    <div className="space-y-6">
      {/* Upper bar: Month Selection and Income Settings */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E6DEC9] pb-4">
        <div>
          <h2 className="text-sm font-semibold text-stone-500 uppercase tracking-wider font-sans">Bảng quản lý</h2>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <span className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">Tháng quan sát:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-[#E6DEC9] rounded px-3 py-2.5 sm:py-1 text-sm font-serif font-bold text-emerald-900 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px] sm:min-h-0"
            >
              {availableMonths.map(m => {
                const [y, mm] = m.split('-');
                return (
                  <option key={m} value={m}>
                    Tháng {mm}/{y}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        {/* Monthly Income Widget */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-3 rounded-lg flex flex-col justify-center min-w-[250px]">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
            <span className="flex items-center gap-1">
              <Coins size={14} className="text-amber-600" />
              THU NHẬP HẰNG THÁNG
            </span>
            {!isEditingIncome && (
              <button 
                onClick={() => {
                  setTempIncome(income.toString());
                  setIsEditingIncome(true);
                }}
                className="text-emerald-800 hover:text-emerald-900 flex items-center gap-1 p-2 -m-2 text-xs font-medium cursor-pointer min-h-[44px] sm:min-h-0"
              >
                <Edit3 size={12} /> Sửa
              </button>
            )}
          </div>
          {isEditingIncome ? (
            <div className="flex gap-1.5 mt-1">
              <input
                type="text"
                value={tempIncome}
                onChange={(e) => setTempIncome(e.target.value)}
                placeholder="Nhập số tiền..."
                className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-2 text-sm font-mono text-stone-800 focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
              />
              <button
                onClick={handleSaveIncome}
                className="bg-emerald-900 text-white p-2 rounded hover:bg-emerald-850 flex items-center justify-center cursor-pointer min-w-[44px] sm:min-w-0 min-h-[44px] sm:min-h-0 shrink-0"
              >
                <Check size={16} />
              </button>
            </div>
          ) : (
            <div className="font-mono text-xl font-bold text-emerald-950 flex items-baseline gap-1 mt-0.5">
              {formatCurrency(income)}
            </div>
          )}
        </div>
      </div>

      {/* Grid of Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Total Expense */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg flex items-start justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Tổng chi tháng này</span>
            <span className="font-mono text-2xl font-black text-emerald-950 block">{formatCurrency(totalExpenseThisMonth)}</span>
          </div>
          <span className="p-2 bg-emerald-50 rounded-md text-emerald-900 border border-emerald-100">
            <TrendingUp size={20} />
          </span>
        </div>

        {/* Daily Average */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg flex items-start justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Trung bình chi mỗi ngày</span>
            <span className="font-mono text-2xl font-black text-emerald-950 block">{formatCurrency(Math.round(dailyAverage))}</span>
          </div>
          <span className="p-2 bg-amber-50 rounded-md text-amber-700 border border-amber-100">
            <Calendar size={20} />
          </span>
        </div>

        {/* Transaction Count */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg flex items-start justify-between shadow-sm">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">Số giao dịch</span>
            <span className="font-mono text-2xl font-black text-emerald-950 block">{transactionCount} <span className="text-xs text-stone-500 font-sans font-normal">lượt</span></span>
          </div>
          <span className="p-2 bg-stone-100 rounded-md text-stone-700 border border-stone-200">
            <DollarSign size={20} />
          </span>
        </div>

        {/* Remaining Budget & Savings Rate */}
        <div className={`border p-4 rounded-lg flex items-start justify-between shadow-sm ${remainingBudget >= 0 ? 'bg-[#FAF7F0] border-[#E6DEC9]' : 'bg-red-50 border-red-200'}`}>
          <div className="space-y-1">
            <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
              {remainingBudget >= 0 ? 'Số dư còn lại' : 'Chi tiêu vượt mức'}
            </span>
            <span className={`font-mono text-2xl font-black block ${remainingBudget >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
              {formatCurrency(remainingBudget)}
            </span>
            <span className="text-xs text-stone-500 block">
              Tỷ lệ tiết kiệm: <span className="font-mono font-bold text-stone-700">{savingsRate.toFixed(1)}%</span>
            </span>
          </div>
          <span className={`p-2 rounded-md border ${remainingBudget >= 0 ? 'bg-emerald-50 text-emerald-900 border-emerald-100' : 'bg-red-100 text-red-700 border-red-200'}`}>
            <PiggyBank size={20} />
          </span>
        </div>
      </div>

      {/* Visual Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pie Chart for Category breakdown */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
          <h3 className="font-serif text-lg font-bold text-emerald-950 mb-3 pb-2 border-b border-stone-200/50 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
            Cơ cấu chi tiêu theo danh mục
          </h3>
          
          {pieData.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <div className="w-full sm:w-1/2 h-48 sm:h-64 shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#FAF7F0" strokeWidth={1} />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Số tiền']}
                      contentStyle={{ backgroundColor: '#FAF7F0', borderColor: '#E6DEC9', borderRadius: '6px', fontFamily: 'JetBrains Mono' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full sm:w-1/2 overflow-y-auto max-h-[220px] pr-2 space-y-1.5">
                {pieData.map((item, idx) => {
                  const percentage = ((item.value / totalExpenseThisMonth) * 100).toFixed(1);
                  return (
                    <div key={idx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }}></span>
                        <span className="text-stone-700 font-medium truncate">{item.name}</span>
                      </div>
                      <div className="font-mono text-stone-500 whitespace-nowrap">
                        <span className="font-bold text-stone-800 mr-1">{formatCurrency(item.value)}</span>
                        ({percentage}%)
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="h-48 sm:h-64 flex flex-col items-center justify-center text-stone-400 font-sans text-sm gap-2">
              <div className="p-3 rounded-full bg-stone-100 border border-stone-200">
                <Coins size={24} className="text-stone-300" />
              </div>
              Chưa có dữ liệu chi tiêu cho tháng này.
            </div>
          )}
        </div>

        {/* Bar Chart for Last 7 Days trend */}
        <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
          <h3 className="font-serif text-lg font-bold text-emerald-950 mb-3 pb-2 border-b border-stone-200/50 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
            Chi tiêu 7 ngày gần nhất
          </h3>
          <div className="h-48 sm:h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={last7DaysData}
                margin={{ top: 10, right: 5, left: -25, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E6DEC9" vertical={false} />
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
                  contentStyle={{ backgroundColor: '#FAF7F0', borderColor: '#E6DEC9', borderRadius: '6px', fontFamily: 'JetBrains Mono' }}
                />
                <Bar dataKey="Số tiền" fill="#064e3b" radius={[2, 2, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Financial Goals Tracker section */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/50 mb-4">
          <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-1.5">
            <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
            Mục tiêu tài chính tích lũy
          </h3>
          {!isAddingGoal && (
            <button
              onClick={() => setIsAddingGoal(true)}
              className="px-2.5 py-1 bg-emerald-900 hover:bg-emerald-850 text-white text-xs font-semibold rounded flex items-center gap-1 cursor-pointer transition"
            >
              <Plus size={14} /> Thêm mục tiêu
            </button>
          )}
        </div>

        {/* Add goal Form */}
        {isAddingGoal && (
          <form onSubmit={handleSaveGoal} className="bg-[#FAF9F6] border border-[#E6DEC9] p-4 rounded-lg mb-4 space-y-3">
            <h4 className="font-serif text-sm font-bold text-stone-800">Thêm mục tiêu tiết kiệm mới</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">TÊN MỤC TIÊU *</label>
                <input
                  type="text"
                  required
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="Ví dụ: Mua Macbook, Đi du lịch..."
                  className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN CẦN ĐẠT *</label>
                <input
                  type="text"
                  required
                  value={newGoalTarget}
                  onChange={(e) => setNewGoalTarget(e.target.value)}
                  placeholder="Ví dụ: 25.000.000"
                  className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN ĐÃ CÓ (TÙY CHỌN)</label>
                <input
                  type="text"
                  value={newGoalCurrent}
                  onChange={(e) => setNewGoalCurrent(e.target.value)}
                  placeholder="Ví dụ: 5.000.000"
                  className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-3 sm:py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
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

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map(goal => {
              const pct = Math.min(100, Math.max(0, (goal.current / goal.target) * 100));
              return (
                <div key={goal.id} className="border border-[#E6DEC9] p-4 rounded-lg bg-white space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="font-serif text-base font-bold text-emerald-950">{goal.name}</h4>
                      <p className="text-[10px] text-stone-400">Tạo ngày: {goal.createdAt}</p>
                    </div>
                    <button
                      onClick={() => onDeleteGoal(goal.id)}
                      className="p-2 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded transition cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
                      title="Xóa mục tiêu"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Progress info */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-stone-500 font-medium">Tiến độ</span>
                      <span className="font-mono font-bold text-emerald-900">{pct.toFixed(0)}%</span>
                    </div>
                    
                    {/* Flat solid progress bar */}
                    <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
                      <div 
                        className="bg-emerald-900 h-full rounded-full transition-all duration-300"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>

                    <div className="flex justify-between text-xs font-mono pt-1 text-stone-500">
                      <span>Đã tích lũy: <strong className="text-stone-800">{formatCurrency(goal.current)}</strong></span>
                      <span>Mục tiêu: <strong className="text-stone-800">{formatCurrency(goal.target)}</strong></span>
                    </div>
                  </div>

                  {/* Quick progress update inline form */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 pt-2 border-t border-stone-100">
                    <span className="text-[10px] font-bold text-stone-400 uppercase shrink-0">CẬP NHẬT NHANH:</span>
                    <input
                      type="text"
                      placeholder="Cộng thêm số tiền, vd: 500k..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const inputVal = (e.currentTarget as HTMLInputElement).value;
                          let cleanVal = inputVal.toLowerCase().replace(/\s/g, '');
                          
                          // Handle suffix parsing
                          let factor = 1;
                          if (cleanVal.endsWith('k')) {
                            factor = 1000;
                            cleanVal = cleanVal.slice(0, -1);
                          } else if (cleanVal.endsWith('tr') || cleanVal.endsWith('m')) {
                            factor = 1000000;
                            cleanVal = cleanVal.slice(0, -2);
                          } else if (cleanVal.endsWith('triệu')) {
                            factor = 1000000;
                            cleanVal = cleanVal.slice(0, -5);
                          }
                          
                          cleanVal = cleanVal.replace(/[.,\s]/g, '');
                          const num = parseFloat(cleanVal);
                          if (!isNaN(num) && num > 0) {
                            const change = num * factor;
                            onUpdateGoalProgress(goal.id, goal.current + change);
                            (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                      className="w-full bg-[#FAF9F6] border border-[#E6DEC9] rounded px-3 py-2.5 sm:py-1 text-xs font-mono text-stone-700 focus:outline-none focus:border-emerald-700 min-h-[44px] sm:min-h-0"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 text-stone-400 font-sans text-xs flex flex-col items-center justify-center gap-2 border border-dashed border-stone-200 rounded-lg">
            <div className="p-2 rounded-full bg-stone-50 border border-stone-100">
              <PiggyBank size={18} className="text-stone-300" />
            </div>
            Chưa có mục tiêu tài chính nào. Hãy thêm một mục tiêu để cùng cố gắng tích lũy nhé!
          </div>
        )}
      </div>
    </div>
  );
}
