import React from 'react';
import { 
  MessageSquare, 
  Cpu, 
  PieChart, 
  TrendingUp, 
  ArrowRight,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      num: "01",
      icon: <MessageSquare className="w-6 h-6 text-emerald-800" />,
      title: "Ghi lại giao dịch",
      desc: "Gõ một câu tiếng Việt tự nhiên hoặc dùng form ghi nhanh một chạm khi có phát sinh chi tiêu.",
      badge: "Nhập liệu siêu tốc"
    },
    {
      num: "02",
      icon: <Cpu className="w-6 h-6 text-amber-700" />,
      title: "AI tự hiểu & phân tích",
      desc: "Hệ thống bóc tách số tiền, gán đúng danh mục và tự động cập nhật số dư của ví tiền tương ứng.",
      badge: "Tự động 100%"
    },
    {
      num: "03",
      icon: <PieChart className="w-6 h-6 text-blue-700" />,
      title: "Theo dõi ngân sách",
      desc: "Hệ thống đối chiếu với mô hình 50/30/20 và gửi cảnh báo trực quan nếu khoản chi chạm ngưỡng.",
      badge: "Kiểm soát rủi ro"
    },
    {
      num: "04",
      icon: <TrendingUp className="w-6 h-6 text-purple-700" />,
      title: "Nhận insight & cải thiện",
      desc: "Xem báo cáo xu hướng, điểm sức khỏe tài chính và nhận tư vấn để gia tăng quỹ tiết kiệm mỗi tháng.",
      badge: "Tối ưu dài hạn"
    }
  ];

  return (
    <section id="how-it-works" className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles size={13} className="text-emerald-700" />
            <span>Quy trình tinh gọn</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Quản lý chi tiêu chỉ với 4 bước
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Quy trình khép kín và tự động hóa giúp bạn hình thành thói quen kiểm soát tài chính chỉ trong vài giây mỗi ngày.
          </p>
        </div>

        {/* Stepper Timeline: Horizontal Desktop & Vertical Mobile */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
          
          {/* Connector Line (Desktop) */}
          <div className="hidden md:block absolute top-10 left-12 right-12 h-0.5 bg-stone-200 -z-0" />

          {steps.map((step, idx) => (
            <div 
              key={idx}
              className="bg-white border border-stone-200/90 rounded-2xl p-6 space-y-4 hover:border-amber-400 hover:shadow-md transition-all duration-200 relative z-10 flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Step Top Bar: Icon + Step Number */}
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shadow-xs">
                    {step.icon}
                  </div>
                  <span className="font-mono font-black text-2xl text-stone-300">
                    {step.num}
                  </span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    {step.badge}
                  </span>
                  <h3 className="font-serif font-bold text-base sm:text-lg text-emerald-950 pt-1">
                    {step.title}
                  </h3>
                </div>

                <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                  {step.desc}
                </p>
              </div>

              <div className="pt-2 border-t border-stone-100 flex items-center gap-1 text-[11px] font-medium text-emerald-800">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Hoàn tất tức thì</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
