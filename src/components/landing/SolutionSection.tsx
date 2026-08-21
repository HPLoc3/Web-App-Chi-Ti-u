import React from 'react';
import { 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Wallet, 
  PieChart, 
  Target, 
  BarChart3, 
  Bot,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function SolutionSection() {
  const pillars = [
    {
      icon: <ArrowUpCircle className="w-5 h-5 text-emerald-600" />,
      title: "Thu nhập",
      desc: "Theo dõi mọi nguồn lương, thưởng và thu nhập thụ động."
    },
    {
      icon: <ArrowDownCircle className="w-5 h-5 text-amber-600" />,
      title: "Chi tiêu",
      desc: "Ghi chép giao dịch siêu tốc với danh mục chi tiết."
    },
    {
      icon: <Wallet className="w-5 h-5 text-blue-600" />,
      title: "Ví tiền",
      desc: "Quản lý đa ví: Tiền mặt, Ngân hàng, Thẻ tín dụng, Tiết kiệm."
    },
    {
      icon: <PieChart className="w-5 h-5 text-indigo-600" />,
      title: "Ngân sách",
      desc: "Tự động phân bổ theo quy tắc 50/30/20 và kiểm soát hạn mức."
    },
    {
      icon: <Target className="w-5 h-5 text-rose-600" />,
      title: "Mục tiêu",
      desc: "Lập quỹ tiết kiệm mua nhà, mua xe, du lịch có lộ trình rõ ràng."
    },
    {
      icon: <BarChart3 className="w-5 h-5 text-teal-600" />,
      title: "Báo cáo",
      desc: "Trực quan hóa xu hướng 7 ngày, cơ cấu chi tiêu bằng biểu đồ."
    },
    {
      icon: <Bot className="w-5 h-5 text-amber-600" />,
      title: "AI Copilot",
      desc: "Hiểu tiếng Việt tự nhiên, bóc tách khoản chi và tư vấn tài chính."
    }
  ];

  return (
    <section id="solution" className="py-16 sm:py-20 bg-[#FAF9F6] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-14">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <Sparkles size={13} className="text-emerald-700" />
            <span>Giải pháp toàn diện</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Một nơi để quản lý toàn bộ tài chính cá nhân
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Hợp nhất mọi khía cạnh tiền bạc của bạn vào một giao diện trực quan duy nhất, loại bỏ sự cồng kềnh của sổ tay và bảng tính phức tạp.
          </p>
        </div>

        {/* Pillars Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3 sm:gap-4">
          {pillars.map((item, idx) => (
            <div 
              key={idx}
              className={`bg-white border border-stone-200/80 rounded-2xl p-4 text-center space-y-2.5 hover:border-emerald-500 hover:shadow-sm transition-all duration-200 ${
                idx === 6 ? 'col-span-2 sm:col-span-3 lg:col-span-1 bg-gradient-to-b from-amber-50/60 to-white border-amber-300/80' : ''
              }`}
            >
              <div className="w-10 h-10 mx-auto rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center">
                {item.icon}
              </div>
              <h3 className="font-serif font-bold text-sm text-emerald-950">
                {item.title}
              </h3>
              <p className="text-[11px] text-stone-600 leading-snug">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
