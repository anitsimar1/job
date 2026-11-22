import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from 'axios';
import { ApiError, ApiErrorPayload, ApiResponse, JwtTokenPair } from '../types/api';
import { tokenStorage } from './tokenStorage';

/**
 * Centralized Axios API client configured for Spring Boot REST API integration.
 * - Reads VITE_API_BASE_URL from environment variables.
 * - Falls back to local mock data during development when VITE_API_BASE_URL is unset
 *   (or when VITE_API_FALLBACK_TO_MOCK="true" on network failure).
 * - Automatically attaches JWT Bearer tokens and coordinates single-flight token refresh on 401.
 */
const rawBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || '';

function normalizeApiBaseUrl(input: string): string {
  const trimmed = input.replace(/\/+$/, '');
  if (!trimmed) return '';
  if (trimmed.startsWith('/')) return trimmed;
  try {
    const parsed = new URL(trimmed);
    if (parsed.pathname === '' || parsed.pathname === '/') {
      return `${parsed.origin}/api`;
    }
    return trimmed;
  } catch {
    return trimmed;
  }
}

function resolveBackendOrigin(normalizedApiUrl: string): string {
  if (!normalizedApiUrl || normalizedApiUrl.startsWith('/')) {
    return '';
  }
  try {
    return new URL(normalizedApiUrl).origin;
  } catch {
    return normalizedApiUrl.replace(/\/api(\/.*)?$/, '');
  }
}

export const API_BASE_URL = normalizeApiBaseUrl(rawBaseUrl);
export const BACKEND_ORIGIN = resolveBackendOrigin(API_BASE_URL);
export const IS_MOCK_MODE = API_BASE_URL.length === 0;
export const DEV_MOCK_FALLBACK =
  Boolean(import.meta.env.DEV) &&
  (import.meta.env.VITE_API_FALLBACK_TO_MOCK as string | undefined)?.toLowerCase() === 'true';

type UnauthorizedListener = () => void;
let unauthorizedListener: UnauthorizedListener | null = null;

export function setUnauthorizedHandler(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
  _skipAuthRefresh?: boolean;
}

export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL || undefined,
  timeout: 65000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

