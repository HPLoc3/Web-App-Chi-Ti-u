import React, { useState, useEffect } from 'react';
import { GoogleLogin, useGoogleOneTapLogin, useGoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';

interface GoogleAuthButtonProps {
  onSuccess?: () => void;
  onError?: (errorMsg: string) => void;
  enableOneTap?: boolean;
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle';
  size?: 'large' | 'medium' | 'small';
}

export const GoogleAuthButton: React.FC<GoogleAuthButtonProps> = ({
  onSuccess,
  onError,
  enableOneTap = true,
  text = 'continue_with',
  shape = 'rectangular',
  size = 'large',
}) => {
  const { loginWithGoogleToken } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [showPopupFallback, setShowPopupFallback] = useState(false);

  const rawClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
  const isGoogleConfigured = Boolean(
    rawClientId &&
    !rawClientId.includes('your_google_client_id') &&
    !rawClientId.includes('your-google-client-id')
  );

  useEffect(() => {
    // Phát hiện ứng dụng đang chạy trong iFrame (AI Studio preview)
    if (typeof window !== 'undefined' && window.self !== window.top) {
      setIsIframe(true);
    }
  }, []);

  if (!isGoogleConfigured) {
    return (
      <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs text-center">
        Chưa cấu hình biến môi trường <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[11px]">VITE_GOOGLE_CLIENT_ID</code>.
      </div>
    );
  }

  // Xử lý khi nhận ID Token từ Google Standard Button
  const handleGoogleSuccess = async (credentialResponse: any) => {
    const idToken = credentialResponse.credential;
    if (!idToken) {
      onError?.('Không nhận được Google ID Token.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithGoogleToken({ idToken });
      onSuccess?.();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Đăng nhập Google thất bại.';
      onError?.(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Google OAuth Popup Fallback (Xử lý khi nút Google Iframe bị chặn trong iFrame/Webview)
  const triggerGooglePopup = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      if (!tokenResponse.access_token) {
        onError?.('Không nhận được Access Token từ Google.');
        return;
      }
      setIsLoading(true);
      try {
        await loginWithGoogleToken({ accessToken: tokenResponse.access_token });
        onSuccess?.();
      } catch (err: any) {
        const msg = err.response?.data?.message || err.message || 'Đăng nhập Google thất bại.';
        onError?.(msg);
      } finally {
        setIsLoading(false);
      }
    },
    onError: () => {
      onError?.('Cửa sổ đăng nhập Google bị đóng hoặc bị chặn bởi trình duyệt.');
    },
  });

  // Chỉ kích hoạt Google One-Tap nếu không nằm trong iFrame
  const canUseOneTap = enableOneTap && !isIframe;

  useGoogleOneTapLogin({
    onSuccess: handleGoogleSuccess,
    onError: () => {
      // Bỏ qua log lỗi OneTap
    },
    disabled: !canUseOneTap || isLoading,
  });

  return (
    <div className="flex flex-col items-center justify-center w-full space-y-2">
      <div className="w-full flex justify-center min-h-[40px]">
        {!showPopupFallback ? (
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => {
              setShowPopupFallback(true);
            }}
            text={text}
            shape={shape}
            size={size}
            useOneTap={canUseOneTap}
          />
        ) : (
          <button
            type="button"
            onClick={() => triggerGooglePopup()}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 font-semibold py-2.5 px-4 rounded-xl shadow-xs transition cursor-pointer min-h-[44px] text-sm"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Đăng nhập với Google (Popup)</span>
          </button>
        )}
      </div>

      {isLoading && (
        <p className="text-xs text-stone-500 animate-pulse text-center">
          Đang xác thực tài khoản Google với máy chủ...
        </p>
      )}
    </div>
  );
};

export default GoogleAuthButton;
