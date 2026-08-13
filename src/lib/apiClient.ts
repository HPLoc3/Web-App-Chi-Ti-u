import axios from 'axios';

/**
 * Xử lý linh hoạt API Base URL cho ứng dụng:
 * - Local Development (localhost / 127.0.0.1): Tự động trỏ về http://localhost:3000
 * - Production (hophuloc.online): Sử dụng relative path (trỏ trực tiếp tới cùng origin)
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // Đang chạy dev ở port 5173 (chưa qua Express proxy)
    if ((hostname === 'localhost' || hostname === '127.0.0.1') && window.location.port === '5173') {
      return 'http://localhost:3000';
    }
    // Mọi trường hợp còn lại (Cloud Run *.run.app, production hophuloc.online, hoặc port 3000)
    // Dùng relative path ('') để tự động trỏ tới đúng host và port hiện tại
    return '';
  }

  let envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (envUrl.endsWith('/api')) {
    envUrl = envUrl.slice(0, -4);
  }
  return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();

// Tạo Axios instance kết nối Backend Express
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Tự động gửi/nhận HttpOnly Cookies với mọi request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Đảm bảo baseURL luôn được cập nhật chính xác theo môi trường runtime
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  return config;
});

// Response Interceptor: Xử lý 401 của /api/auth/me như trạng thái ANONYMOUS hợp lệ, không ném exception/error
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && error.config?.url?.includes('/api/auth/me')) {
      return Promise.resolve({
        data: { success: false, user: null },
        status: 401,
        statusText: 'Unauthorized',
        headers: error.response?.headers || {},
        config: error.config,
      });
    }
    return Promise.reject(error);
  }
);

export default apiClient;
