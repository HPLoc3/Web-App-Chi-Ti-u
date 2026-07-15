import React, { useState, useEffect } from 'react';
import { AppState, Expense, Goal, RecurringExpense } from './types';
import OverviewTab from './components/OverviewTab';
import ChatbotTab from './components/ChatbotTab';
import ExpensesTab from './components/ExpensesTab';
import BudgetTab from './components/BudgetTab';
import GoalsTab from './components/GoalsTab';
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
  Upload
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'so_tay_ledger_data';

const DEFAULT_STATE: AppState = {
  expenses: [
    { id: 'initial-1', amount: 45000, categoryId: 'an_uong', note: 'Phở bò ăn sáng', date: '2026-07-15' },
    { id: 'initial-2', amount: 50000, categoryId: 'di_chuyen', note: 'Đổ xăng xe máy', date: '2026-07-14' },
    { id: 'initial-3', amount: 350000, categoryId: 'mua_sam', note: 'Mua áo thun mới', date: '2026-07-13' },
    { id: 'initial-4', amount: 120000, categoryId: 'giai_tri', note: 'Xem phim rạp CGV', date: '2026-07-12' },
    { id: 'initial-5', amount: 650000, categoryId: 'hoa_don', note: 'Tiền điện sinh hoạt', date: '2026-07-10' },
    { id: 'initial-6', amount: 150000, categoryId: 'suc_khoe', note: 'Mua thuốc cảm & vitamin', date: '2026-07-09' },
    { id: 'initial-7', amount: 250000, categoryId: 'giao_duc', note: 'Mua sách kỹ năng', date: '2026-07-08' },
    { id: 'initial-8', amount: 30000, categoryId: 'an_uong', note: 'Cà phê sữa đá', date: '2026-07-15' },
  ],
  goals: [
    { id: 'goal-1', name: 'Quỹ dự phòng khẩn cấp', target: 10000000, current: 3500000, createdAt: '2026-07-01' },
    { id: 'goal-2', name: 'Mua máy tính làm việc', target: 20000000, current: 8000000, createdAt: '2026-07-05' }
  ],
  income: 18000000, // default 18 million VNĐ
  budgetTemplate: '50_30_20',
  categoryLimits: {
    'an_uong': 4500000,
    'di_chuyen': 1000000,
    'mua_sam': 2500000,
    'giai_tri': 1500000
  },
  recurringExpenses: [
    { id: 'rec-1', amount: 3500000, categoryId: 'hoa_don', dayOfMonth: 5, note: 'Tiền phòng trọ cố định' },
    { id: 'rec-2', amount: 250000, categoryId: 'hoa_don', dayOfMonth: 10, note: 'Tiền mạng Internet hằng tháng' }
  ],
  generatedRecurringMonths: []
};

export default function App() {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Basic schema verification
        if (parsed && Array.isArray(parsed.expenses) && Array.isArray(parsed.goals) && typeof parsed.income === 'number') {
          return {
            ...DEFAULT_STATE,
            ...parsed,
            categoryLimits: parsed.categoryLimits || DEFAULT_STATE.categoryLimits,
            recurringExpenses: parsed.recurringExpenses || DEFAULT_STATE.recurringExpenses,
            generatedRecurringMonths: parsed.generatedRecurringMonths || [],
            budgetTemplate: parsed.budgetTemplate || 'none'
          };
        }
      }
    } catch (e) {
      console.error('Error loading ledger data from localStorage:', e);
    }
    return DEFAULT_STATE;
  });

  const [activeTab, setActiveTab] = useState<'overview' | 'chatbot' | 'budget' | 'expenses' | 'goals'>('overview');

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
            income: typeof parsed.income === 'number' ? parsed.income : DEFAULT_STATE.income,
            budgetTemplate: parsed.budgetTemplate || 'none',
            categoryLimits: parsed.categoryLimits && typeof parsed.categoryLimits === 'object' ? parsed.categoryLimits : {},
            recurringExpenses: Array.isArray(parsed.recurringExpenses) ? parsed.recurringExpenses : [],
            generatedRecurringMonths: Array.isArray(parsed.generatedRecurringMonths) ? parsed.generatedRecurringMonths : []
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

  const handleResetToDefault = () => {
    if (confirm('Bạn có chắc chắn muốn đặt lại toàn bộ dữ liệu về trạng thái ban đầu? Thao tác này sẽ xóa tất cả các giao dịch bạn đã thêm.')) {
      setState(DEFAULT_STATE);
      alert('Đã đặt lại dữ liệu thành công!');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 flex flex-col antialiased">
      {/* Top Header styled like a heavy leather-notebook top band */}
      <header className="bg-emerald-950 text-white border-b-4 border-amber-500 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-500 rounded flex items-center justify-center text-2xl shadow font-serif font-black shrink-0">
              📔
            </div>
            <div className="text-center sm:text-left">
              <h1 className="font-serif text-2xl font-black tracking-wide text-amber-50 flex items-center gap-2">
                SỔ TAY CHI TIÊU
              </h1>
              <p className="text-[11px] text-emerald-200/90 font-sans tracking-widest uppercase font-semibold mt-0.5">
                Nhật ký tài chính cá nhân giản đơn
              </p>
            </div>
          </div>

          {/* Action buttons for Data Backup, Restore and Reset */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2.5">
            <button
              onClick={handleBackupData}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-amber-500/80 hover:border-amber-400 bg-amber-600/30 hover:bg-amber-600/60 text-amber-100 text-xs rounded transition font-medium cursor-pointer shadow-sm"
              title="Tải tệp sao lưu dữ liệu (.json) về máy"
            >
              <Download size={13} className="text-amber-300" />
              Sao lưu dữ liệu
            </button>

            <label
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-700/80 hover:border-emerald-600 bg-emerald-900/30 hover:bg-emerald-900/60 text-emerald-100 text-xs rounded transition font-medium cursor-pointer shadow-sm"
              title="Khôi phục dữ liệu từ tệp sao lưu .json"
            >
              <Upload size={13} className="text-emerald-300" />
              Khôi phục dữ liệu
              <input 
                type="file" 
                accept=".json" 
                onChange={handleRestoreData} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-red-900/60 hover:border-red-800 bg-red-950/30 hover:bg-red-950/60 text-red-100 text-xs rounded transition font-medium cursor-pointer shadow-sm"
              title="Đặt lại dữ liệu mẫu ban đầu"
            >
              <RefreshCw size={12} className="text-red-300" />
              Đặt lại sổ tay
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
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6">
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
          </div>
        </div>
      </main>

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
