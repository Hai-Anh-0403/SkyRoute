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
import { stayFinderService } from '../services/stay-finder.service';
import { CentroidStayDrawer } from './CentroidStayDrawer';

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('CentroidStayDrawer', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows ranked stays near trip centroid and focuses map when selected', async () => {
    useWorkspaceStore.getState().setCentroidStayDrawerOpen(true);

    vi.spyOn(stayFinderService, 'getCentroidStays').mockResolvedValue({
      tripId: 12,
      centroidLocation: { lat: 11.9412, lng: 108.451 },
      totalItineraryPlaces: 3,
      recommendedStays: [
        {
          id: 11,
          name: 'Dalat Boutique Homestay',
          stayType: 'homestay',
          pricePerNight: 650000,
          rating: 4.7,
          address: 'Phường 3, Đà Lạt',
          thumbnailUrl: null,
          location: { lat: 11.942, lng: 108.452 },
          distanceToCentroidKm: 0.14,
          avgDistanceToItineraryPlacesKm: 1.35,
          amenities: ['wifi', 'balcony'],
        },
      ],
    });

    renderWithQuery(<CentroidStayDrawer tripId={12} />);

    expect(
      await screen.findByText('Dalat Boutique Homestay'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Xem trên bản đồ/i }));
    expect(useWorkspaceStore.getState().focusedMapCoords).toEqual({
      lat: 11.942,
      lng: 108.452,
    });
  });

  it('shows empty-trip guidance when backend returns STAY_002 (422)', async () => {
    useWorkspaceStore.getState().setCentroidStayDrawerOpen(true);

    vi.spyOn(stayFinderService, 'getCentroidStays').mockRejectedValue({
      response: {
        status: 422,
        data: {
          success: false,
          error: {
            code: 'STAY_002',
            message: 'Trip has no selected places for centroid calculation',
          },
        },
      },
    });

    renderWithQuery(<CentroidStayDrawer tripId={12} />);

    await waitFor(() => {
      expect(
        screen.getByText(/Hãy thêm ít nhất 1 địa điểm/i),
      ).toBeInTheDocument();
    });
  });
});
