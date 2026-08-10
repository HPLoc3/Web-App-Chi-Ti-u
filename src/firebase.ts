import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Static import configuration file created by Firebase setup
import appletConfig from '../firebase-applet-config.json';

// ---------------------------------------------------------------------------
// CẤU HÌNH FIREBASE CONFIG (Firebase Configuration)
// Lấy tự động từ firebase-applet-config.json hoặc điền thủ công nếu triển khai riêng:
// Firebase Console -> Project Settings -> General -> Your apps -> Web app
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || "AIzaSyCHtidIwyReAGhcZNWmvPk_y8DQa4EXfuY",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "airy-campaign-qj4jh.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "airy-campaign-qj4jh",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "airy-campaign-qj4jh.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "648596570242",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || "1:648596570242:web:5d8a4ddcf08b1d0860f49b"
};

// Khởi tạo Firebase App (Đảm bảo chỉ khởi tạo một lần duy nhất)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firebase Auth và Firestore Database
export const auth = getAuth(app);
export const db = (appletConfig as any).firestoreDatabaseId
  ? getFirestore(app, (appletConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Khởi tạo Provider Đăng nhập bằng Google
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

export { 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged 
};
export type { User };
