import React, { useState, useEffect, useRef, Suspense, lazy } from 'react';
import { AppState, Expense, Goal, RecurringExpense } from '../types';
import TabSkeleton from '../components/common/TabSkeleton';
import { AppShell } from '../components/layout/AppShell';
import { NavTabKey } from '../components/layout/AppSidebar';

// Core Tabs
import OverviewTab from '../features/dashboard/components/OverviewTab';
import { WalletsTab } from '../features/wallets/components/WalletsTab';
import { RecurringTab } from '../features/recurring/components/RecurringTab';
import { ReportsTab } from '../features/reports/components/ReportsTab';
import { SettingsTab } from '../features/settings/components/SettingsTab';

// Code-split heavy tabs with React.lazy
const ChatbotTab = lazy(() => import('../features/ai/components/ChatbotTab'));
const ExpensesTab = lazy(() => import('../features/transactions/components/ExpensesTab'));
const BudgetTab = lazy(() => import('../features/budgets/components/BudgetTab'));
const GoalsTab = lazy(() => import('../features/goals/components/GoalsTab'));
const AboutTab = lazy(() => import('../features/settings/components/AboutTab'));
const InsightsTab = lazy(() => import('../features/insights/components/InsightsTab'));

import OnboardingModal from '../components/common/OnboardingModal';
import QuickAddExpenseModal from '../features/transactions/components/QuickAddExpenseModal';
import AuthModal from '../features/auth/components/AuthModal';
import LandingPage from '../components/layout/LandingPage';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  useTransactions, 
  useGoals, 
  useRecurring, 
  useBudgets, 
  useBackupRestore 
} from '../hooks';
import { recurringExpenseService } from '../services/api/recurringExpenseService';
import { getBusinessDate } from '../utils/dateParser';
import { getApiErrorMessage } from '../lib/apiClient';
import {
  RECURRING_BACKFILL_DAYS,
  applyGuestRecurringSync,
  createGuestRecurring,
  updateGuestRecurring,
} from '../utils/recurringSchedule';

const recordedMessage = (count: number) => `Đã ghi ${count} giao dịch định kỳ đến hạn.`;
const skippedMessage = (count: number) =>
  `Bỏ qua ${count} kỳ định kỳ đã lỡ quá ${RECURRING_BACKFILL_DAYS} ngày (không ghi vào sổ).`;

