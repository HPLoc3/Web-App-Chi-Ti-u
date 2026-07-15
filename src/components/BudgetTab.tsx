import React, { useState, useMemo } from 'react';
import { AppState, RecurringExpense, Expense } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency } from '../utils/format';
import { CategoryIcon } from './ExpensesTab';
import { 
  Plus, 
  Trash2, 
  ShieldAlert, 
  PieChart, 
  Settings, 
  Sliders, 
  Calendar, 
  Check, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Clock
} from 'lucide-react';

interface BudgetTabProps {
  expenses: Expense[];
  income: number;
  budgetTemplate: AppState['budgetTemplate'];
  categoryLimits: Record<string, number>;
  recurringExpenses: RecurringExpense[];
  onUpdateTemplate: (template: AppState['budgetTemplate']) => void;
  onUpdateCategoryLimit: (categoryId: string, limit: number) => void;
  onAddRecurringExpense: (item: Omit<RecurringExpense, 'id'>) => void;
  onDeleteRecurringExpense: (id: string) => void;
  onTriggerManualRecurringSync: () => void;
}

export default function BudgetTab({
  expenses,
  income,
  budgetTemplate,
  categoryLimits,
  recurringExpenses,
  onUpdateTemplate,
  onUpdateCategoryLimit,
  onAddRecurringExpense,
  onDeleteRecurringExpense,
  onTriggerManualRecurringSync
}: BudgetTabProps) {
  // Local state for limit editing
  const [editingLimitCategoryId, setEditingLimitCategoryId] = useState<string | null>(null);
  const [tempLimitVal, setTempLimitVal] = useState('');

  // Local state for adding recurring expense
  const [recAmount, setRecAmount] = useState('');
  const [recCategory, setRecCategory] = useState(CATEGORIES[0].id);
  const [recDay, setRecDay] = useState('1');
  const [recNote, setRecNote] = useState('');

  // Calculate current month's expenses per category
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

  // Handle template allocation calculations
  const templatesInfo = {
    none: {
      name: 'Không dùng mẫu',
      desc: 'Tùy biến tự do tài chính của bạn không theo khuôn mẫu.',
      allocations: [] as { name: string; pct: number; desc: string; categories: string[] }[]
    },
    '50_30_20': {
      name: 'Quy tắc 50-30-20',
      desc: 'Phương pháp phân bổ thu nhập phổ biến nhất thế giới.',
      allocations: [
        { name: 'Thiết yếu (Needs)', pct: 50, desc: 'Ăn uống, Di chuyển, Hóa đơn, Sức khỏe', categories: ['an_uong', 'di_chuyen', 'hoa_don', 'suc_khoe'] },
        { name: 'Linh hoạt (Wants)', pct: 30, desc: 'Mua sắm, Giải trí, Khác', categories: ['mua_sam', 'giai_tri', 'khac'] },
        { name: 'Tích lũy & Mục tiêu', pct: 20, desc: 'Tiết kiệm, Đầu tư, Đạt các mục tiêu tài chính', categories: ['giao_duc'] }
      ]
    },
    '6_jars': {
      name: '6 chiếc lọ tài chính (Jars)',
      desc: 'Quản lý tiền chi tiết theo công thức của T. Harv Eker.',
      allocations: [
        { name: 'Nhu cầu thiết yếu (NEC)', pct: 55, desc: 'Chi tiêu sinh hoạt hằng ngày', categories: ['an_uong', 'di_chuyen', 'hoa_don', 'suc_khoe'] },
        { name: 'Tiết kiệm dài hạn (LTSS)', pct: 10, desc: 'Mua sắm lớn, tích lũy tương lai', categories: [] },
        { name: 'Giáo dục (EDU)', pct: 10, desc: 'Phát triển bản thân, học tập', categories: ['giao_duc'] },
        { name: 'Hưởng thụ (PLAY)', pct: 10, desc: 'Giải trí, nuông chiều bản thân', categories: ['giai_tri', 'mua_sam'] },
        { name: 'Tự do tài chính (FFA)', pct: 10, desc: 'Đầu tư sinh lời, tạo thụ động', categories: [] },
        { name: 'Từ thiện / Cho đi (GIVE)', pct: 5, desc: 'Quà tặng, giúp đỡ người khác', categories: ['khac'] }
      ]
    },
    '10_20_70': {
      name: 'Mẫu 10-20-70',
      desc: 'Thích hợp cho người muốn tập trung tích lũy mạnh mẽ.',
      allocations: [
        { name: 'Sinh hoạt phí thiết yếu', pct: 70, desc: 'Chi trả mọi hoạt động cơ bản', categories: ['an_uong', 'di_chuyen', 'hoa_don', 'suc_khoe', 'khac'] },
        { name: 'Tích lũy & Trả nợ', pct: 20, desc: 'Tiết kiệm dài hạn, trả nợ', categories: [] },
        { name: 'Hưởng thụ cá nhân', pct: 10, desc: 'Mua sắm, xem phim, giải trí', categories: ['mua_sam', 'giai_tri'] }
      ]
    }
  };

  const handleSaveLimit = (categoryId: string) => {
    const parsed = parseFloat(tempLimitVal.replace(/[.,\s]/g, ''));
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateCategoryLimit(categoryId, parsed);
      setEditingLimitCategoryId(null);
      setTempLimitVal('');
    } else if (tempLimitVal === '') {
      onUpdateCategoryLimit(categoryId, 0); // Remove limit
      setEditingLimitCategoryId(null);
    }
  };

  const handleAddRecurringSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(recAmount.replace(/[.,\s]/g, ''));
    const day = parseInt(recDay, 10);

    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ.');
      return;
    }
    if (isNaN(day) || day < 1 || day > 31) {
      alert('Vui lòng nhập ngày từ 1 đến 31.');
      return;
    }

    onAddRecurringExpense({
      amount: numericAmount,
      categoryId: recCategory,
      dayOfMonth: day,
      note: recNote.trim() || 'Hóa đơn định kỳ'
    });

    setRecAmount('');
    setRecNote('');
  };

  return (
    <div className="space-y-6">
      
      {/* SECTION 1: Chọn mẫu phân bổ ngân sách */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          1. Phân bổ ngân sách theo công thức
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Phân chia thu nhập hằng tháng của bạn thành các quỹ chuyên biệt để cân bằng cuộc sống.
        </p>

        {/* Template selector cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
          {(Object.keys(templatesInfo) as Array<keyof typeof templatesInfo>).map(key => {
            const isSelected = budgetTemplate === key;
            return (
              <button
                key={key}
                onClick={() => onUpdateTemplate(key)}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-900 text-white border-emerald-950' 
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

        {/* Allocation breakdown list */}
        {budgetTemplate !== 'none' && (
          <div className="border border-[#E6DEC9] bg-[#FAF9F6] p-4 rounded-lg space-y-4">
            <h4 className="font-serif text-sm font-bold text-emerald-950 border-b border-[#E6DEC9] pb-2 flex justify-between items-center">
              <span>BẢNG CHI TIẾT PHÂN BỔ (Dựa trên thu nhập {formatCurrency(income)})</span>
              <span className="text-xs text-stone-400 font-sans font-normal italic">Cập nhật theo thu nhập ở trang Tổng quan</span>
            </h4>

            {income === 0 ? (
              <div className="text-stone-500 text-xs py-2">
                ⚠️ Vui lòng cập nhật <strong>Thu nhập hằng tháng</strong> lớn hơn 0 ở tab Tổng quan để xem số tiền chi tiết.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {templatesInfo[budgetTemplate].allocations.map((alloc, idx) => {
                  const allocAmount = (income * alloc.pct) / 100;
                  return (
                    <div key={idx} className="bg-white border border-stone-200/60 p-3 rounded-lg flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="font-serif font-bold text-stone-800 text-sm">{alloc.name}</span>
                          <span className="font-mono font-bold text-emerald-900 text-xs px-1.5 py-0.5 bg-emerald-50 rounded">
                            {alloc.pct}%
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mb-3">{alloc.desc}</p>
                      </div>
                      <div className="border-t border-dashed border-stone-100 pt-2">
                        <span className="text-[10px] text-stone-400 font-sans block uppercase font-bold tracking-wider">HẠN MỨC GỢI Ý</span>
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

      {/* SECTION 2: Hạn mức chi tiêu danh mục */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          2. Hạn mức chi tiêu tháng {today.getMonth() + 1}/{today.getFullYear()}
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Đặt hạn mức cụ thể cho mỗi danh mục. Thanh tiến độ sẽ chuyển <strong className="text-red-700">màu đỏ</strong> khi bạn tiêu vượt mức.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {CATEGORIES.map(cat => {
            const actual = currentMonthExpensesByCategory[cat.id] || 0;
            const limit = categoryLimits[cat.id] || 0;
            const isExceeded = limit > 0 && actual > limit;
            const isClose = limit > 0 && actual >= limit * 0.9 && actual <= limit; // 90% or more
            const percent = limit > 0 ? Math.min(100, (actual / limit) * 100) : 0;

            return (
              <div key={cat.id} className="border border-[#E6DEC9] bg-white p-3.5 rounded-lg space-y-2">
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

                  {/* Limit Action setting */}
                  {editingLimitCategoryId === cat.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={tempLimitVal}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/[^\d]/g, '');
                          if (digits) {
                            setTempLimitVal(parseInt(digits, 10).toLocaleString('vi-VN'));
                          } else {
                            setTempLimitVal('');
                          }
                        }}
                        placeholder="Không hạn mức"
                        className="w-24 bg-stone-50 border border-stone-300 rounded px-1.5 py-0.5 text-xs font-mono text-stone-800 focus:outline-none focus:border-emerald-700"
                        autoFocus
                      />
                      <button
                        onClick={() => handleSaveLimit(cat.id)}
                        className="p-1 bg-emerald-900 text-white rounded hover:bg-emerald-850 cursor-pointer"
                        title="Lưu"
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingLimitCategoryId(cat.id);
                        setTempLimitVal(limit > 0 ? limit.toLocaleString('vi-VN') : '');
                      }}
                      className="text-[10px] text-emerald-800 hover:text-emerald-900 border border-emerald-100 hover:border-emerald-300 bg-emerald-50/50 px-2 py-0.5 rounded cursor-pointer transition font-medium"
                    >
                      {limit > 0 ? `Hạn mức: ${formatCurrency(limit)}` : 'Đặt hạn mức'}
                    </button>
                  )}
                </div>

                {/* Progress Bar with alerts */}
                {limit > 0 ? (
                  <div className="space-y-1">
                    <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden border border-stone-200">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${isExceeded ? 'bg-red-700' : isClose ? 'bg-amber-500' : 'bg-emerald-800'}`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-mono text-stone-400">
                        {percent.toFixed(0)}% đã dùng
                      </span>
                      {isExceeded ? (
                        <span className="text-red-700 font-bold flex items-center gap-0.5">
                          <AlertTriangle size={10} /> Vượt {formatCurrency(actual - limit)}
                        </span>
                      ) : isClose ? (
                        <span className="text-amber-600 font-bold flex items-center gap-0.5">
                          ⚠️ Sắp chạm hạn mức
                        </span>
                      ) : (
                        <span className="text-stone-400">
                          Còn lại: {formatCurrency(limit - actual)}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-[10px] text-stone-400 font-sans italic pt-1">
                    Chưa thiết lập hạn mức chi tiêu.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 3: Quản lý chi tiêu định kỳ */}
      <div className="bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-1 flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          3. Chi tiêu cố định hằng tháng (Định kỳ)
        </h3>
        <p className="text-xs text-stone-500 mb-4">
          Các khoản chi cố định (ví dụ: tiền nhà, internet, trả góp...). Hệ thống sẽ tự động tạo giao dịch tương ứng vào sổ tay vào đầu mỗi tháng.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recurring Form */}
          <form onSubmit={handleAddRecurringSubmit} className="lg:col-span-5 bg-white border border-[#E6DEC9] p-4 rounded-lg space-y-3.5">
            <h4 className="font-serif text-sm font-bold text-stone-800 border-b border-stone-100 pb-1.5 flex items-center gap-1">
              <Plus size={14} className="text-emerald-900" /> Thêm khoản định kỳ mới
            </h4>

            {/* Amount */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-500 mb-1">SỐ TIỀN *</label>
              <input
                type="text"
                required
                value={recAmount}
                onChange={(e) => {
                  const digits = e.target.value.replace(/[^\d]/g, '');
                  if (digits) {
                    setRecAmount(parseInt(digits, 10).toLocaleString('vi-VN'));
                  } else {
                    setRecAmount('');
                  }
                }}
                placeholder="Ví dụ: 3.500.000"
                className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-700"
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-[10px] font-semibold text-stone-500 mb-1">GHI CHÚ / TÊN KHOẢN CHI *</label>
              <input
                type="text"
                required
                value={recNote}
                onChange={(e) => setRecNote(e.target.value)}
                placeholder="Ví dụ: Tiền phòng trọ, hóa đơn điện sinh hoạt..."
                className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Category */}
              <div>
                <label className="block text-[10px] font-semibold text-stone-500 mb-1">DANH MỤC</label>
                <select
                  value={recCategory}
                  onChange={(e) => setRecCategory(e.target.value)}
                  className="w-full bg-white border border-[#E6DEC9] rounded px-2.5 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              {/* Day of Month */}
              <div>
                <label className="block text-[10px] font-semibold text-stone-500 mb-1">NGÀY TRONG THÁNG (1-31) *</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  required
                  value={recDay}
                  onChange={(e) => setRecDay(e.target.value)}
                  className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-emerald-700"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-900 hover:bg-emerald-850 text-white py-2 px-3 rounded text-xs font-semibold cursor-pointer transition shadow-sm"
            >
              Lưu thiết lập định kỳ
            </button>
          </form>

          {/* Recurring List */}
          <div className="lg:col-span-7 bg-white border border-[#E6DEC9] p-4 rounded-lg space-y-3">
            <div className="flex justify-between items-center border-b border-stone-100 pb-1.5">
              <h4 className="font-serif text-sm font-bold text-stone-800 flex items-center gap-1">
                <Clock size={14} className="text-emerald-900" /> Danh sách chi tiêu định kỳ
              </h4>
              <button
                onClick={onTriggerManualRecurringSync}
                className="text-[10px] text-emerald-800 hover:text-emerald-950 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 rounded border border-emerald-200/50 flex items-center gap-1 cursor-pointer transition font-bold"
                title="Đồng bộ cho tháng này"
              >
                <RefreshCw size={10} /> Đồng bộ tháng này
              </button>
            </div>

            {recurringExpenses.length > 0 ? (
              <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                {recurringExpenses.map(item => {
                  const cat = CATEGORIES.find(c => c.id === item.categoryId) || CATEGORIES[CATEGORIES.length - 1];
                  return (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-2 bg-stone-50 border border-stone-200/50 rounded hover:border-[#E6DEC9] transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-stone-400 font-mono text-[10px] bg-white border border-stone-200 rounded px-1.5 py-0.5 shrink-0">
                          Ngày {item.dayOfMonth}
                        </span>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-stone-800 block truncate">{item.note}</span>
                          <span className="text-[10px] text-stone-400 font-sans block">{cat.name}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-mono text-xs font-bold text-stone-800">
                          {formatCurrency(item.amount)}
                        </span>
                        <button
                          onClick={() => onDeleteRecurringExpense(item.id)}
                          className="p-1 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded cursor-pointer transition"
                          title="Xóa thiết lập định kỳ"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-stone-400 text-xs italic">
                Chưa có chi tiêu định kỳ nào được thiết lập.
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
