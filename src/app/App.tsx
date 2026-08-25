import React, { useState, useEffect, Suspense, lazy } from 'react';
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

export function LedgerApp() {
  const { currentUser, loading: authLoading, logout } = useAuth();
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

  // Onboarding tour state
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(() => {
    const completed = localStorage.getItem('so_tay_onboarding_completed');
    return !completed;
  });

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
  } = useTransactions(userId);

  const { 
    goals: apiGoals, 
    addGoal: apiAddGoal, 
    updateGoal: apiUpdateGoal, 
    deleteGoal: apiDeleteGoal, 
  } = useGoals(userId);

  const { 
    recurringExpenses: apiRecurring, 
    addRecurringExpense: apiAddRecurring, 
    deleteRecurringExpense: apiDeleteRecurring, 
    syncRecurring: apiSyncRecurring,
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
  } = useBackupRestore(
    userId,
    {
      updateBudget: apiUpdateBudget,
      addBulkExpenses: apiAddBulkExpenses,
      addGoal: apiAddGoal,
    },
    showToast
  );

  // Active state combining API (if logged in) or LocalState (if guest)
  const state: AppState = {
    expenses: userId ? apiExpenses : localState.expenses,
    goals: userId ? apiGoals : localState.goals,
    recurringExpenses: userId ? apiRecurring : localState.recurringExpenses,
    income: userId ? (apiIncome !== undefined ? apiIncome : localState.income) : localState.income,
    budgetTemplate: userId ? (apiTemplate as any || localState.budgetTemplate) : localState.budgetTemplate,
    categoryLimits: userId ? (apiLimits || localState.categoryLimits) : localState.categoryLimits,
    generatedRecurringMonths: localState.generatedRecurringMonths,
    isSampleData: userId ? false : localState.isSampleData,
  };

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

  const handleAddRecurringExpense = async (newRec: Omit<RecurringExpense, 'id'>) => {
    if (userId) {
      await apiAddRecurring(newRec);
    } else {
      const recWithId: RecurringExpense = {
        ...newRec,
        id: `rec-${Date.now()}`
      };
      setLocalState(prev => ({
        ...prev,
        recurringExpenses: [...prev.recurringExpenses, recWithId]
      }));
    }
    showToast('Đã thêm khoản chi định kỳ!', 'success');
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
    if (userId) {
      try {
        const res = await apiSyncRecurring();
        showToast(res.message || 'Đã đồng bộ chi tiêu định kỳ!', 'success');
      } catch (err: any) {
        showToast(err?.message || 'Lỗi đồng bộ chi tiêu định kỳ', 'error');
      }
      return;
    }

    const today = new Date();
    const newExpensesToInsert: Omit<Expense, 'id'>[] = [];
    state.recurringExpenses.forEach(rec => {
      const dayStr = String(rec.dayOfMonth).padStart(2, '0');
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${dayStr}`;
      
      const isAlreadyAdded = state.expenses.some(exp => 
        exp.categoryId === rec.categoryId && 
        exp.amount === rec.amount && 
        exp.date === dateStr &&
        exp.note === rec.note
      );
      
      if (!isAlreadyAdded) {
        newExpensesToInsert.push({
          amount: rec.amount,
          categoryId: rec.categoryId,
          date: dateStr,
          note: `${rec.note} (Tự động định kỳ)`
        });
      }
    });

    if (newExpensesToInsert.length === 0) {
      showToast('Tất cả khoản chi định kỳ tháng này đã được cập nhật trước đó.', 'info');
      return;
    }

    for (const item of newExpensesToInsert) {
      await handleAddExpense(item);
    }
    showToast(`Đã đồng bộ thành công ${newExpensesToInsert.length} khoản chi định kỳ!`, 'success');
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
    if (!targetGoal) return;
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

  if (authLoading) {
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

  if (viewState === 'landing') {
    return (
      <>
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
          isLoggedIn={!!currentUser}
          userName={currentUser?.displayName}
        />
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          defaultTab={authModalTab}
        />
      </>
    );
  }

  return (
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
      onLoadSampleData={handleLoadSampleData}
      stats={{
        totalExpensesCount: state.expenses.length,
        activeGoalsCount: state.goals.length,
        activeRecurringCount: state.recurringExpenses.length,
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
            onAddRecurringExpense={handleAddRecurringExpense}
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
            onLoadSampleData={handleLoadSampleData}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
        initialToken={resetTokenFromUrl}
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab as NavTabKey)}
      />
    </AppShell>
  );
}

export default LedgerApp;
