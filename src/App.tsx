import React, { useState, useEffect } from 'react';
import { AppState, Expense, Goal, RecurringExpense } from './types';
import OverviewTab from './components/OverviewTab';
import ChatbotTab from './components/ChatbotTab';
import ExpensesTab from './components/ExpensesTab';
import BudgetTab from './components/BudgetTab';
import GoalsTab from './components/GoalsTab';
import AboutTab from './components/AboutTab';
import InsightsTab from './components/InsightsTab';
import OnboardingModal from './components/OnboardingModal';
import QuickAddExpenseModal from './components/QuickAddExpenseModal';
import MobileBottomNav from './components/MobileBottomNav';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import LandingPage from './components/LandingPage';
import { generateSampleState, EMPTY_STATE } from './data/sampleData';
import { useExpenses, useGoals, useRecurringExpenses, useBudget } from './hooks';
import { 
  BookOpen, 
  MessageSquare, 
  Receipt, 
  Wallet, 
  HelpCircle, 
  SlidersHorizontal,
  PiggyBank,
  Download,
  Upload,
  LogIn,
  LogOut,
  User as UserIcon,
  Home,
  Sparkles,
  Trash2,
  Cloud,
  CloudOff,
  Activity,
  Plus
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'so_tay_ledger_data';

function LedgerApp() {
  const { currentUser, loading: authLoading, logout } = useAuth();
  const { showToast } = useToast();
  const userId = currentUser?.uid || null;

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [viewState, setViewState] = useState<'landing' | 'app'>('landing');
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

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

  // Local state as offline cache
  const [localState, setLocalState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.goals) && typeof parsed.income === 'number') {
          return {
            ...parsed,
            categoryLimits: parsed.categoryLimits || {},
            recurringExpenses: parsed.recurringExpenses || [],
            generatedRecurringMonths: parsed.generatedRecurringMonths || [],
            budgetTemplate: parsed.budgetTemplate || 'none'
          };
        }
      }
    } catch (e) {
      console.error('Error loading ledger data from localStorage:', e);
    }
    return generateSampleState();
  });

  // Firestore hooks
  const { 
    expenses: firestoreExpenses, 
    addExpense: fsAddExpense, 
    deleteExpense: fsDeleteExpense, 
    loading: expensesLoading, 
    error: expensesError 
  } = useExpenses(userId);

  const { 
    goals: firestoreGoals, 
    addGoal: fsAddGoal, 
    updateGoal: fsUpdateGoal, 
    deleteGoal: fsDeleteGoal, 
    loading: goalsLoading, 
    error: goalsError 
  } = useGoals(userId);

  const { 
    recurringExpenses: firestoreRecurring, 
    addRecurringExpense: fsAddRecurring, 
    deleteRecurringExpense: fsDeleteRecurring, 
    loading: recurringLoading, 
    error: recurringError 
  } = useRecurringExpenses(userId);

  const { 
    income: firestoreIncome, 
    budgetTemplate: firestoreTemplate, 
    categoryLimits: firestoreLimits, 
    generatedRecurringMonths: firestoreMonths, 
    updateBudgetSettings: fsUpdateBudget, 
    loading: budgetLoading, 
    error: budgetError 
  } = useBudget(userId);

  // Active state combining Firestore (if logged in) or LocalState (if guest)
  const state: AppState = {
    expenses: userId ? firestoreExpenses : localState.expenses,
    goals: userId ? firestoreGoals : localState.goals,
    recurringExpenses: userId ? firestoreRecurring : localState.recurringExpenses,
    income: userId ? (firestoreIncome !== undefined ? firestoreIncome : localState.income) : localState.income,
    budgetTemplate: userId ? (firestoreTemplate || localState.budgetTemplate) : localState.budgetTemplate,
    categoryLimits: userId ? (firestoreLimits || localState.categoryLimits) : localState.categoryLimits,
    generatedRecurringMonths: userId ? (firestoreMonths || localState.generatedRecurringMonths) : localState.generatedRecurringMonths,
    isSampleData: userId ? false : localState.isSampleData,
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'chatbot' | 'budget' | 'expenses' | 'goals' | 'insights' | 'about'>('overview');

  // Sync localState to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localState));
    } catch (e) {
      console.error('Error saving ledger data to localStorage:', e);
    }
  }, [localState]);

  // Actions
  const handleAddExpense = async (newExpense: Omit<Expense, 'id'>) => {
    if (userId) {
      await fsAddExpense(newExpense);
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

  const handleDeleteExpense = async (id: string) => {
    if (userId) {
      await fsDeleteExpense(id);
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
      await fsUpdateBudget({ income: newIncome });
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
      await fsUpdateBudget({ budgetTemplate: template });
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
      await fsUpdateBudget({ categoryLimits: updatedLimits });
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
      await fsAddRecurring(newRec);
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
  };

  const handleDeleteRecurringExpense = async (id: string) => {
    if (userId) {
      await fsDeleteRecurring(id);
    } else {
      setLocalState(prev => ({
        ...prev,
        recurringExpenses: prev.recurringExpenses.filter(r => r.id !== id)
      }));
    }
  };

  const handleTriggerManualRecurringSync = async () => {
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
      await fsAddGoal(goalData);
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
      await fsUpdateGoal(updatedGoal);
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
      await fsDeleteGoal(goalId);
    } else {
      setLocalState(prev => ({
        ...prev,
        goals: prev.goals.filter(g => g.id !== goalId)
      }));
    }
    showToast('Đã xóa mục tiêu.', 'info');
  };

  const handleLoadSampleData = () => {
    setLocalState(generateSampleState());
    showToast('Đã nạp 3 tuần dữ liệu mẫu thực tế!', 'success');
  };

  const handleClearSampleData = () => {
    setLocalState({
      ...EMPTY_STATE,
      isSampleData: false
    });
    showToast('Đã xóa dữ liệu mẫu.', 'info');
  };

  const handleBackupData = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `so_tay_chi_tieu_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Đã tải tệp sao lưu dữ liệu!', 'success');
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (event.target.files && event.target.files[0]) {
      fileReader.readAsText(event.target.files[0], "UTF-8");
      fileReader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (parsed && Array.isArray(parsed.expenses)) {
            setLocalState({
              ...parsed,
              isSampleData: false
            });
            showToast('Đã khôi phục dữ liệu từ tệp thành công!', 'success');
          } else {
            showToast('Tệp không đúng định dạng sao lưu của Sổ Tay Chi Tiêu.', 'error');
          }
        } catch (error) {
          showToast('Lỗi khi đọc tệp JSON.', 'error');
        }
      };
    }
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

  if (viewState === 'landing' && !currentUser) {
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
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 flex flex-col font-sans antialiased selection:bg-amber-200 selection:text-emerald-950 pb-16 md:pb-0">
      {/* Header Band */}
      <header className="sticky top-0 z-40 bg-emerald-950/95 backdrop-blur-md text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('overview')}
              className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center text-xl shadow font-serif font-black shrink-0 cursor-pointer hover:bg-amber-400 transition"
              title="Về Trang chủ Tổng quan"
            >
              📔
            </button>
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-xl sm:text-2xl font-black tracking-wide text-amber-50 flex items-center gap-2">
                SỔ TAY CHI TIÊU THÔNG MINH
              </h1>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-[10px] sm:text-[11px] text-emerald-200/90 font-mono tracking-widest uppercase font-semibold">
                  Bảng điều khiển tương tác AI
                </p>
                {userId ? (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-900/90 text-amber-300 border border-emerald-700/80 px-2 py-0.5 rounded-full font-mono">
                    <Cloud size={10} className="text-amber-400" />
                    <span>Firestore Realtime</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-amber-900/40 text-amber-200 border border-amber-700/40 px-2 py-0.5 rounded-full font-mono">
                    <CloudOff size={10} className="text-amber-400" />
                    <span>Bộ nhớ Cục bộ</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            {/* Quick Add Button */}
            <button
              onClick={() => setIsQuickAddOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm min-h-[36px]"
            >
              <Plus size={15} />
              <span className="hidden sm:inline">Ghi nhanh</span>
            </button>

            <button
              onClick={() => setViewState('landing')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700/80 hover:border-emerald-600 bg-emerald-900/60 hover:bg-emerald-900/90 text-emerald-100 font-semibold text-xs rounded-xl transition cursor-pointer min-h-[36px]"
              title="Quay lại Màn hình Giới thiệu"
            >
              <Home size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Giới thiệu</span>
            </button>

            {currentUser ? (
              <div className="flex items-center gap-2 bg-emerald-900/80 border border-emerald-700/80 px-3 py-1.5 rounded-xl text-xs text-emerald-100 shadow-xs">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Avatar" 
                    className="w-7 h-7 rounded-full object-cover border border-amber-400 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {(currentUser?.displayName || currentUser?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left max-w-[100px] sm:max-w-[150px]">
                  <span className="font-semibold text-white truncate text-xs">
                    {currentUser?.displayName || 'Người dùng'}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                  title="Đăng xuất"
                >
                  <LogOut size={13} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalTab('login');
                  setIsAuthModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-sm min-h-[36px]"
              >
                <LogIn size={15} />
                <span>Đăng nhập</span>
              </button>
            )}

            <button
              onClick={handleLoadSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/80 hover:border-amber-400 bg-amber-600/30 hover:bg-amber-600/60 text-amber-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Nạp dữ liệu mẫu"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span className="hidden md:inline">Dữ liệu mẫu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        <div className="bg-[#FCFAF4] border-4 border-double border-[#E6DEC9] rounded-xl p-4 sm:p-7 shadow-sm min-h-[500px] flex flex-col gap-6">
          
          {/* Tabs Navigation */}
          <div className="hidden md:flex flex-wrap border-b-2 border-emerald-900">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <Wallet size={16} className={activeTab === 'overview' ? 'text-amber-600' : ''} />
              Tổng quan
            </button>

            <button
              onClick={() => setActiveTab('chatbot')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'chatbot'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <MessageSquare size={16} className={activeTab === 'chatbot' ? 'text-amber-600' : ''} />
              Trợ lý AI
            </button>

            <button
              onClick={() => setActiveTab('insights')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <Activity size={16} className={activeTab === 'insights' ? 'text-amber-600' : ''} />
              Sức khỏe AI
            </button>

            <button
              onClick={() => setActiveTab('budget')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'budget'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <SlidersHorizontal size={16} className={activeTab === 'budget' ? 'text-amber-600' : ''} />
              Ngân sách
            </button>

            <button
              onClick={() => setActiveTab('expenses')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'expenses'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <Receipt size={16} className={activeTab === 'expenses' ? 'text-amber-600' : ''} />
              Chi tiêu
            </button>

            <button
              onClick={() => setActiveTab('goals')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'goals'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <PiggyBank size={16} className={activeTab === 'goals' ? 'text-amber-600' : ''} />
              Mục tiêu
            </button>

            <button
              onClick={() => setActiveTab('about')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'about'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <BookOpen size={16} className={activeTab === 'about' ? 'text-amber-600' : ''} />
              Giới thiệu
            </button>
          </div>

          {/* Render Active Tab */}
          <div className="flex-1">
            {activeTab === 'overview' && (
              <OverviewTab
                expenses={state.expenses}
                goals={state.goals}
                income={state.income}
                onUpdateIncome={handleUpdateIncome}
                onAddGoal={handleAddGoal}
                onUpdateGoalProgress={handleUpdateGoalProgress}
                onDeleteGoal={handleDeleteGoal}
              />
            )}

            {activeTab === 'chatbot' && (
              <ChatbotTab
                expenses={state.expenses}
                categoryLimits={state.categoryLimits}
                goals={state.goals}
                income={state.income}
                onAddExpense={handleAddExpense}
                currentUser={currentUser}
                onOpenAuthModal={() => {
                  setAuthModalTab('login');
                  setIsAuthModalOpen(true);
                }}
              />
            )}

            {activeTab === 'insights' && (
              <InsightsTab state={state} />
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

            {activeTab === 'expenses' && (
              <ExpensesTab
                expenses={state.expenses}
                onAddExpense={handleAddExpense}
                onDeleteExpense={handleDeleteExpense}
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

            {activeTab === 'about' && (
              <AboutTab
                onGoToApp={() => setActiveTab('overview')}
                onGoToChatbot={() => setActiveTab('chatbot')}
              />
            )}
          </div>
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileBottomNav
        activeTab={activeTab}
        onChangeTab={(tab) => setActiveTab(tab)}
        onOpenQuickAdd={() => setIsQuickAddOpen(true)}
      />

      {/* Quick Add Modal */}
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
      />

      {/* Onboarding Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Footer */}
      <footer className="border-t border-[#E6DEC9] bg-[#FAF7F0] py-4 text-center text-[11px] text-stone-400 font-sans shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Sổ tay chi tiêu thông minh — Fullstack AI Platform</span>
          <a
            href="https://hophuloc.online"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-stone-700 transition underline decoration-stone-300"
          >
            hophuloc.online
          </a>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <LedgerApp />
      </ToastProvider>
    </AuthProvider>
  );
}
