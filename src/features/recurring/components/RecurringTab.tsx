import React, { useState, useMemo } from 'react';
import { RecurringExpense, Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency, formatPercent } from '../../../utils/format';
import { useToast } from '../../../context/ToastContext';
import { CategoryIcon } from '../../transactions/components/ExpensesTab';
import { StatCard } from '../../../components/common/StatCard';
import { EmptyState } from '../../../components/common/EmptyState';
import MoneyInput from '../../../components/common/MoneyInput';
import { getBusinessDate, formatBusinessDate } from '../../../utils/dateParser';
import { getApiErrorMessage } from '../../../lib/apiClient';
import { addDays, diffDays, displayNextDue, totalMonthlyRecurring } from '../../../utils/recurringSchedule';
import { 
  Repeat, 
  Plus, 
  Trash2, 
  Calendar, 
  Clock, 
  RefreshCw, 
  CheckCircle2,
  PauseCircle,
  Pencil,
  AlertCircle,
  CreditCard,
  Zap,
  DollarSign,
  X
} from 'lucide-react';

interface RecurringTabProps {
  recurringExpenses: RecurringExpense[];
  income?: number;
  loadError?: string | null;
  onAddRecurringExpense: (item: Omit<RecurringExpense, 'id'>) => void | Promise<unknown>;
  onUpdateRecurringExpense?: (item: RecurringExpense) => void | Promise<unknown>;
  onDeleteRecurringExpense: (id: string) => void | Promise<unknown>;
  onTriggerManualRecurringSync?: () => void | Promise<unknown>;
}

