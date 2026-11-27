import React, { useEffect, useRef, useState } from 'react';
import { Expense, ImportPreviewItem } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { Upload, CheckCircle2, FileText, AlertCircle, X, Sparkles, Check } from 'lucide-react';
import { parseStatement, StatementLineError } from '../../../utils/csv';
import { getApiErrorMessage } from '../../../lib/apiClient';
import { formatDateShort } from '../../../utils/format';

/** Bằng giới hạn của POST /transactions/bulk */
const IMPORT_MAX_ITEMS = 500;
const CLOSE_DELAY_MS = 1500;

interface StatementSummary {
  incomingCount: number;
  errors: StatementLineError[];
  assumedAllExpense: boolean;
}

const EMPTY_SUMMARY: StatementSummary = { incomingCount: 0, errors: [], assumedAllExpense: false };

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Thêm cả lô trong một lần; ném lỗi nếu thất bại */
  onImport: (expenses: Omit<Expense, 'id'>[]) => Promise<void> | void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [items, setItems] = useState<ImportPreviewItem[]>([]);
  const [summary, setSummary] = useState<StatementSummary>(EMPTY_SUMMARY);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const importingRef = useRef(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  if (!isOpen) return null;

  const resetToUpload = () => {
    setStep('upload');
    setItems([]);
    setSummary(EMPTY_SUMMARY);
    setError(null);
  };

  const handleClose = () => {
    // Đang gửi thì không đóng, để người dùng thấy kết quả
    if (importingRef.current) return;
    clearTimeout(closeTimerRef.current);
    resetToUpload();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    // Cho phép chọn lại đúng tệp vừa sửa
    e.target.value = '';
    if (selectedFile) processFile(selectedFile);
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    setError(null);
    const reader = new FileReader();

    reader.onerror = () => {
      setIsProcessing(false);
      setError('Không đọc được tệp. Vui lòng thử lại.');
    };

    reader.onload = (e) => {
      setIsProcessing(false);
      const result = parseStatement(String(e.target?.result ?? ''));
      if (result.ok === false) {
        setError(result.error);
        return;
      }

      setItems(
        result.expenses.map((expense) => ({
          id: `import-${expense.line}`,
          date: expense.date,
          note: expense.note,
          amount: expense.amount,
          categoryId: expense.categoryId,
          selected: true,
          confidence: expense.categoryId !== 'khac' ? 0.92 : 0.7,
        }))
      );
      setSummary(result);
      setStep('preview');
    };

    reader.readAsText(file);
  };

  const handleToggleSelect = (id: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item)));
  };

  const handleCategoryChange = (id: string, categoryId: string) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, categoryId } : item)));
  };

  const selectedItems = items.filter((i) => i.selected);
  const isOverLimit = selectedItems.length > IMPORT_MAX_ITEMS;

  const handleConfirmImport = async () => {
    if (importingRef.current || selectedItems.length === 0 || isOverLimit) return;
    importingRef.current = true;
    setIsImporting(true);
    setError(null);
    try {
      await onImport(
        selectedItems.map((item) => ({
          amount: item.amount,
          categoryId: item.categoryId,
          note: item.note,
          date: item.date,
        }))
      );
      setStep('complete');
      closeTimerRef.current = setTimeout(() => {
        resetToUpload();
        onClose();
      }, CLOSE_DELAY_MS);
    } catch (err) {
      setError(getApiErrorMessage(err, 'Không nhập được giao dịch từ sao kê.'));
    } finally {
      importingRef.current = false;
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-emerald-950 border border-emerald-800/80 rounded-2xl max-w-2xl w-full shadow-2xl p-4 sm:p-6 text-emerald-50 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-amber-100">
                Nhập sao kê ngân hàng (CSV / TXT)
              </h3>
              <p className="text-xs text-emerald-300/80">Tự động nhận diện & bóc tách danh mục thông minh</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-900/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-emerald-800/80 rounded-xl bg-emerald-900/20 p-6 text-center">
            <Upload size={40} className="text-amber-400 mb-3 animate-bounce" />
            <h4 className="text-sm font-semibold text-emerald-100 mb-1">
              Bấm để chọn tệp sao kê ngân hàng
            </h4>
            <p className="text-xs text-emerald-300/70 mb-4 max-w-md">
              Hỗ trợ CSV (.csv) hoặc TXT (.txt), mã hóa UTF-8, có dòng tiêu đề: Ngày, Nội dung, Số tiền (hoặc Ghi nợ /
              Ghi có). File Excel cần được lưu lại thành CSV.
            </p>
            <label className="cursor-pointer px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm shadow-md transition-all">
              <span>Chọn tệp sao kê</span>
              <input
                type="file"
                accept=".csv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
            {isProcessing && (
              <p className="text-xs text-amber-300 mt-4 flex items-center gap-1.5 animate-pulse">
                <Sparkles size={14} /> Đang đọc tệp sao kê...
              </p>
            )}
            {error && (
              <p role="alert" className="text-xs text-red-300 mt-4 max-w-md flex items-start gap-1.5 text-left">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 text-xs text-emerald-300">
              <span>Đã phát hiện {items.length} giao dịch từ sao kê</span>
              <span className="text-amber-300 font-mono">
                Đã chọn: {selectedItems.length}/{items.length}
              </span>
            </div>

            <div className="space-y-1 mb-3 text-xs">
              {summary.assumedAllExpense && (
                <p className="text-amber-300">
                  Tệp không có số âm hay cột Ghi nợ/Ghi có nên toàn bộ được coi là khoản chi. Hãy bỏ chọn các dòng tiền
                  vào (nếu có).
                </p>
              )}
              {summary.incomingCount > 0 && (
                <p className="text-emerald-300">{`Bỏ qua ${summary.incomingCount} dòng tiền vào`}</p>
              )}
              {summary.errors.length > 0 && (
                <div className="border border-red-800/60 rounded-lg bg-red-950/40 p-2 text-red-200">
                  <p className="font-semibold">{`${summary.errors.length} dòng lỗi không được nhập:`}</p>
                  <ul className="max-h-24 overflow-y-auto">
                    {summary.errors.map((e) => (
                      <li key={e.line} className="break-words">{`Dòng ${e.line}: ${e.reason}`}</li>
                    ))}
                  </ul>
                </div>
              )}
              {isOverLimit && (
                <p role="alert" className="text-red-300">
                  {`Đang chọn ${selectedItems.length} giao dịch, mỗi lần chỉ nhập tối đa ${IMPORT_MAX_ITEMS}. Hãy chia nhỏ tệp hoặc bỏ chọn bớt.`}
                </p>
              )}
              {error && (
                <p role="alert" className="text-red-300">
                  {error}
                </p>
              )}
            </div>

            <div className="flex-1 overflow-y-auto border border-emerald-800/60 rounded-xl bg-emerald-900/30 p-2 space-y-2 max-h-80 mb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex flex-wrap sm:flex-nowrap items-center gap-x-3 gap-y-2 p-2.5 rounded-lg border transition-colors ${
                    item.selected
                      ? 'bg-emerald-900/60 border-emerald-700/80'
                      : 'bg-emerald-950/40 border-emerald-900/40 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="rounded accent-amber-500 w-4 h-4 shrink-0 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-100 break-words [overflow-wrap:anywhere]">{item.note}</p>
                    <p className="text-[10px] font-mono text-emerald-300/80 whitespace-nowrap">{formatDateShort(item.date)}</p>
                  </div>
                  {/* Mobile: danh mục và số tiền xuống hàng riêng để nội dung đủ chỗ */}
                  <div className="flex w-full sm:w-auto shrink-0 items-center justify-between gap-3 pl-7 sm:pl-0">
                    <select
                      value={item.categoryId}
                      onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                      className="min-w-0 bg-emerald-950 border border-emerald-700/80 rounded-md text-xs text-amber-200 px-2 py-1"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                    <span className="font-mono text-xs font-bold text-amber-300 shrink-0 whitespace-nowrap">
                      {item.amount.toLocaleString('vi-VN')} đ
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-emerald-800/60">
              <button
                onClick={resetToUpload}
                disabled={isImporting}
                className="px-4 py-2 text-xs font-medium text-emerald-300 hover:text-emerald-100"
              >
                Tải tệp khác
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={selectedItems.length === 0 || isOverLimit || isImporting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-emerald-950 font-bold text-sm shadow-md transition-all"
              >
                <Check size={16} />
                <span>
                  {isImporting ? 'Đang nhập...' : `Xác nhận nhập (${selectedItems.length} giao dịch)`}
                </span>
              </button>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <CheckCircle2 size={50} className="text-emerald-400 mb-3 animate-bounce" />
            <h4 className="text-lg font-serif font-bold text-amber-100">Nhập dữ liệu thành công!</h4>
            <p className="text-xs text-emerald-300/80 mt-1">
              Toàn bộ giao dịch từ sao kê đã được cập nhật vào sổ tay của bạn.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
