'use client';

import { useEffect } from 'react';
import {
  configureAuthInterceptors,
  refreshAuthSession,
} from '@/shared/lib/axios';
import {
  AUTH_BROADCAST_CHANNEL,
  useAuthStore,
  type AuthBroadcastMessage,
} from '../stores/auth.store';
import type { AuthUser } from '../types/auth.types';

let initialized = false;
let initialRefreshStarted = false;

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

    let channel: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
      channel.onmessage = (event: MessageEvent<AuthBroadcastMessage>) => {
        const msg = event.data;
        if (!msg) return;
        if (msg.type === 'SESSION_UPDATED') {
          useAuthStore
            .getState()
            .setSession(msg.user, msg.accessToken, { broadcast: false });
        } else if (msg.type === 'SESSION_CLEARED') {
          useAuthStore.getState().clearSession({ broadcast: false });
        }
      };
    }

    if (!initialRefreshStarted) {
      initialRefreshStarted = true;
      const state = useAuthStore.getState();
      if (!state.accessToken) {
        refreshAuthSession().catch(() => {
          useAuthStore.getState().markBootstrapped();
        });
      } else {
        state.markBootstrapped();
      }
    }

    return () => {
      channel?.close();
    };
  }, []);

  return null;
}
