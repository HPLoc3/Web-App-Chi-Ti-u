import React, { useState, useMemo } from 'react';
import { Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { formatCurrency, formatDateVietnamese } from '../../../utils/format';
import { getBusinessDate } from '../../../utils/dateParser';
import { useToast } from '../../../context/ToastContext';
import { EditExpenseModal } from './EditExpenseModal';
import { ImportStatementModal } from './ImportStatementModal';
import { ConfirmModal } from '../../../components/common/ConfirmModal';
import { 
  Plus, 
  Trash2, 
  Download, 
  Search,
  HelpCircle,
  Utensils,
  Car,
  ShoppingBag,
  Gamepad2,
  Receipt,
  HeartPulse,
  GraduationCap,
  Edit2,
  FileSpreadsheet,
  CheckSquare,
  Square,
  ArrowUpDown
} from 'lucide-react';

export function CategoryIcon({ name, size = 16, className = '' }: { name: string, size?: number, className?: string }) {
  switch (name) {
    case 'Utensils': return <Utensils size={size} className={className} />;
    case 'Car': return <Car size={size} className={className} />;
    case 'ShoppingBag': return <ShoppingBag size={size} className={className} />;
    case 'Gamepad2': return <Gamepad2 size={size} className={className} />;
    case 'Receipt': return <Receipt size={size} className={className} />;
    case 'HeartPulse': return <HeartPulse size={size} className={className} />;
    case 'GraduationCap': return <GraduationCap size={size} className={className} />;
    default: return <HelpCircle size={size} className={className} />;
  }
}

interface ExpensesTabProps {
  expenses: Expense[];
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<any> | void;
  onUpdateExpense?: (expense: Expense) => Promise<any> | void;
  onDeleteExpense: (id: string) => Promise<any> | void;
}

export default function ExpensesTab({
  expenses,
  onAddExpense,
  onUpdateExpense,
  onDeleteExpense
}: ExpensesTabProps) {
  const { showToast } = useToast();

  // Form states
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(getBusinessDate());
  const [note, setNote] = useState('');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Bulk Selection & Modals
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isBulkDeleteConfirmOpen, setIsBulkDeleteConfirmOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'form' | 'list'>('list');

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/[.,\s]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      showToast('Vui lòng nhập số tiền hợp lệ lớn hơn 0.', 'warning');
      return;
    }

    const newExpense = {
      amount: numericAmount,
      categoryId,
      date,
      note: note.trim() || CATEGORIES.find(c => c.id === categoryId)?.name || 'Khác'
    };

    try {
      await onAddExpense(newExpense);
      setAmount('');
      setNote('');
      setMobileTab('list');
    } catch (err: any) {
      showToast(err?.response?.data?.message || err?.message || 'Không thể lưu giao dịch. Vui lòng thử lại.', 'error');
    }
  };

  const handleSingleDelete = async (expense: Expense) => {
    try {
      await onDeleteExpense(expense.id);
      showToast(
        `Đã xóa giao dịch "${expense.note}"`,
        'info',
        'Hoàn tác',
        () => {
          onAddExpense({
            amount: expense.amount,
            categoryId: expense.categoryId,
            note: expense.note,
            date: expense.date,
          });
        }
      );
    } catch (err: any) {
      showToast(err?.message || 'Lỗi xóa chi tiêu', 'error');
    }
  };

  const handleBulkDelete = async () => {
    try {
      for (const id of selectedIds) {
        await onDeleteExpense(id);
      }
      showToast(`Đã xóa thành công ${selectedIds.length} giao dịch!`, 'success');
      setSelectedIds([]);
      setIsBulkDeleteConfirmOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Lỗi xóa nhiều giao dịch', 'error');
    }
  };

  const handleImportSuccess = async (importedExpenses: Omit<Expense, 'id'>[]) => {
    try {
      for (const item of importedExpenses) {
        await onAddExpense(item);
      }
      showToast(`Đã nhập thành công ${importedExpenses.length} giao dịch từ sao kê!`, 'success');
    } catch (err: any) {
      showToast(err?.message || 'Lỗi nhập giao dịch', 'error');
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map((e) => e.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Filtered & Sorted List
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      const matchSearch = exp.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCatFilter === 'all' || exp.categoryId === selectedCatFilter;
      const matchStartDate = !startDate || exp.date >= startDate;
      const matchEndDate = !endDate || exp.date <= endDate;
      const matchMinAmount = !minAmount || exp.amount >= parseFloat(minAmount);
      const matchMaxAmount = !maxAmount || exp.amount <= parseFloat(maxAmount);

      return matchSearch && matchCat && matchStartDate && matchEndDate && matchMinAmount && matchMaxAmount;
    }).sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });
  }, [expenses, searchTerm, selectedCatFilter, startDate, endDate, minAmount, maxAmount, sortBy]);

  // Grouping for Display
  const groupedExpenses = useMemo(() => {
    const groups: { [date: string]: Expense[] } = {};
    filteredExpenses.forEach((exp) => {
      if (!groups[exp.date]) groups[exp.date] = [];
      groups[exp.date].push(exp);
    });

    return Object.entries(groups).map(([dateStr, items]) => ({
      dateStr,
      items,
      dayTotal: items.reduce((sum, item) => sum + item.amount, 0),
    }));
  }, [filteredExpenses]);

  // Export CSV
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      showToast('Chưa có giao dịch nào để xuất file.', 'warning');
      return;
    }

    const headers = ['Ngày', 'Danh mục', 'Số tiền (₫)', 'Ghi chú'];
    const rows = expenses
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((exp) => {
        const cat = CATEGORIES.find((c) => c.id === exp.categoryId)?.name || 'Khác';
        return [exp.date, cat, exp.amount, `"${(exp.note || '').replace(/"/g, '""')}"`];
      });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `So_tay_Chi_tieu_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Đã tải xuống file CSV sổ chi tiêu!', 'success');
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Tablet / Mobile View Switcher (< 1024px) */}
      <div className="lg:hidden flex items-center bg-[#FCFAF4] border border-[#E6DEC9] p-1 rounded-xl">
        <button
          type="button"
          onClick={() => setMobileTab('form')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'form'
              ? 'bg-emerald-950 text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-emerald-950'
          }`}
        >
          <Plus size={14} />
          <span>Nhập khoản chi</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('list')}
          className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
            mobileTab === 'list'
              ? 'bg-emerald-950 text-amber-300 shadow-xs'
              : 'text-stone-600 hover:text-emerald-950'
          }`}
        >
          <Receipt size={14} />
          <span>Sổ giao dịch ({filteredExpenses.length})</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Manual Add Form */}
        <div className={`lg:col-span-5 bg-[#FAF7F0] border border-[#E6DEC9] p-5 rounded-2xl shadow-md ${
          mobileTab === 'form' ? 'block' : 'hidden lg:block'
        }`}>
          <h3 className="font-serif text-lg font-bold text-emerald-950 mb-3 pb-2 border-b border-[#E6DEC9] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
              <span>Thêm khoản chi thủ công</span>
            </div>
            <button
              onClick={() => setIsImportModalOpen(true)}
              className="flex items-center gap-1 text-xs font-sans font-semibold text-amber-700 hover:text-amber-800 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
            >
              <FileSpreadsheet size={13} />
              <span>Nhập sao kê</span>
            </button>
          </h3>

          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN (₫) *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^\d]/g, '');
                    setAmount(raw ? parseInt(raw, 10).toLocaleString('vi-VN') : '');
                  }}
                  placeholder="Ví dụ: 50.000"
                  className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-3 pr-10 py-2.5 text-sm font-mono font-bold text-emerald-950 focus:outline-none focus:border-emerald-700"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 font-serif font-bold">₫</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">DANH MỤC *</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORIES.map((cat) => {
                  const isSelected = categoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryId(cat.id)}
                      className={`flex items-center gap-1.5 p-2 rounded-xl border text-xs cursor-pointer transition ${
                        isSelected
                          ? 'bg-emerald-900 text-white border-emerald-950 shadow-sm'
                          : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                      }`}
                    >
                      <span
                        className="p-1 rounded-md bg-white/10 shrink-0 flex items-center justify-center"
                        style={{ color: isSelected ? '#ffffff' : cat.color }}
                      >
                        <CategoryIcon name={cat.iconName} size={13} />
                      </span>
                      <span className="truncate font-medium">{cat.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">NGÀY GIAO DỊCH *</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#E6DEC9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-700 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-500 mb-1">GHI CHÚ / CHI TIẾT</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Ăn bún chả, mua sách..."
                className="w-full bg-white border border-[#E6DEC9] rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-emerald-700"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-emerald-900 hover:bg-emerald-850 text-white py-2.5 px-4 rounded-xl text-sm font-semibold transition shadow-md flex items-center justify-center gap-1.5"
            >
              <Plus size={16} />
              <span>Lưu khoản chi ngay</span>
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: Detailed Ledger & Advanced Filters */}
        <div className={`lg:col-span-7 bg-[#FAF7F0] border border-[#E6DEC9] p-5 rounded-2xl shadow-md space-y-4 ${
          mobileTab === 'list' ? 'block' : 'hidden lg:block'
        }`}>
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6DEC9]">
          <div>
            <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
              Sổ tay giao dịch chi tiết
            </h3>
            <span className="text-xs text-stone-500 font-sans block">
              Hiển thị {filteredExpenses.length} / {expenses.length} giao dịch
            </span>
          </div>

          <div className="flex items-center gap-2">
            {selectedIds.length > 0 && (
              <button
                onClick={() => setIsBulkDeleteConfirmOpen(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1 shadow-sm"
              >
                <Trash2 size={13} />
                <span>Xóa chọn ({selectedIds.length})</span>
              </button>
            )}
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 cursor-pointer transition shadow-xs"
            >
              <Download size={14} />
              <span>Xuất CSV</span>
            </button>
          </div>
        </div>

        {/* Filters grid */}
        <div className="space-y-2 bg-white/60 p-3 rounded-xl border border-stone-200/60">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {/* Search */}
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm kiếm nội dung ghi chú..."
                className="w-full bg-white border border-stone-200 rounded-xl pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
              />
              <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
            >
              <option value="all">Tất cả danh mục</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date range & Sort */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              placeholder="Từ ngày"
              className="bg-white border border-stone-200 rounded-xl px-2.5 py-1 text-stone-700"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              placeholder="Đến ngày"
              className="bg-white border border-stone-200 rounded-xl px-2.5 py-1 text-stone-700"
            />
            <div className="col-span-2 sm:col-span-1 flex items-center gap-1 bg-white border border-stone-200 rounded-xl px-2">
              <ArrowUpDown size={12} className="text-stone-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full bg-transparent border-none text-xs focus:outline-none py-1"
              >
                <option value="date-desc">Mới nhất</option>
                <option value="date-asc">Cũ nhất</option>
                <option value="amount-desc">Giá trị cao nhất</option>
                <option value="amount-asc">Giá trị thấp nhất</option>
              </select>
            </div>
          </div>
        </div>

        {/* Grouped Entries */}
        {groupedExpenses.length > 0 ? (
          <div className="space-y-4 max-h-[520px] overflow-y-auto pr-1">
            <div className="flex items-center justify-between text-xs px-1 text-stone-500">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 hover:text-emerald-950 font-medium"
              >
                {selectedIds.length === filteredExpenses.length && filteredExpenses.length > 0 ? (
                  <CheckSquare size={14} className="text-emerald-800" />
                ) : (
                  <Square size={14} />
                )}
                <span>Chọn tất cả trong trang</span>
              </button>
            </div>

            {groupedExpenses.map((group) => (
              <div key={group.dateStr} className="space-y-1.5">
                <div className="flex justify-between items-baseline bg-stone-200/50 border-y border-stone-200 px-2.5 py-1 text-xs rounded-md">
                  <span className="font-serif font-bold text-stone-700">
                    {formatDateVietnamese(group.dateStr)}
                  </span>
                  <span className="font-mono font-bold text-emerald-900">
                    Tổng: {formatCurrency(group.dayTotal)}
                  </span>
                </div>

                <div className="space-y-1.5">
                  {group.items.map((exp) => {
                    const category =
                      CATEGORIES.find((c) => c.id === exp.categoryId) || CATEGORIES[CATEGORIES.length - 1];
                    const isSelected = selectedIds.includes(exp.id);

                    return (
                      <div
                        key={exp.id}
                        className={`flex items-center justify-between p-2.5 bg-white border rounded-xl shadow-2xs hover:border-emerald-700/40 transition group ${
                          isSelected ? 'border-amber-400 bg-amber-50/20' : 'border-stone-200/70'
                        }`}
                        style={{ borderLeftWidth: '4px', borderLeftColor: category.color }}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectOne(exp.id)}
                            className="rounded accent-emerald-800 w-4 h-4 cursor-pointer"
                          />
                          <span
                            className="p-1.5 rounded-full shrink-0 flex items-center justify-center bg-stone-50 border border-stone-100"
                            style={{ color: category.color }}
                          >
                            <CategoryIcon name={category.iconName} size={14} />
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-stone-800 block truncate leading-tight">
                              {exp.note}
                            </span>
                            <span className="text-[10px] text-stone-400 font-sans block">
                              {category.name}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-stone-900">
                            {formatCurrency(exp.amount)}
                          </span>

                          <button
                            onClick={() => setEditingExpense(exp)}
                            className="p-1 text-stone-400 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                            title="Sửa"
                          >
                            <Edit2 size={13} />
                          </button>

                          <button
                            onClick={() => handleSingleDelete(exp)}
                            className="p-1 text-stone-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition"
                            title="Xóa"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-400 font-sans text-xs flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-stone-200 rounded-xl">
            <span>Không tìm thấy giao dịch nào phù hợp với bộ lọc.</span>
          </div>
        )}
        </div>
      </div>

      {/* Edit Expense Modal */}
      <EditExpenseModal
        isOpen={!!editingExpense}
        expense={editingExpense}
        onClose={() => setEditingExpense(null)}
        onSave={(updated) => {
          if (onUpdateExpense) onUpdateExpense(updated);
          setEditingExpense(null);
          showToast('Đã cập nhật giao dịch!', 'success');
        }}
      />

      {/* Bank Statement Import Modal */}
      <ImportStatementModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImport={handleImportSuccess}
      />

      {/* Bulk Delete Confirm */}
      <ConfirmModal
        isOpen={isBulkDeleteConfirmOpen}
        title="Xác nhận xóa nhiều giao dịch"
        message={`Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} giao dịch đã chọn?`}
        confirmText="Xóa tất cả"
        onConfirm={handleBulkDelete}
        onCancel={() => setIsBulkDeleteConfirmOpen(false)}
      />
    </div>
  );
}
