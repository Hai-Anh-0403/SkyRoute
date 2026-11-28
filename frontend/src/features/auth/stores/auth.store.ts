import { create } from 'zustand';
import type { AuthUser } from '../types/auth.types';

export const AUTH_BROADCAST_CHANNEL = 'skyroute-auth';

export type AuthBroadcastMessage =
  | { type: 'SESSION_UPDATED'; user: AuthUser; accessToken: string }
  | { type: 'SESSION_CLEARED' };

function broadcastAuthMessage(message: AuthBroadcastMessage): void {
  if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') {
    return;
  }
  try {
    const channel = new BroadcastChannel(AUTH_BROADCAST_CHANNEL);
    channel.postMessage(message);
    channel.close();
  } catch {
    // Ignore environments where BroadcastChannel is restricted
  }
}

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isBootstrapped: boolean;
  setSession: (
    user: AuthUser,
    accessToken: string,
    options?: { broadcast?: boolean },
  ) => void;
  clearSession: (options?: { broadcast?: boolean }) => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,
  isBootstrapped: false,
  setSession: (user, accessToken, options) => {
    set({
      user,
      accessToken,
      isAuthenticated: true,
      isBootstrapped: true,
    });
    if (options?.broadcast !== false) {
      broadcastAuthMessage({ type: 'SESSION_UPDATED', user, accessToken });
    }
  },
  clearSession: (options) => {
    set({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isBootstrapped: true,
    });
    if (options?.broadcast !== false) {
      broadcastAuthMessage({ type: 'SESSION_CLEARED' });
    }
  },
  markBootstrapped: () => set({ isBootstrapped: true }),
}));
