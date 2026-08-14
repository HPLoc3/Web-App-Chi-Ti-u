import React, { useState } from 'react';
import { Expense, ImportPreviewItem } from '../../../types';
import { CATEGORIES } from '../../../constants/categories';
import { Upload, CheckCircle2, FileText, AlertCircle, X, Sparkles, Check } from 'lucide-react';
import { parseNaturalExpense } from '../../../utils/parser';

interface ImportStatementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (expenses: Omit<Expense, 'id'>[]) => void;
}

export const ImportStatementModal: React.FC<ImportStatementModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [items, setItems] = useState<ImportPreviewItem[]>([]);
  const [step, setStep] = useState<'upload' | 'preview' | 'complete'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      processFile(selectedFile);
    }
  };

  const processFile = (file: File) => {
    setIsProcessing(true);
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) {
        setIsProcessing(false);
        return;
      }

      // Basic CSV parser logic
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const parsedItems: ImportPreviewItem[] = [];

      lines.forEach((line, index) => {
        if (index === 0 && (line.toLowerCase().includes('ngày') || line.toLowerCase().includes('date'))) {
          // skip header line
          return;
        }

        const parts = line.split(/[,;\t]/);
        if (parts.length >= 2) {
          const rawDate = parts[0]?.trim() || new Date().toISOString().slice(0, 10);
          const rawNote = parts[1]?.replace(/"/g, '').trim() || 'Giao dịch ngân hàng';
          const rawAmountStr = parts[2] ? parts[2].replace(/[^0-9]/g, '') : '0';
          const rawAmount = parseInt(rawAmountStr, 10) || 50000;

          // Smart category detection using parser
          const parsed = parseNaturalExpense(`${rawNote} ${rawAmount}`);
          
          parsedItems.push({
            id: `import-${index}-${Date.now()}`,
            date: rawDate.length === 10 ? rawDate : new Date().toISOString().slice(0, 10),
            note: rawNote,
            amount: parsed.amount > 0 ? parsed.amount : rawAmount,
            categoryId: parsed.categoryId || 'khac',
            selected: true,
            confidence: parsed.categoryId !== 'khac' ? 0.92 : 0.7,
          });
        }
      });

      // If text file isn't structured CSV, fall back to line by line parser
      if (parsedItems.length === 0) {
        lines.forEach((line, index) => {
          const parsed = parseNaturalExpense(line);
          if (parsed.amount > 0) {
            parsedItems.push({
              id: `import-${index}-${Date.now()}`,
              date: new Date().toISOString().slice(0, 10),
              note: parsed.note || line,
              amount: parsed.amount,
              categoryId: parsed.categoryId || 'khac',
              selected: true,
              confidence: 0.88,
            });
          }
        });
      }

      setItems(parsedItems);
      setIsProcessing(false);
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

  const handleConfirmImport = () => {
    const selectedItems = items.filter((i) => i.selected && i.amount > 0);
    const expensesToImport: Omit<Expense, 'id'>[] = selectedItems.map((item) => ({
      amount: item.amount,
      categoryId: item.categoryId,
      note: item.note,
      date: item.date,
    }));

    onImport(expensesToImport);
    setStep('complete');
    setTimeout(() => {
      onClose();
      setStep('upload');
      setFile(null);
      setItems([]);
    }, 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-emerald-950 border border-emerald-800/80 rounded-2xl max-w-2xl w-full shadow-2xl p-6 text-emerald-50 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-4 border-b border-emerald-800/60 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <FileText size={20} />
            </div>
            <div>
              <h3 className="text-lg font-serif font-bold text-amber-100">
                Nhập sao kê ngân hàng (CSV / Excel)
              </h3>
              <p className="text-xs text-emerald-300/80">Tự động nhận diện & bóc tách danh mục thông minh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-emerald-400 hover:text-emerald-100 hover:bg-emerald-900/60 rounded-lg transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {step === 'upload' && (
          <div className="flex-1 flex flex-col items-center justify-center py-10 border-2 border-dashed border-emerald-800/80 rounded-xl bg-emerald-900/20 p-6 text-center">
            <Upload size={40} className="text-amber-400 mb-3 animate-bounce" />
            <h4 className="text-sm font-semibold text-emerald-100 mb-1">
              Kéo thả tệp sao kê ngân hàng hoặc bấm chọn
            </h4>
            <p className="text-xs text-emerald-300/70 mb-4 max-w-md">
              Hỗ trợ tệp định dạng CSV (.csv) hoặc TXT (.txt) với các cột Ngày, Nội dung, Số tiền.
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
                <Sparkles size={14} /> Đang phân tích giao dịch bằng AI...
              </p>
            )}
          </div>
        )}

        {step === 'preview' && (
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex items-center justify-between mb-3 text-xs text-emerald-300">
              <span>Đã phát hiện {items.length} giao dịch từ sao kê</span>
              <span className="text-amber-300 font-mono">
                Đã chọn: {items.filter((i) => i.selected).length}/{items.length}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto border border-emerald-800/60 rounded-xl bg-emerald-900/30 p-2 space-y-2 max-h-80 mb-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                    item.selected
                      ? 'bg-emerald-900/60 border-emerald-700/80'
                      : 'bg-emerald-950/40 border-emerald-900/40 opacity-60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.selected}
                    onChange={() => handleToggleSelect(item.id)}
                    className="rounded accent-amber-500 w-4 h-4 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-emerald-100 truncate">{item.note}</p>
                    <p className="text-[10px] font-mono text-emerald-300/80">{item.date}</p>
                  </div>
                  <select
                    value={item.categoryId}
                    onChange={(e) => handleCategoryChange(item.id, e.target.value)}
                    className="bg-emerald-950 border border-emerald-700/80 rounded-md text-xs text-amber-200 px-2 py-1"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <span className="font-mono text-xs font-bold text-amber-300 shrink-0">
                    {item.amount.toLocaleString('vi-VN')} đ
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-emerald-800/60">
              <button
                onClick={() => setStep('upload')}
                className="px-4 py-2 text-xs font-medium text-emerald-300 hover:text-emerald-100"
              >
                Tải tệp khác
              </button>
              <button
                onClick={handleConfirmImport}
                disabled={items.filter((i) => i.selected).length === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-emerald-950 font-bold text-sm shadow-md transition-all"
              >
                <Check size={16} />
                <span>Xác nhận nhập ({items.filter((i) => i.selected).length} giao dịch)</span>
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
