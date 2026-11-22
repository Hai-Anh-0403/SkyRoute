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
import { tripService } from '@/features/itinerary-planner';
import { weatherFallbackService } from '@/features/weather-fallback';
import { aiCopilotService } from '../services/ai-copilot.service';
import { AiPromptModal } from './AiPromptModal';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

describe('AiPromptModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('generates grounded itinerary preview and applies selected places to the trip', async () => {
    const genSpy = vi
      .spyOn(aiCopilotService, 'generateItinerary')
      .mockResolvedValue({
        tripId: 12,
        destinationCity: 'Da Lat',
        summary: 'Lịch trình Đà Lạt thực tế tránh mưa chiều',
        providerMode: 'gemini-tools',
        weatherWarningsAvoided: 1,
        items: [
          {
            dayNumber: 1,
            timeSlot: 'afternoon',
            placeId: 88,
            place: {
              id: 88,
              name: 'Bảo tàng Lâm Đồng',
              category: 'attraction',
              subcategory: 'museum',
              isOutdoor: false,
              priceLevel: 1,
              rating: 4.6,
              address: '4 Hùng Vương',
              location: { lat: 11.9418, lng: 108.4589 },
            },
            weather: {
              temperatureC: 17,
              rainProbability: 75,
              conditionTag: 'rainy',
            },
            reason: 'Điểm trong nhà tránh mưa 75%.',
          },
        ],
      });

    const addSpy = vi.spyOn(tripService, 'addItem').mockResolvedValue({
      item: {} as never,
      centroidLocation: { lat: 11.9418, lng: 108.4589 },
    });
    vi.spyOn(weatherFallbackService, 'syncTripWeather').mockResolvedValue({
      tripId: 12,
      syncedCount: 1,
      conflictCount: 0,
    });

    const onClose = vi.fn();
    renderWithQuery(
      <AiPromptModal
        tripId={12}
        destinationCity="Da Lat"
        isOpen
        onClose={onClose}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Tạo lịch trình thực tế/i }),
    );

    expect(
      await screen.findByText('Bảo tàng Lâm Đồng'),
    ).toBeInTheDocument();
    expect(genSpy).toHaveBeenCalledWith(
      expect.objectContaining({ tripId: 12 }),
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Áp dụng vào lịch trình/i }),
    );

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(12, {
        placeId: 88,
        dayNumber: 1,
        timeSlot: 'afternoon',
        note: 'Điểm trong nhà tránh mưa 75%.',
      });
      expect(onClose).toHaveBeenCalled();
    });
  });
});
