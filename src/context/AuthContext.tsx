import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

export interface AppUser {
  id: string;
  email: string;
  name: string | null;
  avatar: string | null;
  provider?: string;
  createdAt?: string;
  // Aliases tương thích ngược cho UI cũ
  uid?: string;
  displayName?: string | null;
  photoURL?: string | null;
}

export type AuthState = 'LOADING' | 'AUTHENTICATED' | 'ANONYMOUS';

interface AuthContextType {
  user: AppUser | null;
  currentUser: AppUser | null; // Để tương thích ngược với code cũ
  isAuthenticated: boolean;
  isLoading: boolean;
  loading: boolean; // Để tương thích ngược với code cũ
  authState: AuthState;
  loginWithGoogleToken: (tokenData: string | { idToken?: string; accessToken?: string }) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<any>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function normalizeUser(rawUser: any): AppUser | null {
  if (!rawUser) return null;
  return {
    id: rawUser.id || rawUser.uid,
    uid: rawUser.id || rawUser.uid,
    email: rawUser.email,
    name: rawUser.name || rawUser.displayName || rawUser.email?.split('@')[0],
    displayName: rawUser.name || rawUser.displayName || rawUser.email?.split('@')[0],
    avatar: rawUser.avatar || rawUser.photoURL || null,
    photoURL: rawUser.avatar || rawUser.photoURL || null,
    provider: rawUser.provider || 'google',
    createdAt: rawUser.createdAt,
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authState, setAuthState] = useState<AuthState>('LOADING');

  // Kiểm tra trạng thái đăng nhập từ Backend Express (/api/auth/me)
  const checkAuthStatus = useCallback(async () => {
    setIsLoading(true);
    setAuthState('LOADING');
    try {
      const response = await apiClient.get('/api/auth/me');
      if (response.data && response.data.success && response.data.user) {
        const normUser = normalizeUser(response.data.user);
        setUser(normUser);
        setAuthState('AUTHENTICATED');
      } else {
        setUser(null);
        setAuthState('ANONYMOUS');
      }
    } catch (error: any) {
      // 401 hoặc lỗi kết nối đều được xem là ANONYMOUS
      setUser(null);
      setAuthState('ANONYMOUS');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);

  // Đăng nhập bằng Google ID Token hoặc Access Token (gửi tới Express Backend)
  const loginWithGoogleToken = async (tokenData: string | { idToken?: string; accessToken?: string }) => {
    setIsLoading(true);
    try {
      const payload = typeof tokenData === 'string' ? { idToken: tokenData } : tokenData;
      const response = await apiClient.post('/api/auth/google', payload);
      if (response.data && response.data.success && response.data.user) {
        const loggedUser = normalizeUser(response.data.user);
        setUser(loggedUser);
        setAuthState('AUTHENTICATED');
      } else {
        throw new Error(response.data?.message || 'Xác thực Google thất bại.');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Đăng nhập Google thất bại. Vui lòng thử lại.';
      setUser(null);
      setAuthState('ANONYMOUS');
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Phương thức bổ trợ đăng nhập Google
  const loginWithGoogle = async () => {
    console.info('Vui lòng sử dụng nút Google Login trên giao diện.');
  };

  // Đăng nhập bằng Email & Mật khẩu
  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/login', { email, password: pass });
      if (response.data && response.data.success && response.data.user) {
        const loggedUser = normalizeUser(response.data.user);
        setUser(loggedUser);
        setAuthState('AUTHENTICATED');
      } else {
        throw new Error(response.data?.message || 'Email hoặc mật khẩu không chính xác.');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Đăng nhập thất bại. Vui lòng kiểm tra lại Email và Mật khẩu.';
      setUser(null);
      setAuthState('ANONYMOUS');
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng ký bằng Email & Mật khẩu
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/register', { name, email, password: pass });
      if (response.data && response.data.success && response.data.user) {
        const loggedUser = normalizeUser(response.data.user);
        setUser(loggedUser);
        setAuthState('AUTHENTICATED');
        return { session: true, user: loggedUser };
      } else {
        throw new Error(response.data?.message || 'Đăng ký thất bại.');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Đăng ký thất bại. Vui lòng thử lại.';
      setUser(null);
      setAuthState('ANONYMOUS');
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Quên mật khẩu / Đặt lại mật khẩu
  const resetPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const response = await apiClient.post('/api/auth/forgot-password', { email });
      if (!response.data || !response.data.success) {
        throw new Error(response.data?.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
      }
    } catch (error: any) {
      const errorMsg =
        error.response?.data?.message ||
        error.message ||
        'Gửi yêu cầu thất bại. Vui lòng kiểm tra lại địa chỉ email.';
      throw new Error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Đăng xuất người dùng
  const logout = async () => {
    setIsLoading(true);
    try {
      await apiClient.post('/api/auth/logout');
    } catch (error) {
      console.warn('Lỗi khi đăng xuất ở server:', error);
    } finally {
      setUser(null);
      setAuthState('ANONYMOUS');
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentUser: user, // Alias tương thích ngược
        isAuthenticated: !!user && authState === 'AUTHENTICATED',
        isLoading,
        loading: isLoading, // Alias tương thích ngược
        authState,
        loginWithGoogleToken,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        resetPassword,
        logout,
        checkAuthStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};

export default AuthContext;
