import React, { useState, useMemo } from 'react';
import { AppState, RecurringExpense, Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency, formatPercent } from '../../../utils/format';
import { useToast } from '../../../context/ToastContext';
import { CategoryIcon } from '../../transactions/components/ExpensesTab';
import MoneyInput from '../../../components/common/MoneyInput';
import { EMPTY_MONEY, moneyDraft, moneyDraftError } from '../../../utils/moneyDraft';
import { getBusinessDate, formatBusinessDate } from '../../../utils/dateParser';
import { getApiErrorMessage } from '../../../lib/apiClient';
import { displayNextDue, totalMonthlyRecurring } from '../../../utils/recurringSchedule';
import { 
  Plus, 
  Trash2, 
  Calendar, 
  Check, 
  AlertTriangle,
  RefreshCw,
  Clock,
  CreditCard,
  TrendingUp,
  Sliders,
  DollarSign
} from 'lucide-react';

interface BudgetTabProps {
  expenses: Expense[];
  income: number;
  budgetTemplate: AppState['budgetTemplate'];
  categoryLimits: Record<string, number>;
  recurringExpenses: RecurringExpense[];
  onUpdateTemplate: (template: AppState['budgetTemplate']) => void | Promise<unknown>;
  onUpdateCategoryLimit: (categoryId: string, limit: number) => void | Promise<unknown>;
  onAddRecurringExpense: (item: Omit<RecurringExpense, 'id'>) => void | Promise<unknown>;
  onDeleteRecurringExpense: (id: string) => void | Promise<unknown>;
  onTriggerManualRecurringSync: () => void | Promise<unknown>;
}

