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
import { tripService } from '../services/trip.service';
import { TripsDashboard } from './TripsDashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/trips',
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('next/image', () => ({
  default: ({
    alt,
    src,
    className,
  }: {
    alt: string;
    src: string;
    className?: string;
  }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img alt={alt} src={src} className={className} />
  ),
}));

function renderWithQuery(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>,
  );
}

const sampleTrip = {
  id: 12,
  userId: 1,
  title: 'Đà Lạt 3N2Đ',
  destinationCity: 'Da Lat',
  startDate: '2026-12-01',
  endDate: '2026-12-03',
  totalDays: 3,
  status: 'active' as const,
  centroidLocation: null,
  createdAt: '2026-11-22T00:00:00Z',
  updatedAt: '2026-11-22T00:00:00Z',
};

describe('TripsDashboard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('allows editing and two-step deleting an owned trip', async () => {
    vi.spyOn(tripService, 'listTrips').mockResolvedValue([sampleTrip]);
    const updateSpy = vi
      .spyOn(tripService, 'updateTrip')
      .mockResolvedValue({ ...sampleTrip, title: 'Đà Lạt Mới' });
    const deleteSpy = vi
      .spyOn(tripService, 'deleteTrip')
      .mockResolvedValue(undefined);

    renderWithQuery(<TripsDashboard />);

    expect(await screen.findByText('Đà Lạt 3N2Đ')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /Sửa chuyến đi Đà Lạt 3N2Đ/i }),
    );
    const editTitleInput = await screen.findByDisplayValue('Đà Lạt 3N2Đ');
    fireEvent.change(editTitleInput, { target: { value: 'Đà Lạt Mới' } });
    fireEvent.click(screen.getByRole('button', { name: /Lưu thay đổi/i }));

    await waitFor(() => {
      expect(updateSpy).toHaveBeenCalledWith(
        12,
        expect.objectContaining({ title: 'Đà Lạt Mới' }),
      );
    });

    fireEvent.click(
      screen.getByRole('button', { name: /Xóa chuyến đi Đà Lạt 3N2Đ/i }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Xác nhận xóa' }));

    await waitFor(() => {
      expect(deleteSpy).toHaveBeenCalledWith(12);
    });
  });

  it('opens create trip modal prefilled when selecting a curated template', async () => {
    vi.spyOn(tripService, 'listTrips').mockResolvedValue([]);

    renderWithQuery(<TripsDashboard />);

    expect(
      await screen.findByText(/Bạn chưa có chuyến đi nào/i),
    ).toBeInTheDocument();

    const useButtons = screen.getAllByRole('button', { name: /\+ Dùng mẫu/i });
    fireEvent.click(useButtons[0]);

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Đà Lạt 3N2Đ Chữa lành'),
    ).toBeInTheDocument();
  });
});
