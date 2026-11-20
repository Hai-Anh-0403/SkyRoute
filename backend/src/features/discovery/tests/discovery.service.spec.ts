import { HttpStatus } from '@nestjs/common';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { PlaceRepository } from '../repositories/place.repository';
import { DiscoveryService } from '../services/discovery.service';
import { FoodDiscoveryService } from '../services/food-discovery.service';
import { PlaceResponseItem } from '../types/discovery.types';

function makePlace(overrides: Partial<PlaceResponseItem> = {}): PlaceResponseItem {
  return {
    id: 42,
    name: 'Lẩu Gà Lá É Tao Ngộ',
    city: 'Da Lat',
    category: 'restaurant',
    subcategory: 'hotpot',
    isOutdoor: false,
    hasAc: false,
    suitableWeather: ['rainy', 'cold', 'cloudy'],
    priceLevel: 2,
    rating: 4.6,
    address: '5 Đường 3/4, Phường 3, TP. Đà Lạt',
    description: 'Lẩu gà lá é ấm bụng ngày mưa.',
    thumbnailUrl: null,
    location: { lat: 11.9362, lng: 108.4451 },
    distanceKm: 1.52,
    isActive: true,
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

describe('DiscoveryService & FoodDiscoveryService', () => {
  let placeRepo: jest.Mocked<PlaceRepository>;
  let discoveryService: DiscoveryService;
  let foodService: FoodDiscoveryService;

  beforeEach(() => {
    placeRepo = {
      findActiveById: jest.fn(),
      findFiltered: jest.fn(),
      findInRadar: jest.fn(),
      findFoodRecommendations: jest.fn(),
    } as unknown as jest.Mocked<PlaceRepository>;

    discoveryService = new DiscoveryService(placeRepo);
    foodService = new FoodDiscoveryService(placeRepo);
  });

  describe('DiscoveryService.scanRadar', () => {
    it('queries PostGIS radar in meters, splits comma subcategories, and returns spatial meta', async () => {
      const sample = makePlace();
      placeRepo.findInRadar.mockResolvedValue({ items: [sample], total: 1 });

      const result = await discoveryService.scanRadar({
        lat: 11.9404,
        lng: 108.4583,
        radius_km: 3,
        category: 'restaurant',
        subcategory: 'hotpot, bbq',
        is_outdoor: false,
        weather_tag: 'rainy',
        page: 1,
        limit: 10,
        sort: 'distance',
        order: 'asc',
      });

      expect(placeRepo.findInRadar).toHaveBeenCalledWith({
        lat: 11.9404,
        lng: 108.4583,
        radiusMeters: 3000,
        city: undefined,
        category: 'restaurant',
        subcategories: ['hotpot', 'bbq'],
        isOutdoor: false,
        hasAc: undefined,
        weatherTag: 'rainy',
        page: 1,
        limit: 10,
        sort: 'distance',
        order: 'asc',
      });

      expect(result).toEqual({
        success: true,
        data: [sample],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
          anchorPoint: { lat: 11.9404, lng: 108.4583 },
          radiusKm: 3,
        },
      });
    });

    it('throws DISC_002 (400) for invalid WGS84 latitude or longitude', async () => {
      await expectDomainError(
        discoveryService.scanRadar({ lat: 95, lng: 108.45, radius_km: 3 }),
        'DISC_002',
        HttpStatus.BAD_REQUEST,
      );

      await expectDomainError(
        discoveryService.scanRadar({ lat: 11.94, lng: -190, radius_km: 3 }),
        'DISC_002',
        HttpStatus.BAD_REQUEST,
      );
    });

    it('throws DISC_003 (400) when radius_km is outside 1..5 km', async () => {
      await expectDomainError(
        discoveryService.scanRadar({ lat: 11.94, lng: 108.45, radius_km: 0.5 }),
        'DISC_003',
        HttpStatus.BAD_REQUEST,
      );

      await expectDomainError(
        discoveryService.scanRadar({ lat: 11.94, lng: 108.45, radius_km: 6 }),
        'DISC_003',
        HttpStatus.BAD_REQUEST,
      );
    });
  });

  describe('DiscoveryService.listPlaces', () => {
    it('passes multi-layer filters and returns pagination meta', async () => {
      const museum = makePlace({
        id: 88,
        name: 'Bảo tàng Lâm Đồng',
        category: 'attraction',
        subcategory: 'museum',
        isOutdoor: false,
      });
      placeRepo.findFiltered.mockResolvedValue({ items: [museum], total: 25 });

      const result = await discoveryService.listPlaces({
        city: 'Da Lat',
        category: 'attraction',
        is_outdoor: false,
        weather_tag: 'rainy',
        page: 2,
        limit: 10,
        sort: 'rating',
        order: 'desc',
      });

      expect(placeRepo.findFiltered).toHaveBeenCalledWith({
        city: 'Da Lat',
        category: 'attraction',
        subcategories: undefined,
        isOutdoor: false,
        hasAc: undefined,
        weatherTag: 'rainy',
        page: 2,
        limit: 10,
        sort: 'rating',
        order: 'desc',
      });
      expect(result.meta).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });
  });

  describe('DiscoveryService.getPlaceById', () => {
    it('throws DISC_001 (404) when place is not found', async () => {
      placeRepo.findActiveById.mockResolvedValue(null);

      await expectDomainError(
        discoveryService.getPlaceById('999'),
        'DISC_001',
        HttpStatus.NOT_FOUND,
      );
    });
  });

  describe('FoodDiscoveryService.recommendFood', () => {
    it('prioritizes indoor hotpot/bbq/noodles when rainy or cold', async () => {
      placeRepo.findFoodRecommendations.mockResolvedValue({
        items: [makePlace()],
        total: 1,
      });

      const result = await foodService.recommendFood({
        city: 'Da Lat',
        temperature_c: 16,
        rain_probability: 75,
      });

      expect(placeRepo.findFoodRecommendations).toHaveBeenCalledWith({
        city: 'Da Lat',
        lat: undefined,
        lng: undefined,
        preferIndoor: true,
        preferHasAc: undefined,
        preferredSubcategories: ['hotpot', 'bbq', 'noodles'],
        weatherTag: 'rainy',
        page: 1,
        limit: 12,
      });
      expect(result.meta.weatherProfile).toBe('cold_rainy');
    });

    it('prioritizes AC refreshment & light meals when hot and sunny', async () => {
      placeRepo.findFoodRecommendations.mockResolvedValue({
        items: [makePlace({ subcategory: 'refreshment', hasAc: true })],
        total: 1,
      });

      const result = await foodService.recommendFood({
        city: 'Da Lat',
        temperature_c: 36,
        rain_probability: 10,
      });

      expect(placeRepo.findFoodRecommendations).toHaveBeenCalledWith({
        city: 'Da Lat',
        lat: undefined,
        lng: undefined,
        preferIndoor: undefined,
        preferHasAc: true,
        preferredSubcategories: ['refreshment', 'noodles'],
        weatherTag: 'hot',
        page: 1,
        limit: 12,
      });
      expect(result.meta.weatherProfile).toBe('hot_sunny');
    });

    it('throws DISC_002 (400) for partial or invalid coordinates', async () => {
      await expectDomainError(
        foodService.recommendFood({ lat: 11.94, lng: undefined }),
        'DISC_002',
        HttpStatus.BAD_REQUEST,
      );

      await expectDomainError(
        foodService.recommendFood({ lat: 120, lng: 108.45 }),
        'DISC_002',
        HttpStatus.BAD_REQUEST,
      );
    });
  });
});
