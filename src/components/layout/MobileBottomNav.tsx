import React from 'react';
import { LayoutDashboard, BookOpen, Plus, Sparkles, MessageSquare } from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onChangeTab: (tab: any) => void;
  onOpenQuickAdd: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onChangeTab,
  onOpenQuickAdd,
}) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-emerald-950/95 border-t border-emerald-800/80 backdrop-blur-md px-3 py-2 flex items-center justify-around shadow-2xl">
      <button
        onClick={() => onChangeTab('overview')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'overview' ? 'text-amber-300 font-bold' : 'text-emerald-300/70 hover:text-emerald-100'
        }`}
      >
        <LayoutDashboard size={18} />
        <span className="text-[10px]">Trang chủ</span>
      </button>

      <button
        onClick={() => onChangeTab('expenses')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'expenses' ? 'text-amber-300 font-bold' : 'text-emerald-300/70 hover:text-emerald-100'
        }`}
      >
        <BookOpen size={18} />
        <span className="text-[10px]">Sổ chi tiết</span>
      </button>

      <button
        onClick={onOpenQuickAdd}
        className="-mt-5 w-12 h-12 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-emerald-950 shadow-xl flex items-center justify-center border-2 border-emerald-900 active:scale-95 transition-all"
        title="Thêm khoản chi"
      >
        <Plus size={24} className="stroke-[3]" />
      </button>

      <button
        onClick={() => onChangeTab('insights')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'insights' ? 'text-amber-300 font-bold' : 'text-emerald-300/70 hover:text-emerald-100'
        }`}
      >
        <Sparkles size={18} />
        <span className="text-[10px]">AI Insights</span>
      </button>

      <button
        onClick={() => onChangeTab('chatbot')}
        className={`flex flex-col items-center gap-1 transition-colors ${
          activeTab === 'chatbot' ? 'text-amber-300 font-bold' : 'text-emerald-300/70 hover:text-emerald-100'
        }`}
      >
        <MessageSquare size={18} />
        <span className="text-[10px]">Trợ lý AI</span>
      </button>
    </div>
  );
};

export default MobileBottomNav;
