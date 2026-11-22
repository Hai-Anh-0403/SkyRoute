import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OnEvent } from '@nestjs/event-emitter';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { ItineraryItemRepository } from '../../trips/repositories/itinerary-item.repository';
import { TripRepository } from '../../trips/repositories/trip.repository';
import {
  ItineraryItemResponse,
  TRIP_ITEMS_CHANGED_EVENT,
  TripItemsChangedEvent,
} from '../../trips/types/trip.types';
import { SyncTripWeatherDto } from '../dto/weather-sync.dto';
import { WeatherService } from './weather.service';

const DEFAULT_RAIN_THRESHOLD_PCT = 60;

export function isWeatherConflict(
  isOutdoor: boolean,
  rainProbability: number,
  threshold = DEFAULT_RAIN_THRESHOLD_PCT,
): boolean {
  return Boolean(isOutdoor) && rainProbability >= threshold;
}

function addDaysIso(baseDate: string, offsetDays: number): string {
  const ms = Date.parse(`${baseDate}T00:00:00Z`) + offsetDays * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

@Injectable()
export class WeatherConflictService {
  private readonly logger = new Logger(WeatherConflictService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly weatherService: WeatherService,
    private readonly tripRepo: TripRepository,
    private readonly itemRepo: ItineraryItemRepository,
  ) {}

  async syncTripWeather(
    userId: string,
    tripId: string,
    dto?: SyncTripWeatherDto,
  ): Promise<{
    tripId: number;
    syncedCount: number;
    conflictCount: number;
    items: ItineraryItemResponse[];
  }> {
    const trip = await this.tripRepo.findById(tripId);
    if (!trip) {
      throw new DomainException(
        'TRIP_001',
        'Trip not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (String(trip.userId) !== String(userId)) {
      throw new DomainException(
        'AUTH_004',
        'User is not authorized for this resource',
        HttpStatus.FORBIDDEN,
      );
    }

    const items = await this.itemRepo.findByTripOrdered(tripId);
    if (items.length === 0) {
      return {
        tripId: Number(tripId),
        syncedCount: 0,
        conflictCount: 0,
        items: [],
      };
    }

    const uniqueDays = Array.from(new Set(items.map((i) => i.dayNumber)));
    const forecastByDay = new Map<
      number,
      Map<
        string,
        {
          temperatureC: number;
          rainProbability: number;
          conditionTag: string;
        }
      >
    >();

    for (const day of uniqueDays) {
      const targetDate = addDaysIso(trip.startDate, day - 1);
      const forecast = await this.weatherService.getForecast({
        city: trip.destinationCity,
        date: targetDate,
      });
      const slotMap = new Map<
        string,
        {
          temperatureC: number;
          rainProbability: number;
          conditionTag: string;
        }
      >();
      for (const s of forecast.slots) {
        slotMap.set(s.timeSlot, {
          temperatureC: s.temperatureC,
          rainProbability: s.rainProbability,
          conditionTag: s.conditionTag,
        });
      }
      forecastByDay.set(day, slotMap);
    }

    const threshold = this.getRainThresholdPct();
    const updates: Array<{
      id: string;
      weatherCondition: string;
      temperatureC: number;
      rainProbability: number;
      weatherAlertFlag: boolean;
    }> = [];

    let conflictCount = 0;

    for (const item of items) {
      const slotData = forecastByDay.get(item.dayNumber)?.get(item.timeSlot);
      if (!slotData && !dto?.simulateRain) {
        continue;
      }

      let temperatureC = slotData?.temperatureC ?? 18.0;
      let rainProbability = slotData?.rainProbability ?? 0;
      let weatherCondition = slotData?.conditionTag ?? 'cloudy';

      if (
        dto?.simulateRain &&
        dto.simulateRain.dayNumber === item.dayNumber &&
        dto.simulateRain.timeSlot === item.timeSlot
      ) {
        rainProbability = dto.simulateRain.rainProbability ?? 75;
        weatherCondition = rainProbability >= 60 ? 'rainy' : weatherCondition;
      }

      const isOutdoorPlace = item.place !== null && item.place.isOutdoor;
      const weatherAlertFlag = isWeatherConflict(
        isOutdoorPlace,
        rainProbability,
        threshold,
      );
      if (weatherAlertFlag) {
        conflictCount++;
      }

      updates.push({
        id: String(item.id),
        weatherCondition,
        temperatureC,
        rainProbability,
        weatherAlertFlag,
      });
    }

    await this.itemRepo.updateWeatherBatch(updates);
    const refreshedItems = await this.itemRepo.findByTripOrdered(tripId);

    this.logger.log(
      `[WeatherConflict] syncTripWeather - tripId=${tripId},synced=${updates.length},conflicts=${conflictCount}`,
    );

    return {
      tripId: Number(tripId),
      syncedCount: updates.length,
      conflictCount,
      items: refreshedItems,
    };
  }

  @OnEvent(TRIP_ITEMS_CHANGED_EVENT)
  async onTripItemsChanged(event: TripItemsChangedEvent): Promise<void> {
    try {
      const owner = await this.tripRepo.findOwnerById(event.tripId);
      if (!owner) {
        return;
      }
      await this.syncTripWeather(owner.userId, event.tripId);
    } catch (err) {
      this.logger.warn(
        `[WeatherConflict] auto-sync skipped for trip=${event.tripId}: ${(err as Error).message}`,
      );
    }
  }

  private getRainThresholdPct(): number {
    const raw = Number(
      this.config.get('RAIN_CONFLICT_THRESHOLD_PCT', DEFAULT_RAIN_THRESHOLD_PCT),
    );
    return Number.isFinite(raw) ? raw : DEFAULT_RAIN_THRESHOLD_PCT;
  }
}
