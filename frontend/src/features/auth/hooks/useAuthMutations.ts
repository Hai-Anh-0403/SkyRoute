'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ROUTES } from '@/shared/lib/routes';
import type { ApiErrorResponse } from '@/shared/types/api.types';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import type {
  LoginRequest,
  RegisterRequest,
  UpdateProfileRequest,
} from '../types/auth.types';

function extractErrorMessage(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<ApiErrorResponse>;
  return axiosError?.response?.data?.error?.message ?? fallback;
}

export function useLogin() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: LoginRequest) => authService.login(payload),
    onSuccess: (session) => {
      setSession(session.user, session.accessToken);
      toast.success(`Chào mừng trở lại, ${session.user.fullName}!`);
      router.push(ROUTES.TRIPS);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Đăng nhập thất bại.'));
    },
  });
}

export function useRegister() {
  const router = useRouter();
  const setSession = useAuthStore((s) => s.setSession);

  return useMutation({
    mutationFn: (payload: RegisterRequest) => authService.register(payload),
    onSuccess: (session) => {
      setSession(session.user, session.accessToken);
      toast.success('Tạo tài khoản SkyRoute thành công!');
      router.push(ROUTES.TRIPS);
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Đăng ký thất bại.'));
    },
  });
}

export function useLogout() {
  const router = useRouter();
  const clearSession = useAuthStore((s) => s.clearSession);

  return useMutation({
    mutationFn: () => authService.logout(),
    onSettled: () => {
      clearSession();
      router.push(ROUTES.LOGIN);
    },
  });
}

export function useProfileQuery(enabled = true) {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => authService.getMe(),
    enabled,
    retry: false,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateProfileRequest) => authService.updateMe(payload),
    onSuccess: (updatedUser) => {
      const token = useAuthStore.getState().accessToken;
      if (token) {
        useAuthStore.getState().setSession(updatedUser, token);
      }
      queryClient.setQueryData(['auth', 'me'], updatedUser);
      toast.success('Đã cập nhật hồ sơ và sở thích du lịch!');
    },
    onError: (error) => {
      toast.error(extractErrorMessage(error, 'Không thể cập nhật hồ sơ.'));
    },
  });
}
