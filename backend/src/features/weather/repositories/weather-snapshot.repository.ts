import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SlotWeatherForecast } from '../../../shared/utils/time-slot.util';
import { WeatherSnapshot } from '../entities/weather-snapshot.entity';

@Injectable()
export class WeatherSnapshotRepository {
  constructor(
    @InjectRepository(WeatherSnapshot)
    private readonly repo: Repository<WeatherSnapshot>,
  ) {}

  findByCityAndDate(
    city: string,
    forecastDate: string,
  ): Promise<WeatherSnapshot[]> {
    return this.repo.find({
      where: { city, forecastDate },
    });
  }

  async upsertSlots(
    city: string,
    forecastDate: string,
    slots: SlotWeatherForecast[],
  ): Promise<void> {
    if (slots.length === 0) {
      return;
    }

    const rows = slots.map((slot) => ({
      city,
      forecastDate,
      timeSlot: slot.timeSlot,
      temperatureC: slot.temperatureC,
      rainProbability: slot.rainProbability,
      weatherCode: slot.weatherCode,
      conditionTag: slot.conditionTag,
      fetchedAt: new Date(),
    }));

    await this.repo.upsert(rows, ['city', 'forecastDate', 'timeSlot']);
  }
}
