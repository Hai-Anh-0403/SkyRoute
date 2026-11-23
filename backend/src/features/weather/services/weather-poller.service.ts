import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeatherService } from './weather.service';

const POLLED_CITIES = [
  'Da Lat',
  'Ha Noi',
  'Ninh Binh',
  'Ha Long',
  'Tam Dao',
  'Sapa',
  'Mai Chau',
  'Moc Chau',
];

@Injectable()
export class WeatherPollerService {
  private readonly logger = new Logger(WeatherPollerService.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async pollForecasts(): Promise<void> {
    const today = new Date();
    for (const city of POLLED_CITIES) {
      for (let offset = 0; offset < 3; offset++) {
        const target = new Date(today.getTime() + offset * 86_400_000);
        const date = target.toISOString().slice(0, 10);
        try {
          await this.weatherService.getForecast(
            { city, date },
            { bypassCache: true },
          );
        } catch (err) {
          this.logger.warn(
            `[WeatherPoller] failed for ${city} on ${date}: ${(err as Error).message}`,
          );
        }
      }
    }
  }
}
