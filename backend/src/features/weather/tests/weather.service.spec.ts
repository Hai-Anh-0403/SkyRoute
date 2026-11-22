import { HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../core/cache/redis.service';
import { OpenMeteoClient } from '../../../core/integrations/open-meteo.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import {
  aggregateHourlyToSlots,
  HourlyWeatherPoint,
} from '../../../shared/utils/time-slot.util';
import { WeatherSnapshot } from '../entities/weather-snapshot.entity';
import { WeatherSnapshotRepository } from '../repositories/weather-snapshot.repository';
import { WeatherService } from '../services/weather.service';
import { WeatherForecastResponse } from '../types/weather.types';

function makeHourlySample(): HourlyWeatherPoint[] {
  return [
    { hour: 8, time: '2026-12-01T08:00', temperatureC: 18, rainProbability: 10, weatherCode: 1 },
    { hour: 9, time: '2026-12-01T09:00', temperatureC: 19, rainProbability: 15, weatherCode: 2 },
    { hour: 10, time: '2026-12-01T10:00', temperatureC: 21, rainProbability: 20, weatherCode: 2 },
    { hour: 11, time: '2026-12-01T11:00', temperatureC: 22, rainProbability: 25, weatherCode: 2 },
    { hour: 12, time: '2026-12-01T12:00', temperatureC: 23, rainProbability: 20, weatherCode: 2 },
    { hour: 13, time: '2026-12-01T13:00', temperatureC: 20, rainProbability: 45, weatherCode: 3 },
    { hour: 14, time: '2026-12-01T14:00', temperatureC: 17, rainProbability: 75, weatherCode: 63 },
    { hour: 15, time: '2026-12-01T15:00', temperatureC: 16, rainProbability: 70, weatherCode: 61 },
    { hour: 16, time: '2026-12-01T16:00', temperatureC: 17, rainProbability: 50, weatherCode: 3 },
    { hour: 18, time: '2026-12-01T18:00', temperatureC: 15, rainProbability: 30, weatherCode: 2 },
    { hour: 20, time: '2026-12-01T20:00', temperatureC: 14, rainProbability: 15, weatherCode: 1 },
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

describe('WeatherService & time-slot.util', () => {
  let redis: jest.Mocked<RedisService>;
  let openMeteo: jest.Mocked<OpenMeteoClient>;
  let snapshotRepo: jest.Mocked<WeatherSnapshotRepository>;
  let weatherService: WeatherService;

  beforeEach(() => {
    redis = {
      getJson: jest.fn(),
      setJson: jest.fn(),
      del: jest.fn(),
    } as unknown as jest.Mocked<RedisService>;

    openMeteo = {
      fetchDailyHourly: jest.fn(),
    } as unknown as jest.Mocked<OpenMeteoClient>;

    snapshotRepo = {
      findByCityAndDate: jest.fn(),
      upsertSlots: jest.fn(),
    } as unknown as jest.Mocked<WeatherSnapshotRepository>;

    const config = {
      get: jest.fn((key: string, fallback: unknown) =>
        key === 'WEATHER_CACHE_TTL_SEC' ? 1800 : fallback,
      ),
    } as unknown as ConfigService;

    weatherService = new WeatherService(redis, openMeteo, snapshotRepo, config);
  });

  describe('aggregateHourlyToSlots', () => {
    it('aggregates hourly temperatures (avg) and rain probabilities (max) across 4 slots', () => {
      const slots = aggregateHourlyToSlots(makeHourlySample());
      expect(slots).toHaveLength(4);

      const morning = slots.find((s) => s.timeSlot === 'morning')!;
      expect(morning.temperatureC).toBe(19.3);
      expect(morning.rainProbability).toBe(20);
      expect(morning.conditionTag).toBe('cloudy');

      const afternoon = slots.find((s) => s.timeSlot === 'afternoon')!;
      expect(afternoon.temperatureC).toBe(17.5);
      expect(afternoon.rainProbability).toBe(75);
      expect(afternoon.conditionTag).toBe('rainy');
    });
  });

  describe('WeatherService.getForecast', () => {
    it('returns Redis cache directly without calling Open-Meteo', async () => {
      const cached: WeatherForecastResponse = {
        city: 'Da Lat',
        date: '2026-12-01',
        source: 'open-meteo',
        hourly: [],
        slots: [],
      };
      redis.getJson.mockResolvedValue(cached);

      const res = await weatherService.getForecast({
        city: 'Đà Lạt',
        date: '2026-12-01',
      });

      expect(res.source).toBe('redis');
      expect(redis.getJson).toHaveBeenCalledWith('weather:hourly:da-lat:2026-12-01');
      expect(openMeteo.fetchDailyHourly).not.toHaveBeenCalled();
    });

    it('fetches Open-Meteo on cache miss, stores in Redis (1800s TTL), and upserts snapshots', async () => {
      redis.getJson.mockResolvedValue(null);
      openMeteo.fetchDailyHourly.mockResolvedValue(makeHourlySample());

      const res = await weatherService.getForecast({
        city: 'Da Lat',
        date: '2026-12-01',
      });

      expect(res.source).toBe('open-meteo');
      expect(res.slots).toHaveLength(4);
      expect(openMeteo.fetchDailyHourly).toHaveBeenCalledWith(
        11.9404,
        108.4583,
        '2026-12-01',
      );
      expect(redis.setJson).toHaveBeenCalledWith(
        'weather:hourly:da-lat:2026-12-01',
        expect.objectContaining({ city: 'Da Lat', date: '2026-12-01' }),
        1800,
      );
      expect(snapshotRepo.upsertSlots).toHaveBeenCalledWith(
        'Da Lat',
        '2026-12-01',
        res.slots,
      );
    });

    it('falls back to weather_snapshots when Open-Meteo fails', async () => {
      redis.getJson.mockResolvedValue(null);
      openMeteo.fetchDailyHourly.mockRejectedValue(new Error('Network timeout'));
      snapshotRepo.findByCityAndDate.mockResolvedValue([
        {
          id: '1',
          city: 'Da Lat',
          forecastDate: '2026-12-01',
          timeSlot: 'afternoon',
          temperatureC: '17.5' as unknown as number,
          rainProbability: 75,
          weatherCode: 63,
          conditionTag: 'rainy',
          fetchedAt: new Date(),
        } as WeatherSnapshot,
      ]);

      const res = await weatherService.getForecast({
        city: 'Da Lat',
        date: '2026-12-01',
      });

      expect(res.source).toBe('snapshot');
      expect(res.slots[0]).toEqual({
        timeSlot: 'afternoon',
        temperatureC: 17.5,
        rainProbability: 75,
        weatherCode: 63,
        conditionTag: 'rainy',
      });
    });

    it('throws WTHR_001 (503) when both Open-Meteo and snapshots fail', async () => {
      redis.getJson.mockResolvedValue(null);
      openMeteo.fetchDailyHourly.mockRejectedValue(new Error('Network timeout'));
      snapshotRepo.findByCityAndDate.mockResolvedValue([]);

      await expectDomainError(
        weatherService.getForecast({ city: 'Da Lat', date: '2026-12-01' }),
        'WTHR_001',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    });
  });
});
