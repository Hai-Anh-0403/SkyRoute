import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { HomeLandingPage } from './HomeLandingPage';

const pushMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
  usePathname: () => '/',
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

describe('HomeLandingPage', () => {
  it('renders centred hero, live workspace preview, and featured destinations', () => {
    renderWithQuery(<HomeLandingPage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /Du lịch thông minh trước mọi dự báo thời tiết/i,
      }),
    ).toBeTruthy();

    expect(screen.getAllByText(/Mưa 70%/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Radar 3 km • 18 địa điểm/i)).toBeTruthy();
    expect(screen.getByText(/Centroid Stay • Cách tâm 0.5 km/i)).toBeTruthy();

    const destinationsRegion = screen.getByRole('region', {
      name: /Điểm đến sẵn sàng dữ liệu/i,
    });
    expect(within(destinationsRegion).getByText('Đà Lạt')).toBeTruthy();
    expect(within(destinationsRegion).getByText('Hà Nội')).toBeTruthy();
    expect(within(destinationsRegion).getByText('Ninh Bình')).toBeTruthy();
    expect(
      within(destinationsRegion).getByText('Hạ Long (Quảng Ninh)'),
    ).toBeTruthy();
  });

  it('filters destinations by search query and navigates on submit', () => {
    pushMock.mockClear();
    renderWithQuery(<HomeLandingPage />);

    const destinationsRegion = screen.getByRole('region', {
      name: /Điểm đến sẵn sàng dữ liệu/i,
    });
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Ninh Binh' } });

    expect(within(destinationsRegion).getByText('Ninh Bình')).toBeTruthy();
    expect(within(destinationsRegion).queryByText('Đà Lạt')).toBeNull();

    const form = input.closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form!);

    expect(pushMock).toHaveBeenCalledWith('/explore/ninh-binh');
  });

  it('shows empty state and resets filter when no destination matches', () => {
    renderWithQuery(<HomeLandingPage />);

    const destinationsRegion = screen.getByRole('region', {
      name: /Điểm đến sẵn sàng dữ liệu/i,
    });
    const input = screen.getByRole('searchbox');
    fireEvent.change(input, { target: { value: 'Phu Quoc' } });

    expect(
      within(destinationsRegion).getByText(
        /Không tìm thấy điểm đến phù hợp/i,
      ),
    ).toBeTruthy();

    fireEvent.click(
      within(destinationsRegion).getByRole('button', {
        name: /Hiển thị tất cả điểm đến/i,
      }),
    );
    expect(within(destinationsRegion).getByText('Đà Lạt')).toBeTruthy();
  });
});
