import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { supabase } from '../lib/supabase';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  session: Session | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper chuyển Supabase user sang AppUser dạng phẳng
function mapSupabaseUser(user: SupabaseUser | null): AppUser | null {
  if (!user) return null;
  const metadata = user.user_metadata || {};
  return {
    uid: user.id,
    email: user.email || null,
    displayName: metadata.full_name || metadata.name || metadata.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
    photoURL: metadata.avatar_url || metadata.picture || null,
  };
}

// Helper sync user document sang Firestore
async function syncUserProfile(user: AppUser) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        displayName: user.displayName || 'Người dùng',
        email: user.email,
        photoURL: user.photoURL || null,
        lastLoginAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('Lỗi lưu thông tin user profile vào Firestore:', e);
  }
}

// Helper định dạng lỗi Supabase Auth sang Tiếng Việt thân thiện
export function formatSupabaseAuthError(error: any): string {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  
  const msg = typeof error === 'string' ? error : error.message || error.error_description || '';
  const status = error.status;

  if (msg.includes('Invalid login credentials') || msg.includes('invalid_credentials')) {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (msg.includes('User already registered') || msg.includes('already_exists')) {
    return 'Địa chỉ email này đã được đăng ký cho một tài khoản khác.';
  }
  if (msg.includes('Password should be at least') || msg.includes('weak_password')) {
    return 'Mật khẩu quá yếu! Mật khẩu cần có tối thiểu 6 ký tự.';
  }
  if (msg.includes('Email not confirmed')) {
    return 'Tài khoản chưa được xác nhận email. Vui lòng kiểm tra hộp thư email của bạn.';
  }
  if (msg.includes('rate limit') || msg.includes('Too many requests') || status === 429) {
    return 'Tài khoản tạm thời bị giới hạn do gửi quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.';
  }
  if (msg.includes('Unable to validate email address') || msg.includes('invalid email')) {
    return 'Định dạng email không hợp lệ. Vui lòng nhập đúng email (ví dụ: user@example.com).';
  }

  return msg || 'Đã có lỗi xảy ra khi xác thực. Vui lòng thử lại sau.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Kiểm tra session hiện tại khi ứng dụng khởi chạy
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      const appUser = mapSupabaseUser(session?.user || null);
      setCurrentUser(appUser);
      if (appUser) {
        syncUserProfile(appUser);
      }
      setLoading(false);
    }).catch((err) => {
      console.error('Lỗi lấy session Supabase:', err);
      setLoading(false);
    });

    // 2. Lắng nghe thay đổi auth state tự động
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      const appUser = mapSupabaseUser(session?.user || null);
      setCurrentUser(appUser);
      if (appUser) {
        syncUserProfile(appUser);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Đăng nhập bằng Email & Mật khẩu
  const loginWithEmail = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: pass,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }

    if (data.user) {
      const appUser = mapSupabaseUser(data.user);
      if (appUser) {
        setCurrentUser(appUser);
        await syncUserProfile(appUser);
      }
    }
  };

  // Đăng ký bằng Email & Mật khẩu
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password: pass,
      options: {
        data: {
          full_name: cleanName,
        },
      },
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }

    if (data.user) {
      const appUser = mapSupabaseUser(data.user);
      if (appUser) {
        setCurrentUser(appUser);
        await syncUserProfile(appUser);
      }
    }
  };

  // Đăng nhập bằng Google (Supabase OAuth)
  const loginWithGoogle = async () => {
    const redirectUrl = `${window.location.origin}/app_chi_tieu`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error('Lỗi Supabase Google OAuth:', error);
      throw new Error(formatSupabaseAuthError(error));
    }
  };

  // Quên / Khôi phục mật khẩu
  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/app_chi_tieu`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: redirectUrl,
    });

    if (error) {
      throw new Error(formatSupabaseAuthError(error));
    }
  };

  // Đăng xuất
  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session,
        loading,
        loginWithEmail,
        registerWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
