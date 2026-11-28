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
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/features/auth';
import { discoveryService } from '@/features/discovery';
import { adminService } from '../services/admin.service';
import { AdminCatalogDashboard } from './AdminCatalogDashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/admin',
}));

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

describe('AdminCatalogDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession({ broadcast: false });
  });

  it('blocks non-admin accounts with clear permission message', () => {
    useAuthStore.getState().setSession(
      {
        id: '2',
        email: 'traveler@skyroute.vn',
        fullName: 'Traveler',
        avatarUrl: null,
        preferences: {},
        role: 'traveler',
      },
      'jwt.token',
      { broadcast: false },
    );

    renderWithQuery(<AdminCatalogDashboard />);

    expect(
      screen.getByText(/Yêu cầu quyền Quản trị \(Admin\)/i),
    ).toBeInTheDocument();
  });

  it('allows admin users to create a catalog place', async () => {
    useAuthStore.getState().setSession(
      {
        id: '1',
        email: 'admin@skyroute.vn',
        fullName: 'Admin',
        avatarUrl: null,
        preferences: {},
        role: 'admin',
      },
      'admin.jwt.token',
      { broadcast: false },
    );

    vi.spyOn(discoveryService, 'getRadarPlaces').mockResolvedValue({
      data: [],
      meta: {
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
        anchorPoint: { lat: 11.9404, lng: 108.4583 },
        radiusKm: 5,
      },
    });
    const createSpy = vi
      .spyOn(adminService, 'createPlace')
      .mockResolvedValue({ id: 500 });

    renderWithQuery(<AdminCatalogDashboard />);

    fireEvent.change(screen.getByLabelText(/Tên địa điểm/i), {
      target: { value: 'Tiệm Cà Phê Túi Mơ To' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: /Lưu địa điểm vào Catalog/i }),
    );

    await waitFor(() => {
      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Tiệm Cà Phê Túi Mơ To',
          city: 'Da Lat',
        }),
      );
    });
  });
});
