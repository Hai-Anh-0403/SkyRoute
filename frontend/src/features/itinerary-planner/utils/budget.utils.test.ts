import { describe, expect, it } from 'vitest';
import type { ItineraryItem } from '../types/trip.types';
import { estimateTripBudget, formatVnd } from './budget.utils';

function makeItem(overrides: Partial<ItineraryItem>): ItineraryItem {
  return {
    id: 1,
    tripId: 10,
    placeId: null,
    stayId: null,
    dayNumber: 1,
    timeSlot: 'morning',
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
    ...overrides,
  };
}

describe('estimateTripBudget', () => {
  it('sums activity categories and stay nights and aligns with medium budget', () => {
    const items: ItineraryItem[] = [
      makeItem({
        id: 1,
        placeId: 1,
        place: {
          id: 1,
          name: 'Hồ Xuân Hương',
          category: 'attraction',
          subcategory: 'nature',
          isOutdoor: true,
          address: 'Đà Lạt',
          rating: 4.5,
          location: { lat: 11.94, lng: 108.45 },
        },
      }),
      makeItem({
        id: 2,
        placeId: 2,
        place: {
          id: 2,
          name: 'Lẩu Gà Lá É',
          category: 'restaurant',
          subcategory: 'hotpot',
          isOutdoor: false,
          address: 'Đà Lạt',
          rating: 4.6,
          location: { lat: 11.94, lng: 108.45 },
        },
      }),
      makeItem({
        id: 3,
        stayId: 5,
        stay: {
          id: 5,
          name: 'Pine Crest Homestay',
          stayType: 'homestay',
          address: 'Đà Lạt',
          rating: 4.8,
          pricePerNight: 650_000,
          location: { lat: 11.94, lng: 108.45 },
        },
      }),
    ];

    const result = estimateTripBudget(items, 3, 'medium');

    expect(result.activitiesTotalVnd).toBe(340_000);
    expect(result.staysTotalVnd).toBe(1_300_000);
    expect(result.grandTotalVnd).toBe(1_640_000);
    expect(result.status).toBe('aligned');
    expect(result.targetLabel).toBe('Ngân sách vừa');
  });

  it('flags over budget when per-day cost exceeds low budget ceiling', () => {
    const items: ItineraryItem[] = [
      makeItem({
        id: 1,
        stayId: 8,
        stay: {
          id: 8,
          name: 'Luxury Resort',
          stayType: 'resort',
          address: 'Đà Lạt',
          rating: 4.9,
          pricePerNight: 2_500_000,
          location: { lat: 11.94, lng: 108.45 },
        },
      }),
    ];

    const result = estimateTripBudget(items, 2, 'low');

    expect(result.status).toBe('over');
    expect(formatVnd(result.grandTotalVnd)).toContain('2.500.000');
  });
});
