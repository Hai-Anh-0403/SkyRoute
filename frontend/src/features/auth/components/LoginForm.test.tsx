import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '../services/auth.service';
import { useAuthStore } from '../stores/auth.store';
import { LoginForm } from './LoginForm';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    pushMock.mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows inline Zod validation errors when submitting empty/invalid fields', async () => {
    const loginSpy = vi.spyOn(authService, 'login');
    renderWithQuery(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'not-an-email' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    expect(await screen.findByText('Email không hợp lệ')).toBeInTheDocument();
    expect(await screen.findByText('Vui lòng nhập mật khẩu')).toBeInTheDocument();
    expect(loginSpy).not.toHaveBeenCalled();
  });

  it('submits valid credentials, stores session, and redirects to /trips', async () => {
    const loginSpy = vi.spyOn(authService, 'login').mockResolvedValue({
      user: {
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Nguyễn Văn A',
        avatarUrl: null,
        preferences: {},
      },
      accessToken: 'jwt.access.token',
    });

    renderWithQuery(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'traveler@skyroute.vn' },
    });
    fireEvent.change(screen.getByLabelText('Mật khẩu'), {
      target: { value: 'securePassword123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Đăng nhập' }));

    await waitFor(() => {
      expect(loginSpy).toHaveBeenCalledWith({
        email: 'traveler@skyroute.vn',
        password: 'securePassword123',
      });
    });

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
      expect(useAuthStore.getState().accessToken).toBe('jwt.access.token');
      expect(pushMock).toHaveBeenCalledWith('/trips');
    });
  });
});
