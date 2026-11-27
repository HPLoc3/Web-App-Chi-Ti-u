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

const GENERIC_ERROR = 'Đã xảy ra lỗi. Vui lòng thử lại.';
const NETWORK_ERROR = 'Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.';

/**
 * Lấy thông báo lỗi để hiện cho người dùng.
 * Server trả { error: { message } } (sendError) hoặc chỉ { message } (validate, auth, rate limit).
 */
export const getApiErrorMessage = (err: any, fallback?: string): string => {
  const data = err?.response?.data;
  const serverMessage = data?.error?.message || data?.message;
  if (serverMessage) return String(serverMessage);
  // Có phản hồi nhưng không có message: không lộ câu tiếng Anh của axios
  if (err?.response) return fallback || GENERIC_ERROR;
  if (err?.code === 'ERR_NETWORK' || err?.code === 'ECONNABORTED' || err?.message === 'Network Error') {
    return NETWORK_ERROR;
  }
  return err?.message || fallback || GENERIC_ERROR;
};

const REFRESH_LOCK_NAME = 'qlct-auth-refresh';
const REFRESH_IN_PROGRESS_DELAY_MS = 300;

type RefreshOutcome = 'refreshed' | 'in_progress' | 'expired';

/**
 * Gọi /auth/refresh. Chỉ xóa token khi server trả 401;
 * lỗi mạng hoặc lỗi khác được ném ra và giữ nguyên token.
 */
const requestRefresh = async (tokenBeforeWait: string | null): Promise<RefreshOutcome> => {
  const currentToken = getStoredRefreshToken();
  // Tab khác đã xoay token trong lúc chờ khóa: dùng luôn token mới
  if (currentToken && currentToken !== tokenBeforeWait) return 'refreshed';

  try {
    const res = await axios.post(
      `${getApiBaseUrl()}/api/v1/auth/refresh`,
      // Người dùng chỉ có cookie: không gửi refreshToken: null (server từ chối)
      currentToken ? { refreshToken: currentToken } : {},
      { withCredentials: true }
    );
    if (res.data?.success !== true) return 'expired';
    if (res.data.accessToken) {
      setStoredTokens(res.data.accessToken, res.data.refreshToken);
    }
    return 'refreshed';
  } catch (err: any) {
    const status = err?.response?.status;
    if (status === 401) {
      clearStoredTokens();
      return 'expired';
    }
    const code = err?.response?.data?.error?.code || err?.response?.data?.code;
    if (status === 409 && code === 'REFRESH_IN_PROGRESS') return 'in_progress';
    throw err;
  }
};

// Web Locks giúp nhiều tab không cùng xoay một refresh token
const refreshWithLock = (): Promise<RefreshOutcome> => {
  const tokenBeforeWait = getStoredRefreshToken();
  const locks = typeof navigator !== 'undefined' ? (navigator as any).locks : undefined;
  if (locks?.request) {
    return locks.request(REFRESH_LOCK_NAME, () => requestRefresh(tokenBeforeWait));
  }
  return requestRefresh(tokenBeforeWait);
};

// Biến lưu trữ Promise làm mới Token để tránh gọi nhiều lần đồng thời trong cùng tab
let refreshPromise: Promise<RefreshOutcome> | null = null;

// Các endpoint mà 401 là lỗi nghiệp vụ, không được kích hoạt refresh
const NO_REFRESH_ENDPOINTS = [
  '/auth/login',
  '/auth/register',
  '/auth/google',
  '/auth/refresh',
  '/auth/forgot-password',
  '/auth/reset-password',
];

// Response Interceptor: Tự động refresh token khi Access Token hết hạn (401), kể cả /auth/me
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<any>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    const skipRefresh = NO_REFRESH_ENDPOINTS.some((path) => originalRequest?.url?.includes(path));
    if (error.response?.status !== 401 || !originalRequest || originalRequest._retry || skipRefresh) {
      return Promise.reject(error);
    }
    originalRequest._retry = true;

    if (!refreshPromise) {
      refreshPromise = refreshWithLock().finally(() => {
        refreshPromise = null;
      });
    }
    const outcome = await refreshPromise;

    if (outcome === 'expired') {
      return Promise.reject(error);
    }
    if (outcome === 'in_progress') {
      // Một yêu cầu khác đang xoay token: chờ rồi thử lại request gốc đúng một lần
      await new Promise((resolve) => setTimeout(resolve, REFRESH_IN_PROGRESS_DELAY_MS));
    }

    const newToken = getStoredAccessToken();
    if (newToken && originalRequest.headers) {
      originalRequest.headers.Authorization = `Bearer ${newToken}`;
    }
    return apiClient(originalRequest);
  }
);

export default apiClient;