export const RecurringTab: React.FC<RecurringTabProps> = ({
  recurringExpenses = [],
  income = 0,
  loadError,
  onAddRecurringExpense,
  onUpdateRecurringExpense,
  onDeleteRecurringExpense,
  onTriggerManualRecurringSync,
}) => {
  const { showToast } = useToast();

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringExpense | null>(null);
  const [amount, setAmount] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [startDate, setStartDate] = useState('');
  const [note, setNote] = useState('');
  const [frequency, setFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [isSaving, setIsSaving] = useState(false);

  const today = getBusinessDate();

  // Metrics
  const activeItems = recurringExpenses.filter((r) => r.isActive !== false);
  const monthlyTotal = useMemo(() => totalMonthlyRecurring(recurringExpenses), [recurringExpenses]);

  const recurringRatio = income > 0 ? (monthlyTotal / income) * 100 : 0;
  const dueSoonCount = activeItems.filter((r) => displayNextDue(r, today) <= addDays(today, 7)).length;

  const openForm = (item: RecurringExpense | null) => {
    setEditing(item);
    setAmount(item ? item.amount : null);
    setCategoryId(item ? item.categoryId : CATEGORIES[0].id);
    setDayOfMonth(item ? String(item.dayOfMonth) : String(Number(today.slice(8, 10))));
    // Khoản cũ chưa có ngày bắt đầu: để trống thì máy chủ giữ nguyên lịch
    setStartDate(item ? item.startDate || '' : today);
    setNote(item ? item.note : '');
    setFrequency(item?.frequency || 'monthly');
    setIsAddModalOpen(true);
  };

  // Chạy một thao tác lưu; lỗi API được hiện nguyên
  const runAction = async (action: () => void | Promise<unknown>, fallback: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (err) {
      showToast(getApiErrorMessage(err, fallback), 'error');
      return false;
    }
  };

  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedDay = parseInt(dayOfMonth, 10);

    if (amount === null || amount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'warning');
      return;
    }
    if (frequency === 'monthly' && (isNaN(parsedDay) || parsedDay < 1 || parsedDay > 31)) {
      showToast('Ngày trong tháng phải từ 1 đến 31.', 'warning');
      return;
    }
    if (!startDate && (!editing || frequency !== (editing.frequency || 'monthly'))) {
      showToast('Vui lòng chọn ngày bắt đầu.', 'warning');
      return;
    }

    const values: Omit<RecurringExpense, 'id'> = {
      amount,
      categoryId,
      dayOfMonth:
        frequency === 'monthly'
          ? parsedDay
          : startDate
            ? Number(startDate.slice(8, 10))
            : editing!.dayOfMonth,
      note: note.trim() || 'Khoản chi cố định',
      frequency,
      startDate: startDate || undefined,
      isActive: editing ? editing.isActive !== false : true,
    };

    setIsSaving(true);
    const saved = await runAction(
      () => (editing ? onUpdateRecurringExpense?.({ ...editing, ...values }) : onAddRecurringExpense(values)),
      'Không thể lưu khoản định kỳ.'
    );
    setIsSaving(false);
    if (saved) setIsAddModalOpen(false);
  };

  const getDueStatus = (nextDue: string) => {
    const days = diffDays(today, nextDue);
    if (days < 0) return 'Đang chờ ghi';
    if (days === 0) return 'Hôm nay đến hạn';
    return `Còn ${days} ngày`;
  };

  const scheduleLabel = (rec: RecurringExpense) => {
    const anchor = rec.startDate || displayNextDue(rec, today);
    if (rec.frequency === 'weekly') {
      const weekday = new Date(`${anchor}T00:00:00Z`).getUTCDay();
      return `${weekday === 0 ? 'Chủ nhật' : `Thứ ${weekday + 1}`} hàng tuần`;
    }
    if (rec.frequency === 'yearly') return `Ngày ${anchor.slice(8, 10)}/${anchor.slice(5, 7)} hàng năm`;
    return `Ngày ${rec.dayOfMonth} hàng tháng`;
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
              title="Ghi các khoản định kỳ đã đến hạn vào sổ"
            >
              <RefreshCw size={14} className="text-amber-600" />
              <span>Ghi khoản đến hạn</span>
            </button>
          )}

          <button
            onClick={() => openForm(null)}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            <Plus size={15} />
            <span>+ Thêm khoản định kỳ</span>
          </button>
        </div>
      </div>

      {loadError && (
        <div role="alert" className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">
          <AlertCircle size={14} className="shrink-0" />
          <span>{loadError}</span>
        </div>
      )}

      {/* KPI Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Tổng Chi Phí Định Kỳ / Tháng"
          value={formatCurrency(monthlyTotal)}
          subtitle={`${activeItems.length} khoản đang kích hoạt (quy đổi theo tháng)`}
          icon={<Repeat size={18} />}
          variant="emerald"
        />
        <StatCard
          title="Tỷ Trọng Trên Thu Nhập"
          value={income > 0 ? formatPercent(recurringRatio) : 'Chưa đánh giá'}
          subtitle={
            income <= 0
              ? 'Nhập thu nhập tháng để tính tỷ trọng'
              : recurringRatio <= 30 ? 'Mức chi cố định an toàn (<30%)' : 'Chi cố định cao so với thu nhập'
          }
          icon={<Zap size={18} />}
          variant={income <= 0 || recurringRatio <= 30 ? 'blue' : 'amber'}
        />
        <StatCard
          title="Đến Hạn Trong 7 Ngày Tới"
          value={`${dueSoonCount} khoản`}
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
            Tự động ghi khi đến hạn
          </span>
        </div>

        {recurringExpenses.length === 0 ? (
          <EmptyState
            title="Chưa có giao dịch định kỳ nào"
            description="Thêm hóa đơn tiền nhà, điện nước, internet hoặc các gói Netflix/Spotify để không bao giờ quên thanh toán."
            actionText="Thêm khoản định kỳ đầu tiên"
            onAction={() => openForm(null)}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {recurringExpenses.map((rec) => {
              const cat = CATEGORIES.find((c) => c.id === rec.categoryId) || CATEGORIES[0];
              const isActive = rec.isActive !== false;
              const nextDue = displayNextDue(rec, today);
              const isDueToday = isActive && nextDue === today;

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl border bg-white p-5 shadow-xs transition-all hover:shadow-md flex flex-col justify-between ${
                    isDueToday ? 'border-amber-400 ring-1 ring-amber-300' : 'border-[#E6DEC9]'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cat.bgColor}`}>
                          <CategoryIcon name={cat.iconName} size={18} className={cat.textColor} />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-serif font-bold text-sm text-emerald-950 leading-tight [overflow-wrap:anywhere]">
                            {rec.note}
                          </h4>
                          <span className="text-[11px] text-stone-500 font-sans">
                            {cat.name}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        {onUpdateRecurringExpense && (
                          <button
                            onClick={() => openForm(rec)}
                            className="p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Sửa khoản định kỳ"
                            aria-label={`Sửa ${rec.note}`}
                          >
                            <Pencil size={15} />
                          </button>
                        )}
                        <button
                          onClick={() =>
                            runAction(() => onDeleteRecurringExpense(rec.id), 'Không thể xóa khoản định kỳ.')
                          }
                          className="p-1.5 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa khoản định kỳ"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
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
                          {isActive
                            ? `Kỳ tới ${formatBusinessDate(nextDue, 'DD/MM/YYYY')} · ${getDueStatus(nextDue)}`
                            : 'Không ghi khi đang tạm dừng'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-stone-100 text-xs text-stone-500">
                    <div className="flex items-center gap-1">
                      <Calendar size={13} className="text-emerald-800" />
                      <span>{scheduleLabel(rec)}</span>
                    </div>
                    <button
                      type="button"
                      disabled={!onUpdateRecurringExpense}
                      aria-pressed={isActive}
                      title={isActive ? 'Bấm để tạm dừng' : 'Bấm để kích hoạt lại'}
                      onClick={() =>
                        runAction(
                          () => onUpdateRecurringExpense?.({ ...rec, isActive: !isActive }),
                          'Không thể đổi trạng thái khoản định kỳ.'
                        )
                      }
                      className={`inline-flex items-center gap-1 text-[11px] font-semibold cursor-pointer ${
                        isActive ? 'text-emerald-800' : 'text-stone-500'
                      }`}
                    >
                      {isActive ? <CheckCircle2 size={12} /> : <PauseCircle size={12} />}
                      <span>{isActive ? 'Đang kích hoạt' : 'Đã tạm dừng'}</span>
                    </button>
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
                <span>{editing ? 'Sửa giao dịch định kỳ' : 'Thêm giao dịch định kỳ'}</span>
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
                <MoneyInput
                  value={amount}
                  onChange={(value) => setAmount(value)}
                  placeholder="1.200.000"
                  aria-label="Số tiền định kỳ"
                  required
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
                    Ngày bắt đầu
                  </label>
                  <input
                    type="date"
                    aria-label="Ngày bắt đầu"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required={!editing}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                  />
                </div>
              </div>

              {frequency === 'monthly' ? (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Ngày trừ tiền trong tháng
                  </label>
                  <input
                    type="number"
                    aria-label="Ngày trừ tiền trong tháng"
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(e.target.value)}
                    min="1"
                    max="31"
                    required
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-mono text-stone-900 text-xs focus:outline-none focus:border-emerald-700"
                  />
                  <p className="mt-1 text-[11px] text-stone-500">Tháng ngắn hơn sẽ ghi vào ngày cuối tháng.</p>
                </div>
              ) : (
                <p className="text-[11px] text-stone-500">Lặp lại theo ngày bắt đầu.</p>
              )}

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
                  disabled={isSaving}
                  className="disabled:opacity-60 px-5 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
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
