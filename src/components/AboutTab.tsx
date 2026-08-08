import React from 'react';
import { 
  BookOpen, 
  Target, 
  Zap, 
  Cpu, 
  BarChart3, 
  ShieldCheck, 
  User, 
  CheckCircle2, 
  Bot, 
  FileCode2, 
  Sparkles, 
  ArrowRight,
  Layers,
  Globe,
  Clock,
  LayoutDashboard
} from 'lucide-react';

interface AboutTabProps {
  onGoToApp?: () => void;
  onGoToChatbot?: () => void;
}

export default function AboutTab({ onGoToApp, onGoToChatbot }: AboutTabProps) {
  return (
    <div className="space-y-8 font-sans antialiased text-stone-800">
      
      {/* ---------------------------------------------------------------- HERO CASE STUDY BANNER */}
      <div className="bg-gradient-to-r from-emerald-950 via-emerald-900 to-emerald-950 text-white p-6 sm:p-8 rounded-2xl border-2 border-amber-500/80 shadow-md relative overflow-hidden">
        
        {/* Subtle Background Pattern */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-400/40 text-amber-300 text-xs font-semibold">
            <Sparkles size={14} className="text-amber-400" />
            <span>EXECUTIVE CASE STUDY • RECRUITER SUMMARY (1-MIN READ)</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-4xl font-black text-amber-50 tracking-tight leading-tight">
            SỔ TAY CHI TIÊU THÔNG MINH
          </h2>

          <p className="text-emerald-100 text-sm sm:text-base leading-relaxed">
            Ứng dụng quản lý tài chính cá nhân thế hệ mới giúp triệt tiêu ma sát nhập liệu bằng <strong className="text-amber-300 font-semibold">Chatbot NLP Tiếng Việt</strong> kết hợp mô hình phân bổ ngân sách 50/30/20 và trực quan hóa dữ liệu thời gian thực.
          </p>

          <div className="pt-2 flex flex-wrap gap-3 text-xs font-mono">
            <span className="bg-emerald-900/90 border border-emerald-700/80 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <User size={13} className="text-amber-400" />
              Tác giả: <strong>Hồ Phú Lộc</strong>
            </span>
            <span className="bg-emerald-900/90 border border-emerald-700/80 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Globe size={13} className="text-amber-400" />
              Domain: <strong>hophuloc.online</strong>
            </span>
            <span className="bg-emerald-900/90 border border-emerald-700/80 text-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
              <Clock size={13} className="text-amber-400" />
              Thời gian nhập liệu: <strong>&lt; 10 giây/ngày</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------------- PROBLEM vs SOLUTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Problem Card */}
        <div className="bg-red-50/60 border-2 border-red-200/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-red-900 font-serif font-bold text-lg border-b border-red-200 pb-2">
            <span className="w-8 h-8 rounded-lg bg-red-100 text-red-700 flex items-center justify-center font-bold text-base shrink-0">
              ❌
            </span>
            <h3>Vấn Đề (Problem Statement)</h3>
          </div>
          <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
            Việc ghi chép chi tiêu hằng ngày thường thất bại vì <strong className="text-red-950 font-semibold">ma sát nhập liệu quá cao</strong>. Hầu hết app tài chính yêu cầu mở form, chọn từng danh mục, gõ số tiền và chọn ngày thủ công.
          </p>
          <ul className="space-y-1.5 text-xs text-stone-600 list-disc list-inside pt-1">
            <li>Hơn <strong>70% người dùng bỏ dở</strong> ứng dụng sau 2 tuần.</li>
            <li>Rất tốn thời gian khi có nhiều giao dịch nhỏ lẻ trong ngày.</li>
            <li>Thiếu tính cá nhân hóa và báo cáo trực quan tức thì.</li>
          </ul>
        </div>

        {/* Solution Card */}
        <div className="bg-emerald-50/60 border-2 border-emerald-200/80 rounded-2xl p-6 space-y-3">
          <div className="flex items-center gap-2 text-emerald-950 font-serif font-bold text-lg border-b border-emerald-200 pb-2">
            <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-base shrink-0">
              💡
            </span>
            <h3>Giải Pháp (Core Solution)</h3>
          </div>
          <p className="text-stone-700 text-xs sm:text-sm leading-relaxed">
            Sử dụng <strong className="text-emerald-900 font-semibold">Chatbot bóc tách ngôn ngữ tự nhiên Tiếng Việt (NLP)</strong> kết hợp Google Gemini API. Người dùng chỉ cần gõ hoặc nói một câu tự nhiên.
          </p>
          <ul className="space-y-1.5 text-xs text-stone-600 list-inside space-y-1.5 pt-1">
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Nhập trong <strong>dưới 10 giây</strong> mà không cần mở form phức tạp.</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Tự bóc tách nhiều khoản chi cùng lúc (vd: *"Ăn sáng 45k, cafe 30k"*).</span>
            </li>
            <li className="flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
              <span>Tự động phân loại danh mục & cập nhật hạn mức ngân sách lập tức.</span>
            </li>
          </ul>
        </div>

      </div>

      {/* ---------------------------------------------------------------- CORE FEATURES HIGHLIGHT */}
      <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 space-y-6">
        <div className="flex items-center justify-between border-b border-stone-200 pb-3">
          <div>
            <h3 className="font-serif text-xl font-bold text-emerald-950 flex items-center gap-2">
              <Zap size={20} className="text-amber-600" />
              Các Tính Năng Trọng Tâm (Key Features)
            </h3>
            <p className="text-stone-500 text-xs mt-0.5">
              Được thiết kế hoàn chỉnh theo quy trình UX/UI khép kín
            </p>
          </div>
          {onGoToChatbot && (
            <button
              onClick={onGoToChatbot}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs shrink-0"
            >
              <Bot size={14} />
              <span>Thử Chatbot AI</span>
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-lg">
              🤖
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Chatbot NLP Tiếng Việt</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Thuật toán bóc tách cú pháp tự viết (rule-based regex) kết hợp Gemini Pro API xử lý ngôn ngữ tự nhiên Tiếng Việt chuẩn xác.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-lg">
              📊
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Biểu Đồ Trực Quan (Recharts)</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Trực quan hóa phân bổ chi tiêu theo nhóm, xu hướng biến động 7 ngày gần nhất và tỉ lệ thu nhập vs chi tiêu thực tế.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-lg">
              🎯
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Ngân Sách 50/30/20</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Mô hình quản lý tài chính chuẩn mực: 50% Thiết yếu, 30% Linh hoạt, 20% Tích lũy kèm cảnh báo khi vượt hạn mức.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-purple-100 text-purple-800 flex items-center justify-center font-bold text-lg">
              🔒
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Xác Thực Firebase Auth</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Đăng nhập an toàn qua Google OAuth 2.0 hoặc Email/Password. Dữ liệu đồng bộFirestore và lưu trữ bền vững.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-orange-100 text-orange-800 flex items-center justify-center font-bold text-lg">
              💾
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Sao Lưu & Khôi Phục JSON</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Cho phép xuất (export) toàn bộ lịch sử chi tiêu thành file `.json` hoặc nhập (import) lại bất kỳ lúc nào để bảo toàn dữ liệu.
            </p>
          </div>

          <div className="bg-white border border-stone-200 rounded-xl p-4 space-y-2">
            <div className="w-9 h-9 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center font-bold text-lg">
              📌
            </div>
            <h4 className="font-bold text-stone-800 text-sm">Engine Dữ Liệu Mẫu</h4>
            <p className="text-stone-600 text-xs leading-relaxed">
              Tự động khởi tạo 3 tuần dữ liệu mẫu đa dạng danh mục cho nhà tuyển dụng & trải nghiệm lần đầu đánh giá nhanh tính năng.
            </p>
          </div>

        </div>
      </div>

      {/* ---------------------------------------------------------------- TECH STACK TABLE */}
      <div className="bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl p-6 space-y-4">
        <h3 className="font-serif text-xl font-bold text-emerald-950 flex items-center gap-2 border-b border-stone-200 pb-3">
          <Cpu size={20} className="text-emerald-800" />
          Công Nghệ & Kiến Trúc Sản Phẩm (Technology Stack)
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-100 border-b border-stone-300 text-stone-700 font-serif font-bold uppercase">
                <th className="py-2.5 px-3">Thành phần</th>
                <th className="py-2.5 px-3">Công nghệ sử dụng</th>
                <th className="py-2.5 px-3">Vai trò & Giá trị triển khai</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200">
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-950">Frontend UI</td>
                <td className="py-2.5 px-3 font-mono text-stone-800">React 18 + TypeScript + Vite</td>
                <td className="py-2.5 px-3 text-stone-600">Đảm bảo type-safety, tốc độ tải trang cao và kiến trúc component dễ bảo trì.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-950">Styling & UI UX</td>
                <td className="py-2.5 px-3 font-mono text-stone-800">Tailwind CSS + Lucide Icons</td>
                <td className="py-2.5 px-3 text-stone-600">Giao diện phong cách Sổ tay Da (Leather Ledger) ấm áp, chuẩn Responsive mobile/desktop.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-950">NLP & AI Backend</td>
                <td className="py-2.5 px-3 font-mono text-stone-800">Custom Parser + Google Gemini API (@google/genai)</td>
                <td className="py-2.5 px-3 text-stone-600">Phân tích tiếng Việt tự nhiên, bóc tách thực thể số tiền & danh mục thông minh.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-950">Data Visualization</td>
                <td className="py-2.5 px-3 font-mono text-stone-800">Recharts Library</td>
                <td className="py-2.5 px-3 text-stone-600">Vẽ biểu đồ hình tròn (PieChart) & cột (BarChart) phản hồi linh hoạt theo kích thước màn hình.</td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 font-bold text-emerald-950">Database & Auth</td>
                <td className="py-2.5 px-3 font-mono text-stone-800">Firebase Authentication & Firestore</td>
                <td className="py-2.5 px-3 text-stone-600">Bảo mật thông tin người dùng, lưu trữ cloud kiên cố kết hợp LocalStorage fallback offline.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------------------------------------------------------------- DEVELOPER CONTACT */}
      <div className="bg-emerald-950 text-white rounded-2xl p-6 sm:p-8 border-2 border-amber-500/80 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <span className="text-xs font-mono text-amber-400 font-bold uppercase tracking-widest block">
            LỜI NGỎ TỪ TÁC GIẢ
          </span>
          <h3 className="font-serif text-xl sm:text-2xl font-bold text-amber-50">
            Hồ Phú Lộc • Senior Web Developer
          </h3>
          <p className="text-emerald-200 text-xs sm:text-sm max-w-xl leading-relaxed">
            "Sổ Tay Chi Tiêu THÔNG MINH được xây dựng với tư duy lấy trải nghiệm người dùng làm trọng tâm (User-Centered Design), hướng tới việc tạo ra sản phẩm thực sự hữu ích cho cuộc sống hằng ngày."
          </p>
        </div>

        {onGoToApp && (
          <button
            onClick={onGoToApp}
            className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-sm rounded-xl transition cursor-pointer shadow-lg flex items-center gap-2 shrink-0"
          >
            <LayoutDashboard size={16} />
            <span>Khám phá Bảng Điều Khiển</span>
            <ArrowRight size={16} />
          </button>
        )}
      </div>

    </div>
  );
}
