import React, { useState, useMemo } from 'react';
import { RecurringExpense, Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency } from '../../../utils/format';
import { useToast } from '../../../context/ToastContext';
import { CategoryIcon } from '../../transactions/components/ExpensesTab';
import { StatCard } from '../../../components/common/StatCard';
import { EmptyState } from '../../../components/common/EmptyState';
import { 
  Repeat, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  CreditCard,
  Zap,
  DollarSign,
  X
} from 'lucide-react';

interface RecurringTabProps {
  recurringExpenses: RecurringExpense[];
  income?: number;
  onAddRecurringExpense: (item: Omit<RecurringExpense, 'id'>) => void;
  onDeleteRecurringExpense: (id: string) => void;
  onTriggerManualRecurringSync?: () => void;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({
  recurringExpenses = [],
  income = 0,
  onAddRecurringExpense,
  onDeleteRecurringExpense,
  onTriggerManualRecurringSync,
}) => {
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');

  const today = new Date();
  const currentDay = today.getDate();

  // Metrics
  const totalMonthlyRecurring = useMemo(() => {
    return recurringExpenses.reduce((sum, r) => {
      if (r.frequency === 'yearly') return sum + Math.round(r.amount / 12);
      if (r.frequency === 'weekly') return sum + Math.round(r.amount * 4);
      return sum + r.amount;
    }, 0);
  }, [recurringExpenses]);

  const recurringRatio = income > 0 ? ((totalMonthlyRecurring / income) * 100).toFixed(1) : '0';

  const handleSaveRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount.replace(/[.,\s]/g, ''));
    const parsedDay = parseInt(dayOfMonth, 10);

    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'warning');
      return;
    }
    if (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31) {
      showToast('Ngày trong tháng phải từ 1 đến 31.', 'warning');
      return;
    }

    onAddRecurringExpense({
      amount: parsedAmount,
      categoryId,
      dayOfMonth: parsedDay,
      note: note.trim() || 'Khoản chi cố định',
      frequency,
      isActive: true,
    });

    setAmount('');
    setNote('');
    setDayOfMonth('1');
    setIsAddModalOpen(false);
  };

  const getDaysUntilNextRun = (day: number) => {
    if (day === currentDay) return 'Hôm nay đến hạn';
    if (day > currentDay) return `Còn ${day - currentDay} ngày`;
    return `Đã qua (${day}/${today.getMonth() + 1})`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E6DEC9]">
        <div>
          <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">
            Giao Dịch Định Kỳ & Thuê Bao
          </h2>
          <p className="text-xs text-stone-500 font-sans">
            Tự động quản lý hóa đơn tiền nhà, điện nước, internet, bảo hiểm và các gói dịch vụ
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onTriggerManualRecurringSync && (
            <button
              onClick={onTriggerManualRecurringSync}
              className="flex items-center gap-1.5 px-3.5 py-2 border border-[#E6DEC9] bg-white hover:bg-stone-50 text-emerald-950 rounded-xl text-xs font-semibold shadow-2xs transition cursor-pointer"
              title="Tự động ghi các khoản định kỳ chưa ghi vào sổ chi tiêu tháng này"
            >
              <RefreshCw size={14} className="text-amber-600" />
              <span>Đồng bộ tháng này</span>
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Thêm khoản định kỳ</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tổng Chi Phí Định Kỳ / Tháng"
          value={formatCurrency(totalMonthlyRecurring)}
          subtitle={`${recurringExpenses.length} khoản chi cố định`}
          icon={<Repeat size={18} />}
          variant="emerald"
        />
        <StatCard
          title="Tỷ Trọng Trên Thu Nhập"
          value={`${recurringRatio}%`}
          subtitle={Number(recurringRatio) <= 30 ? 'Mức chi cố định an toàn (<30%)' : 'Chi cố định cao so với thu nhập'}
          icon={<Zap size={18} />}
          variant={Number(recurringRatio) <= 30 ? 'blue' : 'amber'}
        />
        <StatCard
          title="Đến Hạn Trong 7 Ngày Tới"
          value={`${
            recurringExpenses.filter((r) => r.dayOfMonth >= currentDay && r.dayOfMonth <= currentDay + 7).length
          } khoản`}
          subtitle="Cần chuẩn bị số dư thanh toán"
          icon={<Clock size={18} />}
          variant="default"
        />
      </div>

      {/* Recurring List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-serif text-base font-bold text-emerald-950">
            Danh Sách Khoản Chi Định Kỳ ({recurringExpenses.length})
          </h3>
          <span className="text-xs text-stone-500 font-sans">
            Tự động lặp lại hàng tháng
          </span>
        </div>

        {recurringExpenses.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch định kỳ nào"
            description="Thêm hóa đơn tiền nhà, điện nước, internet hoặc các gói Netflix/Spotify để không bao giờ quên thanh toán."
            actionText="Thêm khoản định kỳ đầu tiên"
            onAction={() => setIsAddModalOpen(true)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurringExpenses.map((rec) => {
              const cat = CATEGORIES.find((c) => c.id === rec.categoryId) || CATEGORIES[0];
              const daysStatus = getDaysUntilNextRun(rec.dayOfMonth);
              const isDueToday = rec.dayOfMonth === currentDay;

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                    isDueToday ? 'border-amber-400 ring-1 ring-amber-300' : 'border-[#E6DEC9]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.bgColor}`}>
                          <CategoryIcon name={cat.iconName} size={18} className={cat.textColor} />
                        </div>
                        <div>
                          <h4 className="font-serif font-bold text-sm text-emerald-950 leading-tight">
                            {rec.note}
                          </h4>
                          <span className="text-[11px] text-stone-500 font-sans">
                            {cat.name}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => onDeleteRecurringExpense(rec.id)}
                        className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                        title="Xóa khoản định kỳ"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <div className="my-3">
                      <div className="font-mono text-xl font-black text-emerald-900">
                        {formatCurrency(rec.amount)}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                          {rec.frequency === 'yearly' ? 'Hàng năm' : rec.frequency === 'weekly' ? 'Hàng tuần' : 'Hàng tháng'}
                        </span>
                        <span
                          className={`text-[11px] font-medium ${
                            isDueToday
                              ? 'text-amber-700 font-bold'
                              : 'text-stone-500'
                          }`}
                        >
                          {daysStatus}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-800" />
                      <span>Ngày {rec.dayOfMonth} hàng tháng</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800">
                      <CheckCircle2 size={12} />
                      <span>Đang kích hoạt</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Recurring Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#E6DEC9]">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Repeat size={18} className="text-amber-600" />
                <span>Thêm giao dịch định kỳ</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveRecurring} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Tên khoản chi định kỳ *
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="VD: Tiền thuê nhà, Tiền điện, Netflix"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-stone-900 text-sm focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Số tiền (VNĐ) *
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="1200000"
                  required
                  min="1000"
                  step="any"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono text-stone-900 text-base font-bold focus:outline-none focus:border-emerald-700"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Danh mục
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày trừ tiền trong tháng
                  </label>
                  <input
                    type="number"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    min="1"
                    max="31"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Chu kỳ lặp lại
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'monthly', label: 'Hàng tháng' },
                    { id: 'weekly', label: 'Hàng tuần' },
                    { id: 'yearly', label: 'Hàng năm' },
                  ].map((freq) => (
                    <button
                      type="button"
                      key={freq.id}
                      onClick={() => setFrequency(freq.id as any)}
                      className={`py-2 px-3 rounded-xl border text-xs font-semibold transition cursor-pointer text-center ${
                        frequency === freq.id
                          ? 'bg-emerald-950 text-amber-300 border-emerald-950'
                          : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100'
                      }`}
                    >
                      {freq.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Lưu khoản định kỳ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
