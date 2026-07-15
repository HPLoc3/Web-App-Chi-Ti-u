import React, { useState, useMemo } from 'react';
import { Expense, Category } from '../types';
import { CATEGORIES } from '../constants/categories';
import { formatCurrency, formatDateVietnamese } from '../utils/format';
import { 
  Plus, 
  Trash2, 
  Download, 
  Calendar as CalendarIcon, 
  Tag, 
  FileText, 
  Filter, 
  Search,
  Check,
  HelpCircle,
  Utensils,
  Car,
  ShoppingBag,
  Gamepad2,
  Receipt,
  HeartPulse,
  GraduationCap
} from 'lucide-react';

// Static Icon Map to avoid dynamic lookups which are error-prone
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
  onAddExpense: (expense: Omit<Expense, 'id'>) => void;
  onDeleteExpense: (id: string) => void;
}

export default function ExpensesTab({
  expenses,
  onAddExpense,
  onDeleteExpense
}: ExpensesTabProps) {
  // Manual Add Form states
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState(CATEGORIES[0].id);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10)); // Today's date YYYY-MM-DD
  const [note, setNote] = useState('');

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('all');

  // Add transaction submit
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = parseFloat(amount.replace(/[.,\s]/g, ''));
    if (isNaN(numericAmount) || numericAmount <= 0) {
      alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
      return;
    }

    onAddExpense({
      amount: numericAmount,
      categoryId,
      date,
      note: note.trim() || CATEGORIES.find(c => c.id === categoryId)?.name || 'Khác'
    });

    // Reset fields (except category and date, for easier consecutive inputs!)
    setAmount('');
    setNote('');
  };

  // Grouped and filtered transactions
  const filteredAndGroupedExpenses = useMemo(() => {
    // 1. Filter
    const filtered = expenses.filter(exp => {
      const matchSearch = exp.note.toLowerCase().includes(searchTerm.toLowerCase());
      const matchCat = selectedCatFilter === 'all' || exp.categoryId === selectedCatFilter;
      return matchSearch && matchCat;
    });

    // 2. Sort by date descending, then group
    const sorted = [...filtered].sort((a, b) => b.date.localeCompare(a.date));
    
    const groups: { [date: string]: Expense[] } = {};
    sorted.forEach(exp => {
      if (!groups[exp.date]) {
        groups[exp.date] = [];
      }
      groups[exp.date].push(exp);
    });

    return Object.entries(groups).map(([dateStr, items]) => {
      const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);
      return {
        dateStr,
        items,
        dayTotal
      };
    });
  }, [expenses, searchTerm, selectedCatFilter]);

  // Export to CSV function (BOM UTF-8 included for excel accents compatibility)
  const handleExportCSV = () => {
    if (expenses.length === 0) {
      alert('Chưa có giao dịch nào để xuất file.');
      return;
    }

    const headers = ['Ngày', 'Danh mục', 'Số tiền (₫)', 'Ghi chú'];
    const rows = expenses
      .sort((a, b) => b.date.localeCompare(a.date))
      .map(exp => {
        const cat = CATEGORIES.find(c => c.id === exp.categoryId)?.name || 'Khác';
        return [
          exp.date,
          cat,
          exp.amount,
          `"${(exp.note || '').replace(/"/g, '""')}"`
        ];
      });

    const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `So_tay_Chi_tieu_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* LEFT COLUMN: Manual Add Form */}
      <div className="lg:col-span-5 bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm">
        <h3 className="font-serif text-lg font-bold text-emerald-950 mb-3 pb-2 border-b border-[#E6DEC9] flex items-center gap-1.5">
          <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
          Thêm thủ công
        </h3>

        <form onSubmit={handleAddSubmit} className="space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">SỐ TIỀN (₫) *</label>
            <div className="relative">
              <input
                type="text"
                required
                value={amount}
                onChange={(e) => {
                  // Keep only digits
                  const raw = e.target.value.replace(/[^\d]/g, '');
                  if (raw) {
                    setAmount(parseInt(raw, 10).toLocaleString('vi-VN'));
                  } else {
                    setAmount('');
                  }
                }}
                placeholder="Ví dụ: 50.000"
                className="w-full bg-white border border-[#E6DEC9] rounded pl-3 pr-10 py-1.5 text-sm font-mono focus:outline-none focus:border-emerald-700"
              />
              <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-serif font-bold">₫</span>
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">DANH MỤC *</label>
            <div className="grid grid-cols-2 gap-1.5">
              {CATEGORIES.map(cat => {
                const isSelected = categoryId === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={`flex items-center gap-1.5 p-2 rounded text-left border text-xs cursor-pointer transition ${
                      isSelected 
                        ? 'bg-emerald-900 text-white border-emerald-950' 
                        : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
                    }`}
                  >
                    <span 
                      className="p-1 rounded bg-white/10 shrink-0 flex items-center justify-center"
                      style={{ color: isSelected ? '#ffffff' : cat.color }}
                    >
                      <CategoryIcon name={cat.iconName} size={14} />
                    </span>
                    <span className="truncate">{cat.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">NGÀY GIAO DỊCH *</label>
            <div className="relative">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-700 font-mono"
              />
            </div>
          </div>

          {/* Note */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 mb-1">GHI CHÚ / CHI TIẾT</label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ví dụ: Ăn bún chả, đổ xăng xăng..."
              className="w-full bg-white border border-[#E6DEC9] rounded px-3 py-1.5 text-sm focus:outline-none focus:border-emerald-700"
            />
          </div>

          {/* Save button */}
          <button
            type="submit"
            className="w-full bg-emerald-900 hover:bg-emerald-850 text-white py-2 px-4 rounded text-sm font-semibold cursor-pointer transition shadow-sm flex items-center justify-center gap-1.5"
          >
            <Plus size={16} />
            Lưu giao dịch
          </button>
        </form>
      </div>

      {/* RIGHT COLUMN: Detailed ledger List */}
      <div className="lg:col-span-7 bg-[#FAF7F0] border border-[#E6DEC9] p-4 rounded-lg shadow-sm space-y-4">
        {/* Ledger header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E6DEC9]">
          <div>
            <h3 className="font-serif text-lg font-bold text-emerald-950 flex items-center gap-1.5">
              <span className="w-1.5 h-4 bg-emerald-900 rounded-full inline-block"></span>
              Sổ tay chi tiết
            </h3>
            <span className="text-[10px] text-stone-400 font-sans block">
              Tổng số {expenses.length} giao dịch đã lưu
            </span>
          </div>

          {/* Export button */}
          <button
            onClick={handleExportCSV}
            className="px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 text-xs font-semibold rounded flex items-center justify-center gap-1.5 cursor-pointer transition shrink-0"
          >
            <Download size={14} />
            Xuất file CSV
          </button>
        </div>

        {/* Search and Filters bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm ghi chú..."
              className="w-full bg-white border border-stone-200 rounded pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-stone-400" />
          </div>

          {/* Category Filter */}
          <div className="relative">
            <select
              value={selectedCatFilter}
              onChange={(e) => setSelectedCatFilter(e.target.value)}
              className="w-full bg-white border border-stone-200 rounded pl-3 pr-8 py-1.5 text-xs focus:outline-none focus:border-emerald-700"
            >
              <option value="all">Tất cả danh mục</option>
              {CATEGORIES.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Grouped Ledger Entries */}
        {filteredAndGroupedExpenses.length > 0 ? (
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
            {filteredAndGroupedExpenses.map(group => (
              <div key={group.dateStr} className="space-y-1.5">
                {/* Day Header */}
                <div className="flex justify-between items-baseline bg-stone-100/70 border-y border-stone-200/50 px-2 py-1 text-xs">
                  <span className="font-serif font-semibold text-stone-600">
                    {formatDateVietnamese(group.dateStr)}
                  </span>
                  <span className="font-mono font-bold text-stone-700">
                    Tổng: {formatCurrency(group.dayTotal)}
                  </span>
                </div>

                {/* Day Items */}
                <div className="space-y-1">
                  {group.items.map(exp => {
                    const category = CATEGORIES.find(c => c.id === exp.categoryId) || CATEGORIES[CATEGORIES.length - 1];
                    return (
                      <div 
                        key={exp.id} 
                        className="flex items-center justify-between p-2.5 bg-white border border-stone-200/40 rounded shadow-sm hover:border-emerald-700/30 transition group"
                        style={{ borderLeftWidth: '3px', borderLeftColor: category.color }}
                      >
                        {/* Left: Category Icon & Note */}
                        <div className="flex items-center gap-2 min-w-0">
                          <span 
                            className="p-1.5 rounded-full shrink-0 flex items-center justify-center bg-stone-50 border border-stone-100"
                            style={{ color: category.color }}
                          >
                            <CategoryIcon name={category.iconName} size={14} />
                          </span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-stone-800 block truncate leading-tight">
                              {exp.note}
                            </span>
                            <span className="text-[10px] text-stone-400 font-sans block">
                              {category.name}
                            </span>
                          </div>
                        </div>

                        {/* Right: Amount & Delete button */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="font-mono text-xs font-bold text-stone-900">
                            {formatCurrency(exp.amount)}
                          </span>
                          <button
                            onClick={() => {
                              if (confirm(`Bạn chắc chắn muốn xóa giao dịch "${exp.note}"?`)) {
                                onDeleteExpense(exp.id);
                              }
                            }}
                            className="p-1 text-stone-300 hover:text-red-700 hover:bg-red-50 rounded transition opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer"
                            title="Xóa giao dịch"
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
          <div className="text-center py-12 text-stone-400 font-sans text-xs flex flex-col items-center justify-center gap-2 bg-white border border-dashed border-stone-200 rounded-lg">
            <div className="p-2.5 rounded-full bg-stone-50 border border-stone-100">
              <FileText size={20} className="text-stone-300" />
            </div>
            Không tìm thấy giao dịch nào phù hợp.
          </div>
        )}
      </div>
    </div>
  );
}
