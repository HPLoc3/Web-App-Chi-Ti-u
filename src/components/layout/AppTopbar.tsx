import React from 'react';
import { 
  Plus, 
  Sparkles, 
  Search, 
  Home, 
  LogOut, 
  LogIn, 
  Menu, 
  Calendar,
  Layers,
  Bell
} from 'lucide-react';
import { AppUser } from '../../context/AuthContext';
import { NavTabKey } from './AppSidebar';

interface AppTopbarProps {
  activeTab: NavTabKey;
  onNavigateHome: () => void;
  onOpenQuickAdd: () => void;
  onLoadSampleData: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  currentUser: AppUser | null;
  selectedMonth?: string;
  onOpenMobileMenu?: () => void;
}

const TAB_TITLES: Record<NavTabKey, { title: string; subtitle: string; icon: string }> = {
  overview: {
    title: 'Tổng quan tài chính',
    subtitle: 'Nắm bắt sức khỏe tài chính & dòng tiền hôm nay',
    icon: '📊',
  },
  expenses: {
    title: 'Sổ ghi chép giao dịch',
    subtitle: 'Quản lý, tìm kiếm và phân loại mọi khoản thu chi',
    icon: '🧾',
  },
  wallets: {
    title: 'Ví tiền & Tài khoản',
    subtitle: 'Quản lý các nguồn tiền, ngân hàng và phân bổ số dư',
    icon: '💳',
  },
  budget: {
    title: 'Kế hoạch ngân sách 50/30/20',
    subtitle: 'Kiểm soát hạn mức và phân bổ chi tiêu thông minh',
    icon: '⚖️',
  },
  goals: {
    title: 'Mục tiêu tiết kiệm & Tích lũy',
    subtitle: 'Biến ước mơ tài chính thành kế hoạch thực thi rõ ràng',
    icon: '🎯',
  },
  recurring: {
    title: 'Giao dịch định kỳ & Đăng ký',
    subtitle: 'Theo dõi chi phí cố định, hóa đơn điện nước và dịch vụ',
    icon: '🔁',
  },
  reports: {
    title: 'Báo cáo & Phân tích chuyên sâu',
    subtitle: 'Thống kê cơ cấu, xu hướng và dự báo chi tiêu',
    icon: '📈',
  },
  chatbot: {
    title: 'Trợ lý tài chính AI Copilot',
    subtitle: 'Bóc tách ngôn ngữ tự nhiên và tư vấn tối ưu chi tiêu',
    icon: '✨',
  },
  settings: {
    title: 'Cài đặt & Quản lý dữ liệu',
    subtitle: 'Tùy biến tài khoản, bảo mật, sao lưu và xuất dữ liệu',
    icon: '⚙️',
  },
  about: {
    title: 'Giới thiệu & Hướng dẫn sử dụng',
    subtitle: 'Khám phá các nguyên lý quản lý tài chính cá nhân',
    icon: '📖',
  },
};

export const AppTopbar: React.FC<AppTopbarProps> = ({
  activeTab,
  onNavigateHome,
  onOpenQuickAdd,
  onLoadSampleData,
  onOpenAuth,
  onLogout,
  currentUser,
  selectedMonth,
  onOpenMobileMenu,
}) => {
  const currentMeta = TAB_TITLES[activeTab] || TAB_TITLES.overview;

  return (
    <header className="sticky top-0 z-20 bg-[#FAF9F6]/90 backdrop-blur-md border-b border-[#E6DEC9] px-4 sm:px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
        {/* Left: Mobile Menu Trigger + Page Title & Breadcrumb */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <button
            onClick={onOpenMobileMenu}
            className="lg:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-[#FCFAF4] border border-[#E6DEC9] text-emerald-950 hover:bg-stone-100 transition cursor-pointer flex items-center justify-center shrink-0"
            aria-label="Mở menu"
          >
            <Menu size={18} />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-base sm:text-lg shrink-0">{currentMeta.icon}</span>
              <h1 className="font-serif text-sm sm:text-lg lg:text-xl font-bold text-emerald-950 truncate tracking-tight">
                {currentMeta.title}
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-stone-500 font-sans truncate max-w-[200px] sm:max-w-none">
              {selectedMonth ? `Tháng ${selectedMonth.split('-')[1]}/${selectedMonth.split('-')[0]} • ` : ''}
              {currentMeta.subtitle}
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Quick Add Button */}
          <button
            onClick={onOpenQuickAdd}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 sm:px-4 sm:py-2 min-h-[44px] bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl font-medium text-xs sm:text-sm shadow-xs transition active:scale-98 cursor-pointer"
            title="Thêm khoản chi tiêu mới (Phím tắt: Ctrl+N hoặc Ghi nhanh)"
          >
            <Plus size={16} className="stroke-[2.5]" />
            <span className="font-bold">Ghi nhanh</span>
          </button>

          {/* Sample Data Loader */}
          <button
            onClick={onLoadSampleData}
            className="hidden sm:flex items-center gap-1 px-3 py-2 min-h-[44px] border border-[#E6DEC9] bg-[#FCFAF4] hover:bg-white text-stone-700 rounded-xl text-xs font-semibold transition cursor-pointer shadow-2xs"
            title="Nạp 3 tuần dữ liệu mẫu thực tế"
          >
            <Sparkles size={13} className="text-amber-600" />
            <span>Dữ liệu mẫu</span>
          </button>

          {/* Landing / Intro link */}
          <button
            onClick={onNavigateHome}
            className="hidden md:flex items-center p-2 px-3 py-2 min-h-[44px] border border-[#E6DEC9] bg-[#FCFAF4] hover:bg-white text-stone-700 rounded-xl text-xs font-medium transition cursor-pointer"
            title="Quay lại Màn hình Giới thiệu"
          >
            <Home size={15} className="text-emerald-900" />
            <span className="ml-1.5">Trang chủ</span>
          </button>

          {/* User Auth or Avatar */}
          {currentUser ? (
            <div className="flex items-center gap-2 pl-0.5">
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt="Avatar"
                  className="w-9 h-9 rounded-full object-cover border border-amber-400 shrink-0"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-amber-500 text-emerald-950 font-bold flex items-center justify-center text-xs shrink-0 shadow-2xs">
                  {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center gap-1 px-3 py-2 min-h-[44px] bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer shadow-xs"
            >
              <LogIn size={14} />
              <span className="hidden sm:inline">Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
