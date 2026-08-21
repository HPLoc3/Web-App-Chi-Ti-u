import React from 'react';
import { 
  Compass, 
  ShieldAlert, 
  Zap, 
  Sparkles, 
  Check,
  TrendingDown,
  Clock,
  PieChart,
  Bot
} from 'lucide-react';

export default function BenefitsSection() {
  const benefits = [
    {
      icon: <Compass className="w-6 h-6 text-emerald-700" />,
      title: "Biết tiền đang đi đâu",
      description: "Mọi khoản chi được phân loại minh bạch theo nhóm và ví tiền, giúp bạn luôn nắm rõ dòng tiền từng ngày.",
      color: "emerald",
      preview: (
        <div className="bg-emerald-50/60 rounded-xl p-3 border border-emerald-100 space-y-1.5 text-xs font-sans">
          <div className="flex justify-between font-medium text-emerald-950">
            <span>Ăn uống & Cà phê</span>
            <span className="font-mono font-bold">2.450.000 ₫</span>
          </div>
          <div className="w-full bg-emerald-200/60 rounded-full h-1.5">
            <div className="bg-emerald-700 h-1.5 rounded-full" style={{ width: '65%' }} />
          </div>
          <div className="text-[10px] text-emerald-700 font-mono flex justify-between">
            <span>Chiếm 28% tổng chi</span>
            <span>24 giao dịch</span>
          </div>
        </div>
      )
    },
    {
      icon: <ShieldAlert className="w-6 h-6 text-amber-700" />,
      title: "Kiểm soát ngân sách",
      description: "Quy tắc 50/30/20 cùng hạn mức thông minh chủ động cảnh báo khi bạn chuẩn bị tiêu lố ngân sách.",
      color: "amber",
      preview: (
        <div className="bg-amber-50/60 rounded-xl p-3 border border-amber-200/80 space-y-1.5 text-xs font-sans">
          <div className="flex justify-between font-medium text-amber-950">
            <span>Hạn mức Mua sắm</span>
            <span className="font-mono font-bold text-amber-800">80% đã dùng</span>
          </div>
          <div className="w-full bg-amber-200 rounded-full h-1.5">
            <div className="bg-amber-600 h-1.5 rounded-full" style={{ width: '80%' }} />
          </div>
          <div className="text-[10px] text-amber-800 flex items-center justify-between">
            <span>Còn lại: 600.000 ₫</span>
            <span className="font-semibold text-amber-900">⚠️ Chạm ngưỡng an toàn</span>
          </div>
        </div>
      )
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-700" />,
      title: "Tiết kiệm thời gian nhập liệu",
      description: "Không còn phải mở form phức tạp hay chọn tay từng danh mục; ghi chép chỉ với một câu nói dưới 10 giây.",
      color: "blue",
      preview: (
        <div className="bg-blue-50/60 rounded-xl p-3 border border-blue-100 space-y-1 text-xs font-mono">
          <div className="text-[11px] text-blue-900 bg-white/80 px-2 py-1 rounded border border-blue-200/60">
            "Ăn trưa 45k, đổ xăng 60k"
          </div>
          <div className="flex items-center gap-1 text-[10px] text-blue-700 font-bold font-sans pt-0.5">
            <Clock size={11} />
            <span>Xử lý & lưu tức thì trong 0.2 giây</span>
          </div>
        </div>
      )
    },
    {
      icon: <Sparkles className="w-6 h-6 text-purple-700" />,
      title: "Hiểu tài chính bằng AI",
      description: "Trợ lý Copilot thông minh phân tích thói quen, chấm điểm sức khỏe và gợi ý các khoản cần cắt giảm hiệu quả.",
      color: "purple",
      preview: (
        <div className="bg-purple-50/60 rounded-xl p-3 border border-purple-100 space-y-1 text-xs font-sans">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-purple-950">
            <Bot size={13} className="text-purple-700" />
            <span>Đánh giá tài chính tuần:</span>
          </div>
          <p className="text-[11px] text-purple-900 leading-snug">
            "Bạn đã tiết kiệm được thêm 15% so với tuần trước nhờ giảm chi tiêu ăn ngoài!"
          </p>
        </div>
      )
    }
  ];

  return (
    <section id="benefits" className="py-16 sm:py-20 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-100 text-amber-900 text-xs font-semibold">
            <span>Giá trị cốt lõi</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Giá trị khác biệt mang đến cho bạn
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Thiết kế tối ưu cho thói quen hàng ngày, giúp bạn dễ dàng duy trì việc quản lý tài chính bền vững suốt năm.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {benefits.map((b, idx) => (
            <div 
              key={idx}
              className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-4 hover:border-emerald-500 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                  {b.icon}
                </div>

                <h3 className="font-serif text-lg sm:text-xl font-bold text-emerald-950">
                  {b.title}
                </h3>

                <p className="text-stone-600 text-sm leading-relaxed">
                  {b.description}
                </p>
              </div>

              {/* Visual Micro-Preview */}
              <div className="pt-2">
                {b.preview}
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
