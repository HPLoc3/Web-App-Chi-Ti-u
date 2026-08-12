import axios from 'axios';

// Tạo Axios instance kết nối Backend Express
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  withCredentials: true, // Tự động gửi/nhận HttpOnly Cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Đính kèm Authorization Header nếu có token trong localStorage
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Xử lý lỗi hệ thống hoặc token hết hạn
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Có thể tự động đăng xuất khi nhận HTTP 401 Unauthorized
      localStorage.removeItem('auth_token');
    }
    return Promise.reject(error);
  }
);

export default apiClient;
