import axios from 'axios';

// API Base URL duy nhất cho ứng dụng (Đọc từ VITE_API_URL hoặc VITE_API_BASE_URL, mặc định '' cho relative URL)
export const API_BASE_URL = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

// Tạo Axios instance kết nối Backend Express
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Tự động gửi/nhận HttpOnly Cookies với mọi request
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response Interceptor: Xử lý lỗi hệ thống hoặc HTTP 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;
