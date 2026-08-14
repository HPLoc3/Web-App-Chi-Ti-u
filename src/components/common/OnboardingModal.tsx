import React, { useState } from 'react';
import { 
  X, 
  Bot, 
  PieChart, 
  Target, 
  Database, 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  MessageSquare, 
  ShieldCheck, 
  Zap,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: 'overview' | 'chatbot' | 'budget' | 'expenses' | 'goals' | 'about') => void;
}

export default function OnboardingModal({ isOpen, onClose, onNavigateTab }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      id: 'chatbot',
      badge: 'BƯỚC 1 / 4 • TÍNH NĂNG ĐỘT PHÁ',
      title: 'Ghi Chi Tiêu Siêu Tốc Bằng Chatbot AI',
      subtitle: 'Xóa bỏ hoàn toàn ma sát nhập liệu bằng ngôn ngữ tự nhiên Tiếng Việt',
      icon: <Bot className="w-10 h-10 text-amber-400" />,
      color: 'from-emerald-950 via-emerald-900 to-emerald-950',
      borderColor: 'border-amber-500',
      content: (
        <div className="space-y-4 text-stone-700 text-xs sm:text-sm">
          <p className="leading-relaxed">
            Thay vì phải mở form, chọn từng danh mục và gõ số tiền phức tạp, bạn chỉ cần gõ một câu nói tự nhiên như khi nhắn tin với bạn bè:
          </p>

          <div className="bg-emerald-950/90 text-emerald-100 p-4 rounded-xl border border-emerald-700/80 space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-bold border-b border-emerald-800 pb-1.5">
              <MessageSquare size={14} />
              <span>Ví dụ tin nhắn mẫu:</span>
            </div>
            <p className="text-amber-200">💬 "Hôm nay ăn sáng 45k phở bò và đổ xăng xe máy 50k"</p>
            <div className="text-[11px] text-emerald-300/90 pt-1 space-y-1">
              <p>✨ <strong>Bóc tách tự động:</strong></p>
              <p>• Ăn uống: <span className="text-amber-300">45.000 VNĐ</span> (Phở bò)</p>
              <p>• Di chuyển: <span className="text-amber-300">50.000 VNĐ</span> (Xe máy)</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-emerald-900 bg-emerald-50 p-2.5 rounded-lg border border-emerald-200 text-xs font-semibold">
            <Zap size={16} className="text-amber-600 shrink-0" />
            <span>Thời gian nhập liệu thực tế chỉ tốn <strong>dưới 10 giây/ngày</strong>!</span>
          </div>
        </div>
      )
    },
    {
      id: 'budget',
      badge: 'BƯỚC 2 / 4 • PHÂN BỔ TÀI CHÍNH',
      title: 'Lập Ngân Sách Chuẩn 50/30/20',
      subtitle: 'Kiểm soát dòng tiền thông minh và cảnh báo chi tiêu vượt ngưỡng',
      icon: <PieChart className="w-10 h-10 text-amber-400" />,
      color: 'from-emerald-900 via-emerald-850 to-emerald-900',
      borderColor: 'border-amber-400',
      content: (
        <div className="space-y-4 text-stone-700 text-xs sm:text-sm">
          <p className="leading-relaxed">
            Áp dụng mô hình quản lý tài chính kinh điển <strong>50/30/20</strong> giúp bạn cân bằng hoàn hảo giữa sinh hoạt hằng ngày và tích lũy tương lai:
          </p>

          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 space-y-1">
              <span className="font-bold text-amber-900 block text-base">50%</span>
              <span className="font-semibold text-stone-800 text-[11px] block">Thiết Yếu</span>
              <span className="text-[10px] text-stone-500 block">Ăn uống, Hóa đơn, Nhà ở</span>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-2.5 space-y-1">
              <span className="font-bold text-blue-900 block text-base">30%</span>
              <span className="font-semibold text-stone-800 text-[11px] block">Linh Hoạt</span>
              <span className="text-[10px] text-stone-500 block">Giải trí, Mua sắm, Bạn bè</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 space-y-1">
              <span className="font-bold text-emerald-900 block text-base">20%</span>
              <span className="font-semibold text-stone-800 text-[11px] block">Tích Lũy</span>
              <span className="text-[10px] text-stone-500 block">Tiết kiệm, Quỹ dự phòng</span>
            </div>
          </div>

          <p className="text-stone-600 text-xs">
            💡 Hệ thống sẽ tự động tính toán hạn mức cho từng nhóm và hiển thị thanh tiến độ cảnh báo màu cam/đỏ khi bạn sắp vượt hạn mức.
          </p>
        </div>
      )
    },
    {
      id: 'goals',
      badge: 'BƯỚC 3 / 4 • ĐỘNG LỰC TÍCH LŨY',
      title: 'Thiết Lập & Theo Dõi Mục Tiêu',
      subtitle: 'Cụ thể hóa ước mơ bằng các hũ tiết kiệm có kỳ hạn rõ ràng',
      icon: <Target className="w-10 h-10 text-amber-400" />,
      color: 'from-emerald-950 via-emerald-900 to-emerald-950',
      borderColor: 'border-amber-500',
      content: (
        <div className="space-y-4 text-stone-700 text-xs sm:text-sm">
          <p className="leading-relaxed">
            Đặt các mục tiêu ngắn hạn và dài hạn để thôi thúc thói quen tiết kiệm hằng ngày:
          </p>

          <div className="space-y-2">
            <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between font-semibold text-stone-800 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">🛡️</span> Quỹ dự phòng khẩn cấp
                </span>
                <span className="text-emerald-800 font-bold">5.500.000 / 15.000.000 đ (36%)</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full rounded-full w-[36%]"></div>
              </div>
            </div>

            <div className="bg-white border border-stone-200 rounded-xl p-3 space-y-1.5 shadow-xs">
              <div className="flex items-center justify-between font-semibold text-stone-800 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="text-base">💻</span> Mua máy tính làm việc mới
                </span>
                <span className="text-amber-800 font-bold">9.000.000 / 22.000.000 đ (41%)</span>
              </div>
              <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full w-[41%]"></div>
              </div>
            </div>
          </div>

          <p className="text-stone-600 text-xs">
            Nạp tiền tích lũy trực tiếp vào từng mục tiêu để xem phần trăm hoàn thành tăng trưởng theo thời gian.
          </p>
        </div>
      )
    },
    {
      id: 'data',
      badge: 'BƯỚC 4 / 4 • BẢO MẬT & DỮ LIỆU',
      title: 'Đồng Bộ Cloud & Dữ Liệu Mẫu',
      subtitle: 'An toàn tuyệt đối, dễ dàng trải nghiệm ngay không cần chờ đợi',
      icon: <Database className="w-10 h-10 text-amber-400" />,
      color: 'from-emerald-900 via-emerald-850 to-emerald-900',
      borderColor: 'border-amber-400',
      content: (
        <div className="space-y-4 text-stone-700 text-xs sm:text-sm">
          <p className="leading-relaxed">
            Sổ tay chi tiêu cung cấp đầy đủ công cụ để bạn làm chủ dữ liệu của mình:
          </p>

          <div className="space-y-2">
            <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
              <ShieldCheck className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-emerald-950 text-xs">Đồng bộ Firebase Firestore</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  Đăng nhập qua Google hoặc Email để lưu trữ dữ liệu an toàn trên đám mây, sử dụng xuyên suốt nhiều thiết bị.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 p-2.5 rounded-xl">
              <Sparkles className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <h5 className="font-bold text-amber-950 text-xs">Trải nghiệm Dữ Liệu Mẫu (3 Tuần)</h5>
                <p className="text-[11px] text-stone-600 mt-0.5">
                  App đã nạp sẵn 3 tuần dữ liệu thực tế. Bạn có thể nhấn nút <strong className="text-red-800">"Xóa dữ liệu mẫu"</strong> ở góc trên bất kỳ lúc nào để bắt đầu sổ tay trống!
                </p>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const activeStepObj = steps[currentStep];

  const handleFinish = () => {
    localStorage.setItem('so_tay_onboarding_completed', 'true');
    onClose();
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleFinish();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-lg bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`bg-gradient-to-r ${activeStepObj.color} text-white px-6 py-5 border-b-2 ${activeStepObj.borderColor} relative`}>
          <button 
            onClick={handleFinish}
            className="absolute top-4 right-4 p-1.5 text-emerald-200/80 hover:text-white hover:bg-emerald-900 rounded-full transition cursor-pointer"
            title="Bỏ qua hướng dẫn"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-900/80 border border-amber-400/40 shrink-0 shadow-xs">
              {activeStepObj.icon}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold tracking-widest text-amber-300 uppercase block mb-0.5">
                {activeStepObj.badge}
              </span>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-amber-50 leading-snug">
                {activeStepObj.title}
              </h3>
              <p className="text-xs text-emerald-100/90 font-sans mt-0.5">
                {activeStepObj.subtitle}
              </p>
            </div>
          </div>
        </div>

        <div className="w-full bg-stone-200 h-1.5">
          <div 
            className="bg-amber-500 h-full transition-all duration-300"
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          ></div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeStepObj.content}
        </div>

        <div className="bg-[#FAF7F0] border-t border-[#E6DEC9] px-6 py-4 flex items-center justify-between gap-3">
          <button
            onClick={handleFinish}
            className="text-xs text-stone-500 hover:text-stone-800 font-medium cursor-pointer transition py-2"
          >
            Bỏ qua
          </button>

          <div className="flex items-center gap-1.5">
            {steps.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(idx)}
                className={`w-2.5 h-2.5 rounded-full transition-all cursor-pointer ${
                  idx === currentStep 
                    ? 'bg-amber-500 w-5' 
                    : 'bg-stone-300 hover:bg-stone-400'
                }`}
                title={`Chuyển đến bước ${idx + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-3 py-2 border border-stone-300 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition cursor-pointer flex items-center gap-1"
              >
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">Trở lại</span>
              </button>
            )}

            {currentStep < steps.length - 1 ? (
              <button
                onClick={handleNext}
                className="px-4 py-2 bg-emerald-900 hover:bg-emerald-850 text-white font-semibold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-xs"
              >
                <span>Tiếp theo</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <button
                onClick={handleFinish}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-emerald-950 font-bold text-xs rounded-xl transition cursor-pointer flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 size={15} />
                <span>Khám phá ngay!</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
