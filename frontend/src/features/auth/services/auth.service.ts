import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  AuthSessionData,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '../types/auth.types';

export const authService = {
  async register(payload: RegisterRequest): Promise<AuthSessionData> {
    const res = await apiClient.post<ApiResponse<AuthSessionData>>(
      '/auth/register',
      payload,
    );
    return res.data.data;
  },

  async login(payload: LoginRequest): Promise<AuthSessionData> {
    const res = await apiClient.post<ApiResponse<AuthSessionData>>(
      '/auth/login',
      payload,
    );
    return res.data.data;
  },

  async refresh(): Promise<AuthSessionData> {
    const res = await apiClient.post<ApiResponse<AuthSessionData>>(
      '/auth/refresh',
    );
    return res.data.data;
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout');
  },

  async logoutAll(): Promise<void> {
    await apiClient.post('/auth/logout-all');
  },

  async getMe(): Promise<AuthUser> {
    const res = await apiClient.get<ApiResponse<AuthUser>>('/auth/me');
    return res.data.data;
  },
};