export function LedgerApp() {
  const { currentUser, authState, logout, logoutAll } = useAuth();
  const { showToast } = useToast();
  const userId = currentUser?.uid || null;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
  const [resetTokenFromUrl, setResetTokenFromUrl] = useState<string>('');
  const [viewState, setViewState] = useState<'landing' | 'app'>('landing');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<NavTabKey>('overview');

  // Detect reset password URL query parameter
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const action = searchParams.get('action');
      const token = searchParams.get('token');
      if (action === 'reset-password' && token) {
        setResetTokenFromUrl(token);
        setAuthModalTab('reset');
        setIsAuthModalOpen(true);
      }
    }
  }, []);

  // Onboarding: ghi nhận riêng cho từng tài khoản (khách dùng khóa chung)
  const onboardingKey = userId ? `so_tay_onboarding_completed_${userId}` : 'so_tay_onboarding_completed';
  const [closedOnboardingKey, setClosedOnboardingKey] = useState<string | null>(null);
  const isOnboardingOpen =
    authState !== 'LOADING' && closedOnboardingKey !== onboardingKey && !localStorage.getItem(onboardingKey);

  // Rời tài khoản (đăng xuất, hết phiên) thì lần sau bắt đầu lại ở Tổng quan
  const previousUserRef = useRef(userId);
  useEffect(() => {
    if (previousUserRef.current && previousUserRef.current !== userId) setActiveTab('overview');
    previousUserRef.current = userId;
  }, [userId]);

  // Auto switch to 'app' view when logged in
  useEffect(() => {
    if (currentUser) {
      setViewState('app');
    }
  }, [currentUser]);

  // Data Hooks (Database / API)
  const { 
    expenses: apiExpenses, 
    addExpense: apiAddExpense, 
    updateExpense: apiUpdateExpense,
    deleteExpense: apiDeleteExpense, 
    addBulkExpenses: apiAddBulkExpenses,
    refetchExpenses: apiRefetchExpenses,
  } = useTransactions(userId);

  const { 
    goals: apiGoals, 
    addGoal: apiAddGoal, 
    updateGoal: apiUpdateGoal, 
    deleteGoal: apiDeleteGoal, 
  } = useGoals(userId);

  const { 
    recurringExpenses: apiRecurring, 
    error: recurringError,
    addRecurringExpense: apiAddRecurring,
    updateRecurringExpense: apiUpdateRecurring,
    deleteRecurringExpense: apiDeleteRecurring,
    syncRecurring: apiSyncRecurring,
    refetchRecurring: apiRefetchRecurring,
  } = useRecurring(userId);

  const { 
    income: apiIncome, 
    budgetTemplate: apiTemplate, 
    categoryLimits: apiLimits, 
    updateBudgetSettings: apiUpdateBudget, 
  } = useBudgets(userId);

  // Backup / Local offline cache Hook
  const { 
    localState, 
    setLocalState, 
    handleLoadSampleData, 
  } = useBackupRestore(userId, showToast);

  // Dữ liệu mẫu chỉ dành cho chế độ dùng thử (khách)
  const onLoadSampleData = userId ? undefined : handleLoadSampleData;

  // Active state combining API (if logged in) or LocalState (if guest)
  const state: AppState = {
    expenses: userId ? apiExpenses : localState.expenses,
    goals: userId ? apiGoals : localState.goals,
    recurringExpenses: userId ? apiRecurring : localState.recurringExpenses,
    income: userId ? (apiIncome ?? 0) : localState.income,
    budgetTemplate: userId ? ((apiTemplate ?? 'none') as AppState['budgetTemplate']) : localState.budgetTemplate,
    categoryLimits: userId ? (apiLimits ?? {}) : localState.categoryLimits,
    generatedRecurringMonths: userId ? [] : localState.generatedRecurringMonths,
    isSampleData: userId ? false : localState.isSampleData,
  };

  const toastRecurringResult = (syncedCount: number, skippedMissed: number) => {
    if (syncedCount > 0) showToast(recordedMessage(syncedCount), 'success');
    if (skippedMissed > 0) showToast(skippedMessage(skippedMissed), 'warning');
  };

  const syncGuestRecurring = (recurring: RecurringExpense[] = localState.recurringExpenses) => {
    const today = getBusinessDate();
    const result = applyGuestRecurringSync(recurring, localState.expenses, today);
    // Cập nhật theo state mới nhất; hàm thuần và gọi lại không ghi trùng
    setLocalState(prev => {
      const next = applyGuestRecurringSync(prev.recurringExpenses, prev.expenses, today);
      return { ...prev, recurringExpenses: next.recurringExpenses, expenses: next.expenses };
    });
    return result;
  };

  // Tự ghi khoản định kỳ đến hạn: một lần cho mỗi tài khoản (hoặc chế độ khách) mỗi lần mở app
  const autoSyncedForRef = useRef<string | null>(null);
  useEffect(() => {
    if (authState === 'LOADING') return;
    const owner = userId || 'guest';
    if (autoSyncedForRef.current === owner) return;
    autoSyncedForRef.current = owner;

    if (!userId) {
      const result = syncGuestRecurring();
      toastRecurringResult(result.syncedCount, result.skippedMissed);
      return;
    }

    (async () => {
      try {
        const result = await recurringExpenseService.syncRecurring();
        // Đã đổi tài khoản trong lúc chờ: bỏ kết quả
        if (autoSyncedForRef.current !== owner) return;
        toastRecurringResult(result.syncedCount, result.skippedMissed);
        await Promise.all([
          result.syncedCount > 0 ? apiRefetchExpenses() : null,
          apiRefetchRecurring(),
        ]);
      } catch (err) {
        console.warn('Tự động đồng bộ khoản định kỳ thất bại:', err);
      }
    })();
  }, [userId, authState]);

  // Business Action Handlers
  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    if (userId) {
      await apiAddExpense(newExpense);
    } else {
      const expenseWithId: Expense = {
        ...newExpense,
        id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
      };
      setLocalState(prev => ({
        ...prev,
        expenses: [expenseWithId, ...prev.expenses]
      }));
    }
    showToast('Đã thêm giao dịch thành công!', 'success');
  };

  const handleAddBulkExpenses = async (newExpenses: Omit<Expense, 'id'>[]) => {
    if (userId) {
      await apiAddBulkExpenses(newExpenses);
    } else {
      const expensesWithId: Expense[] = newExpenses.map((exp, idx) => ({
        ...exp,
        id: `exp-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      }));
      setLocalState(prev => ({
        ...prev,
        expenses: [...expensesWithId, ...prev.expenses],
      }));
    }
    showToast(`Đã thêm ${newExpenses.length} giao dịch thành công!`, 'success');
  };

  const handleUpdateExpense = async (expense: Expense) => {
    if (userId) {
      await apiUpdateExpense(expense);
    } else {
      setLocalState(prev => ({
        ...prev,
        expenses: prev.expenses.map(e => e.id === expense.id ? expense : e)
      }));
    }
    showToast('Đã cập nhật giao dịch thành công!', 'success');
  };

  const handleDeleteExpense = async (id: string) => {
    if (userId) {
      await apiDeleteExpense(id);
    } else {
      setLocalState(prev => ({
        ...prev,
        expenses: prev.expenses.filter(exp => exp.id !== id)
      }));
    }
    showToast('Đã xóa giao dịch.', 'info');
  };

  const handleUpdateIncome = async (newIncome: number) => {
    if (userId) {
      await apiUpdateBudget({ income: newIncome });
    } else {
      setLocalState(prev => ({
        ...prev,
        income: newIncome
      }));
    }
    showToast('Đã cập nhật thu nhập hàng tháng!', 'success');
  };

  const handleUpdateTemplate = async (template: AppState['budgetTemplate']) => {
    if (userId) {
      await apiUpdateBudget({ budgetTemplate: template });
    } else {
      setLocalState(prev => ({
        ...prev,
        budgetTemplate: template
      }));
    }
  };

  const handleUpdateCategoryLimit = async (categoryId: string, limit: number) => {
    if (userId) {
      const updatedLimits = { ...state.categoryLimits, [categoryId]: limit };
      await apiUpdateBudget({ categoryLimits: updatedLimits });
    } else {
      setLocalState(prev => ({
        ...prev,
        categoryLimits: {
          ...prev.categoryLimits,
          [categoryId]: limit
        }
      }));
    }
  };

  const isDueNow = (rec: RecurringExpense, today: string) =>
    rec.isActive !== false && !!rec.nextPaymentDate && rec.nextPaymentDate <= today;

  // Khoản vừa lưu đã đến hạn thì ghi ngay. Chạy sau khi lưu xong: lỗi ở đây không phải lỗi lưu
  const syncSavedRecurring = async (saved: RecurringExpense) => {
    if (!isDueNow(saved, getBusinessDate())) return;
    const owner = userId;
    try {
      const result = await recurringExpenseService.syncRecurring();
      // Đã đổi tài khoản trong lúc chờ: bỏ kết quả
      if (autoSyncedForRef.current !== owner) return;
      toastRecurringResult(result.syncedCount, result.skippedMissed);
      await Promise.all([
        result.syncedCount > 0 ? apiRefetchExpenses() : null,
        apiRefetchRecurring(),
      ]);
    } catch (err) {
      console.warn('Đồng bộ sau khi lưu khoản định kỳ thất bại:', err);
    }
  };

  // Chế độ khách: danh sách mới chưa có trong localState nên phải truyền vào
  const syncSavedGuestRecurring = (nextList: RecurringExpense[], saved: RecurringExpense, today: string) => {
    if (!isDueNow(saved, today)) return;
    const result = syncGuestRecurring(nextList);
    toastRecurringResult(result.syncedCount, result.skippedMissed);
  };

  const handleAddRecurringExpense = async (newRec: Omit<RecurringExpense, 'id'>) => {
    if (userId) {
      const created = await apiAddRecurring(newRec);
      showToast('Đã thêm khoản chi định kỳ!', 'success');
      void syncSavedRecurring(created);
      return;
    }
    const today = getBusinessDate();
    const recWithId = createGuestRecurring(newRec, today, `rec-${Date.now()}`);
    setLocalState(prev => ({
      ...prev,
      recurringExpenses: [...prev.recurringExpenses, recWithId]
    }));
    showToast('Đã thêm khoản chi định kỳ!', 'success');
    syncSavedGuestRecurring([...localState.recurringExpenses, recWithId], recWithId, today);
  };

  const handleUpdateRecurringExpense = async (rec: RecurringExpense) => {
    if (userId) {
      const updated = await apiUpdateRecurring(rec);
      showToast('Đã cập nhật khoản định kỳ.', 'success');
      void syncSavedRecurring(updated);
      return;
    }
    const today = getBusinessDate();
    const applyUpdate = (list: RecurringExpense[]) =>
      list.map(r => (r.id === rec.id ? updateGuestRecurring(r, rec, today) : r));
    setLocalState(prev => ({ ...prev, recurringExpenses: applyUpdate(prev.recurringExpenses) }));
    showToast('Đã cập nhật khoản định kỳ.', 'success');
    const nextList = applyUpdate(localState.recurringExpenses);
    const saved = nextList.find(r => r.id === rec.id);
    if (saved) syncSavedGuestRecurring(nextList, saved, today);
  };

  const handleDeleteRecurringExpense = async (id: string) => {
    if (userId) {
      await apiDeleteRecurring(id);
    } else {
      setLocalState(prev => ({
        ...prev,
        recurringExpenses: prev.recurringExpenses.filter(r => r.id !== id)
      }));
    }
    showToast('Đã xóa khoản định kỳ.', 'info');
  };

  const handleTriggerManualRecurringSync = async () => {
    try {
      const result = userId ? await apiSyncRecurring() : syncGuestRecurring();
      if (userId && result.syncedCount > 0) await apiRefetchExpenses();
      toastRecurringResult(result.syncedCount, result.skippedMissed);
      if (result.syncedCount === 0 && result.skippedMissed === 0) {
        showToast('Chưa có khoản định kỳ nào đến hạn cần ghi.', 'info');
      }
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Lỗi đồng bộ chi tiêu định kỳ'), 'error');
    }
  };

  const handleAddGoal = async (newGoal: Omit<Goal, 'id' | 'createdAt'>) => {
    const goalData: Omit<Goal, 'id'> = {
      ...newGoal,
      createdAt: new Date().toISOString().slice(0, 10)
    };
    if (userId) {
      await apiAddGoal(goalData);
    } else {
      const goalWithId: Goal = {
        ...goalData,
        id: `goal-${Date.now()}`
      };
      setLocalState(prev => ({
        ...prev,
        goals: [...prev.goals, goalWithId]
      }));
    }
    showToast('Đã tạo mục tiêu tiết kiệm mới!', 'success');
  };

  const handleUpdateGoalProgress = async (goalId: string, newCurrent: number) => {
    const targetGoal = state.goals.find(g => g.id === goalId);
    // Ném lỗi để form không báo lưu thành công
    if (!targetGoal) throw new Error('Không tìm thấy mục tiêu cần cập nhật.');
    const updatedGoal: Goal = { ...targetGoal, current: newCurrent };

    if (userId) {
      await apiUpdateGoal(updatedGoal);
    } else {
      setLocalState(prev => ({
        ...prev,
        goals: prev.goals.map(g => g.id === goalId ? updatedGoal : g)
      }));
    }
    showToast('Đã cập nhật tiến độ mục tiêu!', 'success');
  };

  const handleDeleteGoal = async (goalId: string) => {
    if (userId) {
      await apiDeleteGoal(goalId);
    } else {
      setLocalState(prev => ({
        ...prev,
        goals: prev.goals.filter(g => g.id !== goalId)
      }));
    }
    showToast('Đã xóa mục tiêu.', 'info');
  };

  const handleLogout = async () => {
    try {
      await logout();
      setViewState('landing');
      showToast('Đã đăng xuất thành công.', 'info');
    } catch (e) {
      showToast('Lỗi khi đăng xuất.', 'error');
    }
  };

  // Lỗi được ném tiếp để SettingsTab báo lỗi và giữ nguyên phiên
  const handleLogoutAll = async () => {
    await logoutAll();
    setViewState('landing');
  };

  // Chỉ chặn màn hình khi kiểm tra phiên lần đầu; không unmount AuthModal khi đang gửi form
  if (authState === 'LOADING') {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 font-serif">
        <div className="flex flex-col items-center gap-3 bg-[#FCFAF4] border-2 border-[#E6DEC9] p-8 rounded-2xl shadow-lg text-center max-w-xs w-full">
          <span className="text-4xl animate-bounce">📔</span>
          <h2 className="text-lg font-bold text-emerald-950">SỔ TAY CHI TIÊU</h2>
          <div className="flex items-center gap-2 text-xs text-stone-500 font-sans mt-2">
            <div className="w-4 h-4 border-2 border-emerald-800 border-t-transparent rounded-full animate-spin"></div>
            <span>Đang xác thực tài khoản...</span>
          </div>
        </div>
      </div>
    );
  }

  // AuthModal đặt ngoài hai nhánh để không bị mount lại khi chuyển từ landing sang app
  const authModal = isAuthModalOpen && (
    <AuthModal
      isOpen={isAuthModalOpen}
      onClose={() => setIsAuthModalOpen(false)}
      defaultTab={authModalTab}
      initialToken={resetTokenFromUrl}
    />
  );

  const landingPage = (
    <LandingPage
      onOpenLogin={() => {
        setAuthModalTab('login');
        setIsAuthModalOpen(true);
      }}
      onOpenRegister={() => {
        setAuthModalTab('register');
        setIsAuthModalOpen(true);
      }}
      onStartDemo={() => setViewState('app')}
      onTryChatbot={() => {
        setActiveTab('chatbot');
        setViewState('app');
      }}
      isLoggedIn={!!currentUser}
      userName={currentUser?.displayName}
    />
  );

  const appShell = (
    <AppShell
      activeTab={activeTab}
      onSelectTab={(tab) => setActiveTab(tab)}
      currentUser={currentUser}
      onLogout={handleLogout}
      onOpenAuth={() => {
        setAuthModalTab('login');
        setIsAuthModalOpen(true);
      }}
      onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      onNavigateHome={() => setViewState('landing')}
      onLoadSampleData={onLoadSampleData}
      stats={{
        totalExpensesCount: state.expenses.length,
        activeGoalsCount: state.goals.length,
        activeRecurringCount: state.recurringExpenses.filter(r => r.isActive !== false).length,
      }}
    >
      <Suspense fallback={<TabSkeleton />}>
        {activeTab === 'overview' && (
          <OverviewTab
            expenses={state.expenses}
            goals={state.goals}
            income={state.income}
            categoryLimits={state.categoryLimits}
            recurringExpenses={state.recurringExpenses}
            onUpdateIncome={handleUpdateIncome}
            onAddGoal={handleAddGoal}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onDeleteGoal={handleDeleteGoal}
            onQuickAdd={() => setIsQuickAddOpen(true)}
            onNavigateTab={(tab) => setActiveTab(tab)}
            onTriggerManualRecurringSync={handleTriggerManualRecurringSync}
            onAddExpense={handleAddExpense}
          />
        )}

        {activeTab === 'expenses' && (
          <ExpensesTab
            expenses={state.expenses}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onUpdateExpense={handleUpdateExpense}
            onAddBulkExpenses={handleAddBulkExpenses}
            onRefetchExpenses={userId ? apiRefetchExpenses : undefined}
          />
        )}

        {activeTab === 'wallets' && (
          <WalletsTab
            income={state.income}
            totalExpenses={state.expenses.reduce((s, e) => s + e.amount, 0)}
          />
        )}

        {activeTab === 'budget' && (
          <BudgetTab
            expenses={state.expenses}
            income={state.income}
            budgetTemplate={state.budgetTemplate}
            categoryLimits={state.categoryLimits}
            recurringExpenses={state.recurringExpenses}
            onUpdateTemplate={handleUpdateTemplate}
            onUpdateCategoryLimit={handleUpdateCategoryLimit}
            onAddRecurringExpense={handleAddRecurringExpense}
            onDeleteRecurringExpense={handleDeleteRecurringExpense}
            onTriggerManualRecurringSync={handleTriggerManualRecurringSync}
          />
        )}

        {activeTab === 'goals' && (
          <GoalsTab
            expenses={state.expenses}
            goals={state.goals}
            income={state.income}
            onUpdateIncome={handleUpdateIncome}
            onAddGoal={handleAddGoal}
            onUpdateGoalProgress={handleUpdateGoalProgress}
            onDeleteGoal={handleDeleteGoal}
          />
        )}

        {activeTab === 'recurring' && (
          <RecurringTab
            recurringExpenses={state.recurringExpenses}
            income={state.income}
            loadError={userId ? recurringError : null}
            onAddRecurringExpense={handleAddRecurringExpense}
            onUpdateRecurringExpense={handleUpdateRecurringExpense}
            onDeleteRecurringExpense={handleDeleteRecurringExpense}
            onTriggerManualRecurringSync={handleTriggerManualRecurringSync}
          />
        )}

        {activeTab === 'reports' && (
          <ReportsTab state={state} />
        )}

        {activeTab === 'chatbot' && (
          <ChatbotTab
            expenses={state.expenses}
            categoryLimits={state.categoryLimits}
            goals={state.goals}
            income={state.income}
            recurringExpenses={state.recurringExpenses}
            onAddExpense={handleAddExpense}
            onAddBulkExpenses={handleAddBulkExpenses}
            onUpdateExpense={handleUpdateExpense}
            onDeleteExpense={handleDeleteExpense}
            currentUser={currentUser}
            onOpenAuthModal={() => {
              setAuthModalTab('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsTab
            currentUser={currentUser}
            state={state}
            onLogout={handleLogout}
            onLogoutAll={handleLogoutAll}
            onLoadSampleData={onLoadSampleData}
            onOpenAuth={() => {
              setAuthModalTab('login');
              setIsAuthModalOpen(true);
            }}
          />
        )}

        {activeTab === 'about' && (
          <AboutTab
            onGoToApp={() => setActiveTab('overview')}
            onGoToChatbot={() => setActiveTab('chatbot')}
          />
        )}
      </Suspense>

      {/* Quick Add Expense Modal */}
      <QuickAddExpenseModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onAddExpense={handleAddExpense}
      />

      {/* Onboarding Modal */}
      <React.Fragment key={onboardingKey}>
        <OnboardingModal
          storageKey={onboardingKey}
          isGuest={!userId}
          isOpen={isOnboardingOpen}
          onClose={() => setClosedOnboardingKey(onboardingKey)}
          onNavigateTab={(tab) => setActiveTab(tab as NavTabKey)}
        />
      </React.Fragment>
    </AppShell>
  );

  return (
    <>
      {viewState === 'landing' ? landingPage : appShell}
      {authModal}
    </>
  );
}

export default LedgerApp;