export default function BudgetTab({
  expenses = [],
  income = 0,
  budgetTemplate = '50_30_20',
  categoryLimits = {},
  recurringExpenses = [],
  onUpdateTemplate = () => {},
  onUpdateCategoryLimit = () => {},
  onAddRecurringExpense = () => {},
  onDeleteRecurringExpense = () => {},
  onTriggerManualRecurringSync = () => {}
}: Partial<BudgetTabProps> & { expenses: Expense[]; categoryLimits: Record<string, number> }) {
  const { showToast } = useToast();

  const [editingLimitCategoryId, setEditingLimitCategoryId] = useState<string | null>(null);
  const [tempLimit, setTempLimit] = useState(EMPTY_MONEY);

  // Recurring Form State
  const [recAmount, setRecAmount] = useState<number | null>(null);
  const [recCategory, setRecCategory] = useState(CATEGORIES[0].id);
  const [recDay, setRecDay] = useState('1');
  const [recNote, setRecNote] = useState('');
  const [recFrequency, setRecFrequency] = useState<'monthly' | 'yearly' | 'weekly'>('monthly');
  const [recStartDate, setRecStartDate] = useState(() => getBusinessDate());
  const [isSavingRec, setIsSavingRec] = useState(false);

  const today = new Date();
  const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  const currentMonthExpensesByCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    CATEGORIES.forEach(cat => { totals[cat.id] = 0; });
    
    expenses.forEach(exp => {
      if (exp.date && exp.date.startsWith(currentMonthStr)) {
        const catId = exp.categoryId;
        if (totals[catId] !== undefined) {
          totals[catId] += exp.amount;
        } else {
          totals['khac'] += exp.amount;
        }
      }
    });
    return totals;
  }, [expenses, currentMonthStr]);

  // Subscriptions & Recurring Metrics (Priority 8)
  const monthlyRecurringTotal = useMemo(() => totalMonthlyRecurring(recurringExpenses), [recurringExpenses]);

  const recurringIncomeRatio = income > 0 ? formatPercent((monthlyRecurringTotal / income) * 100) : '';

  const templatesInfo = {
    none: {
      name: 'Không dùng mẫu',
      desc: 'Tùy biến tự do tài chính của bạn không theo khuôn mẫu.',
      allocations: []
    },
    '50_30_20': {
      name: 'Quy tắc 50-30-20',
      desc: 'Phương pháp phân bổ thu nhập phổ biến nhất thế giới.',
      allocations: [
        { name: 'Thiết yếu (Needs)', pct: 50, desc: 'Ăn uống, Di chuyển, Hóa đơn, Sức khỏe' },
        { name: 'Linh hoạt (Wants)', pct: 30, desc: 'Mua sắm, Giải trí, Khác' },
        { name: 'Tích lũy & Mục tiêu', pct: 20, desc: 'Tiết kiệm, Đầu tư, Đạt mục tiêu' }
      ]
    },
    '6_jars': {
      name: '6 chiếc lọ tài chính (Jars)',
      desc: 'Quản lý tiền chi tiết theo công thức của T. Harv Eker.',
      allocations: [
        { name: 'Nhu cầu thiết yếu (NEC)', pct: 55, desc: 'Chi tiêu sinh hoạt hằng ngày' },
        { name: 'Tiết kiệm dài hạn (LTSS)', pct: 10, desc: 'Mua sắm lớn, tương lai' },
        { name: 'Giáo dục (EDU)', pct: 10, desc: 'Phát triển bản thân, học tập' },
        { name: 'Hưởng thụ (PLAY)', pct: 10, desc: 'Giải trí, nuông chiều bản thân' },
        { name: 'Tự do tài chính (FFA)', pct: 10, desc: 'Đầu tư sinh lời' },
        { name: 'Từ thiện / Cho đi (GIVE)', pct: 5, desc: 'Quà tặng, giúp đỡ người khác' }
      ]
    },
    '10_20_70': {
      name: 'Mẫu 10-20-70',
      desc: 'Thích hợp cho người muốn tập trung tích lũy mạnh mẽ.',
      allocations: [
        { name: 'Sinh hoạt phí thiết yếu', pct: 70, desc: 'Chi trả mọi hoạt động cơ bản' },
        { name: 'Tích lũy & Trả nợ', pct: 20, desc: 'Tiết kiệm dài hạn, trả nợ' },
        { name: 'Hưởng thụ cá nhân', pct: 10, desc: 'Mua sắm, xem phim, giải trí' }
      ]
    }
  };

  // Chạy một thao tác lưu; lỗi API được hiện nguyên, chỉ báo thành công khi lưu được
  const runAction = async (action: () => void | Promise<unknown>, fallback: string): Promise<boolean> => {
    try {
      await action();
      return true;
    } catch (err) {
      showToast(getApiErrorMessage(err, fallback), 'error');
      return false;
    }
  };

  const handleSaveLimit = async (categoryId: string) => {
    // Bỏ trống là bỏ hạn mức; gõ sai thì phải báo, không được tự đổi thành số khác
    const clearing = tempLimit.raw.trim() === '';
    const invalid = clearing ? null : moneyDraftError(tempLimit, 'nonNegative');
    if (invalid) {
      showToast(invalid, 'warning');
      return;
    }
    const saved = await runAction(
      () => onUpdateCategoryLimit(categoryId, clearing ? 0 : tempLimit.value!),
      'Không thể lưu hạn mức chi tiêu.'
    );
    if (!saved) return;
    setEditingLimitCategoryId(null);
    setTempLimit(EMPTY_MONEY);
    showToast(clearing ? 'Đã bỏ hạn mức chi tiêu.' : 'Đã cập nhật hạn mức chi tiêu!', clearing ? 'info' : 'success');
  };

  const handleAddRecurringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(recDay, 10);

    if (recAmount === null || recAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ.', 'warning');
      return;
    }
    if (recFrequency === 'monthly' && (isNaN(day) || day < 1 || day > 31)) {
      showToast('Vui lòng nhập ngày từ 1 đến 31.', 'warning');
      return;
    }
    if (!recStartDate) {
      showToast('Vui lòng chọn ngày bắt đầu.', 'warning');
      return;
    }

    setIsSavingRec(true);
    const saved = await runAction(
      () =>
        onAddRecurringExpense({
          amount: recAmount,
          categoryId: recCategory,
          dayOfMonth: recFrequency === 'monthly' ? day : Number(recStartDate.slice(8, 10)),
          note: recNote.trim() || 'Đăng ký định kỳ',
          frequency: recFrequency,
          startDate: recStartDate,
          isActive: true,
        }),
      'Không thể lưu dịch vụ định kỳ.'
    );
    setIsSavingRec(false);
    if (!saved) return;

    setRecAmount(null);
    setRecNote('');
  };

  return (
    <div className="space-y-6 pb-12">
      {/* SECTION 1: Subscriptions & Recurring Expense Dashboard (Priority 8 Upgrade) */}
      <div className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 border border-emerald-800/80 shadow-xl text-emerald-50">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard size={20} className="text-amber-400" />
              <h3 className="text-xl font-serif font-bold text-amber-100">
                Quản lý Đăng ký & Chi phí Cố định (Subscriptions)
              </h3>
            </div>
            <p className="text-xs text-emerald-200/90">
              Tự động hóa các khoản chi định kỳ, dự báo ngày thanh toán tiếp theo và kiểm soát tỷ trọng hóa đơn.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-right">
            <div className="bg-emerald-900/60 border border-emerald-700/60 p-3 rounded-xl">
              <p className="text-[10px] font-mono text-emerald-300 uppercase">Tổng chi cố định/tháng</p>
              <p className="text-lg font-mono font-bold text-amber-300 whitespace-nowrap">{formatCurrency(monthlyRecurringTotal)}</p>
            </div>
            <div className="bg-emerald-900/60 border border-emerald-700/60 p-3 rounded-xl">
              <p className="text-[10px] font-mono text-emerald-300 uppercase">Tỷ trọng/Thu nhập</p>
              <p className="text-lg font-mono font-bold text-emerald-300">{income > 0 ? recurringIncomeRatio : 'Chưa đánh giá'}</p>
            </div>
          </div>
        </div>

        {/* Subscriptions Grid & Form */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          {/* Form */}
          <form onSubmit={handleAddRecurringSubmit} className="lg:col-span-5 bg-emerald-900/40 border border-emerald-800/80 p-4 rounded-xl space-y-3">
            <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
              <Plus size={14} />
              <span>Thêm hóa đơn / Dịch vụ định kỳ</span>
            </h4>

            <div>
              <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Số tiền (VNĐ)</label>
              <MoneyInput
                required
                aria-label="Số tiền định kỳ"
                value={recAmount}
                onChange={(value) => setRecAmount(value)}
                placeholder="VD: 220.000 (Netflix, Spotify...)"
                className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs text-amber-300 font-mono font-bold focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Tên dịch vụ / Ghi chú</label>
              <input
                type="text"
                required
                value={recNote}
                onChange={(e) => setRecNote(e.target.value)}
                placeholder="VD: Tiền nhà, Internet FPT, iCloud..."
                className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs text-emerald-100 focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Chu kỳ gia hạn</label>
                <select
                  value={recFrequency}
                  onChange={(e) => setRecFrequency(e.target.value as any)}
                  className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-2.5 py-2 text-xs text-emerald-100 focus:outline-none"
                >
                  <option value="monthly">Hàng tháng</option>
                  <option value="yearly">Hàng năm</option>
                  <option value="weekly">Hàng tuần</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Ngày bắt đầu</label>
                <input
                  type="date"
                  required
                  aria-label="Ngày bắt đầu"
                  value={recStartDate}
                  onChange={(e) => setRecStartDate(e.target.value)}
                  className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs font-mono text-emerald-100 focus:outline-none"
                />
              </div>
            </div>

            {recFrequency === 'monthly' ? (
              <div>
                <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Ngày gia hạn (1-31)</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={recDay}
                  onChange={(e) => setRecDay(e.target.value)}
                  className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs font-mono text-emerald-100 focus:outline-none"
                />
              </div>
            ) : (
              <p className="text-[11px] text-emerald-300/80">Lặp lại theo ngày bắt đầu.</p>
            )}

            <div>
              <label className="block text-[11px] font-mono uppercase text-emerald-300 mb-1">Danh mục</label>
              <select
                value={recCategory}
                onChange={(e) => setRecCategory(e.target.value)}
                className="w-full bg-emerald-950/80 border border-emerald-700/80 rounded-xl px-3 py-2 text-xs text-emerald-100 focus:outline-none"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={isSavingRec}
              className="w-full py-2.5 rounded-xl disabled:opacity-60 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs shadow-md transition-all"
            >
              Lưu dịch vụ định kỳ
            </button>
          </form>

          {/* List */}
          <div className="lg:col-span-7 bg-emerald-900/40 border border-emerald-800/80 p-4 rounded-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-800/60">
              <h4 className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold flex items-center gap-1.5">
                <Clock size={14} />
                <span>Danh sách đăng ký ({recurringExpenses.length})</span>
              </h4>
              <button
                onClick={() => runAction(onTriggerManualRecurringSync, 'Lỗi đồng bộ chi tiêu định kỳ')}
                className="text-[11px] text-amber-300 hover:text-amber-200 bg-emerald-900/80 hover:bg-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-700/60 flex items-center gap-1 transition"
              >
                <RefreshCw size={11} />
                <span>Ghi khoản đến hạn</span>
              </button>
            </div>

            {recurringExpenses.length > 0 ? (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {recurringExpenses.map((item) => {
                  const cat = CATEGORIES.find((c) => c.id === item.categoryId) || CATEGORIES[CATEGORIES.length - 1];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-2.5 bg-emerald-950/60 border border-emerald-800/60 rounded-xl text-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="text-[10px] font-mono text-amber-300 bg-emerald-900/80 px-2 py-0.5 rounded border border-emerald-700/60 shrink-0">
                          {item.isActive === false
                            ? 'Tạm dừng'
                            : `Kỳ tới ${formatBusinessDate(displayNextDue(item, getBusinessDate()), 'DD/MM/YYYY')}`}
                        </span>
                        <div className="min-w-0">
                          <p className="font-bold text-emerald-100 truncate">{item.note}</p>
                          <p className="text-[10px] text-emerald-300/80">{cat.name}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono font-bold text-amber-300">
                          {formatCurrency(item.amount)}
                        </span>
                        <button
                          onClick={() =>
                            runAction(() => onDeleteRecurringExpense(item.id), 'Không thể xóa dịch vụ định kỳ.')
                          }
                          className="p-1 text-emerald-400 hover:text-red-400 hover:bg-white/10 rounded transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-emerald-300/60 italic">
                Chưa có dịch vụ hoặc hóa đơn định kỳ nào.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 2: Phân bổ ngân sách theo công thức */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-5 rounded-2xl shadow-md">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          2. Chọn mẫu phân bổ ngân sách
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Phân chia thu nhập hằng tháng của bạn thành các quỹ chuyên biệt để cân bằng tài chính.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {(Object.keys(templatesInfo) as Array<keyof typeof templatesInfo>).map((key) => {
            const isSelected = budgetTemplate === key;
            return (
              <button
                key={key}
                onClick={async () => {
                  if (await runAction(() => onUpdateTemplate(key), 'Không thể áp dụng mẫu ngân sách.')) {
                    showToast(`Đã áp dụng mẫu ngân sách: ${templatesInfo[key].name}`, 'success');
                  }
                }}
                className={`p-3.5 rounded-xl border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-900 text-white border-emerald-950 shadow-sm'
                    : 'bg-white text-stone-700 border-[#E6DEC9] hover:border-emerald-700/50'
                }`}
              >
                <div>
                  <h4 className="font-serif text-sm font-bold leading-tight">{templatesInfo[key].name}</h4>
                  <p className={`text-[11px] mt-1 leading-normal ${isSelected ? 'text-emerald-100' : 'text-stone-400'}`}>
                    {templatesInfo[key].desc}
                  </p>
                </div>
                {isSelected && (
                  <span className="mt-3 text-[10px] uppercase font-bold text-amber-400 tracking-wider flex items-center gap-0.5">
                    <Check size={12} /> Đang chọn
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {budgetTemplate !== 'none' && (
          <div className="border border-[#E6DEC9] bg-[#FAF9F6] p-4 rounded-xl space-y-4">
            <h4 className="font-serif text-sm font-bold text-emerald-950 border-b border-[#E6DEC9] pb-2 flex justify-between items-center">
              <span>CHI TIẾT PHÂN BỔ ({income > 0 ? `Dựa trên thu nhập ${formatCurrency(income)}` : 'Chưa nhập thu nhập'})</span>
            </h4>

            {income <= 0 ? (
              <div className="text-stone-500 text-xs py-2">
                ⚠️ Vui lòng cập nhật Thu nhập hằng tháng lớn hơn 0 ở trang Tổng quan.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templatesInfo[budgetTemplate].allocations.map((alloc, idx) => {
                  const allocAmount = (income * alloc.pct) / 100;
                  return (
                    <div key={idx} className="bg-white border border-stone-200/60 p-3.5 rounded-xl flex flex-col justify-between shadow-2xs">
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-serif font-bold text-stone-800 text-sm">{alloc.name}</span>
                          <span className="font-mono font-bold text-emerald-900 text-xs px-2 py-0.5 bg-emerald-50 rounded-md">
                            {alloc.pct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mb-3">{alloc.desc}</p>
                      </div>
                      <div className="border-t border-dashed border-stone-200 pt-2">
                        <span className="text-[10px] text-stone-400 font-sans block uppercase font-bold tracking-wider">HẠN MỨC KHUYẾN NGHỊ</span>
                        <span className="font-mono font-black text-base text-emerald-950">
                          {formatCurrency(allocAmount)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* SECTION 3: Category Spending Limits */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-5 rounded-2xl shadow-md">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          3. Hạn mức chi tiêu danh mục tháng {today.getMonth() + 1}/{today.getFullYear()}
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Cảnh báo khi chi tiêu vượt hạn mức quy định của từng danh mục.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map((cat) => {
            const actual = currentMonthExpensesByCategory[cat.id] || 0;
            const limit = categoryLimits[cat.id] || 0;
            const isExceeded = limit > 0 && actual > limit;
            const realPercent = limit > 0 ? (actual / limit) * 100 : 0;
            const barPercent = Math.min(100, Math.max(0, realPercent));

            return (
              <div key={cat.id} className="border border-[#E6DEC9] bg-white p-3.5 rounded-xl space-y-2 shadow-2xs">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className="p-1.5 rounded-full shrink-0 flex items-center justify-center bg-stone-50 border border-stone-100"
                      style={{ color: cat.color }}
                    >
                      <CategoryIcon name={cat.iconName} size={14} />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800 leading-tight">{cat.name}</h4>
                      <span className="text-[10px] text-stone-400 font-sans block">
                        Đã chi: <strong className="font-mono text-stone-700">{formatCurrency(actual)}</strong>
                      </span>
                    </div>
                  </div>

                  {editingLimitCategoryId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <MoneyInput
                        value={tempLimit.value}
                        onChange={(value, raw) => setTempLimit({ value, raw })}
                        aria-label={`Hạn mức cho ${cat.name}`}
                        placeholder="Không hạn mức"
                        className="w-28 bg-stone-50 border border-stone-300 rounded-lg px-2.5 py-1 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-700"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLimit(cat.id)}
                        aria-label="Lưu hạn mức"
                        className="p-1.5 bg-emerald-900 text-white rounded-lg hover:bg-emerald-850"
                      >
                        <Check size={14} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingLimitCategoryId(cat.id);
                        setTempLimit(limit > 0 ? moneyDraft(limit) : EMPTY_MONEY);
                      }}
                      className="text-[10px] text-emerald-800 hover:text-emerald-900 border border-emerald-100 hover:border-emerald-300 bg-emerald-50 px-2 py-0.5 rounded-md font-medium"
                    >
                      {limit > 0 ? `Hạn mức: ${formatCurrency(limit)}` : 'Đặt hạn mức'}
                    </button>
                  )}
                </div>

                {limit > 0 ? (
                  <div className="space-y-1">
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${isExceeded ? 'bg-red-700' : 'bg-emerald-800'}`}
                        style={{ width: `${barPercent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-mono text-stone-400">{formatPercent(realPercent, 0)} đã dùng</span>
                      {isExceeded && (
                        <span className="text-red-700 font-bold flex items-center gap-0.5">
                          <AlertTriangle size={10} /> Vượt {formatCurrency(actual - limit)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400 italic">Chưa thiết lập hạn mức.</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
