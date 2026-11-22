import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RecommendedStayItem } from '../types/stay-finder.types';
import { StayComparisonCard } from './StayComparisonCard';

const sampleStay: RecommendedStayItem = {
  id: 7,
  name: 'Ana Mandara Villas Dalat',
  stayType: 'resort',
  pricePerNight: 1850000,
  rating: 4.8,
  address: 'Lê Lai, Phường 5, Đà Lạt',
  thumbnailUrl: null,
  location: { lat: 11.9388, lng: 108.4265 },
  distanceToCentroidKm: 0.45,
  avgDistanceToItineraryPlacesKm: 1.92,
  amenities: ['wifi', 'heater', 'breakfast'],
};

describe('StayComparisonCard', () => {
  afterEach(() => {
    cleanup();
  });

  it('renders stay pricing, centroid distance, average itinerary distance, and triggers focus/add actions', () => {
    const onFocusMap = vi.fn();
    const onAddStay = vi.fn();
    const onHover = vi.fn();

    render(
      <StayComparisonCard
        stay={sampleStay}
        rank={1}
        onFocusMap={onFocusMap}
        onAddStay={onAddStay}
        onHover={onHover}
      />,
    );

    expect(screen.getByText('Ana Mandara Villas Dalat')).toBeInTheDocument();
    expect(screen.getByText('Resort')).toBeInTheDocument();
    expect(screen.getByText('0.45 km')).toBeInTheDocument();
    expect(screen.getByText('1.92 km')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Xem trên bản đồ/i }));
    expect(onFocusMap).toHaveBeenCalledWith({ lat: 11.9388, lng: 108.4265 });

    fireEvent.click(screen.getByRole('button', { name: /Ghim lưu trú/i }));
    expect(onAddStay).toHaveBeenCalledWith(7);
  });
});
