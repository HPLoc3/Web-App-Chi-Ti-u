import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthButton } from './GoogleAuthButton';
import { X, Mail, Lock, User as UserIcon, AlertCircle, CheckCircle2, ArrowRight, KeyRound, Eye, EyeOff } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export default function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const { loginWithEmail, registerWithEmail, loginWithGoogle, resetPassword } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'login' | 'register' | 'forgot'>(defaultTab);

  // Sync activeTab and clear state when modal opens or defaultTab changes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setErrorMsg(null);
      setSuccessMsg(null);
      setIsSubmitting(false);
    }
  }, [isOpen, defaultTab]);
  
  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register Form States
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password Visibility Toggle
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

  // Common UI states
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const resetFormFields = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(false);
  };

  const handleTabChange = (tab: 'login' | 'register' | 'forgot') => {
    resetFormFields();
    setActiveTab(tab);
  };

  // Google Sign-In
  const handleGoogleSignIn = async () => {
    resetFormFields();
    setIsSubmitting(true);
    try {
      await loginWithGoogle();
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Không thể đăng nhập bằng Google.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!loginEmail.trim() || !loginPassword.trim()) {
      setErrorMsg('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    setIsSubmitting(true);
    try {
      await loginWithEmail(loginEmail, loginPassword);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Register Submit
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
        setSuccessMsg('Đăng ký tài khoản thành công! Hộp thư xác minh đã được gửi đến email của bạn. Vui lòng kiểm tra email để kích hoạt tài khoản trước khi đăng nhập.');
      }
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Forgot Password Submit
  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormFields();

    if (!forgotEmail.trim()) {
      setErrorMsg('Vui lòng nhập địa chỉ Email của bạn.');
      return;
    }

    setIsSubmitting(true);
    try {
      await resetPassword(forgotEmail);
      setForgotSuccess(true);
      setSuccessMsg(`Đã gửi liên kết đặt lại mật khẩu tới email: ${forgotEmail}. Vui lòng kiểm tra hộp thư!`);
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
      {/* Modal Card */}
      <div 
        className="relative w-full max-w-md bg-[#FCFAF4] border-2 border-[#E6DEC9] rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Decorative Header */}
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

        {/* Tab Switcher (Đăng nhập / Đăng ký) */}
        {activeTab !== 'forgot' && (
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
          {/* Global Notifications */}
          {errorMsg && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2 text-xs text-red-800 animate-in fade-in">
              <AlertCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start gap-2 text-xs text-emerald-900 animate-in fade-in">
              <CheckCircle2 size={16} className="text-emerald-700 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Quick Google Login Button (available for both login & register) */}
          {activeTab !== 'forgot' && (
            <div className="mb-5">
              <GoogleAuthButton
                onSuccess={onClose}
                onError={(err) => setErrorMsg(err)}
                enableOneTap={true}
              />

              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-[#E6DEC9] w-full"></div>
                <span className="bg-[#FCFAF4] px-3 text-[11px] font-semibold text-stone-400 uppercase tracking-widest shrink-0">
                  Hoặc sử dụng Email
                </span>
                <div className="border-t border-[#E6DEC9] w-full"></div>
              </div>
            </div>
          )}

          {/* TAB 1: FORM ĐĂNG NHẬP */}
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
                    placeholder="nhap.email@domain.com"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
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
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-10 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
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

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-emerald-900 hover:bg-emerald-850 text-white font-semibold py-3 px-4 rounded-xl transition cursor-pointer shadow-sm flex items-center justify-center gap-2 text-sm min-h-[44px] disabled:opacity-50 mt-2"
              >
                {isSubmitting ? (
                  <span>Đang xác thực...</span>
                ) : (
                  <>
                    <span>Đăng nhập</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: FORM ĐĂNG KÝ */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
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
                    placeholder="Ví dụ: Hồ Phú Lộc"
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
                    placeholder="nhap.email@domain.com"
                    className="w-full bg-white border border-[#E6DEC9] rounded-xl pl-9 pr-3 py-2.5 text-sm text-stone-800 focus:outline-none focus:border-emerald-700 focus:ring-1 focus:ring-emerald-700 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-600 mb-1">
                  Mật khẩu (Tối thiểu 6 ký tự) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
                  <input
                    type={showRegisterPassword ? 'text' : 'password'}
                    required
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
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

          {/* TAB 3: QUÊN MẬT KHẨU */}
          {activeTab === 'forgot' && (
            <div>
              <div className="mb-4">
                <h4 className="font-serif font-bold text-stone-800 text-base mb-1">
                  Khôi phục mật khẩu
                </h4>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Nhập địa chỉ email đăng ký của bạn. Hệ thống sẽ gửi một liên kết hướng dẫn đặt lại mật khẩu bảo mật qua Email.
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
                    {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết'}
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
