import React from 'react';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  Cpu, 
  DownloadCloud, 
  Server,
  Sparkles
} from 'lucide-react';

export default function SecuritySection() {
  const securityPillars = [
    {
      icon: <Lock className="w-6 h-6 text-emerald-800" />,
      title: "Băm mật khẩu bằng Bcrypt",
      desc: "Máy chủ chỉ lưu bản băm một chiều (bcrypt) của mật khẩu, không lưu mật khẩu gốc."
    },
    {
      icon: <KeyRound className="w-6 h-6 text-blue-800" />,
      title: "Phiên đăng nhập bằng hai token",
      desc: "Đăng nhập dùng JWT: access token hết hạn sau 15 phút, refresh token được đổi mới mỗi lần làm mới phiên. Bạn có thể đăng xuất mọi thiết bị trong Cài đặt."
    },
    {
      icon: <Cpu className="w-6 h-6 text-amber-700" />,
      title: "Giới hạn tần suất yêu cầu",
      desc: "Máy chủ giới hạn số lần đăng nhập, đăng ký, yêu cầu đặt lại mật khẩu và số yêu cầu API trong mỗi khoảng thời gian."
    },
    {
      icon: <DownloadCloud className="w-6 h-6 text-purple-800" />,
      title: "Xuất dữ liệu ra JSON",
      desc: "Trong Cài đặt, bạn có thể xuất giao dịch, mục tiêu, khoản định kỳ, thu nhập và hạn mức ra tệp JSON."
    },
    {
      icon: <Server className="w-6 h-6 text-teal-800" />,
      title: "Dùng thử hoặc lưu theo tài khoản",
      desc: "Dùng thử không cần tài khoản, dữ liệu lưu trên trình duyệt này. Đăng nhập để lưu trên máy chủ; dữ liệu dùng thử không tự chuyển sang tài khoản."
    }
  ];

  return (
    <section id="security" className="py-16 sm:py-24 bg-[#FCFAF4] border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
            <ShieldCheck size={14} className="text-emerald-700" />
            <span>Bảo mật & Dữ liệu</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-emerald-950 tracking-tight">
            Tài khoản và dữ liệu của bạn
          </h2>

          <p className="text-stone-600 text-sm sm:text-base leading-relaxed max-w-2xl mx-auto">
            Những cơ chế đang có trong ứng dụng.
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
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}
