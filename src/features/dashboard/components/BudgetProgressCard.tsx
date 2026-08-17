import React, { useMemo } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  SlidersHorizontal, 
  ArrowUpRight,
  TrendingDown
} from 'lucide-react';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency } from '../../../utils/format';

interface CategorySpendInfo {
  categoryId: string;
  name: string;
  color: string;
  spent: number;
  limit: number;
  percent: number;
  isOver: boolean;
  isNear: boolean;
}

interface BudgetProgressCardProps {
  categoryLimits: Record<string, number>;
  expensesThisMonth: { categoryId: string; amount: number }[];
  income: number;
  totalExpenseThisMonth: number;
  onNavigateToBudget: () => void;
}

export const BudgetProgressCard: React.FC<BudgetProgressCardProps> = React.memo(({
  categoryLimits,
  expensesThisMonth,
  income,
  totalExpenseThisMonth,
  onNavigateToBudget,
}) => {
  // Aggregate category spend and sort by highest usage (memoized)
  const budgetList = useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    expensesThisMonth.forEach((exp) => {
      categoryTotals[exp.categoryId] = (categoryTotals[exp.categoryId] || 0) + exp.amount;
    });

    const list: CategorySpendInfo[] = [];
    CATEGORIES.forEach((cat) => {
      const limit = categoryLimits[cat.id] || 0;
      const spent = categoryTotals[cat.id] || 0;
      
      if (limit > 0 || spent > 0) {
        const percent = limit > 0 ? (spent / limit) * 100 : 0;
        list.push({
          categoryId: cat.id,
          name: cat.name,
          color: cat.color,
          spent,
          limit,
          percent,
          isOver: limit > 0 && spent > limit,
          isNear: limit > 0 && spent >= limit * 0.85 && spent <= limit,
        });
      }
    });

    list.sort((a, b) => {
      if (a.isOver && !b.isOver) return -1;
      if (!a.isOver && b.isOver) return 1;
      return b.percent - a.percent;
    });

    return list;
  }, [categoryLimits, expensesThisMonth]);

  const overBudgetCategories = useMemo(() => budgetList.filter((b) => b.isOver), [budgetList]);

  const totalPlannedBudget = useMemo(() => {
    return Object.values(categoryLimits).reduce((acc, l) => acc + l, 0) || income;
  }, [categoryLimits, income]);

  const overallUsagePct = totalPlannedBudget > 0 ? (totalExpenseThisMonth / totalPlannedBudget) * 100 : 0;

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 mb-4">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${overBudgetCategories.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-900'}`}>
              <SlidersHorizontal size={18} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-emerald-950">
                3. Tiến độ ngân sách & Cảnh báo vượt mức
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Tôi đang chi tiêu vượt hạn mức ở đâu?
              </p>
            </div>
          </div>

          <span className={`text-xs font-bold font-serif px-2.5 py-1 rounded-full border ${
            overBudgetCategories.length > 0
              ? 'bg-rose-100 text-rose-800 border-rose-300'
              : 'bg-emerald-100 text-emerald-800 border-emerald-300'
          }`}>
            {overBudgetCategories.length > 0 
              ? `${overBudgetCategories.length} mục vượt trần` 
              : 'Trong tầm kiểm soát'}
          </span>
        </div>

        {/* Overall budget meter */}
        <div className="bg-white border border-[#E6DEC9] p-3.5 rounded-xl mb-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-serif font-bold text-stone-800">
              Tổng ngân sách tháng đã dùng
            </span>
            <span className="font-mono font-bold text-emerald-950">
              {formatCurrency(totalExpenseThisMonth)} / {formatCurrency(totalPlannedBudget)} ({overallUsagePct.toFixed(0)}%)
            </span>
          </div>

          <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden border border-stone-200">
            <div 
              className={`h-full rounded-full transition-all duration-500 ${
                overallUsagePct > 100 
                  ? 'bg-rose-600' 
                  : overallUsagePct > 80 
                  ? 'bg-amber-500' 
                  : 'bg-emerald-800'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, overallUsagePct))}%` }}
            />
          </div>
        </div>

        {/* Categories with alerts or top progress */}
        <div className="space-y-2.5">
          <span className="text-[10px] font-serif uppercase tracking-wider text-stone-500 font-bold block">
            Chi tiết các hạn mức danh mục
          </span>

          {budgetList.filter(b => b.limit > 0).length > 0 ? (
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {budgetList.filter(b => b.limit > 0).slice(0, 5).map((item) => (
                <div 
                  key={item.categoryId}
                  className={`p-2.5 rounded-lg border text-xs transition ${
                    item.isOver 
                      ? 'bg-rose-50/70 border-rose-200' 
                      : item.isNear 
                      ? 'bg-amber-50/70 border-amber-200' 
                      : 'bg-white border-stone-200/70'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span 
                        className="w-2.5 h-2.5 rounded-full shrink-0" 
                        style={{ backgroundColor: item.color }} 
                      />
                      <span className="font-semibold text-stone-800 truncate font-serif">
                        {item.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-stone-600 text-[11px]">
                        <strong className={item.isOver ? 'text-rose-700' : 'text-stone-900'}>
                          {formatCurrency(item.spent)}
                        </strong> / {formatCurrency(item.limit)}
                      </span>

                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        item.isOver 
                          ? 'bg-rose-200 text-rose-900' 
                          : item.isNear 
                          ? 'bg-amber-200 text-amber-900' 
                          : 'bg-stone-100 text-stone-700'
                      }`}>
                        {item.percent.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-stone-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${
                        item.isOver ? 'bg-rose-600' : item.isNear ? 'bg-amber-500' : 'bg-emerald-800'
                      }`}
                      style={{ width: `${Math.min(100, Math.max(0, item.percent))}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 bg-white rounded-lg border border-dashed border-stone-200 text-stone-500 text-xs font-sans">
              Chưa thiết lập hạn mức danh mục.
            </div>
          )}
        </div>
      </div>

      {/* Action Footer */}
      <button
        onClick={onNavigateToBudget}
        className="mt-4 pt-3 border-t border-stone-200/70 text-xs font-semibold text-emerald-900 hover:text-emerald-950 flex items-center justify-between transition cursor-pointer w-full"
      >
        <span>Điều chỉnh hạn mức & mẫu ngân sách</span>
        <ChevronRight size={14} />
      </button>
    </div>
  );
});
export default BudgetProgressCard;
