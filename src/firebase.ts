import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';

// Static import configuration file created by Firebase setup
import appletConfig from '../firebase-applet-config.json';

// ---------------------------------------------------------------------------
// CẤU HÌNH FIREBASE CONFIG (Firebase Configuration)
// Lấy tự động từ firebase-applet-config.json hoặc điền thủ công nếu triển khai riêng
// ---------------------------------------------------------------------------
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || appletConfig.apiKey || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || appletConfig.authDomain || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || appletConfig.projectId || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || appletConfig.storageBucket || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || appletConfig.messagingSenderId || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || appletConfig.appId || ""
};

// Khởi tạo Firebase App (Đảm bảo chỉ khởi tạo một lần duy nhất)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Khởi tạo Firestore Database
export const db = (appletConfig as any).firestoreDatabaseId
  ? getFirestore(app, (appletConfig as any).firestoreDatabaseId)
  : getFirestore(app);

// Khởi tạo Firebase Auth
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export default app;


