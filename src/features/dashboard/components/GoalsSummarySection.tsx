import React, { useState } from 'react';
import { 
  PiggyBank, 
  Plus, 
  ChevronRight, 
  TrendingUp, 
  Sparkles,
  Check,
  X
} from 'lucide-react';
import { Goal } from '../../../types';
import { formatCurrency } from '../../../utils/format';

interface GoalsSummarySectionProps {
  goals: Goal[];
  onAddGoal: (goal: Omit<Goal, 'id' | 'createdAt'>) => void;
  onUpdateGoalProgress: (id: string, current: number) => void;
  onNavigateToGoals: () => void;
}

export const GoalsSummarySection: React.FC<GoalsSummarySectionProps> = ({
  goals,
  onAddGoal,
  onUpdateGoalProgress,
  onNavigateToGoals,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [goalName, setGoalName] = useState('');
  const [goalTarget, setGoalTarget] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');

  const handleSaveGoal = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(goalTarget.replace(/[.,\s]/g, ''));
    const current = parseFloat(goalCurrent.replace(/[.,\s]/g, '') || '0');
    if (goalName.trim() && !isNaN(target) && target > 0) {
      onAddGoal({
        name: goalName.trim(),
        target,
        current: isNaN(current) ? 0 : current,
      });
      setGoalName('');
      setGoalTarget('');
      setGoalCurrent('');
      setIsAdding(false);
    }
  };

  const handleQuickDeposit = (goal: Goal, amount: number) => {
    onUpdateGoalProgress(goal.id, goal.current + amount);
  };

  const totalTarget = goals.reduce((sum, g) => sum + g.target, 0);
  const totalSaved = goals.reduce((sum, g) => sum + g.current, 0);
  const overallProgress = totalTarget > 0 ? (totalSaved / totalTarget) * 100 : 0;

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
              <PiggyBank size={18} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-emerald-950">
                Mục tiêu tích lũy tài chính
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Đã gom được: <strong className="font-mono text-emerald-900">{formatCurrency(totalSaved)}</strong> / {formatCurrency(totalTarget)} ({overallProgress.toFixed(0)}%)
              </p>
            </div>
          </div>

          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="p-1.5 px-2.5 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-lg text-xs font-serif font-bold flex items-center gap-1 transition cursor-pointer"
            >
              <Plus size={14} />
              <span>Thêm mục tiêu</span>
            </button>
          )}
        </div>

        {/* Quick Add Form */}
        {isAdding && (
          <form onSubmit={handleSaveGoal} className="bg-white border border-[#E6DEC9] p-3.5 rounded-xl mb-4 space-y-3 text-xs shadow-2xs">
            <div className="flex items-center justify-between font-serif font-bold text-emerald-950">
              <span>Tạo mục tiêu tiết kiệm mới</span>
              <button type="button" onClick={() => setIsAdding(false)} className="text-stone-400 hover:text-stone-600">
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                type="text"
                required
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                placeholder="Tên mục tiêu (vd: Quỹ dự phòng)..."
                className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-700"
              />
              <input
                type="text"
                required
                value={goalTarget}
                onChange={(e) => setGoalTarget(e.target.value)}
                placeholder="Số tiền cần đạt (vd: 30tr)..."
                className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-emerald-700"
              />
              <input
                type="text"
                value={goalCurrent}
                onChange={(e) => setGoalCurrent(e.target.value)}
                placeholder="Đã có sẵn (vd: 5tr)..."
                className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1 text-stone-600 hover:bg-stone-100 rounded cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-3 py-1 bg-emerald-900 text-white font-serif font-bold rounded hover:bg-emerald-850 cursor-pointer"
              >
                Lưu mục tiêu
              </button>
            </div>
          </form>
        )}

        {/* Goals List */}
        {goals.length > 0 ? (
          <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
            {goals.map((goal) => {
              const pct = Math.min(100, Math.max(0, (goal.current / goal.target) * 100));
              const remaining = Math.max(0, goal.target - goal.current);

              return (
                <div key={goal.id} className="bg-white border border-[#E6DEC9] p-3 rounded-xl text-xs space-y-2 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="font-serif font-bold text-stone-900 text-sm">
                      {goal.name}
                    </span>
                    <span className="font-mono font-bold text-emerald-950 text-xs">
                      {pct.toFixed(0)}%
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                    <div 
                      className="bg-emerald-900 h-full rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] font-mono text-stone-500">
                    <span>Đã gom: <strong className="text-emerald-950 font-bold">{formatCurrency(goal.current)}</strong></span>
                    <span>Mục tiêu: {formatCurrency(goal.target)}</span>
                  </div>

                  {/* Quick deposit shortcuts */}
                  <div className="flex items-center justify-between pt-2 border-t border-stone-100 gap-1">
                    <span className="text-[10px] font-serif uppercase tracking-wider text-stone-400 font-bold">
                      Nạp thêm:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleQuickDeposit(goal, 200000)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        +200k
                      </button>
                      <button
                        onClick={() => handleQuickDeposit(goal, 500000)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        +500k
                      </button>
                      <button
                        onClick={() => handleQuickDeposit(goal, 1000000)}
                        className="px-2 py-0.5 bg-stone-100 hover:bg-emerald-100 text-stone-700 hover:text-emerald-900 rounded text-[10px] font-mono font-bold transition cursor-pointer"
                      >
                        +1Tr
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs font-sans">
            Chưa có mục tiêu tài chính nào. Hãy tạo mục tiêu đầu tiên để tạo động lực tích lũy!
          </div>
        )}
      </div>

      <button
        onClick={onNavigateToGoals}
        className="mt-4 pt-3 border-t border-stone-200/70 text-xs font-semibold text-emerald-900 hover:text-emerald-950 flex items-center justify-between transition cursor-pointer w-full"
      >
        <span>Xem tất cả mục tiêu & dự báo tài chính</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
};
export default GoalsSummarySection;
