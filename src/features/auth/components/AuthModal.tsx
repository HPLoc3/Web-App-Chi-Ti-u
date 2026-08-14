import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useToast } from '../../../context/ToastContext';
import { GoogleAuthButton } from './GoogleAuthButton';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Eye, EyeOff, ShieldCheck } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register' | 'forgot' | 'reset';
  initialToken?: string;
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login', initialToken = '' }: AuthModalProps) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword, resetPasswordWithToken } = useAuth();
  const { showToast } = useToast();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot' | 'reset'>(defaultTab);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
      if (initialToken) {
        setResetToken(initialToken);
      }
    }
  }, [isOpen, defaultTab, initialToken]);
  
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  const [resetToken, setResetToken] = useState(initialToken || '');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetFormFields = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(false);
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot' | 'reset') => {
    resetFormFields();
    setActiveTab(tab);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      const msg = 'Vui lòng nhập đầy đủ Email và Mật khẩu.';
      setErrorMsg(msg);
      showToast(msg, 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      showToast('Đăng nhập thành công!', 'success');
      onClose();
    } catch (err: any) {
      const msg = err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!registerName.trim()) {
      setErrorMsg('Vui lòng nhập Họ và tên.');
      return;
    }
    if (!registerEmail.trim()) {
      setErrorMsg('Vui lòng nhập Email hợp lệ.');
      return;
    }
    if (registerPassword.length < 6) {
      setErrorMsg('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
      return;
    }
    if (registerPassword !== confirmPassword) {
      setErrorMsg('Mật khẩu nhập lại không khớp. Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result: any = await registerWithEmail(registerName, registerEmail, registerPassword);
      if (result?.session) {
        setSuccessMsg('Đăng ký tài khoản thành công! Bạn đã được tự động đăng nhập.');
        setTimeout(() => {
          onClose();
        }, 1200);
      } else {
        setSuccessMsg('Đăng ký tài khoản thành công! Vui lòng đăng nhập để bắt đầu.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!forgotEmail.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ Email của bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await resetPassword(forgotEmail);
      setForgotSuccess(true);
      setSuccessMsg(res.message || 'Nếu địa chỉ email tồn tại, hệ thống đã gửi liên kết đặt lại mật khẩu.');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!resetToken.trim()) {
      setErrorMsg('Vui lòng nhập mã Token đặt lại mật khẩu.');
      return;
    }
    if (resetNewPassword.length < 6) {
      setErrorMsg('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (resetNewPassword !== resetConfirmPassword) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPasswordWithToken(resetToken.trim(), resetNewPassword);
      setResetSuccess(true);
      setSuccessMsg('Đặt lại mật khẩu thành công! Vui lòng đăng nhập với mật khẩu mới.');
      setTimeout(() => {
        handleTabChange('login');
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-md bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-emerald-950 text-white px-6 py-4 flex items-center justify-between border-b-2 border-amber-500">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📔</span>
            <div>
              <h3 className="font-serif text-lg font-bold text-amber-50 leading-snug">
                SỔ TAY CHI TIÊU
              </h3>
              <p className="text-[11px] text-emerald-200/90 font-sans tracking-wide">
                Hệ thống xác thực tài khoản
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-emerald-200/80 hover:text-white hover:bg-emerald-900 rounded-full transition cursor-pointer"
            title="Đóng modal"
          >
            <X size={20} />
          </button>
        </div>

        {activeTab !== 'forgot' && activeTab !== 'reset' && (
          <div className="flex border-b border-[#E6DEC9] bg-[#FAF7F0]">
            <button
              type="button"
              onClick={() => handleTabChange('login')}
              className={`flex-1 py-3 text-sm font-serif font-bold tracking-wider transition cursor-pointer text-center border-b-2 ${
                activeTab === 'login'
                  ? 'border-emerald-900 text-emerald-950 bg-[#FCFAF4]'
                  : 'border-transparent text-stone-500 hover:text-emerald-900'
              }`}
            >
              ĐĂNG NHẬP
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('register')}
              className={`flex-1 py-3 text-sm font-serif font-bold tracking-wider transition cursor-pointer text-center border-b-2 ${
                activeTab === 'register'
                  ? 'border-emerald-900 text-emerald-950 bg-[#FCFAF4]'
                  : 'border-transparent text-stone-500 hover:text-emerald-900'
              }`}
            >
              ĐĂNG KÝ
            </button>
          </div>
        )}

        <div className="p-6 overflow-y-auto max-h-[80vh]">
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-100/90 border-2 border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-950 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="font-bold text-red-900 text-[13px] mb-0.5">Xác thực không thành công</p>
                <p className="text-red-800 leading-relaxed font-medium">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {(activeTab === 'login' || activeTab === 'register') && (
            <div className="mb-5">
              <GoogleAuthButton
                onSuccess={() => {
                  showToast('Đăng nhập thành công!', 'success');
                  onClose();
                }}
                onError={(err) => {
                  setErrorMsg(err);
                  showToast(err, 'error');
                }}
                enableOneTap={true}
              />

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-[#E6DEC9] w-full"></div>
                <span className="bg-[#FCFAF4] px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-widest shrink-0">
                  Hoặc sử dụng Email
                </span>
              </div>
            </div>
          )}

          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="tenban@domain.com"
                    className={`w-full bg-white border rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 min-h-[44px] transition ${
                      errorMsg 
                        ? 'border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20' 
                        : 'border-[#E6DEC9] focus:border-emerald-700 focus:ring-emerald-700'
                    }`}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-stone-600">
                    Mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => handleTabChange('forgot')}
                    className="text-xs text-emerald-800 hover:text-emerald-950 font-medium cursor-pointer"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className={`w-full bg-white border rounded-xl pl-9 pr-10 py-2.5 text-sm text-stone-800 focus:outline-none focus:ring-1 min-h-[44px] transition ${
                      errorMsg 
                        ? 'border-red-400 focus:border-red-600 focus:ring-red-600 bg-red-50/20' 
                        : 'border-[#E6DEC9] focus:border-emerald-700 focus:ring-emerald-700'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                    title={showLoginPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showLoginPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-100 border-2 border-red-300 rounded-xl flex items-start gap-2.5 text-xs text-red-950 font-medium shadow-xs">
                  <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-red-900 text-xs mb-0.5">Xác thực không thành công</p>
                    <p className="text-red-800 leading-relaxed font-medium">{errorMsg}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-900 hover:bg-emerald-850 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 text-sm min-h-[44px] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span>Đang đăng nhập...</span>
                ) : (
                  <>
                    <span>Đăng nhập vào sổ tay</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Họ và tên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <UserIcon size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="text"
                    required
                    value={registerName}
                    onChange={(e) => setRegisterName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Địa chỉ Email <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type="email"
                    required
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    placeholder="tenban@domain.com"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Mật khẩu (tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-10 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                    title={showRegisterPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Nhập lại mật khẩu <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Nhập lại chính xác mật khẩu"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-10 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                    title={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-900 hover:bg-emerald-850 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 text-sm min-h-[44px] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span>Đang khởi tạo tài khoản...</span>
                ) : (
                  <>
                    <span>Đăng ký tài khoản</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {activeTab === 'forgot' && (
            <div>
              <div className="mb-4">
                <h4 className="font-serif font-bold text-stone-800 text-base mb-1">
                  Khôi phục mật khẩu
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Nhập địa chỉ email đăng ký của bạn. Hệ thống sẽ gửi một mã token / liên kết hướng dẫn đặt lại mật khẩu an toàn.
                </p>
              </div>

              <form onSubmit={handleForgotSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Địa chỉ Email của bạn <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="nhap.email@domain.com"
                      className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <button
                    type="button"
                    onClick={() => handleTabChange('reset')}
                    className="text-emerald-800 hover:text-emerald-950 font-medium cursor-pointer underline underline-offset-2"
                  >
                    Đã có mã Token đặt lại?
                  </button>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="flex-1 py-2.5 px-4 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl font-medium text-xs cursor-pointer min-h-[44px]"
                  >
                    Quay lại Đăng nhập
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || forgotSuccess}
                    className="flex-1 bg-emerald-900 hover:bg-emerald-850 text-white font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs min-h-[44px] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang gửi...' : 'Gửi yêu cầu'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'reset' && (
            <div>
              <div className="mb-4">
                <h4 className="font-serif font-bold text-stone-800 text-base mb-1">
                  Tạo mật khẩu mới
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Nhập mã Token nhận được từ email và thiết lập mật khẩu bảo mật mới cho tài khoản của bạn.
                </p>
              </div>

              <form onSubmit={handleResetSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Mã Token đặt lại mật khẩu <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <ShieldCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="text"
                      required
                      value={resetToken}
                      onChange={(e) => setResetToken(e.target.value)}
                      placeholder="Dán mã Token từ email"
                      className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Mật khẩu mới (tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type={showResetPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={resetNewPassword}
                      onChange={(e) => setResetNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-10 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowResetPassword(!showResetPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer p-1"
                      title={showResetPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                    >
                      {showResetPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-600 mb-1">
                    Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                    <input
                      type="password"
                      required
                      value={resetConfirmPassword}
                      onChange={(e) => setResetConfirmPassword(e.target.value)}
                      placeholder="Nhập lại mật khẩu mới"
                      className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => handleTabChange('login')}
                    className="flex-1 py-2.5 px-4 border border-stone-300 hover:bg-stone-100 text-stone-700 rounded-xl font-medium text-xs cursor-pointer min-h-[44px]"
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting || resetSuccess}
                    className="flex-1 bg-emerald-900 hover:bg-emerald-850 text-white font-semibold py-2.5 px-4 rounded-xl transition cursor-pointer text-xs min-h-[44px] disabled:opacity-50"
                  >
                    {isSubmitting ? 'Đang lưu...' : 'Đổi mật khẩu'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
