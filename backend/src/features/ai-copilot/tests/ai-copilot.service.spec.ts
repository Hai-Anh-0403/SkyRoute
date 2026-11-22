import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  LlmTimeoutError,
  LlmToolClient,
} from '../../../core/integrations/llm-tool.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { AuthService } from '../../auth/auth.service';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import { FoodDiscoveryService } from '../../discovery/services/food-discovery.service';
import { PlaceResponseItem } from '../../discovery/types/discovery.types';
import { TripsService } from '../../trips/services/trips.service';
import { TripSummaryResponse } from '../../trips/types/trip.types';
import { WeatherService } from '../../weather/services/weather.service';
import { AiCopilotService } from '../services/ai-copilot.service';

function makeTrip(): TripSummaryResponse {
  return {
    id: 12,
    userId: 1,
    title: 'Đà Lạt 2N1Đ',
    destinationCity: 'Da Lat',
    startDate: '2026-12-01',
    endDate: '2026-12-02',
    totalDays: 2,
    status: 'active',
    centroidLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makePlace(
  id: number,
  overrides: Partial<PlaceResponseItem> = {},
): PlaceResponseItem {
  return {
    id,
    name: `Place #${id}`,
    city: 'Da Lat',
    category: 'attraction',
    subcategory: 'nature',
    isOutdoor: true,
    hasAc: false,
    suitableWeather: ['sunny', 'cloudy'],
    priceLevel: 2,
    rating: 4.5,
    address: 'Đà Lạt',
    description: null,
    thumbnailUrl: null,
    location: { lat: 11.94 + id * 0.001, lng: 108.45 + id * 0.001 },
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeCatalog(): PlaceResponseItem[] {
  return [
    makePlace(1, { name: 'Hồ Xuân Hương', isOutdoor: true, rating: 4.8 }),
    makePlace(2, { name: 'Đồi Chè Cầu Đất', isOutdoor: true, rating: 4.9 }),
    makePlace(3, {
      name: 'Bảo tàng Lâm Đồng',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cloudy'],
      rating: 4.6,
    }),
    makePlace(4, {
      name: 'Biệt điện Trần Lệ Xuân',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cloudy'],
      rating: 4.5,
    }),
    makePlace(5, {
      name: 'Tiệm Cà Phê Túi Mơ To (Trong nhà)',
      category: 'cafe',
      subcategory: 'coffee',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cold', 'cloudy'],
      rating: 4.7,
    }),
    makePlace(6, {
      name: 'Lẩu Gà Lá É Tao Ngộ',
      category: 'restaurant',
      subcategory: 'hotpot',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cold'],
      rating: 4.8,
    }),
    makePlace(7, {
      name: 'Bò Nướng Lạc Dương',
      category: 'restaurant',
      subcategory: 'bbq',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cold'],
      rating: 4.7,
    }),
    makePlace(8, {
      name: 'Quán Cơm Lam Gà Nướng',
      category: 'restaurant',
      subcategory: 'bbq',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cold'],
      rating: 4.5,
    }),
    makePlace(9, {
      name: 'Nhà Thờ Con Gà (Khuôn viên trong)',
      category: 'attraction',
      subcategory: 'culture',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cloudy'],
      rating: 4.6,
    }),
    makePlace(10, {
      name: 'Lẩu Bò Ba Toa Nhà Gỗ',
      category: 'restaurant',
      subcategory: 'hotpot',
      isOutdoor: false,
      suitableWeather: ['rainy', 'cold'],
      rating: 4.8,
    }),
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

describe('AiCopilotService', () => {
  let config: ConfigService;
  let tripsService: jest.Mocked<TripsService>;
  let discoveryService: jest.Mocked<DiscoveryService>;
  let foodDiscoveryService: jest.Mocked<FoodDiscoveryService>;
  let weatherService: jest.Mocked<WeatherService>;
  let llmClient: jest.Mocked<LlmToolClient>;
  let aiService: AiCopilotService;

  beforeEach(() => {
    config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'RAIN_CONFLICT_THRESHOLD_PCT' ? 60 : fallback,
      ),
    } as unknown as ConfigService;

    tripsService = {
      requireOwnedTrip: jest.fn(),
    } as unknown as jest.Mocked<TripsService>;

    const catalog = makeCatalog();
    discoveryService = {
      listPlaces: jest.fn().mockResolvedValue({
        success: true,
        data: catalog,
        meta: { page: 1, limit: 100, total: catalog.length, totalPages: 1 },
      }),
      scanRadar: jest.fn().mockResolvedValue({
        success: true,
        data: catalog,
        meta: {
          page: 1,
          limit: 12,
          total: catalog.length,
          totalPages: 1,
          anchorPoint: { lat: 11.9404, lng: 108.4583 },
          radiusKm: 5,
        },
      }),
    } as unknown as jest.Mocked<DiscoveryService>;

    foodDiscoveryService = {
      recommendFood: jest.fn().mockResolvedValue({
        success: true,
        data: catalog.filter((p) => p.category !== 'attraction'),
        meta: {
          page: 1,
          limit: 50,
          total: 4,
          totalPages: 1,
          weatherProfile: 'cold_rainy',
        },
      }),
    } as unknown as jest.Mocked<FoodDiscoveryService>;

    weatherService = {
      getForecast: jest.fn().mockResolvedValue({
        city: 'Da Lat',
        date: '2026-12-01',
        source: 'redis',
        hourly: [],
        slots: [
          {
            timeSlot: 'morning',
            temperatureC: 17,
            rainProbability: 15,
            weatherCode: 1,
            conditionTag: 'cold',
          },
          {
            timeSlot: 'lunch',
            temperatureC: 19,
            rainProbability: 20,
            weatherCode: 2,
            conditionTag: 'cloudy',
          },
          {
            timeSlot: 'afternoon',
            temperatureC: 16,
            rainProbability: 80,
            weatherCode: 63,
            conditionTag: 'rainy',
          },
          {
            timeSlot: 'dinner',
            temperatureC: 15,
            rainProbability: 70,
            weatherCode: 61,
            conditionTag: 'rainy',
          },
        ],
      }),
    } as unknown as jest.Mocked<WeatherService>;

    llmClient = {
      isConfigured: jest.fn().mockReturnValue(false),
      generateGroundedItinerary: jest.fn(),
    } as unknown as jest.Mocked<LlmToolClient>;

    aiService = new AiCopilotService(
      config,
      tripsService,
      discoveryService,
      foodDiscoveryService,
      weatherService,
      llmClient,
    );
  });

  it('enforces trip ownership and propagates AUTH_004 for non-owners', async () => {
    tripsService.requireOwnedTrip.mockRejectedValue(
      new DomainException(
        'AUTH_004',
        'User is not authorized for this resource',
        HttpStatus.FORBIDDEN,
      ),
    );

    await expectDomainError(
      aiService.generateItinerary('99', {
        tripId: 12,
        prompt: 'Đà Lạt 2N1Đ săn mây lẩu nướng',
      }),
      'AUTH_004',
      HttpStatus.FORBIDDEN,
    );
  });

  it('strips hallucinated placeIds and blocks outdoor picks on rainy (>=60%) slots', async () => {
    const catalogIds = new Set(makeCatalog().map((p) => p.id));
    tripsService.requireOwnedTrip.mockResolvedValue(makeTrip());
    llmClient.isConfigured.mockReturnValue(true);
    llmClient.generateGroundedItinerary.mockResolvedValue({
      summary: 'Đà Lạt ấm áp',
      items: [
        {
          dayNumber: 1,
          timeSlot: 'morning',
          placeId: 999999, // Hallucinated ID!
          reason: 'Quán ảo không tồn tại',
        },
        {
          dayNumber: 1,
          timeSlot: 'afternoon',
          placeId: 2, // Đồi Chè Cầu Đất (isOutdoor=true) on 80% rain slot!
          reason: 'Ngắm đồi chè chiều',
        },
        {
          dayNumber: 1,
          timeSlot: 'lunch',
          placeId: 6, // Real grounded hotpot
          reason: 'Ăn trưa lẩu gà',
        },
      ],
    });

    const result = await aiService.generateItinerary('1', {
      tripId: 12,
      prompt: 'Đà Lạt 2N1Đ thích săn mây, lẩu nướng, ngân sách vừa',
    });

    expect(result.providerMode).toBe('gemini-tools');
    expect(result.weatherWarningsAvoided).toBeGreaterThanOrEqual(1);
    expect(result.items.length).toBeGreaterThanOrEqual(6);

    for (const item of result.items) {
      expect(catalogIds.has(item.placeId)).toBe(true);
      if (item.weather.rainProbability >= 60) {
        expect(item.place.isOutdoor).toBe(false);
      }
    }
    expect(result.items.map((i) => i.placeId)).not.toContain(999999);
  });

  it('throws AI_002 (504) when the configured LLM provider times out', async () => {
    tripsService.requireOwnedTrip.mockResolvedValue(makeTrip());
    llmClient.isConfigured.mockReturnValue(true);
    llmClient.generateGroundedItinerary.mockRejectedValue(
      new LlmTimeoutError('timeout'),
    );

    await expectDomainError(
      aiService.generateItinerary('1', {
        tripId: 12,
        prompt: 'Đà Lạt 2N1Đ săn mây lẩu nướng',
      }),
      'AI_002',
      HttpStatus.GATEWAY_TIMEOUT,
    );
  });

  it('merges saved user preferences from AuthService into deterministic grounded recommendations', async () => {
    tripsService.requireOwnedTrip.mockResolvedValue(makeTrip());
    const authService = {
      getProfile: jest.fn().mockResolvedValue({
        id: '1',
        email: 'traveler@skyroute.vn',
        fullName: 'Traveler',
        avatarUrl: null,
        preferences: {
          budget: 'low',
          interests: ['museum', 'hotpot'],
          preferIndoor: true,
        },
      }),
    } as unknown as AuthService;

    const personalizedService = new AiCopilotService(
      config,
      tripsService,
      discoveryService,
      foodDiscoveryService,
      weatherService,
      llmClient,
      authService,
    );

    const res = await personalizedService.generateItinerary('1', {
      tripId: 12,
      prompt: 'Gợi ý lịch trình Đà Lạt cuối tuần',
    });

    const day1Morning = res.items.find(
      (i) => i.dayNumber === 1 && i.timeSlot === 'morning',
    );
    expect(authService.getProfile).toHaveBeenCalledWith('1');
    expect(day1Morning?.place.isOutdoor).toBe(false);
    expect(res.items.some((i) => i.place.subcategory === 'hotpot')).toBe(true);
  });
});
