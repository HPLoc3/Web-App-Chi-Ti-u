import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  where, 
  getDocs 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  signInWithPopup, 
  signOut, 
  sendPasswordResetEmail, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { db, auth, googleProvider } from '../firebase';

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

interface AuthContextType {
  currentUser: AppUser | null;
  session: any | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (name: string, email: string, pass: string) => Promise<any>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'app_user_auth_session';

// Helper hash mật khẩu bằng SHA-256 tiêu chuẩn trên trình duyệt
async function hashPassword(password: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Helper chuyển Firebase user thành AppUser
function mapFirebaseUser(user: FirebaseUser | null): AppUser | null {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || null,
    displayName: user.displayName || (user.email ? user.email.split('@')[0] : 'Người dùng'),
    photoURL: user.photoURL || null,
  };
}

// Sync thông tin user lên Firestore collection 'users'
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
    console.error('Lỗi đồng bộ hồ sơ người dùng vào Firestore:', e);
  }
}

// Chuyển mã lỗi Firebase Auth sang tiếng Việt thân thiện
function formatFirebaseAuthError(error: any): string {
  if (!error) return 'Đã có lỗi xảy ra. Vui lòng thử lại sau.';
  const code = error.code || '';
  const msg = error.message || String(error);

  if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
    return 'Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.';
  }
  if (code === 'auth/email-already-in-use') {
    return 'Địa chỉ email này đã được đăng ký cho một tài khoản khác.';
  }
  if (code === 'auth/weak-password') {
    return 'Mật khẩu quá yếu! Mật khẩu cần tối thiểu 6 ký tự.';
  }
  if (code === 'auth/invalid-email') {
    return 'Định dạng email không hợp lệ. Vui lòng kiểm tra lại (ví dụ: name@example.com).';
  }
  if (code === 'auth/too-many-requests') {
    return 'Tài khoản tạm thời bị giới hạn do thử đăng nhập nhiều lần. Vui lòng đợi ít phút.';
  }
  if (code === 'auth/popup-closed-by-user') {
    return 'Cửa sổ đăng nhập Google đã bị đóng. Vui lòng thử lại.';
  }

  return msg || 'Đã có lỗi xảy ra khi xác thực.';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Khởi tạo và lắng nghe trạng thái đăng nhập
  useEffect(() => {
    // 1. Lắng nghe trạng thái từ Firebase Auth
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const appUser = mapFirebaseUser(fbUser);
        setCurrentUser(appUser);
        if (appUser) {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appUser));
          await syncUserProfile(appUser);
        }
        setLoading(false);
      } else {
        // 2. Nếu Firebase Auth không có session, kiểm tra localStorage (Local Session)
        const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (savedSession) {
          try {
            const parsedUser: AppUser = JSON.parse(savedSession);
            setCurrentUser(parsedUser);
          } catch (e) {
            localStorage.removeItem(LOCAL_STORAGE_KEY);
            setCurrentUser(null);
          }
        } else {
          setCurrentUser(null);
        }
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Đăng nhập bằng Email & Mật khẩu
  const loginWithEmail = async (email: string, pass: string) => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    // 1. Thử đăng nhập qua Firebase Auth
    try {
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, cleanPass);
      const appUser = mapFirebaseUser(userCredential.user);
      if (appUser) {
        setCurrentUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appUser));
        await syncUserProfile(appUser);
        return;
      }
    } catch (fbErr: any) {
      // Nếu lỗi là do tài khoản/mật khẩu sai rõ ràng từ Firebase Auth -> Ném lỗi
      if (
        fbErr.code === 'auth/wrong-password' ||
        fbErr.code === 'auth/user-not-found' ||
        fbErr.code === 'auth/invalid-credential'
      ) {
        throw new Error('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      }
    }

    // 2. Dự phòng: Kiểm tra tài khoản đã đăng ký trong Firestore
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnap = await getDocs(q);

      if (!querySnap.empty) {
        const userDoc = querySnap.docs[0];
        const userData = userDoc.data();
        const hashedInput = await hashPassword(cleanPass);

        if (userData.passwordHash && userData.passwordHash === hashedInput) {
          const appUser: AppUser = {
            uid: userData.uid || userDoc.id,
            email: userData.email,
            displayName: userData.displayName || cleanEmail.split('@')[0],
            photoURL: userData.photoURL || null,
          };
          setCurrentUser(appUser);
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appUser));
          await syncUserProfile(appUser);
          return;
        }
      }
    } catch (e) {
      console.error('Lỗi khi tra cứu tài khoản Firestore:', e);
    }

    throw new Error('Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại.');
  };

  // Đăng ký bằng Email & Mật khẩu
  const registerWithEmail = async (name: string, email: string, pass: string) => {
    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = pass.trim();

    if (cleanPass.length < 6) {
      throw new Error('Mật khẩu phải có độ dài tối thiểu 6 ký tự.');
    }

    // Kiểm tra trùng email trong Firestore trước
    try {
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnap = await getDocs(q);
      if (!querySnap.empty) {
        throw new Error('Địa chỉ email này đã được đăng ký cho một tài khoản khác.');
      }
    } catch (err: any) {
      if (err.message?.includes('đã được đăng ký')) {
        throw err;
      }
    }

    let createdUser: AppUser | null = null;

    // 1. Thử đăng ký qua Firebase Auth
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, cleanPass);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: cleanName });
        createdUser = {
          uid: userCredential.user.uid,
          email: cleanEmail,
          displayName: cleanName,
          photoURL: null,
        };
      }
    } catch (fbErr: any) {
      if (fbErr.code === 'auth/email-already-in-use') {
        throw new Error('Địa chỉ email này đã được đăng ký cho một tài khoản khác.');
      }
      if (fbErr.code === 'auth/invalid-email') {
        throw new Error('Định dạng email không hợp lệ.');
      }
      if (fbErr.code === 'auth/weak-password') {
        throw new Error('Mật khẩu quá yếu! Mật khẩu phải có ít nhất 6 ký tự.');
      }
      // Nêu Firebase Auth chưa bật provider Email/Password, chuyển sang đăng ký trực tiếp qua Firestore database
    }

    // 2. Đăng ký qua Firestore nếu Firebase Auth không trả về user
    if (!createdUser) {
      const customUid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const hashedPassword = await hashPassword(cleanPass);

      createdUser = {
        uid: customUid,
        email: cleanEmail,
        displayName: cleanName,
        photoURL: null,
      };

      // Lưu chi tiết tài khoản bao gồm passwordHash vào Firestore
      const userDocRef = doc(db, 'users', customUid);
      await setDoc(userDocRef, {
        uid: customUid,
        displayName: cleanName,
        email: cleanEmail,
        passwordHash: hashedPassword,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      });
    } else {
      // Lưu thông tin vào Firestore
      const hashedPassword = await hashPassword(cleanPass);
      const userDocRef = doc(db, 'users', createdUser.uid);
      await setDoc(
        userDocRef,
        {
          uid: createdUser.uid,
          displayName: cleanName,
          email: cleanEmail,
          passwordHash: hashedPassword,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
        },
        { merge: true }
      );
    }

    // Tự động đăng nhập
    setCurrentUser(createdUser);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(createdUser));

    return { session: true, user: createdUser };
  };

  // Đăng nhập bằng Google
  const loginWithGoogle = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const appUser = mapFirebaseUser(result.user);
      if (appUser) {
        setCurrentUser(appUser);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(appUser));
        await syncUserProfile(appUser);
      }
    } catch (err: any) {
      console.error('Lỗi đăng nhập Google Firebase:', err);
      throw new Error(formatFirebaseAuthError(err));
    }
  };

  // Quên / Khôi phục mật khẩu
  const resetPassword = async (email: string) => {
    const cleanEmail = email.trim().toLowerCase();
    try {
      await sendPasswordResetEmail(auth, cleanEmail);
    } catch (err: any) {
      // Nếu gửi email reset qua Firebase Auth gặp lỗi, kiểm tra xem email có tồn tại không
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', cleanEmail));
      const querySnap = await getDocs(q);

      if (querySnap.empty) {
        throw new Error('Không tìm thấy tài khoản tương ứng với email này.');
      }
    }
  };

  // Đăng xuất
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Lỗi signOut Firebase:', e);
    }
    localStorage.removeItem(LOCAL_STORAGE_KEY);
    setCurrentUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        session: currentUser ? { user: currentUser } : null,
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
