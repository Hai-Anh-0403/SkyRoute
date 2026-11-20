import { describe, expect, it } from 'vitest';
import type { ItineraryItem } from '../types/trip.types';
import {
  buildDailyRouteSegments,
  computeReorderedDayState,
} from './route.utils';

function makeItem(overrides: Partial<ItineraryItem> = {}): ItineraryItem {
  return {
    id: 1,
    tripId: 12,
    placeId: 10,
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
    place: {
      id: 10,
      name: 'Hồ Xuân Hương',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      address: 'Phường 1, Đà Lạt',
      rating: 4.8,
      location: { lat: 11.9404, lng: 108.445 },
    },
    stay: null,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('route.utils', () => {
  it('builds consecutive daily route segments ordered morning -> lunch -> afternoon -> dinner and preserves detour warnings', () => {
    const items: ItineraryItem[] = [
      makeItem({
        id: 3,
        timeSlot: 'afternoon',
        distanceFromPrevKm: 11.8,
        isDetourWarning: true,
        place: {
          id: 30,
          name: 'Đồi Chè Cầu Đất',
          category: 'attraction',
          subcategory: 'nature',
          isOutdoor: true,
          address: null,
          rating: 4.8,
          location: { lat: 11.8256, lng: 108.5621 },
        },
      }),
      makeItem({
        id: 1,
        timeSlot: 'morning',
        distanceFromPrevKm: 0,
        isDetourWarning: false,
      }),
      makeItem({
        id: 2,
        timeSlot: 'lunch',
        distanceFromPrevKm: 1.5,
        isDetourWarning: false,
        place: {
          id: 20,
          name: 'Lẩu Gà Lá É Tao Ngộ',
          category: 'restaurant',
          subcategory: 'hotpot',
          isOutdoor: false,
          address: null,
          rating: 4.6,
          location: { lat: 11.9362, lng: 108.4451 },
        },
      }),
    ];

    const segments = buildDailyRouteSegments(items, 1);

    expect(segments).toHaveLength(2);
    expect(segments[0]).toMatchObject({
      fromLabel: 'Hồ Xuân Hương',
      toLabel: 'Lẩu Gà Lá É Tao Ngộ',
      distanceKm: 1.5,
      isDetourWarning: false,
    });
    expect(segments[1]).toMatchObject({
      fromLabel: 'Lẩu Gà Lá É Tao Ngộ',
      toLabel: 'Đồi Chè Cầu Đất',
      distanceKm: 11.8,
      isDetourWarning: true,
    });
  });

  it('moves an item across slots and re-indexes orderIndex cleanly', () => {
    const items: ItineraryItem[] = [
      makeItem({ id: 101, timeSlot: 'morning', orderIndex: 0 }),
      makeItem({ id: 102, timeSlot: 'morning', orderIndex: 1 }),
      makeItem({ id: 103, timeSlot: 'afternoon', orderIndex: 0 }),
    ];

    const { nextItems, payload } = computeReorderedDayState(
      items,
      101,
      'afternoon',
      1,
      1,
    );

    const moved = nextItems.find((i) => i.id === 101);
    const remainingMorning = nextItems.find((i) => i.id === 102);

    expect(moved).toMatchObject({ timeSlot: 'afternoon', orderIndex: 1 });
    expect(remainingMorning).toMatchObject({ timeSlot: 'morning', orderIndex: 0 });
    expect(payload).toEqual([
      { itemId: 102, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
      { itemId: 103, dayNumber: 1, timeSlot: 'afternoon', orderIndex: 0 },
      { itemId: 101, dayNumber: 1, timeSlot: 'afternoon', orderIndex: 1 },
    ]);
  });
});
