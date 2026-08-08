import React, { useState, useEffect } from 'react';
import { AppState, Expense, Goal, RecurringExpense } from './types';
import OverviewTab from './components/OverviewTab';
import ChatbotTab from './components/ChatbotTab';
import ExpensesTab from './components/ExpensesTab';
import BudgetTab from './components/BudgetTab';
import GoalsTab from './components/GoalsTab';
import AboutTab from './components/AboutTab';
import OnboardingModal from './components/OnboardingModal';
import AuthModal from './components/AuthModal';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './components/LandingPage';
import { generateSampleState, EMPTY_STATE } from './data/sampleData';
import { 
  BookOpen, 
  MessageSquare, 
  Receipt, 
  Wallet, 
  HelpCircle, 
  RefreshCw,
  SlidersHorizontal,
  PiggyBank,
  Download,
  Upload,
  LogIn,
  LogOut,
  User as UserIcon,
  Home,
  Sparkles,
  Trash2
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'so_tay_ledger_data';

function LedgerApp() {
  const { currentUser, logout } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [viewState, setViewState] = useState<'landing' | 'app'>('landing');

  // Onboarding tour state - opens automatically if not completed
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

  const [state, setState] = useState<AppState>(() => {
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
    // Return dynamically generated sample state for 2-3 weeks if no saved data exists
    return generateSampleState();
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'chatbot' | 'budget' | 'expenses' | 'goals' | 'about'>('overview');

  // Auto-generation of recurring expenses on mount exactly once (safely)
  useEffect(() => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    setState(prev => {
      if (prev.generatedRecurringMonths.includes(currentMonthStr)) {
        return prev;
      }
      
      const newExpensesToInsert: Expense[] = [];
      prev.recurringExpenses.forEach(rec => {
        const dayStr = String(rec.dayOfMonth).padStart(2, '0');
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${dayStr}`;
        
        // Prevent double insertion
        const isAlreadyAdded = prev.expenses.some(exp => 
          exp.categoryId === rec.categoryId && 
          exp.amount === rec.amount && 
          exp.date === dateStr &&
          exp.note === rec.note
        );
        
        if (!isAlreadyAdded) {
          newExpensesToInsert.push({
            id: `exp-rec-${rec.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            amount: rec.amount,
            categoryId: rec.categoryId,
            note: rec.note,
            date: dateStr
          });
        }
      });
      
      return {
        ...prev,
        expenses: [...newExpensesToInsert, ...prev.expenses],
        generatedRecurringMonths: [...prev.generatedRecurringMonths, currentMonthStr]
      };
    });
  }, []);

  // Sync to local storage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Error saving ledger data to localStorage:', e);
    }
  }, [state]);

  // Actions
  const handleAddExpense = (newExpense: Omit<Expense, 'id'>) => {
    const expenseWithId: Expense = {
      ...newExpense,
      id: `exp-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`
    };
    setState(prev => ({
      ...prev,
      expenses: [expenseWithId, ...prev.expenses]
    }));
  };

  const handleDeleteExpense = (id: string) => {
    setState(prev => ({
      ...prev,
      expenses: prev.expenses.filter(exp => exp.id !== id)
    }));
  };

  const handleUpdateIncome = (newIncome: number) => {
    setState(prev => ({
      ...prev,
      income: newIncome
    }));
  };

  const handleUpdateTemplate = (template: AppState['budgetTemplate']) => {
    setState(prev => ({
      ...prev,
      budgetTemplate: template
    }));
  };

  const handleUpdateCategoryLimit = (categoryId: string, limit: number) => {
    setState(prev => ({
      ...prev,
      categoryLimits: {
        ...prev.categoryLimits,
        [categoryId]: limit
      }
    }));
  };

  const handleAddRecurringExpense = (newRec: Omit<RecurringExpense, 'id'>) => {
    const recWithId: RecurringExpense = {
      ...newRec,
      id: `rec-${Date.now()}`
    };
    setState(prev => ({
      ...prev,
      recurringExpenses: [...prev.recurringExpenses, recWithId]
    }));
  };

  const handleDeleteRecurringExpense = (id: string) => {
    setState(prev => ({
      ...prev,
      recurringExpenses: prev.recurringExpenses.filter(r => r.id !== id)
    }));
  };

  const handleTriggerManualRecurringSync = () => {
    const today = new Date();
    const currentMonthStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    
    setState(prev => {
      const newExpensesToInsert: Expense[] = [];
      prev.recurringExpenses.forEach(rec => {
        const dayStr = String(rec.dayOfMonth).padStart(2, '0');
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${dayStr}`;
        
        const isAlreadyAdded = prev.expenses.some(exp => 
          exp.categoryId === rec.categoryId && 
          exp.amount === rec.amount && 
          exp.date === dateStr &&
          exp.note === rec.note
        );
        
        if (!isAlreadyAdded) {
          newExpensesToInsert.push({
            id: `exp-rec-manual-${rec.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            amount: rec.amount,
            categoryId: rec.categoryId,
            note: rec.note,
            date: dateStr
          });
        }
      });
      
      if (newExpensesToInsert.length === 0) {
        alert('Tất cả khoản chi tiêu định kỳ của tháng này đã được đồng bộ từ trước!');
        return prev;
      }
      
      alert(`Đã tự động tạo thành công ${newExpensesToInsert.length} giao dịch chi tiêu định kỳ vào Sổ tay chi tiết!`);
      return {
        ...prev,
        expenses: [...newExpensesToInsert, ...prev.expenses],
        generatedRecurringMonths: prev.generatedRecurringMonths.includes(currentMonthStr)
          ? prev.generatedRecurringMonths
          : [...prev.generatedRecurringMonths, currentMonthStr]
      };
    });
  };

  const handleAddGoal = (newGoal: Omit<Goal, 'id' | 'createdAt'>) => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const goalWithId: Goal = {
      ...newGoal,
      id: `goal-${Date.now()}`,
      createdAt: todayStr
    };
    setState(prev => ({
      ...prev,
      goals: [...prev.goals, goalWithId]
    }));
  };

  const handleUpdateGoalProgress = (id: string, currentAmount: number) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.map(g => g.id === id ? { ...g, current: currentAmount } : g)
    }));
  };

  const handleDeleteGoal = (id: string) => {
    setState(prev => ({
      ...prev,
      goals: prev.goals.filter(g => g.id !== id)
    }));
  };

  const handleBackupData = () => {
    try {
      const dataStr = JSON.stringify(state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `so_tay_ledger_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Đã xảy ra lỗi khi sao lưu dữ liệu!');
      console.error(e);
    }
  };

  const handleRestoreData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (typeof result !== 'string') {
          throw new Error('Dữ liệu không đúng định dạng');
        }
        const parsed = JSON.parse(result);
        
        if (parsed && typeof parsed === 'object') {
          const restoredState: AppState = {
            expenses: Array.isArray(parsed.expenses) ? parsed.expenses : [],
            goals: Array.isArray(parsed.goals) ? parsed.goals : [],
            income: typeof parsed.income === 'number' ? parsed.income : 0,
            budgetTemplate: parsed.budgetTemplate || 'none',
            categoryLimits: parsed.categoryLimits && typeof parsed.categoryLimits === 'object' ? parsed.categoryLimits : {},
            recurringExpenses: Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [],
            generatedRecurringMonths: Array.isArray(parsed.generatedRecurringMonths) ? parsed.generatedRecurringMonths : [],
            isSampleData: !!parsed.isSampleData
          };

          setState(restoredState);
          alert('Khôi phục dữ liệu thành công!');
        } else {
          alert('Tệp sao lưu không hợp lệ!');
        }
      } catch (err) {
        alert('Có lỗi xảy ra khi đọc tệp sao lưu. Vui lòng kiểm tra lại định dạng tệp!');
        console.error(err);
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };

  const handleLoadSampleData = () => {
    const sampleState = generateSampleState();
    setState(sampleState);
    alert('Đã nạp 3 tuần dữ liệu chi tiêu mẫu thực tế thành công!');
  };

  const handleClearSampleData = () => {
    if (confirm('Bạn có chắc chắn muốn xóa toàn bộ dữ liệu mẫu và bắt đầu từ đầu với sổ tay trống?')) {
      setState(EMPTY_STATE);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(EMPTY_STATE));
      alert('Đã xóa dữ liệu mẫu! Sổ tay của bạn hiện sẵn sàng để ghi chép dữ liệu thực tế.');
    }
  };

  const handleLogout = async () => {
    await logout();
    setViewState('landing');
  };

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
          userName={currentUser?.displayName || currentUser?.email}
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
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 flex flex-col antialiased">
      {/* Top Header styled like a heavy leather-notebook top band */}
      <header className="bg-emerald-950 text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3.5 sm:py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setViewState('landing')}
              className="w-10 h-10 bg-amber-500 hover:bg-amber-400 rounded-lg flex items-center justify-center text-xl shadow font-serif font-black shrink-0 transition cursor-pointer"
              title="Quay lại trang Giới thiệu"
            >
              📔
            </button>
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-xl sm:text-2xl font-black tracking-wide text-amber-50 flex items-center gap-2">
                SỔ TAY CHI TIÊU THÔNG MINH
              </h1>
              <p className="text-[10px] sm:text-[11px] text-emerald-200/90 font-mono tracking-widest uppercase font-semibold">
                Bảng điều khiển tương tác AI
              </p>
            </div>
          </div>

          {/* Action buttons & Authentication Status */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            {/* Back to Home Landing button */}
            <button
              onClick={() => setViewState('landing')}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700/80 hover:border-emerald-600 bg-emerald-900/60 hover:bg-emerald-900/90 text-emerald-100 font-semibold text-xs rounded-xl transition cursor-pointer min-h-[36px]"
              title="Quay lại Màn hình Giới thiệu"
            >
              <Home size={14} className="text-amber-400" />
              <span className="hidden sm:inline">Giới thiệu</span>
            </button>

            {/* User Auth Widget */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-emerald-900/80 border border-emerald-700/80 px-3 py-1.5 rounded-xl text-xs text-emerald-100 shadow-xs">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt="Avatar" 
                    className="w-7 h-7 rounded-full object-cover border border-amber-400 shrink-0" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                    {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex flex-col text-left max-w-[100px] sm:max-w-[150px]">
                  <span className="font-semibold text-white truncate text-xs">
                    {currentUser.displayName || 'Người dùng'}
                  </span>
                  <span className="text-[10px] text-emerald-300 truncate">
                    {currentUser.email}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-1 px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/40 rounded-lg transition cursor-pointer flex items-center gap-1 shrink-0"
                  title="Đăng xuất khỏi hệ thống"
                >
                  <LogOut size={13} />
                  <span className="hidden sm:inline text-[11px] font-semibold">Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
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
                <button
                  onClick={() => {
                    setAuthModalTab('register');
                    setIsAuthModalOpen(true);
                  }}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700 hover:border-emerald-600 bg-emerald-900/60 hover:bg-emerald-900/90 text-emerald-100 font-semibold text-xs rounded-xl transition cursor-pointer min-h-[36px]"
                >
                  <UserIcon size={14} />
                  <span>Đăng ký</span>
                </button>
              </div>
            )}

            <div className="h-6 w-[1px] bg-emerald-800 hidden sm:block mx-0.5"></div>

            <button
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/80 hover:border-amber-400 bg-amber-600/30 hover:bg-amber-600/60 text-amber-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Xem lại hướng dẫn nhanh sử dụng ứng dụng"
            >
              <HelpCircle size={13} className="text-amber-300" />
              <span className="hidden md:inline">Hướng dẫn</span>
            </button>

            <button
              onClick={handleLoadSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/80 hover:border-amber-400 bg-amber-600/30 hover:bg-amber-600/60 text-amber-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Xem / Nạp 3 tuần dữ liệu chi tiêu mẫu thực tế"
            >
              <Sparkles size={13} className="text-amber-300" />
              <span className="hidden md:inline">Xem dữ liệu mẫu</span>
            </button>

            <label
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700/80 hover:border-emerald-600 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Khôi phục dữ liệu từ tệp sao lưu .json"
            >
              <Upload size={13} className="text-emerald-300" />
              <span className="hidden md:inline">Khôi phục</span>
              <input 
                type="file" 
                accept=".json" 
                onChange={handleRestoreData} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleBackupData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700/80 hover:border-emerald-600 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Tải tệp sao lưu dữ liệu (.json) về máy"
            >
              <Download size={13} className="text-emerald-300" />
              <span className="hidden md:inline">Sao lưu</span>
            </button>

            <button
              onClick={handleClearSampleData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/60 hover:border-red-800 bg-red-950/40 hover:bg-red-950/70 text-red-100 text-xs rounded-xl transition font-medium cursor-pointer shadow-sm min-h-[36px]"
              title="Xóa dữ liệu mẫu, bắt đầu từ đầu"
            >
              <Trash2 size={13} className="text-red-300" />
              <span className="hidden md:inline">Xóa dữ liệu mẫu</span>
            </button>
          </div>
        </div>
      </header>

      {/* Decorative notebook binding line - vintage notebook feel */}
      <div className="h-2 bg-[#F3ECE0] border-y border-[#E6DEC9] w-full flex justify-center gap-10 overflow-hidden shrink-0">
        {[...Array(12)].map((_, i) => (
          <span key={i} className="w-2 bg-emerald-900/25 h-full inline-block"></span>
        ))}
      </div>

      {/* Main Container mimicking book pages with double-line borders */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Sample Data Mode Banner */}
        {state.isSampleData ? (
          <div className="bg-amber-50 border-2 border-amber-300/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-lg shrink-0 shadow-xs">
                📌
              </div>
              <div>
                <h4 className="font-bold text-amber-950 text-xs sm:text-sm flex items-center gap-2">
                  ĐANG HIỂN THỊ DỮ LIỆU MẪU (3 TUẦN CHI TIÊU THỰC TẾ)
                </h4>
                <p className="text-stone-600 text-xs mt-0.5">
                  Tự động nạp sẵn giao dịch, mục tiêu & ngân sách mẫu để bạn trải nghiệm trọn vẹn biểu đồ và phân tích AI.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
              <button
                onClick={handleClearSampleData}
                className="px-3.5 py-2 bg-red-800 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5"
                title="Xóa toàn bộ dữ liệu mẫu để bắt đầu sổ tay riêng của bạn"
              >
                <Trash2 size={14} />
                <span>Xóa dữ liệu mẫu, bắt đầu từ đầu</span>
              </button>
            </div>
          </div>
        ) : state.expenses.length === 0 ? (
          <div className="bg-emerald-50 border-2 border-emerald-200/80 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 font-sans">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-800 text-amber-300 font-bold flex items-center justify-center text-lg shrink-0">
                📔
              </div>
              <div>
                <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                  SỔ TAY THỰC TẾ ĐANG TRỐNG
                </h4>
                <p className="text-stone-600 text-xs mt-0.5">
                  Bạn chưa có giao dịch nào trong sổ. Hãy thêm mới ở tab Ghi Nhanh hoặc nạp dữ liệu mẫu để thử nghiệm!
                </p>
              </div>
            </div>
            <button
              onClick={handleLoadSampleData}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
            >
              <Sparkles size={14} />
              <span>Xem / Nạp dữ liệu mẫu</span>
            </button>
          </div>
        ) : null}

        <div className="bg-[#FCFAF4] border-4 border-double border-[#E6DEC9] rounded-xl p-5 sm:p-7 shadow-sm min-h-[500px] flex flex-col gap-6">
          
          {/* Flat, ledger-ruled tabs navigation */}
          <div className="flex flex-wrap border-b-2 border-emerald-900">
            {/* TỔNG QUAN Tab */}
            <button
              id="tab-overview"
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

            {/* GHI NHANH Tab */}
            <button
              id="tab-chatbot"
              onClick={() => setActiveTab('chatbot')}
              className={`flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-serif font-bold uppercase tracking-wider border-t-2 border-x-2 transition cursor-pointer ${
                activeTab === 'chatbot'
                  ? 'bg-[#FCFAF4] border-emerald-900 border-b-transparent text-emerald-950 -mb-[2px] relative z-10'
                  : 'bg-stone-100/50 border-transparent text-stone-500 hover:text-emerald-900 hover:bg-stone-100'
              }`}
            >
              <MessageSquare size={16} className={activeTab === 'chatbot' ? 'text-amber-600' : ''} />
              Ghi nhanh
            </button>

            {/* NGÂN SÁCH Tab */}
            <button
              id="tab-budget"
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

            {/* CHI TIÊU Tab */}
            <button
              id="tab-expenses"
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

            {/* MỤC TIÊU Tab */}
            <button
              id="tab-goals"
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

            {/* GIỚI THIỆU Tab */}
            <button
              id="tab-about"
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

          {/* Active Tab Component Render */}
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
                onAddExpense={handleAddExpense}
                currentUser={currentUser}
                onOpenAuthModal={() => {
                  setAuthModalTab('login');
                  setIsAuthModalOpen(true);
                }}
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

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        defaultTab={authModalTab}
      />

      {/* Interactive Onboarding Tour Modal */}
      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Humble footer */}
      <footer className="border-t border-[#E6DEC9] bg-[#FAF7F0] py-4 text-center text-[11px] text-stone-400 font-sans tracking-wide shrink-0">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>© 2026 Sổ tay chi tiêu Ledger — Giao diện phẳng & tối giản</span>
          <span>Bảo mật dữ liệu trên trình duyệt của bạn</span>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LedgerApp />
    </AuthProvider>
  );
}

