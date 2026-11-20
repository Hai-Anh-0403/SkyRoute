import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { ItineraryItemRepository } from '../repositories/itinerary-item.repository';
import { TripRepository } from '../repositories/trip.repository';
import { TimelineService } from '../services/timeline.service';
import {
  ItineraryItemResponse,
  TRIP_ITEMS_CHANGED_EVENT,
  TripSummaryResponse,
} from '../types/trip.types';

function makeTrip(overrides: Partial<TripSummaryResponse> = {}): TripSummaryResponse {
  return {
    id: 12,
    userId: 1,
    title: 'Đà Lạt 3N2Đ',
    destinationCity: 'Da Lat',
    startDate: '2026-12-01',
    endDate: '2026-12-03',
    totalDays: 3,
    status: 'active',
    centroidLocation: { lat: 11.94, lng: 108.45 },
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeItem(overrides: Partial<ItineraryItemResponse> = {}): ItineraryItemResponse {
  return {
    id: 101,
    tripId: 12,
    placeId: 42,
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
      id: 42,
      name: 'Hồ Xuân Hương',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      address: 'Phường 1, TP. Đà Lạt',
      rating: 4.8,
      location: { lat: 11.9404, lng: 108.445 },
    },
    stay: null,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
    ...overrides,
  };
}

async function expectDomainError(
  promise: Promise<unknown>,
  code: string,
  status: HttpStatus,
) {
  await expect(promise).rejects.toBeInstanceOf(DomainException);
  await promise.catch((err: DomainException) => {
    expect((err.getResponse() as { code: string }).code).toBe(code);
    expect(err.getStatus()).toBe(status);
  });
}

describe('TimelineService', () => {
  let fakeManager: EntityManager;
  let dataSource: jest.Mocked<DataSource>;
  let tripRepo: jest.Mocked<TripRepository>;
  let itemRepo: jest.Mocked<ItineraryItemRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let timelineService: TimelineService;

  beforeEach(() => {
    fakeManager = {} as EntityManager;
    dataSource = {
      transaction: jest.fn(async (cb: (m: EntityManager) => unknown) =>
        cb(fakeManager),
      ),
    } as unknown as jest.Mocked<DataSource>;

    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'DETOUR_WARNING_KM' ? 8.0 : fallback,
      ),
    } as unknown as ConfigService;

    tripRepo = {
      findById: jest.fn(),
      recalculateCentroid: jest.fn(),
    } as unknown as jest.Mocked<TripRepository>;

    itemRepo = {
      findExistingIdsAndDays: jest.fn(),
      batchUpdatePositions: jest.fn(),
      recalculateDayDistances: jest.fn(),
      findByTripOrdered: jest.fn(),
    } as unknown as jest.Mocked<ItineraryItemRepository>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    timelineService = new TimelineService(
      dataSource,
      config,
      tripRepo,
      itemRepo,
      eventEmitter,
    );
  });

  it('reorders items atomically across days, recalculates detour distances & centroid, and emits event', async () => {
    tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));
    itemRepo.findExistingIdsAndDays.mockResolvedValue([
      { id: '101', dayNumber: 1 },
      { id: '103', dayNumber: 1 },
    ]);
    tripRepo.recalculateCentroid.mockResolvedValue({
      lat: 11.9438,
      lng: 108.4419,
    });

    const orderedAfter = [
      makeItem({ id: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 }),
      makeItem({
        id: 103,
        dayNumber: 2,
        timeSlot: 'afternoon',
        orderIndex: 0,
        distanceFromPrevKm: 11.8,
        isDetourWarning: true,
      }),
    ];
    itemRepo.findByTripOrdered.mockResolvedValue(orderedAfter);

    const result = await timelineService.reorderItems('1', '12', {
      items: [
        { itemId: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
        { itemId: 103, dayNumber: 2, timeSlot: 'afternoon', orderIndex: 0 },
      ],
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(itemRepo.batchUpdatePositions).toHaveBeenCalledWith(
      '12',
      [
        { itemId: '101', dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
        { itemId: '103', dayNumber: 2, timeSlot: 'afternoon', orderIndex: 0 },
      ],
      fakeManager,
    );
    expect(itemRepo.recalculateDayDistances).toHaveBeenCalledWith(
      '12',
      [1, 2],
      8.0,
      fakeManager,
    );
    expect(tripRepo.recalculateCentroid).toHaveBeenCalledWith(
      '12',
      fakeManager,
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(TRIP_ITEMS_CHANGED_EVENT, {
      tripId: '12',
      affectedDays: [1, 2],
    });
    expect(result.data.centroidLocation).toEqual({
      lat: 11.9438,
      lng: 108.4419,
    });
    expect(result.data.updatedItems[1].isDetourWarning).toBe(true);
  });

  it('throws TRIP_001 (404) if trip is missing and AUTH_004 (403) if user is not owner', async () => {
    tripRepo.findById.mockResolvedValue(null);
    await expectDomainError(
      timelineService.reorderItems('1', '99', {
        items: [{ itemId: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 }],
      }),
      'TRIP_001',
      HttpStatus.NOT_FOUND,
    );

    tripRepo.findById.mockResolvedValue(makeTrip({ userId: 2 }));
    await expectDomainError(
      timelineService.reorderItems('1', '12', {
        items: [{ itemId: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 }],
      }),
      'AUTH_004',
      HttpStatus.FORBIDDEN,
    );
  });

  it('throws TRIP_004 (400) for duplicate itemIds, invalid dayNumber, or invalid timeSlot', async () => {
    tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));

    await expectDomainError(
      timelineService.reorderItems('1', '12', {
        items: [
          { itemId: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
          { itemId: 101, dayNumber: 1, timeSlot: 'lunch', orderIndex: 0 },
        ],
      }),
      'TRIP_004',
      HttpStatus.BAD_REQUEST,
    );

    await expectDomainError(
      timelineService.reorderItems('1', '12', {
        items: [{ itemId: 101, dayNumber: 5, timeSlot: 'morning', orderIndex: 0 }],
      }),
      'TRIP_004',
      HttpStatus.BAD_REQUEST,
    );

    await expectDomainError(
      timelineService.reorderItems('1', '12', {
        items: [{ itemId: 101, dayNumber: 1, timeSlot: 'brunch', orderIndex: 0 }],
      }),
      'TRIP_004',
      HttpStatus.BAD_REQUEST,
    );
  });

  it('throws TRIP_003 (404) when any itemId does not belong to the trip', async () => {
    tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));
    itemRepo.findExistingIdsAndDays.mockResolvedValue([
      { id: '101', dayNumber: 1 },
    ]);

    await expectDomainError(
      timelineService.reorderItems('1', '12', {
        items: [
          { itemId: 101, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
          { itemId: 999, dayNumber: 1, timeSlot: 'lunch', orderIndex: 0 },
        ],
      }),
      'TRIP_003',
      HttpStatus.NOT_FOUND,
    );

    expect(itemRepo.batchUpdatePositions).not.toHaveBeenCalled();
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
