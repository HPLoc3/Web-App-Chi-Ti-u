import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User 
} from '../firebase';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper chuyển mã lỗi Firebase sang Tiếng Việt thân thiện
export function formatAuthError(errorCode: string): string {
  switch (errorCode) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
    case 'auth/email-already-in-use':
      return 'Địa chỉ email này đã được sử dụng cho một tài khoản khác.';
    case 'auth/invalid-email':
      return 'Định dạng email không hợp lệ. Vui lòng nhập đúng email (vd: name@example.com).';
    case 'auth/weak-password':
      return 'Mật khẩu quá yếu! Mật khẩu cần có tối thiểu 6 ký tự.';
    case 'auth/popup-closed-by-user':
      return 'Bạn đã đóng cửa sổ đăng nhập Google trước khi hoàn tất.';
    case 'auth/popup-blocked':
      return 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng bật popup hoặc dùng Email.';
    case 'auth/cancelled-popup-request':
      return 'Yêu cầu mở cửa sổ đăng nhập bằng Google đã bị hủy.';
    case 'auth/account-exists-with-different-credential':
      return 'Tài khoản với email này đã tồn tại bằng phương thức đăng nhập khác.';
    case 'auth/user-disabled':
      return 'Tài khoản này đã bị tạm khóa. Vui lòng liên hệ quản trị viên.';
    case 'auth/network-request-failed':
      return 'Lỗi kết nối mạng. Vui lòng kiểm tra lại kết nối internet của bạn.';
    case 'auth/too-many-requests':
      return 'Tài khoản tạm thời bị khóa do thử sai quá nhiều lần. Vui lòng thử lại sau.';
    default:
      return 'Đã có lỗi xảy ra khi xác thực. Vui lòng thử lại sau.';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listener lắng nghe trạng thái đăng nhập
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Đăng nhập bằng Email & Mật khẩu
  const loginWithEmail = async (email: string, pass: string) => {
    try {
      await signInWithEmailAndPassword(auth, email.trim(), pass);
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Đăng ký bằng Email & Mật khẩu
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      // Cập nhật tên hiển thị người dùng
      if (userCredential.user) {
        await updateProfile(userCredential.user, {
          displayName: name.trim()
        });
        await userCredential.user.reload();
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
        }
      }
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Quên mật khẩu
  const resetPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email.trim());
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Đăng xuất
  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{
      currentUser,
      loading,
      loginWithEmail,
      registerWithEmail,
      loginWithGoogle,
      resetPassword,
      logout
    }}>
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
