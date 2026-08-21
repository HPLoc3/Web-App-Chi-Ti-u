import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Receipt, 
  SlidersHorizontal, 
  BarChart3, 
  Bot, 
  Sparkles,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  Wallet,
  PieChart,
  ArrowUpRight,
  Filter,
  Plus
} from 'lucide-react';

export default function ProductShowcaseSection() {
  const tabs = [
    {
      id: 'dashboard',
      label: 'Tổng quan (Dashboard)',
      icon: <LayoutDashboard size={16} />,
      title: 'Bảng Điều Khiển Tổng Thể Dòng Tiền',
      description: 'Tổng hợp số dư các ví, doanh thu, chi tiêu thực tế và chỉ số sức khỏe tài chính tổng thể trong một khung nhìn duy nhất.'
    },
    {
      id: 'transactions',
      label: 'Sổ Giao Dịch',
      icon: <Receipt size={16} />,
      title: 'Lịch Sử Giao Dịch Đa Chiều & Bộ Lọc Nhanh',
      description: 'Dễ dàng tra cứu mọi khoản thu chi, lọc theo danh mục, ví tiền, ngày phát sinh và xem tổng kết chi tiết tức thì.'
    },
    {
      id: 'budget',
      label: 'Kế Hoạch Ngân Sách',
      icon: <SlidersHorizontal size={16} />,
      title: 'Phân Bổ 50/30/20 & Hạn Mức Từng Nhóm',
      description: 'Tự động tính toán hạn mức tối đa cho từng nhóm nhu cầu, ngăn ngừa tình trạng chi tiêu vượt quỹ vào cuối tháng.'
    },
    {
      id: 'reports',
      label: 'Báo Cáo Chuyên Sâu',
      icon: <BarChart3 size={16} />,
      title: 'Biểu Đồ Xu Hướng 7 Ngày & Cơ Cấu Danh Mục',
      description: 'Trực quan hóa tỷ trọng chi tiêu bằng biểu đồ Donut và biến động chi phí 7 ngày giúp nhận diện xu hướng nhanh chóng.'
    },
    {
      id: 'ai-copilot',
      label: 'Trợ Lý AI Copilot',
      icon: <Bot size={16} />,
      title: 'Ghi Nhận Thu Chi Bằng Ngôn Ngữ Tự Nhiên',
      description: 'Bóc tách dữ liệu phức tạp từ câu nói tiếng Việt và tự động gợi ý cách tối ưu hóa kế hoạch tài chính cá nhân.'
    }
  ];

  const [activeTab, setActiveTab] = useState('dashboard');
  const currentTab = tabs.find(t => t.id === activeTab) || tabs[0];

  return (
    <section className="py-16 sm:py-24 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles size={13} className="text-emerald-700" />
            <span>Trải nghiệm người dùng chân thực</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Khám phá giao diện ứng dụng
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Thiết kế lấy cảm hứng từ sổ da tài chính cổ điển kết hợp trải nghiệm phần mềm tài chính hiện đại hàng đầu.
          </p>
        </div>

        {/* Tab Selector Buttons */}
        <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === tab.id
                  ? 'bg-emerald-950 text-amber-300 shadow-md border border-emerald-900'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border border-stone-200'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Showcase Container Frame */}
        <div className="bg-white border-2 border-[#E6DEC9] rounded-2xl sm:rounded-3xl p-4 sm:p-8 shadow-xl max-w-5xl mx-auto space-y-6">
          
          {/* Tab Information Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-stone-200">
            <div>
              <h3 className="font-serif text-lg sm:text-2xl font-bold text-emerald-950">
                {currentTab.title}
              </h3>
              <p className="text-xs sm:text-sm text-stone-600 mt-1 max-w-2xl">
                {currentTab.description}
              </p>
            </div>
            <span className="text-[11px] font-mono font-bold bg-amber-50 text-amber-800 px-3 py-1 rounded-full border border-amber-200 shrink-0 self-start md:self-auto">
              Chế độ xem thực tế
            </span>
          </div>

          {/* Interactive Dynamic View Mockups according to Tab */}
          <div className="bg-[#FAF9F6] border border-stone-200/80 rounded-2xl p-4 sm:p-6 min-h-[380px] flex flex-col justify-center">
            
            {/* 1. Dashboard View */}
            {activeTab === 'dashboard' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-emerald-950 text-white p-4 rounded-xl">
                    <div className="text-[10px] text-emerald-300 uppercase font-mono">Tổng Số Dư Khả Dụng</div>
                    <div className="text-xl font-mono font-bold text-amber-300 mt-1">30.000.000 ₫</div>
                    <div className="text-[10px] text-emerald-300 mt-1">Phân bổ trên 4 ví</div>
                  </div>
                  <div className="bg-white border border-stone-200 p-4 rounded-xl">
                    <div className="text-[10px] text-stone-500 uppercase font-mono">Thu Nhập Tháng Này</div>
                    <div className="text-xl font-mono font-bold text-emerald-800 mt-1">25.000.000 ₫</div>
                    <div className="text-[10px] text-emerald-600 mt-1 font-semibold">100% mục tiêu thu nhập</div>
                  </div>
                  <div className="bg-white border border-stone-200 p-4 rounded-xl">
                    <div className="text-[10px] text-stone-500 uppercase font-mono">Tổng Tiền Đã Chi</div>
                    <div className="text-xl font-mono font-bold text-stone-900 mt-1">8.450.000 ₫</div>
                    <div className="text-[10px] text-stone-500 mt-1">Còn lại 16.550.000 ₫</div>
                  </div>
                </div>

                {/* 50/30/20 visual in dashboard */}
                <div className="bg-white border border-stone-200 p-4 rounded-xl space-y-2">
                  <div className="flex justify-between text-xs font-serif font-bold text-stone-900">
                    <span>Tiến độ ngân sách 50/30/20</span>
                    <span className="text-emerald-700 font-mono">Đạt tiêu chuẩn an toàn</span>
                  </div>
                  <div className="h-3 w-full bg-stone-100 rounded-full flex overflow-hidden">
                    <div className="bg-emerald-600 h-full" style={{ width: '45%' }} />
                    <div className="bg-amber-500 h-full" style={{ width: '22%' }} />
                    <div className="bg-blue-600 h-full" style={{ width: '33%' }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-mono text-stone-500">
                    <span>Thiết yếu: 45% / 50%</span>
                    <span>Sở thích: 22% / 30%</span>
                    <span>Tiết kiệm: 33% / 20% ✓</span>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Transactions View */}
            {activeTab === 'transactions' && (
              <div className="space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center justify-between gap-2 pb-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-stone-800">Bộ lọc:</span>
                    <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-mono text-[11px]">Tất cả ví</span>
                    <span className="bg-stone-200 text-stone-700 px-2 py-0.5 rounded font-mono text-[11px]">Tháng này</span>
                  </div>
                  <span className="text-xs font-mono text-stone-500">Hiển thị 24 giao dịch</span>
                </div>

                <div className="space-y-2">
                  {[
                    { icon: '🍜', title: 'Ăn trưa & Cà phê sáng', cat: 'Ăn uống', wallet: 'Ví Tiền Mặt', amount: '-75.000 ₫', type: 'expense' },
                    { icon: '💼', title: 'Nhận lương tháng 8/2026', cat: 'Lương & Thưởng', wallet: 'Vietcombank', amount: '+25.000.000 ₫', type: 'income' },
                    { icon: '🚗', title: 'Grab Car đi làm việc', cat: 'Di chuyển', wallet: 'Thẻ Tín Dụng', amount: '-85.000 ₫', type: 'expense' },
                    { icon: '🛍️', title: 'Mua sắm đồ gia dụng', cat: 'Mua sắm', wallet: 'Vietcombank', amount: '-320.000 ₫', type: 'expense' }
                  ].map((item, idx) => (
                    <div key={idx} className="bg-white border border-stone-200 rounded-xl p-3 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <span className="text-lg p-1 bg-stone-50 rounded-lg">{item.icon}</span>
                        <div>
                          <div className="font-bold text-stone-900">{item.title}</div>
                          <div className="text-[10px] text-stone-500">{item.cat} • {item.wallet}</div>
                        </div>
                      </div>
                      <span className={`font-mono font-bold text-sm ${item.type === 'income' ? 'text-emerald-700' : 'text-stone-900'}`}>
                        {item.amount}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. Budget View */}
            {activeTab === 'budget' && (
              <div className="space-y-4 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border-2 border-emerald-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="text-xs font-serif font-bold text-emerald-950">50% Nhu Cầu Thiết Yếu</div>
                    <div className="text-base font-mono font-bold text-emerald-900">5.600.000 / 12.500.000 ₫</div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '45%' }} />
                    </div>
                    <div className="text-[10px] text-emerald-700 font-mono">Đã dùng 45% • An toàn</div>
                  </div>

                  <div className="bg-white border-2 border-amber-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="text-xs font-serif font-bold text-amber-950">30% Chi Tiêu Linh Hoạt</div>
                    <div className="text-base font-mono font-bold text-amber-900">2.850.000 / 7.500.000 ₫</div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '38%' }} />
                    </div>
                    <div className="text-[10px] text-amber-700 font-mono">Đã dùng 38% • An toàn</div>
                  </div>

                  <div className="bg-white border-2 border-blue-500/40 rounded-xl p-3.5 space-y-2">
                    <div className="text-xs font-serif font-bold text-blue-950">20% Tích Lũy & Đầu Tư</div>
                    <div className="text-base font-mono font-bold text-blue-900">5.000.000 / 5.000.000 ₫</div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '100%' }} />
                    </div>
                    <div className="text-[10px] text-blue-700 font-mono">Đã đạt 100% mục tiêu ✓</div>
                  </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-3 text-xs text-stone-600 flex items-center justify-between">
                  <span>💡 Lời khuyên: Giữ tỷ lệ tiết kiệm trên 20% giúp bạn hoàn thành quỹ khẩn cấp sau 4 tháng.</span>
                </div>
              </div>
            )}

            {/* 4. Reports View */}
            {activeTab === 'reports' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300">
                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-serif font-bold text-emerald-950">Cơ Cấu Chi Tiêu Theo Danh Mục</div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span>🍜 Ăn uống (42%)</span>
                      <span className="font-bold">3.550.000 ₫</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: '42%' }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>🚗 Di chuyển (25%)</span>
                      <span className="font-bold">2.100.000 ₫</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '25%' }} />
                    </div>
                    <div className="flex justify-between text-xs font-mono">
                      <span>⚡ Tiện ích (18%)</span>
                      <span className="font-bold">1.520.000 ₫</span>
                    </div>
                    <div className="w-full bg-stone-100 rounded-full h-2">
                      <div className="bg-blue-600 h-2 rounded-full" style={{ width: '18%' }} />
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                  <div className="text-xs font-serif font-bold text-emerald-950">Biến Động Chi Phí 7 Ngày Gần Nhất</div>
                  <div className="h-32 flex items-end justify-between gap-2 pt-4 px-2 border-b border-stone-200">
                    {[
                      { day: 'T2', height: '40%', val: '120k' },
                      { day: 'T3', height: '65%', val: '240k' },
                      { day: 'T4', height: '30%', val: '95k' },
                      { day: 'T5', height: '80%', val: '310k' },
                      { day: 'T6', height: '55%', val: '180k' },
                      { day: 'T7', height: '95%', val: '450k' },
                      { day: 'CN', height: '50%', val: '160k' }
                    ].map((bar, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                        <div className="w-full bg-emerald-800 hover:bg-amber-500 rounded-t transition-all" style={{ height: bar.height }} />
                        <span className="text-[10px] font-mono text-stone-500">{bar.day}</span>
                      </div>
                    ))}
                  </div>
                  <div className="text-[11px] text-stone-500 text-center font-mono">
                    Trung bình mỗi ngày: 222.000 ₫
                  </div>
                </div>
              </div>
            )}

            {/* 5. AI Copilot View */}
            {activeTab === 'ai-copilot' && (
              <div className="bg-emerald-950 text-white rounded-xl p-4 sm:p-5 space-y-3 animate-in fade-in duration-300">
                <div className="flex items-center gap-2 border-b border-emerald-800 pb-2">
                  <Bot size={18} className="text-amber-400" />
                  <span className="font-serif font-bold text-sm text-amber-100">Giao diện tương tác trực tiếp</span>
                </div>
                <div className="bg-emerald-900/80 p-3 rounded-lg text-xs space-y-1">
                  <div className="text-amber-300 font-mono font-bold text-[10px]">CÂU NHẬP LIỆU CỦA BẠN:</div>
                  <p className="italic">"Sáng nay mua phở 50k với ly cafe Highland 40k"</p>
                </div>
                <div className="bg-emerald-900/40 p-3 rounded-lg border border-amber-400/30 text-xs space-y-1.5">
                  <div className="text-emerald-300 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 size={13} className="text-emerald-400" />
                    <span>AI đã bóc tách & cập nhật thành công:</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div className="bg-emerald-950 p-2 rounded">🍲 Phở: 50.000 ₫ (Ăn uống)</div>
                    <div className="bg-emerald-950 p-2 rounded">☕ Cafe: 40.000 ₫ (Sở thích)</div>
                  </div>
                </div>
              </div>
            )}

          </div>

        </div>

      </div>
    </section>
  );
}
