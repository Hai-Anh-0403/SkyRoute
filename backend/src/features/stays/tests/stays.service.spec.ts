import { HttpStatus } from '@nestjs/common';
import { RedisService } from '../../../core/cache/redis.service';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { TripsService } from '../../trips/services/trips.service';
import { TripSummaryResponse } from '../../trips/types/trip.types';
import { StayRepository } from '../repositories/stay.repository';
import {
  buildTripCentroidCacheKey,
  computeGeometricCentroid,
  StaysService,
} from '../services/stays.service';
import { RecommendedStayItem } from '../types/stay.types';

function makeTripSummary(): TripSummaryResponse {
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
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeRecommendedStay(
  overrides: Partial<RecommendedStayItem> = {},
): RecommendedStayItem {
  return {
    id: 7,
    name: 'Ana Mandara Villas Dalat',
    stayType: 'resort',
    pricePerNight: 1800000,
    rating: 4.8,
    address: 'Lê Lai, Phường 5, Đà Lạt',
    thumbnailUrl: null,
    location: { lat: 11.9388, lng: 108.4265 },
    distanceToCentroidKm: 0.45,
    avgDistanceToItineraryPlacesKm: 1.92,
    amenities: ['wifi', 'heater', 'breakfast'],
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

describe('StaysService', () => {
  let stayRepo: jest.Mocked<StayRepository>;
  let tripsService: jest.Mocked<TripsService>;
  let redis: jest.Mocked<RedisService>;
  let staysService: StaysService;

  beforeEach(() => {
    stayRepo = {
      findActiveById: jest.fn(),
      findFiltered: jest.fn(),
      findNearestToCentroid: jest.fn(),
      createStay: jest.fn(),
      updateStay: jest.fn(),
      softDeleteStay: jest.fn(),
    } as unknown as jest.Mocked<StayRepository>;

    tripsService = {
      requireOwnedTrip: jest.fn(),
      getTripPlaceCentroidStats: jest.fn(),
    } as unknown as jest.Mocked<TripsService>;

    redis = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    staysService = new StaysService(stayRepo, tripsService, redis);
  });

  describe('computeGeometricCentroid', () => {
    it('returns arithmetic mean (x_bar, y_bar) matching ST_Centroid for points', () => {
      const points = [
        { lat: 11.9404, lng: 108.445 },
        { lat: 11.952, lng: 108.441 },
        { lat: 11.928, lng: 108.464 },
      ];

      const centroid = computeGeometricCentroid(points);

      expect(centroid).toEqual({
        lat: Number(((11.9404 + 11.952 + 11.928) / 3).toFixed(6)),
        lng: Number(((108.445 + 108.441 + 108.464) / 3).toFixed(6)),
      });
    });

    it('returns null for an empty array', () => {
      expect(computeGeometricCentroid([])).toBeNull();
    });
  });

  describe('findNearestToTripCentroid', () => {
    it('throws STAY_002 (422) when trip has 0 selected itinerary places', async () => {
      tripsService.requireOwnedTrip.mockResolvedValue(makeTripSummary());
      redis.getJson.mockResolvedValue(null);
      tripsService.getTripPlaceCentroidStats.mockResolvedValue({
        tripId: 12,
        destinationCity: 'Da Lat',
        centroidLocation: null,
        totalItineraryPlaces: 0,
        placeLocations: [],
      });

      await expectDomainError(
        staysService.findNearestToTripCentroid('1', '12'),
        'STAY_002',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(stayRepo.findNearestToCentroid).not.toHaveBeenCalled();
    });

    it('queries KNN stays around DB centroid, caches centroid in Redis, and serves cached centroid on subsequent call', async () => {
      const points = [
        { lat: 11.94, lng: 108.44 },
        { lat: 11.96, lng: 108.46 },
      ];
      const expectedCentroid = { lat: 11.95, lng: 108.45 };

      tripsService.requireOwnedTrip.mockResolvedValue(makeTripSummary());
      redis.getJson.mockResolvedValueOnce(null);
      tripsService.getTripPlaceCentroidStats.mockResolvedValue({
        tripId: 12,
        destinationCity: 'Da Lat',
        centroidLocation: expectedCentroid,
        totalItineraryPlaces: 2,
        placeLocations: points,
      });
      stayRepo.findNearestToCentroid.mockResolvedValue([
        makeRecommendedStay({ id: 7, distanceToCentroidKm: 0.45 }),
        makeRecommendedStay({
          id: 9,
          name: 'Dalat Wonder Resort',
          distanceToCentroidKm: 1.85,
        }),
      ]);

      const first = await staysService.findNearestToTripCentroid('1', '12', {
        stay_type: 'resort',
        limit: 5,
      });

      expect(first.tripId).toBe(12);
      expect(first.centroidLocation).toEqual(expectedCentroid);
      expect(first.totalItineraryPlaces).toBe(2);
      expect(first.recommendedStays).toHaveLength(2);
      expect(redis.setJson).toHaveBeenCalledWith(
        buildTripCentroidCacheKey('12'),
        expect.objectContaining({
          lat: 11.95,
          lng: 108.45,
          totalItineraryPlaces: 2,
          destinationCity: 'Da Lat',
        }),
        3600,
      );
      expect(stayRepo.findNearestToCentroid).toHaveBeenCalledWith({
        centroid: expectedCentroid,
        placeLocations: points,
        city: 'Da Lat',
        stayType: 'resort',
        minPrice: undefined,
        maxPrice: undefined,
        limit: 5,
      });

      redis.getJson.mockResolvedValueOnce({
        lat: 11.95,
        lng: 108.45,
        totalItineraryPlaces: 2,
        destinationCity: 'Da Lat',
        placeLocations: points,
        updatedAt: new Date().toISOString(),
      });

      await staysService.findNearestToTripCentroid('1', '12');
      expect(tripsService.getTripPlaceCentroidStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('getStayById & cache invalidation', () => {
    it('throws STAY_001 (404) when stay is not found', async () => {
      stayRepo.findActiveById.mockResolvedValue(null);

      await expectDomainError(
        staysService.getStayById('999'),
        'STAY_001',
        HttpStatus.NOT_FOUND,
      );
    });

    it('deletes trip centroid cache key on trip.items.changed event', async () => {
      await staysService.onTripItemsChanged({ tripId: '12', affectedDays: [1] });
      expect(redis.del).toHaveBeenCalledWith('trip:centroid:12');
    });
  });

  describe('StaysService Admin Catalog', () => {
    it('creates a stay with defaults and validated coordinates', async () => {
      stayRepo.createStay.mockResolvedValue({
        id: 88,
        name: 'Dalat Boutique',
        city: 'Da Lat',
        stayType: 'homestay',
        pricePerNight: 650000,
        rating: 4.0,
        address: null,
        thumbnailUrl: null,
        location: { lat: 11.94, lng: 108.45 },
        amenities: ['wifi'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await staysService.createStay({
        name: ' Dalat Boutique ',
        city: ' Da Lat ',
        stayType: 'homestay',
        pricePerNight: 650000,
        amenities: ['wifi'],
        location: { lat: 11.94, lng: 108.45 },
      });

      expect(created.id).toBe(88);
      expect(stayRepo.createStay).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Dalat Boutique',
          city: 'Da Lat',
          amenities: ['wifi'],
        }),
      );
    });

    it('throws DISC_002 on invalid coordinates and STAY_001 on missing update/delete target', async () => {
      await expectDomainError(
        staysService.createStay({
          name: 'Bad Stay',
          city: 'Da Lat',
          stayType: 'hotel',
          pricePerNight: 500000,
          location: { lat: 11.94, lng: 200 },
        }),
        'DISC_002',
        HttpStatus.BAD_REQUEST,
      );

      stayRepo.updateStay.mockResolvedValue(null);
      await expectDomainError(
        staysService.updateStay('999', { name: 'Renamed' }),
        'STAY_001',
        HttpStatus.NOT_FOUND,
      );

      stayRepo.softDeleteStay.mockResolvedValue(false);
      await expectDomainError(
        staysService.softDeleteStay('999'),
        'STAY_001',
        HttpStatus.NOT_FOUND,
      );
    });

    it('soft-deletes an active stay and returns isActive=false', async () => {
      stayRepo.softDeleteStay.mockResolvedValue(true);

      const res = await staysService.softDeleteStay('88');
      expect(res).toEqual({ id: 88, isActive: false });
    });
  });
});