let isRefreshing = false;
let refreshQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function flushRefreshQueue(error: unknown, token: string | null): void {
  refreshQueue.forEach(({ resolve, reject }) => {
    if (error || !token) {
      reject(error ?? new ApiError({ message: 'Session expired', status: 401, code: 'UNAUTHORIZED' }));
    } else {
      resolve(token);
    }
  });
  refreshQueue = [];
}

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (config.data instanceof FormData && config.headers) {
      delete config.headers['Content-Type'];
    }
    return config;
  },
  (error) => Promise.reject(normalizeApiError(error))
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiErrorPayload>) => {
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const status = error.response?.status;

    if (
      status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest._skipAuthRefresh &&
      !IS_MOCK_MODE
    ) {
      const refreshToken = tokenStorage.getRefreshToken();
      if (!refreshToken) {
        tokenStorage.clearTokens();
        unauthorizedListener?.();
        return Promise.reject(normalizeApiError(error));
      }

      if (isRefreshing) {
        return new Promise<string>((resolve, reject) => {
          refreshQueue.push({ resolve, reject });
        }).then((newToken) => {
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
          }
          return axiosInstance(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshRes = await axios.post<JwtTokenPair | ApiResponse<JwtTokenPair>>(
          `${API_BASE_URL}/auth/refresh`,
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' }, timeout: 30000 }
        );
        const tokens = unwrapApiResponse<JwtTokenPair>(refreshRes.data);
        tokenStorage.setTokens(tokens, tokenStorage.isRemembered());
        flushRefreshQueue(null, tokens.accessToken);
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${tokens.accessToken}`;
        }
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        flushRefreshQueue(refreshError, null);
        tokenStorage.clearTokens();
        unauthorizedListener?.();
        return Promise.reject(normalizeApiError(refreshError));
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(normalizeApiError(error));
  }
);

/**
 * Unwraps standard Spring Boot ApiResponse<T> envelopes while also supporting
 * direct DTO responses from Spring Boot @RestController endpoints.
 */
export function unwrapApiResponse<T>(payload: T | ApiResponse<T>): T {
  if (
    payload !== null &&
    typeof payload === 'object' &&
    'data' in payload &&
    'success' in payload &&
    typeof (payload as ApiResponse<T>).success === 'boolean'
  ) {
    const wrapped = payload as ApiResponse<T>;
    if (!wrapped.success) {
      throw new ApiError({
        message: wrapped.message || 'API returned an unsuccessful response',
        status: 400,
        code: 'API_FAILURE',
        timestamp: wrapped.timestamp,
        path: wrapped.path,
      });
    }
    return wrapped.data;
  }
  return payload as T;
}

/**
 * Normalizes Axios, Spring Boot validation, and network errors into a consistent ApiError.
 */
export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<ApiErrorPayload>;
    if (!axiosErr.response) {
      const isTimeout =
        axiosErr.code === 'ECONNABORTED' ||
        axiosErr.code === 'ETIMEDOUT' ||
        /timeout/i.test(axiosErr.message || '');
      return new ApiError({
        message: isTimeout
          ? 'The server is taking longer than expected to respond (cold start). Please try again in a few seconds.'
          : axiosErr.message || 'Unable to reach backend server',
        status: isTimeout ? 408 : 0,
        code: isTimeout ? 'REQUEST_TIMEOUT' : 'NETWORK_ERROR',
        isNetworkError: true,
      });
    }

    const { status, data } = axiosErr.response;
    const message =
      data?.message ||
      data?.error ||
      axiosErr.message ||
      `Request failed with status ${status}`;

    return new ApiError({
      message,
      status,
      code: data?.code || `HTTP_${status}`,
      fieldErrors: data?.fieldErrors,
      path: data?.path,
      timestamp: data?.timestamp,
    });
  }

  if (error instanceof Error) {
    return new ApiError({ message: error.message, status: 500, code: 'UNEXPECTED_ERROR' });
  }

  return new ApiError({ message: 'An unexpected error occurred', status: 500, code: 'UNKNOWN' });
}

/**
 * Executes a live Spring Boot HTTP request when VITE_API_BASE_URL is configured,
 * or falls back cleanly to mock data in preview/development mode.
 */
export async function withMockFallback<T>(
  apiCall: () => Promise<T>,
  mockFallback: () => T | Promise<T>,
  options: { allowDevFallbackOnNetworkError?: boolean } = {}
): Promise<T> {
  if (IS_MOCK_MODE) {
    return mockFallback();
  }

  try {
    return await apiCall();
  } catch (err) {
    const apiError = normalizeApiError(err);
    const shouldFallback =
      (options.allowDevFallbackOnNetworkError ?? DEV_MOCK_FALLBACK) && apiError.isNetworkError;
    if (shouldFallback) {
      return mockFallback();
    }
    throw apiError;
  }
}

export const apiClient = {
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.get<T | ApiResponse<T>>(url, config);
    return unwrapApiResponse<T>(response.data);
  },

  async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<T | ApiResponse<T>>(url, data, config);
    return unwrapApiResponse<T>(response.data);
  },

  async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.put<T | ApiResponse<T>>(url, data, config);
    return unwrapApiResponse<T>(response.data);
  },

  async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.patch<T | ApiResponse<T>>(url, data, config);
    return unwrapApiResponse<T>(response.data);
  },

  async delete<T = void>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.delete<T | ApiResponse<T>>(url, config);
    if (response.status === 204 || response.data === undefined || response.data === '') {
      return undefined as T;
    }
    return unwrapApiResponse<T>(response.data);
  },

  async upload<T>(url: string, formData: FormData, config?: AxiosRequestConfig): Promise<T> {
    const response = await axiosInstance.post<T | ApiResponse<T>>(url, formData, {
      ...config,
      headers: {
        ...config?.headers,
        'Content-Type': 'multipart/form-data',
      },
    });
    return unwrapApiResponse<T>(response.data);
  },
};

/**
 * Backward-compatible helper retained for any callers importing apiRequest directly.
 */
export async function apiRequest<T>(
  endpoint: string,
  options: {
    method?: string;
    params?: Record<string, string | number | boolean | undefined>;
    body?: string;
    headers?: Record<string, string>;
  } = {}
): Promise<T> {
  const method = (options.method || 'GET').toUpperCase();
  const parsedData = options.body ? JSON.parse(options.body) : undefined;
  const response = await axiosInstance.request<T | ApiResponse<T>>({
    url: endpoint,
    method,
    params: options.params,
    data: parsedData,
    headers: options.headers,
  });
  return unwrapApiResponse<T>(response.data);
}
