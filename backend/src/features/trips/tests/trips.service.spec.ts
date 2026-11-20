import { ExecutionContext, HttpStatus } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import { TripOwnerGuard } from '../guards/trip-owner.guard';
import { ItineraryItemRepository } from '../repositories/itinerary-item.repository';
import { TripRepository } from '../repositories/trip.repository';
import { TripsService } from '../services/trips.service';
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
    centroidLocation: null,
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
    timeSlot: 'lunch',
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
      name: 'Lẩu Gà Lá É Tao Ngộ',
      category: 'restaurant',
      subcategory: 'hotpot',
      isOutdoor: false,
      address: '5 Đường 3/4, TP. Đà Lạt',
      rating: 4.6,
      location: { lat: 11.9362, lng: 108.4451 },
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

describe('TripsService & TripOwnerGuard', () => {
  let tripRepo: jest.Mocked<TripRepository>;
  let itemRepo: jest.Mocked<ItineraryItemRepository>;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let tripsService: TripsService;
  let ownerGuard: TripOwnerGuard;

  beforeEach(() => {
    tripRepo = {
      findOwnerById: jest.fn(),
      findById: jest.fn(),
      findByUserPaginated: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
      recalculateCentroid: jest.fn(),
    } as unknown as jest.Mocked<TripRepository>;

    itemRepo = {
      findByTripOrdered: jest.fn(),
      findByIdInTrip: jest.fn(),
      getNextOrderIndex: jest.fn(),
      existsActiveStay: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      deleteById: jest.fn(),
    } as unknown as jest.Mocked<ItineraryItemRepository>;

    discoveryService = {
      getPlaceById: jest.fn(),
    } as unknown as jest.Mocked<DiscoveryService>;

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    tripsService = new TripsService(
      tripRepo,
      itemRepo,
      discoveryService,
      eventEmitter,
    );
    ownerGuard = new TripOwnerGuard(tripRepo);
  });

  describe('createTrip', () => {
    it('creates a valid multi-day trip', async () => {
      const sample = makeTrip();
      tripRepo.create.mockResolvedValue(sample);

      const res = await tripsService.createTrip('1', {
        title: 'Đà Lạt 3N2Đ',
        destinationCity: 'Da Lat',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      });

      expect(tripRepo.create).toHaveBeenCalledWith({
        userId: '1',
        title: 'Đà Lạt 3N2Đ',
        destinationCity: 'Da Lat',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      });
      expect(res.totalDays).toBe(3);
    });

    it('throws TRIP_002 (400) when endDate is before startDate', async () => {
      await expectDomainError(
        tripsService.createTrip('1', {
          title: 'Invalid trip',
          destinationCity: 'Da Lat',
          startDate: '2026-12-05',
          endDate: '2026-12-01',
        }),
        'TRIP_002',
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('getTripDetail', () => {
    it('throws TRIP_001 (404) when trip does not exist', async () => {
      tripRepo.findById.mockResolvedValue(null);

      await expectDomainError(
        tripsService.getTripDetail('1', '999'),
        'TRIP_001',
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws AUTH_004 (403) when accessed by non-owner', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip({ userId: 2 }));

      await expectDomainError(
        tripsService.getTripDetail('1', '12'),
        'AUTH_004',
        HttpStatus.FORBIDDEN,
      );
    });

    it('returns trip metadata and ordered items for owner', async () => {
      const trip = makeTrip({ userId: 1 });
      const items = [makeItem()];
      tripRepo.findById.mockResolvedValue(trip);
      itemRepo.findByTripOrdered.mockResolvedValue(items);

      const result = await tripsService.getTripDetail('1', '12');

      expect(result.items).toEqual(items);
      expect(itemRepo.findByTripOrdered).toHaveBeenCalledWith('12');
    });
  });

  describe('addItem', () => {
    it('throws TRIP_004 (400) when both placeId and stayId are provided or both omitted', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());

      await expectDomainError(
        tripsService.addItem('1', '12', {
          placeId: 42,
          stayId: 15,
          dayNumber: 1,
          timeSlot: 'morning',
        }),
        'TRIP_004',
        HttpStatus.BAD_REQUEST,
      );

      await expectDomainError(
        tripsService.addItem('1', '12', {
          dayNumber: 1,
          timeSlot: 'morning',
        }),
        'TRIP_004',
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws TRIP_004 (400) for out-of-range dayNumber or invalid timeSlot', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));

      await expectDomainError(
        tripsService.addItem('1', '12', {
          placeId: 42,
          dayNumber: 4,
          timeSlot: 'morning',
        }),
        'TRIP_004',
        HttpStatus.BAD_REQUEST,
      );

      await expectDomainError(
        tripsService.addItem('1', '12', {
          placeId: 42,
          dayNumber: 1,
          timeSlot: 'midnight',
        }),
        'TRIP_004',
        HttpStatus.BAD_REQUEST,
      );
    });

    it('adds a place item, recalculates centroid, and emits trip.items.changed', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));
      itemRepo.getNextOrderIndex.mockResolvedValue(0);
      itemRepo.create.mockResolvedValue(makeItem());
      tripRepo.recalculateCentroid.mockResolvedValue({
        lat: 11.9362,
        lng: 108.4451,
      });

      const res = await tripsService.addItem('1', '12', {
        placeId: 42,
        dayNumber: 1,
        timeSlot: 'lunch',
        note: 'Lẩu gà lá é',
      });

      expect(discoveryService.getPlaceById).toHaveBeenCalledWith('42');
      expect(tripRepo.recalculateCentroid).toHaveBeenCalledWith('12');
      expect(eventEmitter.emit).toHaveBeenCalledWith(TRIP_ITEMS_CHANGED_EVENT, {
        tripId: '12',
        affectedDays: [1],
      });
      expect(res.centroidLocation).toEqual({ lat: 11.9362, lng: 108.4451 });
    });

    it('throws STAY_001 (404) when referenced stay does not exist', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip({ totalDays: 3 }));
      itemRepo.existsActiveStay.mockResolvedValue(false);

      await expectDomainError(
        tripsService.addItem('1', '12', {
          stayId: 999,
          dayNumber: 1,
          timeSlot: 'dinner',
        }),
        'STAY_001',
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('deleteItem', () => {
    it('throws TRIP_003 (404) when item does not belong to trip', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByIdInTrip.mockResolvedValue(null);

      await expectDomainError(
        tripsService.deleteItem('1', '12', '888'),
        'TRIP_003',
        HttpStatus.NOT_FOUND,
      );
    });

    it('deletes item, recalculates centroid, and emits event', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByIdInTrip.mockResolvedValue(makeItem({ dayNumber: 2 }));

      await tripsService.deleteItem('1', '12', '101');

      expect(itemRepo.deleteById).toHaveBeenCalledWith('12', '101');
      expect(tripRepo.recalculateCentroid).toHaveBeenCalledWith('12');
      expect(eventEmitter.emit).toHaveBeenCalledWith(TRIP_ITEMS_CHANGED_EVENT, {
        tripId: '12',
        affectedDays: [2],
      });
    });
  });

  describe('TripOwnerGuard', () => {
    function makeCtx(params: Record<string, string>, userId?: string): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({
            params,
            user: userId ? { userId, email: 'a@b.com' } : undefined,
          }),
        }),
      } as unknown as ExecutionContext;
    }

    it('throws TRIP_001 (404) when trip does not exist', async () => {
      tripRepo.findOwnerById.mockResolvedValue(null);
      await expectDomainError(
        ownerGuard.canActivate(makeCtx({ id: '99' }, '1')),
        'TRIP_001',
        HttpStatus.NOT_FOUND,
      );
    });

    it('throws AUTH_004 (403) when user does not own the trip', async () => {
      tripRepo.findOwnerById.mockResolvedValue({ id: '12', userId: '2' });
      await expectDomainError(
        ownerGuard.canActivate(makeCtx({ id: '12' }, '1')),
        'AUTH_004',
        HttpStatus.FORBIDDEN,
      );
    });

    it('returns true when authenticated user owns the trip', async () => {
      tripRepo.findOwnerById.mockResolvedValue({ id: '12', userId: '1' });
      await expect(ownerGuard.canActivate(makeCtx({ id: '12' }, '1'))).resolves.toBe(
        true,
      );
    });
  });
});
