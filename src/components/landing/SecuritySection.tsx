import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Cpu, 
  DownloadCloud, 
  Server,
  Sparkles,
  CheckCircle2
} from 'lucide-react';

export default function SecuritySection() {
  const securityPillars = [
    {
      icon: <Lock className="w-6 h-6 text-emerald-800" />,
      title: "Mã hóa mật khẩu chuẩn Bcrypt",
      desc: "Mật khẩu của bạn được băm một chiều an toàn bằng thuật toán Bcrypt. Ngay cả quản trị viên hệ thống cũng không thể đọc được mật khẩu gốc của bạn."
    },
    {
      icon: <KeyRound className="w-6 h-6 text-blue-800" />,
      title: "Bảo mật Token kép & HttpOnly Cookies",
      desc: "Hệ thống xác thực JWT phân tầng (Access Token + Refresh Token) lưu trữ an toàn trong HttpOnly Cookie, giảm thiểu tối đa rủi ro tấn công XSS và đánh cắp token."
    },
    {
      icon: <Cpu className="w-6 h-6 text-amber-700" />,
      title: "Tự động chống xâm nhập & Rate Limiting",
      desc: "Hệ thống giới hạn tần suất yêu cầu (Rate Limiter) chủ động vô hiệu hóa các cuộc tấn công dò mật khẩu (Brute-force) và lạm dụng API."
    },
    {
      icon: <DownloadCloud className="w-6 h-6 text-purple-800" />,
      title: "Quyền sở hữu & Xuất dữ liệu JSON",
      desc: "Dữ liệu thuộc quyền sở hữu của bạn. Bạn có thể xuất toàn bộ lịch sử thu chi, danh mục ra file JSON tiêu chuẩn hoặc xóa tài khoản cá nhân bất kỳ lúc nào."
    },
    {
      icon: <Server className="w-6 h-6 text-teal-800" />,
      title: "Offline-First & Đồng bộ Cloud Đa Nền Tảng",
      desc: "Sổ tay hoạt động trơn tru ngay cả khi mất mạng internet với cơ chế lưu trữ cục bộ, và tự động đồng bộ lên đám mây khi có kết nối."
    }
  ];

  return (
    <section id="security" className="py-16 sm:py-24 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>Bảo mật & Quyền riêng tư đa lớp</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            An toàn dữ liệu là ưu tiên hàng đầu
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Chúng tôi xây dựng nền tảng trên kiến trúc bảo mật nhiều lớp để bảo vệ thông tin thu chi cá nhân an toàn và riêng tư.
          </p>
        </div>

        {/* Security Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {securityPillars.map((item, idx) => (
            <div 
              key={idx}
              className={`bg-white border border-stone-200/90 rounded-2xl p-6 space-y-3 hover:border-emerald-500 hover:shadow-md transition-all duration-200 ${
                idx === 4 ? 'md:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-stone-50 border border-stone-100 flex items-center justify-center shadow-xs">
                {item.icon}
              </div>

              <h3 className="font-serif text-base sm:text-lg font-bold text-emerald-950">
                {item.title}
              </h3>

              <p className="text-stone-600 text-xs sm:text-sm leading-relaxed">
                {item.desc}
              </p>

              <div className="pt-2 flex items-center gap-1.5 text-[11px] font-mono text-emerald-800 font-semibold">
                <CheckCircle2 size={13} className="text-emerald-600" />
                <span>Đã xác thực kiểm thử</span>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
