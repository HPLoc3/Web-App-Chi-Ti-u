import React, { useState, useEffect, useRef } from 'react';
import { Expense } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { X, Save } from 'lucide-react';
import MoneyInput from '../../../components/common/MoneyInput';
import { EMPTY_MONEY, moneyDraft, moneyDraftError } from '../../../utils/moneyDraft';
import { getApiErrorMessage } from '../../../lib/apiClient';

interface EditExpenseModalProps {
  isOpen: boolean;
  expense: Expense | null;
  onClose: () => void;
  /** Ném lỗi nếu lưu thất bại; modal được giữ nguyên */
  onSave: (updatedExpense: Expense) => Promise<unknown> | void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  isOpen,
  expense,
  onClose,
  onSave,
}) => {
  const [amount, setAmount] = useState(EMPTY_MONEY);
  const [categoryId, setCategoryId] = useState<string>('an_uong');
  const [note, setNote] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const savingRef = useRef(false);

  useEffect(() => {
    if (expense) {
      setAmount(moneyDraft(expense.amount));
      setError(null);
      setCategoryId(expense.categoryId);
      setNote(expense.note);
      setDate(expense.date);
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleClose = () => {
    if (savingRef.current) return;
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
      await onSave({
        ...expense,
        amount: amount.value!,
        categoryId,
        note,
        date,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không cập nhật được giao dịch.'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-emerald-950 border border-emerald-800/80 rounded-2xl max-w-lg w-full shadow-2xl p-6 text-emerald-50 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/60 mb-5">
          <h3 className="text-lg font-serif font-bold text-amber-100">Chỉnh sửa giao dịch</h3>
          <button
            onClick={handleClose}
            className="p-1.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-900/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="edit-expense-amount"
              className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1.5"
            >
              Số tiền (VNĐ)
            </label>
            <MoneyInput
              id="edit-expense-amount"
              value={amount.value}
              onChange={(value, raw) => setAmount({ value, raw })}
              required
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-amber-300 font-mono text-lg font-bold focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1.5">
              Danh mục
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-emerald-100 text-sm focus:outline-none focus:border-amber-400"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id} className="bg-emerald-950 text-emerald-100">
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1.5">
              Ghi chú
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-emerald-100 text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-emerald-300 mb-1.5">
              Ngày phát sinh
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="w-full bg-emerald-900/40 border border-emerald-700/80 rounded-xl px-4 py-2.5 text-emerald-100 font-mono text-sm focus:outline-none focus:border-amber-400"
            />
          </div>

          {error && (
            <p role="alert" className="text-xs text-red-300">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-emerald-800/60">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 rounded-xl border border-emerald-800 hover:bg-emerald-900/50 text-emerald-200 text-sm font-medium transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="disabled:opacity-50 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-sm font-bold shadow-md transition-all"
            >
              <Save size={16} />
              <span>Lưu thay đổi</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
