import React from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  Wallet, 
  SlidersHorizontal, 
  Bot, 
  Target, 
  RefreshCw, 
  BarChart3, 
  Tags, 
  DownloadCloud,
  Sparkles,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function CoreFeaturesSection({
  onSelectFeature
}: {
  onSelectFeature?: (tab: string) => void;
}) {
  return (
    <section id="features" className="py-16 sm:py-24 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-14 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles size={13} className="text-emerald-700" />
            <span>Hệ thống tính năng</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Bộ công cụ tài chính chuyên sâu & toàn diện
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Thiết kế phân tầng thông minh: Tập trung các tính năng cốt lõi hàng ngày và bổ trợ các công cụ phân tích nâng cao.
          </p>
        </div>

        {/* -------------------------------------------------- CORE FEATURES (PRIMARY - LARGER CARDS) */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-amber-900 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Tính năng cốt lõi (Core Pillars)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* 1. Dashboard */}
            <div className="bg-white border-2 border-emerald-900/10 rounded-2xl p-6 space-y-4 hover:border-emerald-700 hover:shadow-lg transition-all duration-200 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-100/70 text-emerald-900 flex items-center justify-center">
                  <LayoutDashboard size={24} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  Trung tâm
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Bảng điều khiển (Dashboard)
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Nắm bắt ngay lập tức tổng số dư mọi nguồn tiền, tỷ lệ thu chi tháng, sức khỏe dòng tiền và các giao dịch gần nhất chỉ trên một màn hình.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <span>Trực quan hóa thời gian thực</span>
              </div>
            </div>

            {/* 2. Transactions */}
            <div className="bg-white border-2 border-emerald-900/10 rounded-2xl p-6 space-y-4 hover:border-emerald-700 hover:shadow-lg transition-all duration-200 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-100/70 text-amber-900 flex items-center justify-center">
                  <Receipt size={24} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-100 text-amber-900 px-2.5 py-1 rounded-full">
                  Hàng ngày
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Sổ Quản Lý Giao Dịch
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Lưu trữ lịch sử thu chi chi tiết, hỗ trợ tìm kiếm tức thì, phân loại theo ngày tháng, gắn nhãn danh mục và đính kèm ghi chú rõ ràng.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-semibold text-amber-800">
                <span>Bộ lọc đa chiều & Tìm kiếm nhanh</span>
              </div>
            </div>

            {/* 3. AI Copilot */}
            <div className="bg-gradient-to-br from-emerald-950 to-emerald-900 text-white rounded-2xl p-6 space-y-4 shadow-md border border-emerald-800 md:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-amber-500 text-emerald-950 flex items-center justify-center font-bold">
                  <Bot size={24} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2.5 py-1 rounded-full border border-amber-400/30">
                  Công nghệ AI
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-amber-50">
                Trợ Lý AI Copilot
              </h3>
              <p className="text-emerald-100/90 text-xs sm:text-sm leading-relaxed">
                Bóc tách ngôn ngữ tự nhiên Tiếng Việt không ma sát. Tự động nhận diện nhiều khoản chi, gợi ý danh mục và phân tích sức khỏe tài chính.
              </p>
              <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-amber-300">
                <Sparkles size={14} />
                <span>Hiểu tiếng Việt tự nhiên 100%</span>
              </div>
            </div>

            {/* 4. Wallets */}
            <div className="bg-white border-2 border-emerald-900/10 rounded-2xl p-6 space-y-4 hover:border-emerald-700 hover:shadow-lg transition-all duration-200 md:col-span-1 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-blue-100/70 text-blue-900 flex items-center justify-center">
                  <Wallet size={24} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-full">
                  Tài sản
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Hệ Thống Đa Ví Tiền
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Phân bổ linh hoạt giữa Ví Tiền Mặt, Thẻ Ngân Hàng, Thẻ Tín Dụng và Quỹ Khẩn Cấp để kiểm soát số dư chính xác từng tài khoản.
              </p>
            </div>

            {/* 5. Budget 50/30/20 */}
            <div className="bg-white border-2 border-emerald-900/10 rounded-2xl p-6 space-y-4 hover:border-emerald-700 hover:shadow-lg transition-all duration-200 md:col-span-1 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div className="w-12 h-12 rounded-xl bg-indigo-100/70 text-indigo-900 flex items-center justify-center">
                  <SlidersHorizontal size={24} />
                </div>
                <span className="text-[10px] font-mono font-bold bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full">
                  Kỷ luật tài chính
                </span>
              </div>
              <h3 className="font-serif text-xl font-bold text-emerald-950">
                Kế Hoạch Ngân Sách 50/30/20 & Hạn Mức Danh Mục
              </h3>
              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                Tự động chia thu nhập theo công thức vàng: 50% Nhu cầu thiết yếu, 30% Chi tiêu linh hoạt, 20% Tích lũy. Thiết lập hạn mức trần cho từng nhóm chi tiêu để không bao giờ vượt quỹ.
              </p>
            </div>

          </div>
        </div>

        {/* -------------------------------------------------- SECONDARY FEATURES (COMPACT CARDS) */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-xs font-mono uppercase font-bold text-stone-500 tracking-wider">
            <span className="w-2 h-2 rounded-full bg-stone-400" />
            <span>Tính năng mở rộng (Secondary Tools)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Goals */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 hover:border-stone-400 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center">
                <Target size={18} />
              </div>
              <h4 className="font-serif font-bold text-sm text-stone-900">Mục Tiêu Tiết Kiệm</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Tạo quỹ mua nhà, xe, du lịch có lộ trình và thanh % tiến độ trực quan.
              </p>
            </div>

            {/* Recurring */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 hover:border-stone-400 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center">
                <RefreshCw size={18} />
              </div>
              <h4 className="font-serif font-bold text-sm text-stone-900">Chi Tiêu Định Kỳ</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Tự động ghi nhận tiền nhà, hóa đơn điện nước, gói cước hàng tháng.
              </p>
            </div>

            {/* Reports */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 hover:border-stone-400 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <BarChart3 size={18} />
              </div>
              <h4 className="font-serif font-bold text-sm text-stone-900">Báo Cáo & Phân Tích</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Biểu đồ cấu trúc chi tiêu, xu hướng 7 ngày và so sánh theo kỳ.
              </p>
            </div>

            {/* Categories */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 hover:border-stone-400 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center">
                <Tags size={18} />
              </div>
              <h4 className="font-serif font-bold text-sm text-stone-900">Danh Mục Tùy Biến</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Bộ danh mục chuẩn phong phú, phân định rõ ràng Thiết yếu vs Sở thích.
              </p>
            </div>

            {/* Backup */}
            <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2 hover:border-stone-400 transition-colors">
              <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <DownloadCloud size={18} />
              </div>
              <h4 className="font-serif font-bold text-sm text-stone-900">Sao Lưu & JSON</h4>
              <p className="text-stone-600 text-xs leading-relaxed">
                Xuất/nhập file dữ liệu toàn diện, bảo vệ quyền riêng tư người dùng.
              </p>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
