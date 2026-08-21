import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  SlidersHorizontal, 
  BarChart3, 
  Bot, 
  Plus 
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  onChangeTab: (tab: any) => void;
  onOpenQuickAdd: () => void;
}

export default function MobileBottomNav({
  activeTab,
  onChangeTab,
  onOpenQuickAdd
}: MobileBottomNavProps) {
  const tabs = [
    { id: 'overview', label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'expenses', label: 'Giao dịch', icon: Receipt },
    { id: 'budget', label: 'Ngân sách', icon: SlidersHorizontal },
    { id: 'insights', label: 'Báo cáo', icon: BarChart3 },
    { id: 'chatbot', label: 'AI Copilot', icon: Bot },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-emerald-950/95 backdrop-blur-md border-t border-emerald-800/80 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChangeTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition cursor-pointer min-w-[54px] min-h-[44px] ${
              isActive 
                ? 'text-amber-400 font-bold' 
                : 'text-emerald-300/80 hover:text-emerald-100'
            }`}
          >
            <Icon size={19} />
            <span className="text-[10px] mt-1 leading-none">{tab.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenQuickAdd}
        aria-label="Thêm chi tiêu nhanh"
        className="flex flex-col items-center justify-center p-2 rounded-xl bg-amber-500 text-emerald-950 font-bold transition active:scale-95 shadow-md min-w-[44px] min-h-[44px]"
      >
        <Plus size={20} className="stroke-[3]" />
      </button>
    </div>
  );
}
