import React, { useState } from 'react';
import { 
  SlidersHorizontal, 
  PieChart, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';

export default function BudgetDeepDiveSection() {
  const [sampleIncome, setSampleIncome] = useState(25000000); // 25 million VND

  const needsAmount = sampleIncome * 0.5;
  const wantsAmount = sampleIncome * 0.3;
  const savingsAmount = sampleIncome * 0.2;

  const presetIncomes = [15000000, 25000000, 40000000, 60000000];

  return (
    <section id="budget" className="py-16 sm:py-24 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-900 text-xs font-semibold">
            <SlidersHorizontal size={13} className="text-indigo-700" />
            <span>Phương pháp tài chính chuẩn quốc tế</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Quản lý ngân sách tự động theo quy tắc 50/30/20
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Không cần tính toán thủ công. Hệ thống tự động phân bổ thu nhập thành 3 quỹ tài chính thông minh kèm cảnh báo thời gian thực khi một danh mục chạm trần.
          </p>
        </div>

        {/* Interactive 50/30/20 Visualizer */}
        <div className="bg-white border-2 border-[#E6DEC9] rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-xl max-w-4xl mx-auto space-y-8">
          
          {/* Income Selector Bar */}
          <div className="bg-[#FAF7F0] border border-[#E6DEC9] rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-mono uppercase font-bold text-stone-500 block">
                  Chọn mức thu nhập hàng tháng để mô phỏng:
                </span>
                <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-950">
                  {sampleIncome.toLocaleString('vi-VN')} ₫
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap gap-2">
                {presetIncomes.map((inc) => (
                  <button
                    key={inc}
                    onClick={() => setSampleIncome(inc)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      sampleIncome === inc
                        ? 'bg-emerald-950 text-amber-300 shadow-xs'
                        : 'bg-white text-stone-700 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    {(inc / 1000000)} Triệu
                  </button>
                ))}
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min="5000000"
              max="100000000"
              step="1000000"
              value={sampleIncome}
              onChange={(e) => setSampleIncome(Number(e.target.value))}
              className="w-full accent-emerald-900 cursor-pointer"
            />
          </div>

          {/* 3 Calculated Pillars */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 50% Needs */}
            <div className="bg-[#FCFAF4] border-2 border-emerald-800/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold font-mono text-sm">
                50%
              </div>
              <h3 className="font-serif font-bold text-base text-emerald-950">
                Nhu Cầu Thiết Yếu (Needs)
              </h3>
              <div className="font-mono text-xl font-bold text-emerald-900">
                {needsAmount.toLocaleString('vi-VN')} ₫
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Chi trả tiền thuê nhà, ăn uống cơ bản, điện nước, xăng xe và các hóa đơn bắt buộc.
              </p>
              <div className="text-[11px] font-mono text-emerald-800 bg-emerald-100/70 px-2 py-1 rounded">
                Hạn mức an toàn trần
              </div>
            </div>

            {/* 30% Wants */}
            <div className="bg-[#FCFAF4] border-2 border-amber-500/40 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-900 flex items-center justify-center font-bold font-mono text-sm">
                30%
              </div>
              <h3 className="font-serif font-bold text-base text-amber-950">
                Chi Tiêu Linh Hoạt (Wants)
              </h3>
              <div className="font-mono text-xl font-bold text-amber-900">
                {wantsAmount.toLocaleString('vi-VN')} ₫
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Mua sắm thời trang, cà phê cuối tuần, xem phim, giải trí và ăn ngoài cùng bạn bè.
              </p>
              <div className="text-[11px] font-mono text-amber-800 bg-amber-100/70 px-2 py-1 rounded">
                Tự do chi tiêu có kiểm soát
              </div>
            </div>

            {/* 20% Savings */}
            <div className="bg-[#FCFAF4] border-2 border-blue-600/30 rounded-2xl p-5 space-y-3 relative overflow-hidden">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center font-bold font-mono text-sm">
                20%
              </div>
              <h3 className="font-serif font-bold text-base text-blue-950">
                Tích Lũy & Đầu Tư (Savings)
              </h3>
              <div className="font-mono text-xl font-bold text-blue-900">
                {savingsAmount.toLocaleString('vi-VN')} ₫
              </div>
              <p className="text-xs text-stone-600 leading-relaxed">
                Xây dựng quỹ khẩn cấp 3-6 tháng, tiết kiệm mua tài sản lớn và các khoản đầu tư sinh lời.
              </p>
              <div className="text-[11px] font-mono text-blue-800 bg-blue-100/70 px-2 py-1 rounded">
                Tích lũy tự động hàng tháng
              </div>
            </div>

          </div>

          {/* Real-time Health Warning Feature Callout */}
          <div className="p-4 bg-amber-50/80 border border-amber-200/80 rounded-2xl flex items-start gap-3 text-xs sm:text-sm text-stone-700">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block font-serif">Hệ thống Cảnh báo Tiến độ Thông minh:</span>
              Khi bất kỳ danh mục nào đạt đến 80% hạn mức đã thiết lập, hệ thống sẽ tự động đổi màu hiển thị cảnh báo sang màu cam và gửi thông báo nhắc nhở để bạn điều chỉnh kế hoạch kịp thời trước khi vượt ngân sách.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
