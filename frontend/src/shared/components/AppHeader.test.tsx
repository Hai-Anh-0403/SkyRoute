import '@testing-library/jest-dom/vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth';
import { AppHeader } from './AppHeader';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/trips',
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('AppHeader', () => {
  afterEach(() => {
    cleanup();
    useAuthStore.getState().clearSession({ broadcast: false });
  });

  it('toggles mobile navigation drawer and closes on Escape', () => {
    useAuthStore.getState().markBootstrapped();
    renderWithQuery(<AppHeader />);

    const toggleBtn = screen.getByRole('button', {
      name: /Mở menu điều hướng/i,
    });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(toggleBtn);
    expect(
      screen.getByRole('navigation', { name: /Điều hướng di động/i }),
    ).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByRole('navigation', { name: /Điều hướng di động/i }),
    ).not.toBeInTheDocument();
  });

  it('shows authenticated user name and logout button when signed in', () => {
    useAuthStore.getState().setSession(
      {
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Nguyễn Minh',
        avatarUrl: null,
        preferences: {},
      },
      'valid.token',
      { broadcast: false },
    );

    renderWithQuery(<AppHeader />);

    expect(screen.getByText('Nguyễn Minh')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /Đăng xuất/i }),
    ).toBeInTheDocument();
  });
});
