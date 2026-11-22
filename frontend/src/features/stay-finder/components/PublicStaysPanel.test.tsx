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
import { PublicStaysPanel } from './PublicStaysPanel';

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('PublicStaysPanel', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('filters stays by type and focuses map coordinates when clicked', async () => {
    const listSpy = vi
      .spyOn(stayFinderService, 'listPublicStays')
      .mockResolvedValue({
        data: [
          {
            id: 21,
            name: 'Đồi Mơ Homestay',
            city: 'Da Lat',
            stayType: 'homestay',
            pricePerNight: 550000,
            rating: 4.8,
            address: 'Phường 4, Đà Lạt',
            thumbnailUrl: null,
            location: { lat: 11.933, lng: 108.431 },
            amenities: ['wifi', 'kitchen'],
          },
        ],
        meta: { page: 1, limit: 24, total: 1, totalPages: 1 },
      });

    renderWithQuery(<PublicStaysPanel city="Da Lat" />);

    expect(await screen.findByText('Đồi Mơ Homestay')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Homestay' }));
    await waitFor(() => {
      expect(listSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          city: 'Da Lat',
          stayType: 'homestay',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: /Xem trên bản đồ/i }));
    expect(useWorkspaceStore.getState().focusedMapCoords).toEqual({
      lat: 11.933,
      lng: 108.431,
    });
  });
});
