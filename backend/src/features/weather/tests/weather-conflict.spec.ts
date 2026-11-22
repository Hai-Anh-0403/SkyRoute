import { ConfigService } from '@nestjs/config';
import { ItineraryItemRepository } from '../../trips/repositories/itinerary-item.repository';
import { TripRepository } from '../../trips/repositories/trip.repository';
import {
  ItineraryItemResponse,
  TripSummaryResponse,
} from '../../trips/types/trip.types';
import {
  isWeatherConflict,
  WeatherConflictService,
} from '../services/weather-conflict.service';
import { WeatherService } from '../services/weather.service';

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
    centroidLocation: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

function makeItem(
  overrides: Partial<ItineraryItemResponse> = {},
): ItineraryItemResponse {
  return {
    id: 103,
    tripId: 12,
    placeId: 3,
    stayId: null,
    dayNumber: 1,
    timeSlot: 'afternoon',
    orderIndex: 0,
    distanceFromPrevKm: 2.0,
    isDetourWarning: false,
    weatherCondition: null,
    temperatureC: null,
    rainProbability: null,
    weatherAlertFlag: false,
    note: null,
    place: {
      id: 3,
      name: 'Đồi Chè Cầu Đất',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      address: 'Trạm Hành, Đà Lạt',
      rating: 4.8,
      location: { lat: 11.8256, lng: 108.5621 },
    },
    stay: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe('WeatherConflictService', () => {
  let weatherService: jest.Mocked<WeatherService>;
  let tripRepo: jest.Mocked<TripRepository>;
  let itemRepo: jest.Mocked<ItineraryItemRepository>;
  let service: WeatherConflictService;

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'RAIN_CONFLICT_THRESHOLD_PCT' ? 60 : fallback,
      ),
    } as unknown as ConfigService;

    weatherService = {
      getForecast: jest.fn(),
    } as unknown as jest.Mocked<WeatherService>;

    tripRepo = {
      findById: jest.fn(),
      findOwnerById: jest.fn(),
    } as unknown as jest.Mocked<TripRepository>;

    itemRepo = {
      findByTripOrdered: jest.fn(),
      updateWeatherBatch: jest.fn(),
    } as unknown as jest.Mocked<ItineraryItemRepository>;

    service = new WeatherConflictService(
      config,
      weatherService,
      tripRepo,
      itemRepo,
    );
  });

  describe('isWeatherConflict boundary rules', () => {
    it('flags outdoor activity only when rain probability >= 60%', () => {
      expect(isWeatherConflict(true, 59, 60)).toBe(false);
      expect(isWeatherConflict(true, 60, 60)).toBe(true);
      expect(isWeatherConflict(false, 95, 60)).toBe(false);
    });
  });

  describe('syncTripWeather', () => {
    it('flags outdoor rainy items while keeping indoor & stay items clear', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      const outdoorRainItem = makeItem({ id: 103, timeSlot: 'afternoon' });
      const indoorRainItem = makeItem({
        id: 104,
        timeSlot: 'afternoon',
        placeId: 88,
        place: {
          id: 88,
          name: 'Bảo tàng Lâm Đồng',
          category: 'attraction',
          subcategory: 'museum',
          isOutdoor: false,
          address: '4 Hùng Vương',
          rating: 4.6,
          location: { lat: 11.9418, lng: 108.4589 },
        },
      });
      const stayItem = makeItem({
        id: 105,
        timeSlot: 'afternoon',
        placeId: null,
        stayId: 15,
        place: null,
        stay: {
          id: 15,
          name: 'The Kupid Homestay',
          stayType: 'homestay',
          address: '47 Đặng Thái Thân',
          rating: 4.8,
          pricePerNight: 650000,
          location: { lat: 11.9395, lng: 108.4528 },
        },
      });

      itemRepo.findByTripOrdered.mockResolvedValue([
        outdoorRainItem,
        indoorRainItem,
        stayItem,
      ]);

      weatherService.getForecast.mockResolvedValue({
        city: 'Da Lat',
        date: '2026-12-01',
        source: 'open-meteo',
        hourly: [],
        slots: [
          {
            timeSlot: 'afternoon',
            temperatureC: 16.5,
            rainProbability: 75,
            weatherCode: 63,
            conditionTag: 'rainy',
          },
        ],
      });

      const res = await service.syncTripWeather('1', '12');

      expect(res.conflictCount).toBe(1);
      expect(itemRepo.updateWeatherBatch).toHaveBeenCalledWith([
        {
          id: '103',
          weatherCondition: 'rainy',
          temperatureC: 16.5,
          rainProbability: 75,
          weatherAlertFlag: true,
        },
        {
          id: '104',
          weatherCondition: 'rainy',
          temperatureC: 16.5,
          rainProbability: 75,
          weatherAlertFlag: false,
        },
        {
          id: '105',
          weatherCondition: 'rainy',
          temperatureC: 16.5,
          rainProbability: 75,
          weatherAlertFlag: false,
        },
      ]);
    });

    it('supports simulateRain override for live demo testing', async () => {
      tripRepo.findById.mockResolvedValue(makeTrip());
      itemRepo.findByTripOrdered.mockResolvedValue([
        makeItem({ id: 103, dayNumber: 1, timeSlot: 'afternoon' }),
      ]);
      weatherService.getForecast.mockResolvedValue({
        city: 'Da Lat',
        date: '2026-12-01',
        source: 'open-meteo',
        hourly: [],
        slots: [
          {
            timeSlot: 'afternoon',
            temperatureC: 23.0,
            rainProbability: 10,
            weatherCode: 0,
            conditionTag: 'sunny',
          },
        ],
      });

      const res = await service.syncTripWeather('1', '12', {
        simulateRain: {
          dayNumber: 1,
          timeSlot: 'afternoon',
          rainProbability: 80,
        },
      });

      expect(res.conflictCount).toBe(1);
      expect(itemRepo.updateWeatherBatch).toHaveBeenCalledWith([
        {
          id: '103',
          weatherCondition: 'rainy',
          temperatureC: 23.0,
          rainProbability: 80,
          weatherAlertFlag: true,
        },
      ]);
    });
  });
});
