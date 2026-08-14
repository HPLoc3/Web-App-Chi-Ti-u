import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    return '';
  }

  let envUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
  if (envUrl.endsWith('/api')) {
    envUrl = envUrl.slice(0, -4);
  }
  return envUrl;
};

export const API_BASE_URL = getApiBaseUrl();

export const ACCESS_TOKEN_KEY = 'so_tay_access_token';
export const REFRESH_TOKEN_KEY = 'so_tay_refresh_token';

export const getStoredAccessToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredTokens = (accessToken?: string, refreshToken?: string): void => {
  if (typeof window === 'undefined') return;
  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearStoredTokens = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Tạo Axios instance kết nối Backend Express
export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Tự động gửi/nhận HttpOnly Cookies (accessToken, refreshToken)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Đảm bảo baseURL và Authorization header luôn được cập nhật chính xác
apiClient.interceptors.request.use((config) => {
  config.baseURL = getApiBaseUrl();
  const token = getStoredAccessToken();
  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Biến lưu trữ Promise làm mới Token để tránh gọi nhiều lần đồng thời
let refreshPromise: Promise<boolean> | null = null;

// Response Interceptor: Tự động refresh token khi Access Token hết hạn (401)
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // 1. Xử lý trường hợp endpoint /auth/me trả về 401: coi như trạng thái ANONYMOUS hợp lệ
    if (error.response?.status === 401 && originalRequest?.url?.includes('/auth/me')) {
      clearStoredTokens();
      return Promise.resolve({
        data: { success: false, user: null },
        status: 401,
        statusText: 'Unauthorized',
        headers: error.response?.headers || {},
        config: originalRequest,
      });
    }

    // 2. Bỏ qua nếu lỗi xảy ra ngay tại các endpoint auth cơ bản (login, register, google, forgot-password, refresh)
    const isAuthEndpoint =
      originalRequest?.url?.includes('/auth/login') ||
      originalRequest?.url?.includes('/auth/register') ||
      originalRequest?.url?.includes('/auth/google') ||
      originalRequest?.url?.includes('/auth/refresh') ||
      originalRequest?.url?.includes('/auth/forgot-password') ||
      originalRequest?.url?.includes('/auth/reset-password');

    if (error.response?.status === 401 && !originalRequest?._retry && !isAuthEndpoint) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          const storedRefreshToken = getStoredRefreshToken();
          refreshPromise = axios
            .post(
              `${getApiBaseUrl()}/api/v1/auth/refresh`,
              { refreshToken: storedRefreshToken },
              { withCredentials: true }
            )
            .then((res) => {
              if (res.data?.success === true) {
                if (res.data.accessToken) {
                  setStoredTokens(res.data.accessToken, res.data.refreshToken);
                }
                return true;
              }
              clearStoredTokens();
              return false;
            })
            .catch(() => {
              clearStoredTokens();
              return false;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const isRefreshed = await refreshPromise;

        if (isRefreshed) {
          const newToken = getStoredAccessToken();
          if (newToken && originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        clearStoredTokens();
        return Promise.reject(refreshErr);
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
