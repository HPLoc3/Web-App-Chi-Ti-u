import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  SlidersHorizontal, 
  BarChart3, 
  Bot, 
  Plus, 
  Menu, 
  X, 
  Wallet, 
  PiggyBank, 
  Repeat, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { NavTabKey } from './AppSidebar';
import { AppUser } from '../../context/AuthContext';

interface MobileNavProps {
  activeTab: NavTabKey;
  onSelectTab: (tab: NavTabKey) => void;
  onOpenQuickAdd: () => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  isDrawerOpen: boolean;
  onCloseDrawer: () => void;
  onOpenDrawer: () => void;
  onLoadSampleData?: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenQuickAdd,
  currentUser,
  onLogout,
  onOpenAuth,
  isDrawerOpen,
  onCloseDrawer,
  onOpenDrawer,
  onLoadSampleData,
}) => {
  const primaryTabs = [
    { key: 'overview' as NavTabKey, label: 'Tổng quan', icon: LayoutDashboard },
    { key: 'expenses' as NavTabKey, label: 'Giao dịch', icon: Receipt },
    { key: 'budget' as NavTabKey, label: 'Ngân sách', icon: SlidersHorizontal },
    { key: 'reports' as NavTabKey, label: 'Báo cáo', icon: BarChart3 },
    { key: 'chatbot' as NavTabKey, label: 'AI Copilot', icon: Bot, isAi: true },
  ];

  const drawerItems = [
    { key: 'wallets' as NavTabKey, label: 'Ví tiền & Tài khoản', icon: Wallet, desc: 'Phân bổ số dư các nguồn tiền' },
    { key: 'goals' as NavTabKey, label: 'Mục tiêu tiết kiệm', icon: PiggyBank, desc: 'Theo dõi tiến độ tích lũy' },
    { key: 'recurring' as NavTabKey, label: 'Giao dịch định kỳ', icon: Repeat, desc: 'Quản lý hóa đơn & đăng ký' },
    { key: 'settings' as NavTabKey, label: 'Cài đặt & Dữ liệu', icon: Settings, desc: 'Bảo mật, sao lưu, xuất JSON' },
    { key: 'about' as NavTabKey, label: 'Giới thiệu & Hướng dẫn', icon: HelpCircle, desc: 'Nguyên tắc quản lý tài chính' },
  ];

  return (
    <>
      {/* Fixed Mobile Bottom Bar */}
      <nav 
        aria-label="Thanh điều hướng di động"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-emerald-950/98 backdrop-blur-md border-t border-emerald-900 px-2 py-1.5 flex items-center justify-around shadow-2xl safe-area-bottom"
      >
        {primaryTabs.map((item) => {
          const isActive = activeTab === item.key;
          const Icon = item.icon;

          return (
            <button
              key={item.key}
              onClick={() => onSelectTab(item.key)}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-xl transition-all relative cursor-pointer min-w-[56px] min-h-[44px] ${
                isActive
                  ? 'text-amber-400 font-bold'
                  : 'text-emerald-300/80 hover:text-emerald-100'
              }`}
            >
              <div className="relative">
                <Icon size={20} />
                {item.isAi && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                )}
              </div>
              <span className="text-[10px] mt-1 leading-tight tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="w-4 h-0.5 bg-amber-400 rounded-full mt-0.5" />
              )}
            </button>
          );
        })}

        {/* More button */}
        <button
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-emerald-300/80 hover:text-emerald-100 transition-all cursor-pointer min-w-[56px] min-h-[44px]"
        >
          <Menu size={20} />
          <span className="text-[10px] mt-1 leading-tight tracking-tight">Thêm</span>
        </button>
      </nav>

      {/* Floating Action Button (FAB) for Mobile Quick Add */}
      <button
        onClick={onOpenQuickAdd}
        aria-label="Thêm chi tiêu nhanh"
        className="lg:hidden fixed bottom-20 right-4 z-40 w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 text-emerald-950 flex items-center justify-center shadow-xl hover:shadow-2xl active:scale-95 transition-transform cursor-pointer border-2 border-amber-300 mb-[env(safe-area-inset-bottom,0px)]"
      >
        <Plus size={24} className="stroke-[3]" />
      </button>

      {/* Slide-over Drawer for Secondary Nav & Profile */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-xs bg-emerald-950 text-white h-full flex flex-col p-5 shadow-2xl animate-in slide-in-from-right duration-250 border-l border-emerald-900">
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-4 border-b border-emerald-900">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">📔</span>
                <div>
                  <h3 className="font-serif font-bold text-sm text-amber-100">Tính Năng Khác</h3>
                  <p className="text-[10px] text-emerald-300/70">Sổ Tay Chi Tiêu Thông Minh</p>
                </div>
              </div>
              <button
                onClick={onCloseDrawer}
                className="p-1.5 rounded-lg text-emerald-300 hover:text-white hover:bg-emerald-900 transition cursor-pointer"
                aria-label="Đóng menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* User Profile Card in Drawer */}
            <div className="my-4 p-3 rounded-2xl bg-emerald-900/60 border border-emerald-800">
              {currentUser ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-10 h-10 rounded-full object-cover border border-amber-400 shrink-0"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-sm shrink-0">
                        {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="truncate">
                      <div className="text-xs font-bold text-white truncate">
                        {currentUser.displayName || 'Người dùng'}
                      </div>
                      <div className="text-[10px] text-emerald-300/70 truncate font-mono">
                        {currentUser.email}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    onCloseDrawer();
                    onOpenAuth();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-amber-500 text-emerald-950 rounded-xl text-xs font-bold transition cursor-pointer shadow-xs"
                >
                  <ShieldCheck size={16} />
                  <span>Đăng nhập / Đăng ký</span>
                </button>
              )}
            </div>

            {/* Secondary Navigation List */}
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
              <div className="text-[10px] font-mono uppercase tracking-wider text-emerald-400/60 font-semibold px-2">
                Các chuyên mục quản lý
              </div>

              {drawerItems.map((item) => {
                const isActive = activeTab === item.key;
                const Icon = item.icon;

                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      onSelectTab(item.key);
                      onCloseDrawer();
                    }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition cursor-pointer ${
                      isActive
                        ? 'bg-amber-500 text-emerald-950 font-bold'
                        : 'text-emerald-100 hover:bg-emerald-900/60'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isActive ? 'bg-emerald-950 text-amber-300' : 'bg-emerald-900 text-emerald-300'
                      }`}
                    >
                      <Icon size={16} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold leading-tight">{item.label}</div>
                      <div className={`text-[10px] truncate ${isActive ? 'text-emerald-950/80' : 'text-emerald-300/60'}`}>
                        {item.desc}
                      </div>
                    </div>
                  </button>
                );
              })}

              {onLoadSampleData && (
                <button
                  onClick={() => {
                    onLoadSampleData();
                    onCloseDrawer();
                  }}
                  className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left text-amber-300 hover:bg-emerald-900/60 transition cursor-pointer mt-2 border border-amber-500/30"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0">
                    <Sparkles size={16} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold">Nạp 3 tuần dữ liệu mẫu</div>
                    <div className="text-[10px] text-amber-200/60">Trải nghiệm đầy đủ tính năng</div>
                  </div>
                </button>
              )}
            </div>

            {/* Logout Action in Drawer */}
            {currentUser && (
              <div className="pt-3 border-t border-emerald-900 mt-auto">
                <button
                  onClick={() => {
                    onCloseDrawer();
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-red-950/60 border border-red-900/60 text-red-300 hover:bg-red-900/60 text-xs font-bold transition cursor-pointer"
                >
                  <LogOut size={15} />
                  <span>Đăng xuất tài khoản</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
