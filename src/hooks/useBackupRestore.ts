import { useState, useEffect, useCallback } from 'react';
import { AppState } from '../types';
import { generateSampleState, EMPTY_STATE } from '../data/sampleData';

const LOCAL_STORAGE_KEY = 'so_tay_ledger_data';

export function useBackupRestore(
  userId: string | null,
  apiActions?: {
    updateBudget: (data: any) => Promise<any>;
    addBulkExpenses: (expenses: any[]) => Promise<any>;
    addGoal: (goal: any) => Promise<any>;
  },
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
    (event: React.ChangeEvent<HTMLInputElement>) => {
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
    const sample = generateSampleState();
    if (userId && apiActions) {
      showToast?.('Đang nạp 3 tuần dữ liệu mẫu vào PostgreSQL...', 'info');
      try {
        await apiActions.updateBudget({
          income: sample.income,
          budgetTemplate: sample.budgetTemplate,
          categoryLimits: sample.categoryLimits,
        });
        if (sample.expenses.length > 0) {
          await apiActions.addBulkExpenses(sample.expenses);
        }
        for (const g of sample.goals) {
          await apiActions.addGoal({
            name: g.name,
            target: g.target,
            current: g.current,
            createdAt: g.createdAt || new Date().toISOString().slice(0, 10),
          });
        }
        showToast?.('Đã nạp 3 tuần dữ liệu mẫu thực tế vào PostgreSQL thành công!', 'success');
      } catch (err) {
        console.error('Error loading sample data to PostgreSQL:', err);
        showToast?.('Lỗi khi nạp dữ liệu mẫu vào tài khoản.', 'error');
      }
    } else {
      setLocalState(sample);
      showToast?.('Đã nạp 3 tuần dữ liệu mẫu thực tế!', 'success');
    }
  }, [userId, apiActions, showToast]);

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
