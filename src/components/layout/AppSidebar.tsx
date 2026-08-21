import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  SlidersHorizontal, 
  PiggyBank, 
  Repeat, 
  BarChart3, 
  Bot, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Sparkles,
  ChevronRight,
  ShieldCheck
} from 'lucide-react';
import { AppUser } from '../../context/AuthContext';

export type NavTabKey = 
  | 'overview' 
  | 'expenses' 
  | 'wallets' 
  | 'budget' 
  | 'goals' 
  | 'recurring' 
  | 'reports' 
  | 'chatbot' 
  | 'settings' 
  | 'about';

interface AppSidebarProps {
  activeTab: NavTabKey;
  onSelectTab: (tab: NavTabKey) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenQuickAdd: () => void;
  stats?: {
    totalExpensesCount?: number;
    activeGoalsCount?: number;
    activeRecurringCount?: number;
  };
}

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenQuickAdd,
  stats = {},
}) => {
  const mainNavItems = [
    {
      key: 'overview' as NavTabKey,
      label: 'Tổng quan',
      icon: LayoutDashboard,
      description: 'Dòng tiền & Sức khỏe',
    },
    {
      key: 'expenses' as NavTabKey,
      label: 'Giao dịch',
      icon: Receipt,
      description: 'Sổ thu chi chi tiết',
      badge: stats.totalExpensesCount ? `${stats.totalExpensesCount}` : undefined,
    },
    {
      key: 'wallets' as NavTabKey,
      label: 'Ví tiền',
      icon: Wallet,
      description: 'Tài khoản & Phân bổ',
    },
    {
      key: 'budget' as NavTabKey,
      label: 'Ngân sách',
      icon: SlidersHorizontal,
      description: 'Mô hình 50/30/20',
    },
    {
      key: 'goals' as NavTabKey,
      label: 'Mục tiêu',
      icon: PiggyBank,
      description: 'Tiết kiệm & Tích lũy',
      badge: stats.activeGoalsCount ? `${stats.activeGoalsCount}` : undefined,
    },
    {
      key: 'recurring' as NavTabKey,
      label: 'Giao dịch định kỳ',
      icon: Repeat,
      description: 'Hóa đơn & Đăng ký',
      badge: stats.activeRecurringCount ? `${stats.activeRecurringCount}` : undefined,
    },
    {
      key: 'reports' as NavTabKey,
      label: 'Báo cáo',
      icon: BarChart3,
      description: 'Phân tích & Xu hướng',
    },
    {
      key: 'chatbot' as NavTabKey,
      label: 'AI Copilot',
      icon: Bot,
      description: 'Trợ lý tài chính cá nhân',
      isAi: true,
    },
  ];

  const secondaryNavItems = [
    {
      key: 'about' as NavTabKey,
      label: 'Giới thiệu & Hướng dẫn',
      icon: HelpCircle,
    },
    {
      key: 'settings' as NavTabKey,
      label: 'Cài đặt & Dữ liệu',
      icon: Settings,
    },
  ];

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-emerald-950 text-white border-r border-emerald-900 shrink-0 h-screen sticky top-0 z-30 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-emerald-900/80 flex items-center justify-between">
        <div 
          onClick={() => onSelectTab('overview')}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-emerald-950 flex items-center justify-center font-serif font-black text-xl shadow-md group-hover:scale-105 transition-transform shrink-0">
            📔
          </div>
          <div>
            <h1 className="font-serif font-bold text-sm text-amber-50 tracking-tight leading-tight group-hover:text-amber-300 transition-colors">
              SỔ TAY CHI TIÊU
            </h1>
            <p className="text-[10px] text-emerald-300/80 font-mono font-medium tracking-wider uppercase">
              Thông Minh • AI Fintech
            </p>
          </div>
        </div>
      </div>

      {/* Quick Add Hero Button in Sidebar */}
      <div className="px-4 pt-4 pb-2">
        <button
          onClick={onOpenQuickAdd}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-emerald-950 rounded-xl font-bold text-xs shadow-md hover:shadow-lg transition-all active:scale-98 cursor-pointer"
        >
          <span className="text-base font-black leading-none">+</span>
          <span>Thêm giao dịch mới</span>
        </button>
      </div>

      {/* Primary Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scrollbar-thin scrollbar-thumb-emerald-900">
        <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400/60 font-semibold">
          Menu Chính
        </div>

        {mainNavItems.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-xs'
                  : 'text-emerald-100/90 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                    isActive
                      ? 'bg-emerald-950/20 text-emerald-950'
                      : item.isAi
                      ? 'bg-amber-500/20 text-amber-300 group-hover:text-amber-200'
                      : 'bg-emerald-900/60 text-emerald-300 group-hover:text-amber-300'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div className="text-left truncate">
                  <div className="leading-tight">{item.label}</div>
                  {!isActive && (
                    <div className="text-[10px] text-emerald-400/60 font-sans truncate">
                      {item.description}
                    </div>
                  )}
                </div>
              </div>

              {item.badge && (
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-bold shrink-0 ${
                    isActive
                      ? 'bg-emerald-950 text-amber-300'
                      : 'bg-emerald-900 text-emerald-300'
                  }`}
                >
                  {item.badge}
                </span>
              )}

              {item.isAi && !item.badge && (
                <Sparkles
                  size={13}
                  className={`shrink-0 ${isActive ? 'text-emerald-950' : 'text-amber-400 animate-pulse'}`}
                />
              )}
            </button>
          );
        })}

        <div className="pt-3 px-3 py-1.5 text-[10px] font-mono uppercase tracking-widest text-emerald-400/60 font-semibold">
          Hệ Thống
        </div>

        {secondaryNavItems.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all group cursor-pointer ${
                isActive
                  ? 'bg-amber-500 text-emerald-950 font-bold shadow-xs'
                  : 'text-emerald-200/80 hover:bg-emerald-900/60 hover:text-white'
              }`}
            >
              <div
                className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive
                    ? 'bg-emerald-950/20 text-emerald-950'
                    : 'bg-emerald-900/40 text-emerald-300'
                }`}
              >
                <Icon size={15} />
              </div>
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </div>

      {/* User Section / Bottom Footer */}
      <div className="p-3 border-t border-emerald-900/80 bg-emerald-950/90">
        {currentUser ? (
          <div className="flex items-center justify-between p-2 rounded-xl bg-emerald-900/50 border border-emerald-800/80">
            <div 
              onClick={() => onSelectTab('settings')}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer hover:opacity-80 transition"
              title="Xem thông tin tài khoản"
            >
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-8 h-8 rounded-full object-cover border border-amber-400 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-xs">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
              <div className="truncate text-left">
                <div className="text-xs font-semibold text-white truncate">
                  {currentUser.displayName || 'Người dùng'}
                </div>
                <div className="text-[10px] text-emerald-300/80 truncate font-mono">
                  {currentUser.email || 'Đã đồng bộ'}
                </div>
              </div>
            </div>

            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-emerald-300 hover:text-amber-300 hover:bg-emerald-800/80 transition cursor-pointer"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-emerald-900 hover:bg-emerald-850 text-amber-300 border border-emerald-700/80 rounded-xl text-xs font-bold transition cursor-pointer"
          >
            <ShieldCheck size={14} />
            <span>Đăng nhập / Đăng ký</span>
          </button>
        )}
      </div>
    </aside>
  );
};
