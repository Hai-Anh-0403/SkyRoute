import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import type { ApiResponse } from '@/shared/types/api.types';

export const apiClient = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3001/api/v1',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

export interface AuthInterceptorHandlers {
  getAccessToken: () => string | null;
  onTokenRefreshed: (payload: { user: unknown; accessToken: string }) => void;
  onAuthFailed: () => void;
}

interface RetryableRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const AUTH_SKIP_REFRESH_PATHS = [
  '/auth/login',
  '/auth/register',
  '/auth/refresh',
  '/auth/logout',
];

let requestInterceptorId: number | null = null;
let responseInterceptorId: number | null = null;
let refreshPromise: Promise<string | null> | null = null;

function shouldSkipRefresh(url: string | undefined): boolean {
  if (!url) {
    return false;
  }
  return AUTH_SKIP_REFRESH_PATHS.some((path) => url.includes(path));
}

export function configureAuthInterceptors(
  handlers: AuthInterceptorHandlers,
): void {
  if (requestInterceptorId !== null) {
    apiClient.interceptors.request.eject(requestInterceptorId);
  }
  if (responseInterceptorId !== null) {
    apiClient.interceptors.response.eject(responseInterceptorId);
  }

  requestInterceptorId = apiClient.interceptors.request.use((config) => {
    const token = handlers.getAccessToken();
    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  responseInterceptorId = apiClient.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as
        | RetryableRequestConfig
        | undefined;
      const status = error.response?.status;

      if (
        status !== 401 ||
        !originalRequest ||
        originalRequest._retry ||
        shouldSkipRefresh(originalRequest.url)
      ) {
        return Promise.reject(error);
      }

      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = apiClient
            .post<ApiResponse<{ user: unknown; accessToken: string }>>(
              '/auth/refresh',
            )
            .then((res) => {
              const payload = res.data.data;
              handlers.onTokenRefreshed(payload);
              return payload.accessToken;
            })
            .finally(() => {
              refreshPromise = null;
            });
        }

        const newAccessToken = await refreshPromise;
        if (!newAccessToken) {
          handlers.onAuthFailed();
          return Promise.reject(error);
        }

        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        handlers.onAuthFailed();
        return Promise.reject(refreshError);
      }
    },
  );
}
