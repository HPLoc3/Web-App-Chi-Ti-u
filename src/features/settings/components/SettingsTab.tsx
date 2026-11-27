import React, { useState, useRef } from 'react';
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
  Save
} from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { apiClient, setStoredTokens, getApiErrorMessage } from '../../../lib/apiClient';
import { validatePassword } from '../../../utils/passwordPolicy';
import { ConfirmModal } from '../../../components/common/ConfirmModal';

interface SettingsTabProps {
  currentUser: AppUser | null;
  state: AppState;
  onLogout: () => void;
  onLogoutAll?: () => Promise<void>;
  onLoadSampleData?: () => void;
  onOpenAuth?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  currentUser,
  state,
  onLogout,
  onLogoutAll,
  onLoadSampleData,
  onOpenAuth,
}) => {
  const { showToast } = useToast();
  const [activeSection, setActiveSection] = useState<'account' | 'security' | 'preferences' | 'data' | 'integrations'>('account');

  // Password modal or inline state
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const savingPasswordRef = useRef(false);

  const [isConfirmingLogoutAll, setIsConfirmingLogoutAll] = useState(false);
  const loggingOutAllRef = useRef(false);

  const isGoogleAccount = currentUser?.provider === 'google' || currentUser?.provider === 'google.com';

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

      showToast('Đã xuất giao dịch, mục tiêu, khoản định kỳ, thu nhập và ngân sách ra tệp JSON (không gồm ví).', 'success');
    } catch (err) {
      showToast('Lỗi khi xuất dữ liệu', 'error');
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingPasswordRef.current) return;

    const invalid =
      validatePassword(newPassword) ||
      (newPassword !== confirmNewPassword ? 'Mật khẩu xác nhận không khớp.' : null);
    if (invalid) {
      setPasswordError(invalid);
      return;
    }

    setPasswordError(null);
    savingPasswordRef.current = true;
    setIsSavingPassword(true);
    try {
      const response = await apiClient.post('/api/v1/users/change-password', {
        currentPassword: oldPassword,
        newPassword,
      });
      // Server thu hồi phiên cũ và cấp token mới cho thiết bị này
      setStoredTokens(response.data?.accessToken, response.data?.refreshToken);
      showToast('Đổi mật khẩu thành công.', 'success');
      setOldPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChangingPassword(false);
    } catch (err) {
      setPasswordError(getApiErrorMessage(err, 'Đổi mật khẩu thất bại. Vui lòng thử lại.'));
    } finally {
      savingPasswordRef.current = false;
      setIsSavingPassword(false);
    }
  };

  const handleConfirmLogoutAll = async () => {
    setIsConfirmingLogoutAll(false);
    if (!onLogoutAll || loggingOutAllRef.current) return;
    loggingOutAllRef.current = true;
    try {
      await onLogoutAll();
      showToast('Đã đăng xuất khỏi tất cả thiết bị.', 'info');
    } catch (err) {
      showToast(getApiErrorMessage(err, 'Không thể đăng xuất tất cả thiết bị.'), 'error');
    } finally {
      loggingOutAllRef.current = false;
    }
  };

  const navItems = [
    { key: 'account', label: 'Tài khoản & Hồ sơ', icon: User, desc: 'Thông tin tài khoản' },
    { key: 'security', label: 'Bảo mật & Phiên', icon: ShieldCheck, desc: 'Mật khẩu & kiểm soát đăng nhập' },
    { key: 'preferences', label: 'Tùy chọn ứng dụng', icon: Sliders, desc: 'Tiền tệ & cảnh báo (sắp có)' },
    { key: 'data', label: 'Quản lý dữ liệu', icon: Database, desc: onLoadSampleData ? 'Xuất JSON & nạp mẫu' : 'Xuất JSON' },
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
          Quản lý tài khoản, phiên đăng nhập và dữ liệu
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
                  Thông tin tài khoản đang dùng
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
                      <span className="text-stone-400 block mb-1">Dữ liệu hiện có</span>
                      <span className="font-semibold text-stone-800">
                        {state.expenses.length} giao dịch • {state.goals.length} mục tiêu
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-center space-y-3">
                  <p className="text-xs text-amber-900 font-medium">
                    Dữ liệu đang lưu trên trình duyệt này. Đăng nhập để lưu trên máy chủ; dữ liệu dùng thử không tự chuyển sang tài khoản.
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
                  Mật khẩu và phiên đăng nhập
                </p>
              </div>

              <div className="space-y-4">
                {!currentUser ? (
                  <p className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900">
                    Bạn đang dùng chế độ Khách. Đăng nhập để đổi mật khẩu và quản lý phiên đăng nhập.
                  </p>
                ) : isGoogleAccount ? (
                  <p className="p-4 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
                    Tài khoản đăng nhập bằng Google nên không có mật khẩu để đổi. Hãy quản lý mật khẩu trong tài khoản Google của bạn.
                  </p>
                ) : (
                  <>
                    <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                      <div>
                        <h4 className="text-xs font-bold text-stone-800">Đổi Mật Khẩu</h4>
                        <p className="text-[11px] text-stone-500">Cập nhật mật khẩu định kỳ để nâng cao bảo mật</p>
                      </div>
                      <button
                        onClick={() => {
                          setPasswordError(null);
                          setIsChangingPassword(!isChangingPassword);
                        }}
                        className="px-3 py-1.5 border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 rounded-lg text-xs font-semibold transition cursor-pointer"
                      >
                        {isChangingPassword ? 'Đóng' : 'Đổi mật khẩu'}
                      </button>
                    </div>

                    {isChangingPassword && (
                      <form onSubmit={handleChangePassword} className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                        <div>
                          <label htmlFor="current-password" className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu hiện tại</label>
                          <input
                            id="current-password"
                            type="password"
                            autoComplete="current-password"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label htmlFor="new-password" className="block text-xs font-semibold text-stone-700 mb-1">Mật khẩu mới</label>
                            <input
                              id="new-password"
                              type="password"
                              autoComplete="new-password"
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              required
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                            />
                          </div>
                          <div>
                            <label htmlFor="confirm-new-password" className="block text-xs font-semibold text-stone-700 mb-1">Xác nhận mật khẩu</label>
                            <input
                              id="confirm-new-password"
                              type="password"
                              autoComplete="new-password"
                              value={confirmNewPassword}
                              onChange={(e) => setConfirmNewPassword(e.target.value)}
                              required
                              className="w-full px-3 py-2 rounded-lg border border-stone-300 text-xs focus:outline-none focus:border-emerald-700"
                            />
                          </div>
                        </div>
                        {passwordError && (
                          <p role="alert" className="text-xs font-medium text-red-700">
                            {passwordError}
                          </p>
                        )}
                        <button
                          type="submit"
                          disabled={isSavingPassword}
                          className="px-4 py-2 bg-emerald-950 text-amber-300 font-bold text-xs rounded-lg transition disabled:opacity-50"
                        >
                          {isSavingPassword ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                        </button>
                      </form>
                    )}
                  </>
                )}

                {currentUser && onLogoutAll && (
                  <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">Đăng Xuất Mọi Thiết Bị</h4>
                      <p className="text-[11px] text-stone-500">Thu hồi các phiên đăng nhập, kể cả thiết bị này</p>
                    </div>
                    <button
                      onClick={() => setIsConfirmingLogoutAll(true)}
                      className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg text-xs font-bold hover:bg-red-100 transition cursor-pointer"
                    >
                      Đăng xuất tất cả
                    </button>
                  </div>
                )}
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
                  Các tùy chọn dưới đây chưa dùng được
                </p>
              </div>

              <div className="space-y-4 text-xs">
                <div>
                  <label htmlFor="pref-currency" className="block font-semibold text-stone-700 mb-1">
                    Đơn vị tiền tệ chính
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">Sắp có</span>
                  </label>
                  <select
                    id="pref-currency"
                    value="VND"
                    disabled
                    onChange={() => {}}
                    className="w-full sm:w-64 px-3 py-2 rounded-xl border border-stone-300 text-stone-800 font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="VND">₫ Việt Nam Đồng (VND)</option>
                    <option value="USD">$ Đô la Mỹ (USD)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="pref-threshold" className="block font-semibold text-stone-700 mb-1">
                    Ngưỡng cảnh báo ngân sách màu vàng
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">Sắp có</span>
                  </label>
                  <input
                    id="pref-threshold"
                    type="range"
                    min="50"
                    max="95"
                    step="5"
                    value="80"
                    disabled
                    onChange={() => {}}
                    className="w-full sm:w-64 accent-amber-600 disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                  <span className="text-[11px] text-stone-500 block mt-0.5">
                    Chưa chỉnh được ngưỡng cảnh báo.
                  </span>
                </div>

                <div className="pt-3 border-t border-stone-200">
                  <button
                    disabled
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-950 text-amber-300 font-bold rounded-xl disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Save size={14} />
                    <span>Lưu tùy chọn</span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-200 text-stone-600">Sắp có</span>
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
                  Quản Lý Dữ Liệu
                </h3>
                <p className="text-xs text-stone-500 font-sans">
                  {onLoadSampleData ? 'Xuất dữ liệu ra tệp JSON hoặc nạp dữ liệu mẫu' : 'Xuất dữ liệu ra tệp JSON'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-stone-800">Xuất Dữ Liệu (JSON)</h4>
                    <p className="text-[11px] text-stone-500">
                      Tệp gồm {state.expenses.length} giao dịch cùng mục tiêu, khoản định kỳ, thu nhập và ngân sách; không gồm ví
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
                      <h4 className="text-xs font-bold text-stone-800">Nạp Dữ Liệu Mẫu (3 Tuần)</h4>
                      <p className="text-[11px] text-stone-500">
                        Thay dữ liệu dùng thử hiện tại bằng dữ liệu mẫu để xem thử biểu đồ
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
                  Dịch vụ bên ngoài mà ứng dụng dùng
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
                      <p className="text-[11px] text-stone-500">Đăng nhập bằng tài khoản Google</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-stone-800">Gemini AI Financial Copilot</h4>
                      <p className="text-[11px] text-stone-500">Dùng khi bạn đăng nhập; nếu không gọi được Gemini, máy chủ trả lời bằng bộ quy tắc có sẵn</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmingLogoutAll}
        title="Đăng xuất mọi thiết bị?"
        message="Tất cả phiên đăng nhập, kể cả thiết bị này, sẽ bị thu hồi. Thiết bị khác có thể còn truy cập tối đa 15 phút."
        confirmText="Đăng xuất mọi thiết bị"
        onConfirm={handleConfirmLogoutAll}
        onCancel={() => setIsConfirmingLogoutAll(false)}
      />
    </div>
  );
};
