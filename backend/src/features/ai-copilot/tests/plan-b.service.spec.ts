import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { LlmToolClient } from '../../../core/integrations/llm-tool.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import { PlaceResponseItem } from '../../discovery/types/discovery.types';
import { ItineraryItemRepository } from '../../trips/repositories/itinerary-item.repository';
import { TripRepository } from '../../trips/repositories/trip.repository';
import { TimelineService } from '../../trips/services/timeline.service';
import {
  ItineraryItemResponse,
  TRIP_ITEMS_CHANGED_EVENT,
  TripSummaryResponse,
} from '../../trips/types/trip.types';
import { PlanBSwapRepository } from '../repositories/plan-b-swap.repository';
import { ContextualRankingService } from '../services/contextual-ranking.service';
import { PlanBService } from '../services/plan-b.service';

function makeTrip(): TripSummaryResponse {
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

function makePlace(
  overrides: Partial<PlaceResponseItem> = {},
): PlaceResponseItem {
  return {
    id: 88,
    name: 'Bảo tàng Lâm Đồng',
    city: 'Da Lat',
    category: 'attraction',
    subcategory: 'museum',
    isOutdoor: false,
    hasAc: true,
    suitableWeather: ['rainy', 'cloudy'],
    priceLevel: 1,
    rating: 4.6,
    address: '4 Hùng Vương',
    description: null,
    thumbnailUrl: null,
    location: { lat: 11.9418, lng: 108.4589 },
    distanceKm: 1.2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeItems(): ItineraryItemResponse[] {
  return [
    {
      id: 102,
      tripId: 12,
      placeId: 42,
      stayId: null,
      dayNumber: 1,
      timeSlot: 'lunch',
      orderIndex: 0,
      distanceFromPrevKm: 0,
      isDetourWarning: false,
      weatherCondition: 'rainy',
      temperatureC: 17,
      rainProbability: 70,
      weatherAlertFlag: false,
      note: null,
      place: {
        id: 42,
        name: 'Lẩu Gà Lá É Tao Ngộ',
        category: 'restaurant',
        subcategory: 'hotpot',
        isOutdoor: false,
        address: '5 Đường 3/4',
        rating: 4.6,
        location: { lat: 11.9404, lng: 108.4583 },
      },
      stay: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: 103,
      tripId: 12,
      placeId: 3,
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
        id: 3,
        name: 'Đồi Chè Cầu Đất',
        category: 'attraction',
        subcategory: 'nature',
        isOutdoor: true,
        address: 'Trạm Hành',
        rating: 4.8,
        location: { lat: 11.8256, lng: 108.5621 },
      },
      stay: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ];
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

describe('PlanBService & ContextualRankingService', () => {
  let fakeManager: EntityManager;
  let dataSource: jest.Mocked<DataSource>;
  let tripRepo: jest.Mocked<TripRepository>;
  let itemRepo: jest.Mocked<ItineraryItemRepository>;
  let timelineService: jest.Mocked<TimelineService>;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let swapRepo: jest.Mocked<PlanBSwapRepository>;
  let llmClient: jest.Mocked<LlmToolClient>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let rankingService: ContextualRankingService;
  let planBService: PlanBService;

  beforeEach(() => {
    fakeManager = {} as EntityManager;
    dataSource = {
      transaction: jest.fn(async (cb: (m: EntityManager) => unknown) =>
        cb(fakeManager),
      ),
    } as unknown as jest.Mocked<DataSource>;

    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'PLAN_B_RADIUS_METERS' ? 3000 : fallback,
      ),
    } as unknown as ConfigService;

    tripRepo = { findById: jest.fn() } as unknown as jest.Mocked<TripRepository>;
    itemRepo = {
      findByTripOrdered: jest.fn(),
      findByIdInTrip: jest.fn(),
      swapPlaceInTransaction: jest.fn(),
    } as unknown as jest.Mocked<ItineraryItemRepository>;

    timelineService = {
      recalculateTripSpatialState: jest.fn(),
    } as unknown as jest.Mocked<TimelineService>;

    discoveryService = {
      findIndoorWithinRadius: jest.fn(),
      getPlaceById: jest.fn(),
    } as unknown as jest.Mocked<DiscoveryService>;

    swapRepo = { createAudit: jest.fn() } as unknown as jest.Mocked<PlanBSwapRepository>;
    llmClient = { generatePlanBReasons: jest.fn() } as unknown as jest.Mocked<LlmToolClient>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    rankingService = new ContextualRankingService();
    planBService = new PlanBService(
      dataSource,
      config,
      tripRepo,
      itemRepo,
      timelineService,
      discoveryService,
      rankingService,
      swapRepo,
      llmClient,
      eventEmitter,
    );
  });

  describe('ContextualRankingService', () => {
    it('ranks closer, higher-rated rainy indoor places higher', () => {
      const closeMuseum = makePlace({ id: 88, distanceKm: 0.8, rating: 4.8 });
      const farCafe = makePlace({
        id: 95,
        category: 'cafe',
        distanceKm: 2.8,
        rating: 4.2,
      });

      const ranked = rankingService.rankIndoorCandidates(
        [farCafe, closeMuseum],
        'attraction',
        3,
      );

      expect(ranked[0].place.id).toBe(88);
      expect(ranked[0].contextualScore).toBeGreaterThan(ranked[1].contextualScore);
    });
  });

  describe('getPlanBCandidates', () => {
    it('excludes already scheduled day items and returns top 3 grounded candidates', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByTripOrdered.mockResolvedValue(makeItems());
      discoveryService.findIndoorWithinRadius.mockResolvedValue([
        makePlace({ id: 42, name: 'Already Scheduled Hotpot' }),
        makePlace({ id: 88, name: 'Bảo tàng Lâm Đồng', distanceKm: 1.2 }),
        makePlace({ id: 91, name: 'Biệt điện Trần Lệ Xuân', distanceKm: 2.1 }),
      ]);
      llmClient.generatePlanBReasons.mockResolvedValue({
        88: 'Bảo tàng trong nhà cách điểm ăn trưa 1.2 km, tránh mưa hiệu quả.',
      });

      const res = await planBService.getPlanBCandidates('1', '12', '103');

      expect(discoveryService.findIndoorWithinRadius).toHaveBeenCalledWith(
        { lat: 11.9404, lng: 108.4583 },
        3000,
        15,
      );
      expect(res.candidates).toHaveLength(2);
      expect(res.candidates.map((c) => c.placeId)).not.toContain(42);
      expect(res.candidates[0].aiReason).toContain('Bảo tàng trong nhà');
    });

    it('throws AI_001 (422) when no eligible indoor candidate exists within 3km', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByTripOrdered.mockResolvedValue(makeItems());
      discoveryService.findIndoorWithinRadius.mockResolvedValue([]);

      await expectDomainError(
        planBService.getPlanBCandidates('1', '12', '103'),
        'AI_001',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    });
  });

  describe('swapPlanB', () => {
    it('rejects outdoor replacement places with AI_001 (422)', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByTripOrdered.mockResolvedValue(makeItems());
      discoveryService.getPlaceById.mockResolvedValue(
        makePlace({ id: 99, isOutdoor: true }),
      );

      await expectDomainError(
        planBService.swapPlanB('1', '12', '103', { replacementPlaceId: 99 }),
        'AI_001',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
      expect(dataSource.transaction).not.toHaveBeenCalled();
    });

    it('atomically swaps place, recalculates spatial state, inserts plan_b_swaps audit, and emits event', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByTripOrdered.mockResolvedValue(makeItems());
      discoveryService.getPlaceById.mockResolvedValue(
        makePlace({ id: 88, isOutdoor: false, location: { lat: 11.9418, lng: 108.4589 } }),
      );
      timelineService.recalculateTripSpatialState.mockResolvedValue({
        lat: 11.9412,
        lng: 108.451,
      });

      const swappedItem = {
        ...makeItems()[1],
        placeId: 88,
        distanceFromPrevKm: 1.2,
        isDetourWarning: false,
        weatherAlertFlag: false,
      };
      itemRepo.findByIdInTrip.mockResolvedValue(swappedItem);

      const res = await planBService.swapPlanB('1', '12', '103', {
        replacementPlaceId: 88,
        note: 'Swapped due to rain',
      });

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(itemRepo.swapPlaceInTransaction).toHaveBeenCalledWith(
        '12',
        '103',
        '88',
        'Swapped due to rain',
        fakeManager,
      );
      expect(timelineService.recalculateTripSpatialState).toHaveBeenCalledWith(
        '12',
        [1],
        fakeManager,
      );
      expect(swapRepo.createAudit).toHaveBeenCalledWith(
        {
          tripId: '12',
          itineraryItemId: '103',
          originalPlaceId: '3',
          replacementPlaceId: '88',
          rainProbabilityAtSwap: 75,
          distanceFromPrevKm: 1.2,
        },
        fakeManager,
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(TRIP_ITEMS_CHANGED_EVENT, {
        tripId: '12',
        affectedDays: [1],
      });
      expect(res.data.newCentroidLocation).toEqual({
        lat: 11.9412,
        lng: 108.451,
      });
    });
  });
});
