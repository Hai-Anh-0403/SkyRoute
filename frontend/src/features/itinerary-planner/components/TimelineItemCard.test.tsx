import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { ItineraryItem } from '../types/trip.types';
import { TimelineItemCard } from './TimelineItemCard';

function makeItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 103,
    tripId: 12,
    placeId: 88,
    stayId: null,
    dayNumber: 1,
    timeSlot: 'afternoon',
    orderIndex: 0,
    distanceFromPrevKm: 11.8,
    isDetourWarning: true,
    weatherCondition: 'rainy',
    temperatureC: 16.5,
    rainProbability: 75,
    weatherAlertFlag: true,
    note: null,
    place: {
      id: 88,
      name: 'Đồi Chè Cầu Đất',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      address: 'Trạm Hành, Đà Lạt',
      rating: 4.8,
      location: { lat: 11.8256, lng: 108.5621 },
    },
    stay: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('TimelineItemCard', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders place info, outdoor badge, detour warning, and weather alert', () => {
    render(<TimelineItemCard item={makeItem()} onDelete={vi.fn()} />);

    expect(screen.getByText('Đồi Chè Cầu Đất')).toBeInTheDocument();
    expect(screen.getByText('Ngoài trời')).toBeInTheDocument();
    expect(screen.getByText(/Ngược đường \(11\.8 km\)/)).toBeInTheDocument();
    expect(screen.getByText(/Mưa 75%/)).toBeInTheDocument();
  });

  it('syncs hoveredPlaceId with workspace store and triggers onDelete', () => {
    const onDelete = vi.fn();
    render(<TimelineItemCard item={makeItem()} onDelete={onDelete} />);

    const card = screen.getByText('Đồi Chè Cầu Đất').closest('div');
    fireEvent.mouseEnter(card!);
    expect(useWorkspaceStore.getState().hoveredPlaceId).toBe(88);

    fireEvent.mouseLeave(card!);
    expect(useWorkspaceStore.getState().hoveredPlaceId).toBeNull();

    fireEvent.click(screen.getByLabelText('Xóa khỏi lịch trình'));
    expect(onDelete).toHaveBeenCalledWith(103);
  });
});
