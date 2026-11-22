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
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { weatherFallbackService } from '../services/weather-fallback.service';
import { PlanBSwapDrawer } from './PlanBSwapDrawer';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('PlanBSwapDrawer', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('renders grounded indoor candidates and triggers 1-click swap mutation', async () => {
    useWorkspaceStore.getState().setActivePlanBItemId(103);

    vi.spyOn(weatherFallbackService, 'getPlanBCandidates').mockResolvedValue({
      conflictedItem: {
        id: 103,
        placeId: 3,
        placeName: 'Đồi Chè Cầu Đất',
        dayNumber: 1,
        timeSlot: 'afternoon',
        rainProbability: 75,
        temperatureC: 16.5,
      },
      anchorLocation: { lat: 11.9404, lng: 108.4583 },
      radiusMeters: 3000,
      candidates: [
        {
          placeId: 88,
          name: 'Bảo tàng Lâm Đồng',
          category: 'attraction',
          subcategory: 'museum',
          isOutdoor: false,
          address: '4 Hùng Vương, Đà Lạt',
          rating: 4.6,
          location: { lat: 11.9418, lng: 108.4589 },
          distanceFromPrevKm: 1.2,
          contextualScore: 0.94,
          aiReason:
            'Bảo tàng trong nhà cách điểm ăn trưa 1.2 km, tránh mưa 75%.',
        },
      ],
    });

    const swapSpy = vi
      .spyOn(weatherFallbackService, 'swapPlanB')
      .mockResolvedValue({
        updatedItem: {
          id: 103,
          placeId: 88,
          weatherAlertFlag: false,
          distanceFromPrevKm: 1.2,
          isDetourWarning: false,
        },
        newCentroidLocation: { lat: 11.9412, lng: 108.451 },
      });

    renderWithQuery(<PlanBSwapDrawer tripId={12} />);

    expect(await screen.findByText('Bảo tàng Lâm Đồng')).toBeInTheDocument();
    expect(screen.getByText(/Phù hợp 94%/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Hoán đổi 1-Click/i }));

    await waitFor(() => {
      expect(swapSpy).toHaveBeenCalledWith(12, 103, {
        replacementPlaceId: 88,
        note: 'Hoán đổi Kế hoạch B tránh mưa 75%',
      });
      expect(useWorkspaceStore.getState().activePlanBItemId).toBeNull();
    });
  });
});
