import { useState, useEffect, useCallback, type ChangeEvent } from 'react';
import { AppState } from '../types';
import { generateSampleState, EMPTY_STATE } from '../data/sampleData';

const LOCAL_STORAGE_KEY = 'so_tay_ledger_data';

export function useBackupRestore(
  userId: string | null,
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void
) {
  const [localState, setLocalState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (
          parsed &&
          Array.isArray(parsed.expenses) &&
          Array.isArray(parsed.goals) &&
          typeof parsed.income === 'number'
        ) {
          return {
            ...parsed,
            categoryLimits: parsed.categoryLimits || {},
            recurringExpenses: parsed.recurringExpenses || [],
            generatedRecurringMonths: parsed.generatedRecurringMonths || [],
            budgetTemplate: parsed.budgetTemplate || 'none',
          };
        }
      }
    } catch (e) {
      console.error('Error loading ledger data from localStorage:', e);
    }
    return generateSampleState();
  });

  // Persist localState to localStorage with debounce to prevent main-thread lag
  useEffect(() => {
    // When logged in, cloud sync handles persistence; only keep minimal backup in localStorage
    const timeoutId = setTimeout(() => {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localState));
      } catch (e) {
        console.error('Error saving ledger data to localStorage:', e);
      }
    }, 400);

    return () => clearTimeout(timeoutId);
  }, [localState]);

  const handleBackupData = useCallback((currentState: AppState) => {
    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify(currentState, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute(
      'download',
      `so_tay_chi_tieu_backup_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast?.('Đã tải tệp sao lưu dữ liệu!', 'success');
  }, [showToast]);

  const handleRestoreData = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const fileReader = new FileReader();
      if (event.target.files && event.target.files[0]) {
        fileReader.readAsText(event.target.files[0], 'UTF-8');
        fileReader.onload = (e) => {
          try {
            const parsed = JSON.parse(e.target?.result as string);
            if (parsed && Array.isArray(parsed.expenses)) {
              setLocalState({
                ...parsed,
                isSampleData: false,
              });
              showToast?.('Đã khôi phục dữ liệu từ tệp thành công!', 'success');
            } else {
              showToast?.('Tệp không đúng định dạng sao lưu của Sổ Tay Chi Tiêu.', 'error');
            }
          } catch (error) {
            showToast?.('Lỗi khi đọc tệp JSON.', 'error');
          }
        };
      }
    },
    [showToast]
  );

  const handleLoadSampleData = useCallback(async () => {
    // Không bao giờ ghi dữ liệu mẫu vào tài khoản thật
    if (userId) {
      showToast?.('Chỉ dùng ở chế độ dùng thử', 'info');
      return;
    }
    setLocalState(generateSampleState());
    showToast?.('Đã nạp 3 tuần dữ liệu mẫu thực tế!', 'success');
  }, [userId, showToast]);

  const handleClearSampleData = useCallback(() => {
    setLocalState({
      ...EMPTY_STATE,
      isSampleData: false,
    });
    showToast?.('Đã xóa dữ liệu mẫu.', 'info');
  }, [showToast]);

  return {
    localState,
    setLocalState,
    handleBackupData,
    handleRestoreData,
    handleLoadSampleData,
    handleClearSampleData,
  };
}
