import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { ProfilePreferencesModal } from './ProfilePreferencesModal';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('ProfilePreferencesModal', () => {
  beforeEach(() => {
    useAuthStore.getState().setSession(
      {
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Nguyễn Văn A',
        avatarUrl: null,
        preferences: { budget: 'medium', interests: ['nature'] },
      },
      'fake-token',
    );
  });

  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession();
    vi.restoreAllMocks();
  });

  it('updates fullName, budget, and interests via PATCH /auth/me', async () => {
    vi.spyOn(authService, 'getMe').mockResolvedValue({
      id: '1',
      email: 'traveler@skyroute.vn',
      fullName: 'Nguyễn Văn A',
      avatarUrl: null,
      preferences: { budget: 'medium', interests: ['nature'] },
    });

    const updateSpy = vi.spyOn(authService, 'updateMe').mockResolvedValue({
      id: '1',
      email: 'traveler@skyroute.vn',
      fullName: 'Nguyễn Văn B',
      avatarUrl: null,
      preferences: {
        budget: 'low',
        interests: ['nature', 'hotpot'],
        preferIndoor: true,
      },
    });

    const onClose = vi.fn();
    renderWithQuery(<ProfilePreferencesModal isOpen onClose={onClose} />);

    const nameInput = await screen.findByLabelText(/Họ và tên/i);
    fireEvent.change(nameInput, { target: { value: 'Nguyễn Văn B' } });
    fireEvent.click(screen.getByRole('button', { name: 'Tiết kiệm' }));
    fireEvent.click(screen.getByRole('button', { name: 'Lẩu / Đồ nướng' }));
    fireEvent.click(
      screen.getByLabelText(/Ưu tiên địa điểm trong nhà/i),
    );
    fireEvent.click(screen.getByRole('button', { name: /Lưu sở thích/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith({
        fullName: 'Nguyễn Văn B',
        preferences: {
          budget: 'low',
          interests: ['nature', 'hotpot'],
          preferIndoor: true,
        },
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
