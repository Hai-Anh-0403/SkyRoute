'use client';

import { useEffect } from 'react';
import { configureAuthInterceptors } from '@/shared/lib/axios';
import { useAuthStore } from '../stores/auth.store';
import type { AuthUser } from '../types/auth.types';

let initialized = false;

function ensureInterceptorsConfigured() {
  if (initialized) {
    return;
  }
  initialized = true;
  configureAuthInterceptors({
    getAccessToken: () => useAuthStore.getState().accessToken,
    onTokenRefreshed: ({ user, accessToken }) => {
      useAuthStore.getState().setSession(user as AuthUser, accessToken);
    },
    onAuthFailed: () => {
      useAuthStore.getState().clearSession();
    },
  });
}

export function AuthBootstrap() {
  ensureInterceptorsConfigured();

  useEffect(() => {
    ensureInterceptorsConfigured();
  }, []);

  return null;
}
