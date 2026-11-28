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
import { tripService } from '@/features/itinerary-planner';
import type { PlaceItem } from '../types/discovery.types';
import { AddToTripModal } from './AddToTripModal';

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

const samplePlace: PlaceItem = {
  id: 101,
  name: 'Lẩu Gà Lá É Tao Ngộ',
  city: 'Da Lat',
  category: 'restaurant',
  subcategory: 'hotpot',
  isOutdoor: false,
  hasAc: false,
  suitableWeather: ['rainy', 'cold'],
  priceLevel: 2,
  rating: 4.6,
  address: 'Đường 3/4, Đà Lạt',
  description: null,
  thumbnailUrl: null,
  location: { lat: 11.93, lng: 108.45 },
};

describe('AddToTripModal', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    useAuthStore.getState().clearSession({ broadcast: false });
  });

  it('prompts login when user is unauthenticated', () => {
    renderWithQuery(<AddToTripModal place={samplePlace} onClose={vi.fn()} />);

    expect(screen.getByText(/Đăng nhập để lưu/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Đăng nhập ngay/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('adds place to selected trip, day, and slot when signed in', async () => {
    useAuthStore.getState().setSession(
      {
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Traveler',
        avatarUrl: null,
        preferences: {},
      },
      'jwt.token',
      { broadcast: false },
    );

    vi.spyOn(tripService, 'listTrips').mockResolvedValue([
      {
        id: 7,
        userId: 1,
        title: 'Đà Lạt 3N2Đ',
        destinationCity: 'Da Lat',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
        totalDays: 3,
        status: 'active',
        centroidLocation: null,
        createdAt: '2026-11-22T00:00:00Z',
        updatedAt: '2026-11-22T00:00:00Z',
      },
    ]);
    const addSpy = vi.spyOn(tripService, 'addItem').mockResolvedValue({
      item: {
        id: 99,
        tripId: 7,
        placeId: 101,
        stayId: null,
        dayNumber: 2,
        timeSlot: 'dinner',
        orderIndex: 0,
        distanceFromPrevKm: 0,
        isDetourWarning: false,
        weatherCondition: null,
        temperatureC: null,
        rainProbability: null,
        weatherAlertFlag: false,
        note: null,
        place: null,
        stay: null,
        createdAt: '2026-11-22T00:00:00Z',
        updatedAt: '2026-11-22T00:00:00Z',
      },
      centroidLocation: null,
    });
    const onClose = vi.fn();

    renderWithQuery(<AddToTripModal place={samplePlace} onClose={onClose} />);

    expect(
      await screen.findByLabelText(/Chọn chuyến đi/i),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Ngày thứ/i), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText(/Khung giờ/i), {
      target: { value: 'dinner' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Xác nhận thêm/i }));

    await waitFor(() => {
      expect(addSpy).toHaveBeenCalledWith(7, {
        placeId: 101,
        dayNumber: 2,
        timeSlot: 'dinner',
      });
    });
    expect(onClose).toHaveBeenCalled();
  });
});
