import React from 'react';
import { 
  HelpCircle, 
  Clock, 
  AlertTriangle, 
  LineChart, 
  Scissors,
  ArrowDown
} from 'lucide-react';

export default function ProblemSection() {
  const problems = [
    {
      icon: <HelpCircle className="w-5 h-5 text-amber-700" />,
      title: "Không biết tiền đang đi đâu?",
      description: "Đầu tháng nhận lương rủng rỉnh, cuối tháng ví cạn kiệt nhưng không thể nhớ rõ mình đã tiêu vào những việc gì.",
      badge: "Mất kiểm soát"
    },
    {
      icon: <Clock className="w-5 h-5 text-red-600" />,
      title: "Ghi chép chi tiêu mất thời gian?",
      description: "Mở app, bấm chọn danh mục, gõ số tiền và ngày tháng cho từng khoản nhỏ lẻ khiến 70% người dùng bỏ dở sau 2 tuần.",
      badge: "Ma sát cao"
    },
    {
      icon: <AlertTriangle className="w-5 h-5 text-amber-600" />,
      title: "Cuối tháng thường vượt ngân sách?",
      description: "Không có giới hạn chi tiêu rõ ràng cho từng nhóm hoặc thiếu cảnh báo thời gian thực khi chạm ngưỡng nguy hiểm.",
      badge: "Vượt hạn mức"
    },
    {
      icon: <LineChart className="w-5 h-5 text-orange-600" />,
      title: "Khó nhìn thấy xu hướng chi tiêu?",
      description: "Các con số ghi chép thủ công rời rạc không vẽ nên bức tranh tài chính toàn diện để nhận diện thói quen lãng phí.",
      badge: "Thiếu trực quan"
    },
    {
      icon: <Scissors className="w-5 h-5 text-stone-700" />,
      title: "Không biết nên cắt giảm khoản nào?",
      description: "Thiếu công cụ phân loại chi phí thiết yếu (Needs) và mua sắm tùy hứng (Wants) để tối ưu hóa khoản tiết kiệm hàng tháng.",
      badge: "Khó ra quyết định"
    }
  ];

  return (
    <section id="problems" className="py-16 sm:py-20 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
            <span>Thực trạng tài chính cá nhân</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Bạn có đang gặp những vấn đề này?
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed">
            Việc quản lý tài chính thủ công thường mang lại cảm giác mệt mỏi và dễ dàng bị bỏ rơi sau vài ngày.
          </p>
        </div>

        {/* 5 Problem Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {problems.map((item, idx) => (
            <div 
              key={idx}
              className={`bg-white border border-stone-200/90 rounded-2xl p-5 sm:p-6 space-y-3 hover:border-amber-400 hover:shadow-md transition-all duration-200 group relative ${
                idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-stone-100 group-hover:bg-amber-100 flex items-center justify-center transition-colors">
                  {item.icon}
                </div>
                <span className="text-[11px] font-mono font-semibold px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-600 group-hover:bg-red-50 group-hover:text-red-700 transition-colors">
                  {item.badge}
                </span>
              </div>

              <h3 className="font-serif text-base sm:text-lg font-bold text-stone-900 group-hover:text-emerald-950 transition-colors">
                {item.title}
              </h3>

              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
