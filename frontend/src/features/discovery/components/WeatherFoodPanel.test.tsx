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
import { discoveryService } from '../services/discovery.service';
import { WeatherFoodPanel } from './WeatherFoodPanel';

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('WeatherFoodPanel', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('switches weather presets, calls food-recommendations API, and triggers selection', async () => {
    const foodSpy = vi
      .spyOn(discoveryService, 'getFoodRecommendations')
      .mockImplementation(async (params) => ({
        data: [
          {
            id: params.temperatureC && params.temperatureC >= 30 ? 52 : 42,
            name:
              params.temperatureC && params.temperatureC >= 30
                ? 'Kem Bơ Thanh Thảo (Máy lạnh)'
                : 'Lẩu Gà Lá É Tao Ngộ',
            city: 'Da Lat',
            category: 'restaurant',
            subcategory:
              params.temperatureC && params.temperatureC >= 30
                ? 'refreshment'
                : 'hotpot',
            isOutdoor: false,
            hasAc: Boolean(params.temperatureC && params.temperatureC >= 30),
            suitableWeather: ['rainy', 'cold'],
            priceLevel: 2,
            rating: 4.7,
            address: 'Đà Lạt',
            description: null,
            thumbnailUrl: null,
            location: { lat: 11.9362, lng: 108.4451 },
            distanceKm: 1.2,
          },
        ],
        meta: {
          page: 1,
          limit: 15,
          total: 1,
          totalPages: 1,
          weatherProfile:
            params.temperatureC && params.temperatureC >= 30
              ? 'hot_sunny'
              : 'cold_rainy',
        },
      }));

    const onSelectPlace = vi.fn();
    renderWithQuery(
      <WeatherFoodPanel
        city="Da Lat"
        lat={11.9404}
        lng={108.4583}
        onSelectPlace={onSelectPlace}
      />,
    );

    expect(
      await screen.findByText('Lẩu Gà Lá É Tao Ngộ'),
    ).toBeInTheDocument();
    expect(foodSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        city: 'Da Lat',
        temperatureC: 16,
        rainProbability: 75,
      }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Nắng nóng 34°C/i }),
    );

    expect(
      await screen.findByText('Kem Bơ Thanh Thảo (Máy lạnh)'),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(foodSpy).toHaveBeenLastCalledWith(
        expect.objectContaining({
          temperatureC: 34,
          rainProbability: 5,
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '+ Thêm' }));
    expect(onSelectPlace).toHaveBeenCalledWith(
      expect.objectContaining({ id: 52 }),
    );
  });
});
