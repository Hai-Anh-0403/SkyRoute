import { beforeEach, describe, expect, it } from 'vitest';
import { useAuthStore } from './auth.store';

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
  });

  it('sets user, accessToken in memory and marks isAuthenticated true', () => {
    const user = {
      id: '1',
      email: 'traveler@skyroute.vn',
      fullName: 'Nguyễn Văn A',
      avatarUrl: null,
      preferences: {},
    };

    useAuthStore.getState().setSession(user, 'access.jwt.token');

    const state = useAuthStore.getState();
    expect(state.user).toEqual(user);
    expect(state.accessToken).toBe('access.jwt.token');
    expect(state.isAuthenticated).toBe(true);
  });

  it('clears session back to unauthenticated defaults', () => {
    useAuthStore.getState().setSession(
      {
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Nguyễn Văn A',
        avatarUrl: null,
        preferences: {},
      },
      'access.jwt.token',
    );

    useAuthStore.getState().clearSession();

    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.accessToken).toBeNull();
    expect(state.isAuthenticated).toBe(false);
  });
});
