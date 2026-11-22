import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { WeatherService } from './weather.service';

@Injectable()
export class WeatherPollerService {
  private readonly logger = new Logger(WeatherPollerService.name);

  constructor(private readonly weatherService: WeatherService) {}

  @Cron(CronExpression.EVERY_30_MINUTES)
  async pollForecasts(): Promise<void> {
    const today = new Date();
    for (let offset = 0; offset < 3; offset++) {
      const target = new Date(today.getTime() + offset * 86_400_000);
      const date = target.toISOString().slice(0, 10);
      try {
        await this.weatherService.getForecast(
          { city: 'Da Lat', date },
          { bypassCache: true },
        );
      } catch (err) {
        this.logger.warn(
          `[WeatherPoller] failed for Da Lat on ${date}: ${(err as Error).message}`,
        );
      }
    }
  }
}
