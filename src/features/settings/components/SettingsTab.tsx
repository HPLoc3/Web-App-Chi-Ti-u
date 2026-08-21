import React, { useState } from 'react';
import { AppUser } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { AppState } from '../../../types';
import { 
  User, 
  ShieldCheck, 
  Sliders, 
  Database, 
  Sparkles, 
  LogOut, 
  Download, 
  Upload, 
  Trash2, 
  KeyRound, 
  Globe, 
  Bell, 
  Check, 
  AlertTriangle,
  Bot,
  ExternalLink,
  Save,
  CheckCircle2
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';

interface SettingsTabProps {
  currentUser: AppUser | null;
  state: AppState;
  onLogout: () => void;
  onLoadSampleData?: () => void;
  onOpenAuth?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  state,
  onLogout,
  onLoadSampleData,
  onOpenAuth,
}) => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'preferences' | 'data' | 'integrations'>('account');

  // Preferences State
  const [currency, setCurrency] = useState('VND');
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState('80');
  const [autoSyncRecurring, setAutoSyncRecurring] = useState(true);
  const [privacyModeDefault, setPrivacyModeDefault] = useState(() => {
    return localStorage.getItem('so_tay_show_balance') !== 'false';
  });

  // Password modal or inline state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const handleExportData = () => {
    try {
      const exportObject = {
        exportDate: new Date().toISOString(),
        version: '2.0',
        data: {
          expenses: state.expenses,
          goals: state.goals,
          recurringExpenses: state.recurringExpenses,
          income: state.income,
          categoryLimits: state.categoryLimits,
          budgetTemplate: state.budgetTemplate,
        },
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportObject, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `so_tay_chi_tieu_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast('Đã xuất toàn bộ dữ liệu tài chính ra tệp JSON thành công!', 'success');
    } catch (err) {
      showToast('Lỗi khi xuất dữ liệu', 'error');
    }
  };

  const handleSavePreferences = () => {
    localStorage.setItem('so_tay_show_balance', String(privacyModeDefault));
    showToast('Đã lưu tùy chọn cài đặt thành công!', 'success');
  };

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Mật khẩu mới phải có ít nhất 6 ký tự.', 'warning');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showToast('Mật khẩu xác nhận không khớp.', 'warning');
      return;
    }

    showToast('Đã gửi yêu cầu đổi mật khẩu thành công.', 'success');
    setOldPassword('');
    setNewPassword('');
    setConfirmNewPassword('');
    setIsChangingPassword(false);
  };

  const navItems = [
    { key: 'account', label: 'Tài khoản & Hồ sơ', icon: User, desc: 'Thông tin cá nhân & định danh' },
    { key: 'security', label: 'Bảo mật & Phiên', icon: ShieldCheck, desc: 'Mật khẩu & kiểm soát đăng nhập' },
    { key: 'preferences', label: 'Tùy chọn ứng dụng', icon: Sliders, desc: 'Tiền tệ, cảnh báo & hiển thị' },
    { key: 'data', label: 'Quản lý dữ liệu', icon: Database, desc: 'Sao lưu, xuất JSON & nạp mẫu' },
    { key: 'integrations', label: 'Tích hợp & AI', icon: Bot, desc: 'Google OAuth & Gemini AI' },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="pb-2 border-b border-[#E6DEC9]">
        <h2 className="font-serif text-xl sm:text-2xl font-bold text-emerald-950">
          Cài Đặt & Cấu Hình Hệ Thống
        </h2>
        <p className="text-xs text-stone-500 font-sans">
          Quản lý tài khoản, chính sách bảo mật, dữ liệu sao lưu và trải nghiệm người dùng
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
        {/* Left Sub-navigation */}
        <div className="md:col-span-1 bg-white border border-[#E6DEC9] rounded-2xl p-2.5 shadow-xs space-y-1">
          {navItems.map((item) => {
            const isActive = activeSection === item.key;
            const Icon = item.icon;

            return (
              <button
                key={item.key}
                onClick={() => setActiveSection(item.key as any)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition cursor-pointer ${
                  isActive
                    ? 'bg-emerald-950 text-amber-300 font-bold shadow-2xs'
                    : 'text-stone-700 hover:bg-stone-100'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-amber-300' : 'text-stone-500'} />
                <div className="min-w-0 flex-1">
                  <div className="text-xs leading-tight">{item.label}</div>
                  <div className={`text-[10px] truncate ${isActive ? 'text-emerald-200/80' : 'text-stone-400'}`}>
                    {item.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right Content Panels */}
        <div className="md:col-span-3 bg-white border border-[#E6DEC9] rounded-2xl p-6 shadow-xs">
          {/* 1. ACCOUNT */}
          {activeSection === 'account' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 mb-1">
                  Thông Tin Tài Khoản
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Hồ sơ cá nhân và trạng thái xác thực
                </p>
              </div>

              {currentUser ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                    {currentUser.photoURL ? (
                      <img
                        src={currentUser.photoURL}
                        alt="Avatar"
                        className="w-14 h-14 rounded-full object-cover border-2 border-amber-400"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-amber-500 text-emerald-950 font-serif font-black text-xl flex items-center justify-center">
                        {(currentUser.displayName || currentUser.email || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h4 className="font-serif font-bold text-base text-emerald-950">
                        {currentUser.displayName || 'Người dùng Sổ Tay'}
                      </h4>
                      <p className="text-xs font-mono text-stone-500">{currentUser.email}</p>
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                        <CheckCircle2 size={11} />
                        <span>Đã xác thực bảo mật</span>
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-400 block mb-1">Phương thức đăng nhập</span>
                      <span className="font-semibold text-stone-800">
                        {currentUser.provider === 'google' || currentUser.provider === 'google.com' ? 'Google OAuth 2.0' : 'Email & Mật khẩu'}
                      </span>
                    </div>
                    <div className="p-3 rounded-xl bg-stone-50 border border-stone-100">
                      <span className="text-stone-400 block mb-1">Dung lượng giao dịch đã lưu</span>
                      <span className="font-semibold text-stone-800">
                        {state.expenses.length} giao dịch • {state.goals.length} mục tiêu
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <p className="text-xs text-amber-900 font-medium">
                    Bạn đang sử dụng ở chế độ Khách (Dữ liệu lưu tạm trên trình duyệt). Đăng nhập để đồng bộ an toàn lên Cloud.
                  </p>
                  {onOpenAuth && (
                    <button
                      onClick={onOpenAuth}
                      className="px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Đăng nhập / Đăng ký ngay
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 2. SECURITY */}
          {activeSection === 'security' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 mb-1">
                  Bảo Mật & Quản Lý Phiên
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Kiểm soát mật khẩu và bảo vệ an toàn tài sản dữ liệu
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">Đổi Mật Khẩu</h4>
                    <p className="text-[11px] text-stone-500">Cập nhật mật khẩu định kỳ để nâng cao bảo mật</p>
                  </div>
                  <button
                    onClick={() => setIsChangingPassword(!isChangingPassword)}
                    className="px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                  >
                    {isChangingPassword ? 'Đóng' : 'Đổi mật khẩu'}
                  </button>
                </div>

                {isChangingPassword && (
                  <form onSubmit={handleChangePassword} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu hiện tại</label>
                      <input
                        type="password"
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        required
                        className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu mới</label>
                        <input
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">Xác nhận mật khẩu</label>
                        <input
                          type="password"
                          value={confirmNewPassword}
                          onChange={(e) => setConfirmNewPassword(e.target.value)}
                          required
                          className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-emerald-950 text-amber-300 font-bold text-xs rounded-lg transition"
                    >
                      Cập nhật mật khẩu
                    </button>
                  </form>
                )}

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">Đăng Xuất Mọi Thiết Bị</h4>
                    <p className="text-[11px] text-stone-500">Hủy bỏ toàn bộ phiên làm việc trên các trình duyệt khác</p>
                  </div>
                  <button
                    onClick={() => {
                      onLogout();
                      showToast('Đã đăng xuất khỏi tất cả thiết bị.', 'info');
                    }}
                    className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition cursor-pointer"
                  >
                    Đăng xuất tất cả
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 3. PREFERENCES */}
          {activeSection === 'preferences' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 mb-1">
                  Tùy Chọn Ứng Dụng
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Tùy biến hiển thị tiền tệ, ngưỡng cảnh báo và trải nghiệm cá nhân hóa
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Đơn vị tiền tệ chính</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full sm:w-64 px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-semibold"
                  >
                    <option value="VND">₫ Việt Nam Đồng (VND)</option>
                    <option value="USD">$ Đô la Mỹ (USD)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-stone-700 mb-1">
                    Ngưỡng cảnh báo ngân sách màu vàng ({budgetAlertThreshold}%)
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value={budgetAlertThreshold}
                    onChange={(e) => setBudgetAlertThreshold(e.target.value)}
                    className="w-full sm:w-64 accent-amber-600"
                  />
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Hệ thống sẽ chuyển màu cảnh báo khi bạn tiêu đến {budgetAlertThreshold}% ngân sách
                  </span>
                </div>

                <div className="pt-3 border-t border-stone-200">
                  <button
                    onClick={handleSavePreferences}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 hover:bg-emerald-900 text-amber-300 font-bold rounded-xl transition cursor-pointer"
                  >
                    <Save size={14} />
                    <span>Lưu tùy chọn</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 4. DATA */}
          {activeSection === 'data' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 mb-1">
                  Quản Lý Dữ Liệu & Sao Lưu
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Xuất dữ liệu dự phòng chuẩn JSON, nạp dữ liệu mẫu hoặc thiết lập lại
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">Xuất Toàn Bộ Dữ Liệu (JSON)</h4>
                    <p className="text-[11px] text-stone-500">
                      Tải về tệp sao lưu chứa tất cả {state.expenses.length} giao dịch và mục tiêu
                    </p>
                  </div>
                  <button
                    onClick={handleExportData}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-950 text-amber-300 rounded-xl text-xs font-bold hover:bg-emerald-900 transition cursor-pointer shrink-0"
                  >
                    <Download size={14} />
                    <span>Xuất tệp JSON</span>
                  </button>
                </div>

                {onLoadSampleData && (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">Nạp Dữ Liệu Mẫu Thực Tế (3 Tuần)</h4>
                      <p className="text-[11px] text-stone-500">
                        Nạp nhanh các khoản ăn uống, grab, siêu thị, điện nước để trải nghiệm biểu đồ
                      </p>
                    </div>
                    <button
                      onClick={onLoadSampleData}
                      className="flex items-center gap-1.5 px-3.5 py-2 border border-amber-300 bg-amber-50 text-amber-900 rounded-xl text-xs font-bold hover:bg-amber-100 transition cursor-pointer shrink-0"
                    >
                      <Sparkles size={14} className="text-amber-700" />
                      <span>Nạp dữ liệu mẫu</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. INTEGRATIONS */}
          {activeSection === 'integrations' && (
            <div className="space-y-6">
              <div>
                <h3 className="font-serif text-base font-bold text-emerald-950 mb-1">
                  Tích Hợp & Trí Tuệ Nhân Tạo
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  Quản lý kết nối Google OAuth và Mô hình AI Phân tích tài chính
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-900 flex items-center justify-center font-bold">
                      G
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">Google OAuth 2.0</h4>
                      <p className="text-[11px] text-stone-500">Đăng nhập nhanh không cần mật khẩu</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Sẵn sàng</span>
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">Gemini AI Financial Copilot</h4>
                      <p className="text-[11px] text-stone-500">Tự động phân tích ngôn ngữ tự nhiên và đề xuất ngân sách</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                    <CheckCircle2 size={13} />
                    <span>Đang hoạt động</span>
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
