import React, { useRef, useState } from 'react';
import { Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { parseNaturalExpense } from '../../../utils/parser';
import { X, PlusCircle, Sparkles } from 'lucide-react';
import MoneyInput from '../../../components/common/MoneyInput';
import { EMPTY_MONEY, moneyDraft, moneyDraftError } from '../../../utils/moneyDraft';
import { getBusinessDate } from '../../../utils/dateParser';
import { getApiErrorMessage } from '../../../lib/apiClient';

interface QuickAddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Ném lỗi nếu lưu thất bại; form được giữ nguyên */
  onAddExpense: (expense: Omit<Expense, 'id'>) => Promise<unknown> | void;
}

export const QuickAddExpenseModal: React.FC<QuickAddExpenseModalProps> = ({
  isOpen,
  onClose,
  onAddExpense,
}) => {
  const [naturalInput, setNaturalInput] = useState('');
  const [amount, setAmount] = useState(EMPTY_MONEY);
  const [categoryId, setCategoryId] = useState('an_uong');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(getBusinessDate());
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  if (!isOpen) return null;

  const handleNaturalParse = () => {
    if (!naturalInput.trim()) return;
    const parsed = parseNaturalExpense(naturalInput);
    if (parsed.amount > 0) setAmount(moneyDraft(parsed.amount));
    if (parsed.categoryId) setCategoryId(parsed.categoryId);
    if (parsed.note) setNote(parsed.note);
    if (parsed.date) setDate(parsed.date);
  };

  const handleClose = () => {
    // Đang lưu thì không đóng, để lỗi (nếu có) không bị mất
    if (savingRef.current) return;
    setError(null);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current) return;
    const invalid = moneyDraftError(amount, 'positive');
    setError(invalid);
    if (invalid) return;

    savingRef.current = true;
    setIsSaving(true);
    try {
      await onAddExpense({
        amount: amount.value!,
        categoryId,
        note: note || 'Chi tiêu mới',
        date,
      });
      setNaturalInput('');
      setAmount(EMPTY_MONEY);
      setNote('');
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không lưu được giao dịch.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="bg-emerald-950 border border-emerald-800/80 rounded-2xl max-w-md w-full shadow-2xl p-6 text-emerald-50">
        <div className="flex items-center justify-between pb-3 border-b border-emerald-800/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
              <PlusCircle size={20} />
            </div>
            <h3 className="text-lg font-serif font-bold text-amber-100">Thêm khoản chi tiêu nhanh</h3>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-900/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1">
            Gõ nhanh bằng Tiếng Việt
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={naturalInput}
              onChange={(e) => setNaturalInput(e.target.value)}
              placeholder="VD: Phở bò 45k hôm qua"
              className="flex-1 bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-3.5 py-2 text-emerald-100 text-xs focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              onClick={handleNaturalParse}
              className="px-3 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-700 text-amber-300 text-xs font-bold flex items-center gap-1 shrink-0"
            >
              <Sparkles size={14} />
              <span>Bóc tách</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1">
              Số tiền (VNĐ) *
            </label>
            <MoneyInput
              value={amount.value}
              onChange={(value, raw) => setAmount({ value, raw })}
              placeholder="45000"
              required
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-lg font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1">
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2 text-emerald-100 text-xs focus:outline-none focus:border-amber-400"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-emerald-950 text-emerald-100">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Mô tả khoản chi"
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2 text-emerald-100 text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1">
              Ngày ghi nhận
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2 text-emerald-100 font-mono text-xs focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="pt-3">
            <button
              type="submit"
              disabled={isSaving}
              className="disabled:opacity-50 w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle size={18} />
              <span>Lưu giao dịch ngay</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuickAddExpenseModal;
