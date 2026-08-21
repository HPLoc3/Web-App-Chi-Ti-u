import React, { useState, useEffect, ReactNode } from 'react';
import { AppSidebar, NavTabKey } from './AppSidebar';
import { AppTopbar } from './AppTopbar';
import { MobileNav } from './MobileNav';
import { AppUser } from '../../context/AuthContext';

interface AppShellProps {
  activeTab: NavTabKey;
  onSelectTab: (tab: NavTabKey) => void;
  currentUser: AppUser | null;
  onLogout: () => void;
  onOpenAuth: () => void;
  onOpenQuickAdd: () => void;
  onNavigateHome: () => void;
  onLoadSampleData: () => void;
  selectedMonth?: string;
  stats?: {
    totalExpensesCount?: number;
    activeGoalsCount?: number;
    activeRecurringCount?: number;
  };
  children: ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  activeTab,
  onSelectTab,
  currentUser,
  onLogout,
  onOpenAuth,
  onOpenQuickAdd,
  onNavigateHome,
  onLoadSampleData,
  selectedMonth,
  stats,
  children,
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Global keyboard shortcuts (Ctrl+N or Cmd+N for quick add)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onOpenQuickAdd();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenQuickAdd]);

  return (
    <div className="min-h-screen bg-[#FAF9F6] text-stone-800 flex font-sans antialiased selection:bg-amber-200 selection:text-emerald-950">
      {/* 1. Desktop Left Sidebar */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenAuth={onOpenAuth}
        onOpenQuickAdd={onOpenQuickAdd}
        stats={stats}
      />

      {/* 2. Main Content Canvas */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header */}
        <AppTopbar
          activeTab={activeTab}
          onNavigateHome={onNavigateHome}
          onOpenQuickAdd={onOpenQuickAdd}
          onLoadSampleData={onLoadSampleData}
          onOpenAuth={onOpenAuth}
          onLogout={onLogout}
          currentUser={currentUser}
          selectedMonth={selectedMonth}
          onOpenMobileMenu={() => setIsDrawerOpen(true)}
        />

        {/* Dynamic Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-32 sm:pb-28 lg:pb-10">
          {children}
        </main>

        {/* Global Footer (Desktop) */}
        <footer className="hidden lg:block border-t border-[#E6DEC9] bg-[#FAF7F0] py-3 text-center text-[11px] text-stone-400 font-sans mt-auto">
          <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
            <span>© 2026 Sổ Tay Chi Tiêu Thông Minh — Nền tảng Quản lý Tài chính Fintech & AI Copilot</span>
            <div className="flex items-center gap-4">
              <span className="font-mono">Phiên bản 2.0 • Sẵn sàng bảo mật</span>
              <a
                href="https://hophuloc.online"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-stone-700 transition underline decoration-stone-300"
              >
                hophuloc.online
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* 3. Mobile Navigation & Drawer */}
      <MobileNav
        activeTab={activeTab}
        onSelectTab={onSelectTab}
        onOpenQuickAdd={onOpenQuickAdd}
        currentUser={currentUser}
        onLogout={onLogout}
        onOpenAuth={onOpenAuth}
        isDrawerOpen={isDrawerOpen}
        onCloseDrawer={() => setIsDrawerOpen(false)}
        onOpenDrawer={() => setIsDrawerOpen(true)}
        onLoadSampleData={onLoadSampleData}
      />
    </div>
  );
};
