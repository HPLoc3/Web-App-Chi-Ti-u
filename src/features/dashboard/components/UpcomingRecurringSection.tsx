import React from 'react';
import { 
  Calendar, 
  RefreshCw, 
  ChevronRight, 
  CheckCircle2, 
  AlertCircle, 
  Clock,
  Plus
} from 'lucide-react';
import { RecurringExpense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { formatMaskedCurrency } from '../../../utils/format';
import { getBusinessDate } from '../../../utils/dateParser';
import { diffDays, displayNextDue, totalMonthlyRecurring } from '../../../utils/recurringSchedule';

interface UpcomingRecurringSectionProps {
  recurringExpenses: RecurringExpense[];
  showBalance?: boolean;
  onTriggerSync?: () => void;
  onNavigateToBudget?: () => void;
  onQuickRecordRecurring?: (rec: RecurringExpense) => void;
}

export const UpcomingRecurringSection: React.FC<UpcomingRecurringSectionProps> = ({
  recurringExpenses,
  showBalance = true,
  onTriggerSync,
  onNavigateToBudget,
  onQuickRecordRecurring,
}) => {
  const today = getBusinessDate();

  // Khoản đang kích hoạt, xếp theo ngày đến hạn kế tiếp
  const sortedRecurring = recurringExpenses
    .filter((r) => r.isActive !== false)
    .map((item) => ({ item, nextDue: displayNextDue(item, today) }))
    .sort((a, b) => a.nextDue.localeCompare(b.nextDue));

  const monthlyTotal = totalMonthlyRecurring(recurringExpenses);

  return (
    <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-200/70 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-900">
              <Calendar size={18} />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-emerald-950">
                Khoản chi định kỳ & Hóa đơn sắp tới
              </h3>
              <p className="text-[11px] text-stone-500 font-sans">
                Tổng định kỳ: <strong className="font-mono text-emerald-900">{formatMaskedCurrency(monthlyTotal, showBalance)}/tháng</strong>
              </p>
            </div>
          </div>

          {onTriggerSync && (
            <button
              onClick={onTriggerSync}
              className="p-1.5 bg-white border border-[#E6DEC9] hover:bg-emerald-50 text-emerald-900 rounded-lg text-xs font-serif font-bold flex items-center gap-1 transition cursor-pointer"
              title="Đồng bộ chi tiêu định kỳ vào sổ"
            >
              <RefreshCw size={13} />
              <span className="hidden sm:inline">Đồng bộ</span>
            </button>
          )}
        </div>

        {/* List of upcoming recurring bills */}
        {sortedRecurring.length > 0 ? (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
            {sortedRecurring.map(({ item, nextDue }) => {
              const cat = CATEGORIES.find((c) => c.id === item.categoryId);
              const daysDiff = diffDays(today, nextDue);
              const dueLabel = `${nextDue.slice(8, 10)}/${nextDue.slice(5, 7)}`;

              let statusBadge = {
                text: `Ngày ${dueLabel} (còn ${daysDiff} ngày)`,
                style: 'bg-emerald-50 text-emerald-800 border-emerald-200',
              };

              if (daysDiff < 0) {
                statusBadge = {
                  text: `Chờ ghi (${dueLabel})`,
                  style: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                };
              } else if (daysDiff === 0) {
                statusBadge = {
                  text: 'Hôm nay',
                  style: 'bg-rose-100 text-rose-800 border-rose-200 font-bold',
                };
              } else if (daysDiff <= 3) {
                statusBadge = {
                  text: `Còn ${daysDiff} ngày`,
                  style: 'bg-amber-100 text-amber-800 border-amber-200 font-semibold',
                };
              }

              return (
                <div 
                  key={item.id}
                  className="bg-white border border-[#E6DEC9] p-3 rounded-xl flex items-center justify-between gap-3 text-xs shadow-2xs hover:border-emerald-700/50 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span 
                      className="w-3 h-3 rounded-full shrink-0" 
                      style={{ backgroundColor: cat?.color || '#064e3b' }} 
                    />
                    <div className="min-w-0">
                      <div className="font-serif font-bold text-stone-900 truncate">
                        {item.note || cat?.name || 'Chi tiêu định kỳ'}
                      </div>
                      <div className="text-[10px] text-stone-400 font-sans">
                        {cat?.name || 'Định kỳ'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-950">
                        {formatMaskedCurrency(item.amount, showBalance)}
                      </div>
                      <span className={`inline-block text-[9px] font-sans px-1.5 py-0.2 rounded border ${statusBadge.style}`}>
                        {statusBadge.text}
                      </span>
                    </div>

                    {onQuickRecordRecurring && (
                      <button
                        onClick={() => {
                          // Giao dịch ghi tay không thay cho kỳ tự động: hỏi trước để tránh ghi hai lần
                          const warning = `Khoản này vẫn được tự ghi vào ngày ${dueLabel}. Ghi thêm một giao dịch ngay bây giờ?`;
                          if (window.confirm(warning)) onQuickRecordRecurring(item);
                        }}
                        className="p-1 text-emerald-800 hover:text-emerald-950 hover:bg-emerald-50 rounded cursor-pointer transition"
                        title="Ghi nhận ngay vào sổ"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-6 bg-white rounded-xl border border-dashed border-stone-200 text-stone-400 text-xs font-sans">
            Chưa thiết lập khoản chi cố định hoặc đăng ký nào.
          </div>
        )}
      </div>

      {onNavigateToBudget && (
        <button
          onClick={onNavigateToBudget}
          className="mt-4 pt-3 border-t border-stone-200/70 text-xs font-semibold text-emerald-900 hover:text-emerald-950 flex items-center justify-between transition cursor-pointer w-full"
        >
          <span>Quản lý danh sách chi tiêu định kỳ</span>
          <ChevronRight size={14} />
        </button>
      )}
    </div>
  );
};
export default UpcomingRecurringSection;
