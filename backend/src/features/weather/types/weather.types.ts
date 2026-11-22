import type {
  HourlyWeatherPoint,
  SlotWeatherForecast,
  WeatherSlotKey,
} from '../../../shared/utils/time-slot.util';

export type { HourlyWeatherPoint, SlotWeatherForecast, WeatherSlotKey };

export type WeatherSource = 'redis' | 'open-meteo' | 'snapshot';

export interface WeatherForecastResponse {
  city: string;
  date: string;
  source: WeatherSource;
  hourly: HourlyWeatherPoint[];
  slots: SlotWeatherForecast[];
}
