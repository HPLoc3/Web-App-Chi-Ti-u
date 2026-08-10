import React, { createContext, useContext, useState, useEffect } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { 
  auth, 
  db,
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

// Helper sync user document to Firestore
async function syncUserProfile(user: User, customDisplayName?: string) {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(userRef, {
      uid: user.uid,
      displayName: customDisplayName || user.displayName || 'Người dùng',
      email: user.email,
      photoURL: user.photoURL || null,
      lastLoginAt: new Date().toISOString()
    }, { merge: true });
  } catch (e) {
    console.error('Lỗi lưu thông tin user profile vào Firestore:', e);
  }
}

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
      return 'Trình duyệt đã chặn cửa sổ đăng nhập Google. Vui lòng cho phép popup cho trang web này.';
    case 'auth/unauthorized-domain':
      return 'Tên miền hophuloc.online chưa được thêm vào Authorized Domains trong Firebase Console. Vui lòng vào Firebase Console > Authentication > Settings > Authorized domains và thêm "hophuloc.online".';
    case 'auth/operation-not-allowed':
      return 'Phương thức đăng nhập này chưa được bật trong Firebase Console (Authentication > Sign-in method).';
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
      return `Đã có lỗi xảy ra khi xác thực${errorCode ? ` (${errorCode})` : ''}. Vui lòng thử lại sau.`;
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
      if (user) {
        syncUserProfile(user);
      }
    });

    return unsubscribe;
  }, []);

  // Đăng nhập bằng Email & Mật khẩu
  const loginWithEmail = async (email: string, pass: string) => {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
      if (userCredential.user) {
        await syncUserProfile(userCredential.user);
      }
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Đăng ký bằng Email & Mật khẩu
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
      if (userCredential.user) {
        const cleanName = name.trim();
        await updateProfile(userCredential.user, {
          displayName: cleanName
        });
        await userCredential.user.reload();
        if (auth.currentUser) {
          setCurrentUser(auth.currentUser);
          await syncUserProfile(auth.currentUser, cleanName);
        }
      }
    } catch (error: any) {
      throw new Error(formatAuthError(error?.code || ''));
    }
  };

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      if (userCredential.user) {
        await syncUserProfile(userCredential.user);
      }
    } catch (error: any) {
      console.error('Firebase Auth Error (loginWithGoogle):', error);
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
