import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../../core/cache/redis.service';
import { OpenMeteoClient } from '../../../core/integrations/open-meteo.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import {
  aggregateHourlyToSlots,
  buildWeatherCacheKey,
  resolveCityCoordinates,
  WeatherSlotKey,
} from '../../../shared/utils/time-slot.util';
import { WeatherForecastQueryDto } from '../dto/weather-query.dto';
import { WeatherSnapshotRepository } from '../repositories/weather-snapshot.repository';
import { WeatherForecastResponse } from '../types/weather.types';

const DEFAULT_CACHE_TTL_SEC = 1800;
const SLOT_ORDER: Record<WeatherSlotKey, number> = {
  morning: 0,
  lunch: 1,
  afternoon: 2,
  dinner: 3,
};

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  constructor(
    private readonly redis: RedisService,
    private readonly openMeteo: OpenMeteoClient,
    private readonly snapshotRepo: WeatherSnapshotRepository,
    private readonly config: ConfigService,
  ) {}

  async getForecast(
    query: WeatherForecastQueryDto,
    options?: { bypassCache?: boolean },
  ): Promise<WeatherForecastResponse> {
    const date = (query.date ?? new Date().toISOString().slice(0, 10)).slice(
      0,
      10,
    );
    const { city, lat, lng } = this.resolveTarget(query);
    const cacheKey = buildWeatherCacheKey(city, date);

    if (!options?.bypassCache) {
      const cached = await this.redis.getJson<WeatherForecastResponse>(cacheKey);
      if (cached) {
        return { ...cached, source: 'redis' };
      }
    }

    try {
      const hourly = await this.openMeteo.fetchDailyHourly(lat, lng, date);
      const slots = aggregateHourlyToSlots(hourly);
      const payload: WeatherForecastResponse = {
        city,
        date,
        source: 'open-meteo',
        hourly,
        slots,
      };

      const ttlSec = Number(
        this.config.get<number>('WEATHER_CACHE_TTL_SEC', DEFAULT_CACHE_TTL_SEC),
      );
      await this.redis.setJson(
        cacheKey,
        payload,
        Number.isFinite(ttlSec) && ttlSec > 0 ? ttlSec : DEFAULT_CACHE_TTL_SEC,
      );

      await this.snapshotRepo.upsertSlots(city, date, slots);

      this.logger.log(
        `[Weather] synced Open-Meteo for city=${city},date=${date}`,
      );
      return payload;
    } catch (err) {
      this.logger.warn(
        `[Weather] Open-Meteo failed for city=${city},date=${date}: ${(err as Error).message}`,
      );

      const snapshots = await this.snapshotRepo.findByCityAndDate(city, date);
      if (snapshots.length > 0) {
        const slots = snapshots
          .slice()
          .sort((a, b) => SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot])
          .map((s) => ({
            timeSlot: s.timeSlot,
            temperatureC: Number(s.temperatureC),
            rainProbability: Number(s.rainProbability),
            weatherCode: Number(s.weatherCode),
            conditionTag: s.conditionTag,
          }));

        return {
          city,
          date,
          source: 'snapshot',
          hourly: [],
          slots,
        };
      }

      throw new DomainException(
        'WTHR_001',
        'Weather provider unavailable and no cached snapshot found',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  private resolveTarget(query: WeatherForecastQueryDto): {
    city: string;
    lat: number;
    lng: number;
  } {
    const hasLat = query.lat !== undefined;
    const hasLng = query.lng !== undefined;

    if (hasLat || hasLng) {
      if (
        !hasLat ||
        !hasLng ||
        !Number.isFinite(query.lat) ||
        query.lat! < -90 ||
        query.lat! > 90 ||
        !Number.isFinite(query.lng) ||
        query.lng! < -180 ||
        query.lng! > 180
      ) {
        throw new DomainException(
          'DISC_002',
          'Invalid WGS84 coordinates',
          HttpStatus.BAD_REQUEST,
        );
      }
      const city =
        query.city?.trim() || `${query.lat!.toFixed(2)},${query.lng!.toFixed(2)}`;
      return { city, lat: query.lat!, lng: query.lng! };
    }

    const resolved = resolveCityCoordinates(query.city ?? 'Da Lat');
    if (resolved) {
      return {
        city: resolved.canonicalCity,
        lat: resolved.lat,
        lng: resolved.lng,
      };
    }

    return { city: 'Da Lat', lat: 11.9404, lng: 108.4583 };
  }
}
