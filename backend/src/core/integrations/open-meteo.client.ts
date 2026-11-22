import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HourlyWeatherPoint } from '../../shared/utils/time-slot.util';

interface OpenMeteoForecastPayload {
  hourly?: {
    time?: string[];
    temperature_2m?: number[];
    precipitation_probability?: number[];
    weather_code?: number[];
  };
}

@Injectable()
export class OpenMeteoClient {
  private readonly logger = new Logger(OpenMeteoClient.name);
  private readonly baseUrl: string;

  constructor(config: ConfigService) {
    this.baseUrl = config
      .get<string>('OPEN_METEO_BASE_URL', 'https://api.open-meteo.com/v1')
      .replace(/\/+$/, '');
  }

  async fetchDailyHourly(
    lat: number,
    lng: number,
    date: string,
  ): Promise<HourlyWeatherPoint[]> {
    const params = new URLSearchParams({
      latitude: String(lat),
      longitude: String(lng),
      hourly: 'temperature_2m,precipitation_probability,weather_code',
      timezone: 'Asia/Ho_Chi_Minh',
      start_date: date,
      end_date: date,
    });

    const url = `${this.baseUrl}/forecast?${params.toString()}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

    if (!res.ok) {
      throw new Error(`Open-Meteo HTTP ${res.status}`);
    }

    const body = (await res.json()) as OpenMeteoForecastPayload;
    const times = body.hourly?.time ?? [];
    const temps = body.hourly?.temperature_2m ?? [];
    const rainProbs = body.hourly?.precipitation_probability ?? [];
    const codes = body.hourly?.weather_code ?? [];

    if (times.length === 0) {
      throw new Error('Open-Meteo returned empty hourly payload');
    }

    const points: HourlyWeatherPoint[] = [];
    for (let i = 0; i < times.length; i++) {
      const time = times[i];
      const hourPart = time.split('T')[1]?.slice(0, 2);
      const hour = Number(hourPart);
      if (!Number.isFinite(hour)) {
        continue;
      }
      points.push({
        hour,
        time,
        temperatureC: Number(temps[i] ?? 20),
        rainProbability: Number(rainProbs[i] ?? 0),
        weatherCode: Number(codes[i] ?? 0),
      });
    }

    this.logger.debug(
      `[OpenMeteo] fetched ${points.length} hourly points for (${lat},${lng}) on ${date}`,
    );
    return points;
  }
}
