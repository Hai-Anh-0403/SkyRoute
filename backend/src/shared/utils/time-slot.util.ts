export type WeatherSlotKey = 'morning' | 'lunch' | 'afternoon' | 'dinner';

export interface HourlyWeatherPoint {
  hour: number;
  time: string;
  temperatureC: number;
  rainProbability: number;
  weatherCode: number;
}

export interface SlotWeatherForecast {
  timeSlot: WeatherSlotKey;
  temperatureC: number;
  rainProbability: number;
  weatherCode: number;
  conditionTag: string;
}

export const SLOT_HOUR_RANGES: Record<
  WeatherSlotKey,
  { startHour: number; endHour: number }
> = {
  morning: { startHour: 8, endHour: 10 },
  lunch: { startHour: 11, endHour: 12 },
  afternoon: { startHour: 13, endHour: 16 },
  dinner: { startHour: 17, endHour: 21 },
};

const RAIN_WMO_CODES = new Set([
  51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99,
]);

const CLOUDY_WMO_CODES = new Set([2, 3, 45, 48]);

export function mapWmoCodeToConditionTag(
  code: number,
  rainProbability: number,
  temperatureC: number,
): string {
  if (RAIN_WMO_CODES.has(code) || rainProbability >= 60) {
    return 'rainy';
  }
  if (CLOUDY_WMO_CODES.has(code)) {
    return 'cloudy';
  }
  if (code === 0 || code === 1) {
    if (temperatureC >= 30) {
      return 'hot';
    }
    if (temperatureC <= 18) {
      return 'cold';
    }
    return 'sunny';
  }
  return temperatureC <= 18 ? 'cold' : 'cloudy';
}

export function aggregateHourlyToSlots(
  hourly: HourlyWeatherPoint[],
): SlotWeatherForecast[] {
  return (Object.keys(SLOT_HOUR_RANGES) as WeatherSlotKey[]).map((slot) => {
    const { startHour, endHour } = SLOT_HOUR_RANGES[slot];
    const points = hourly.filter(
      (p) => p.hour >= startHour && p.hour <= endHour,
    );

    if (points.length === 0) {
      return {
        timeSlot: slot,
        temperatureC: 20.0,
        rainProbability: 0,
        weatherCode: 0,
        conditionTag: 'cloudy',
      };
    }

    const avgTemp =
      points.reduce((sum, p) => sum + p.temperatureC, 0) / points.length;
    const temperatureC = Number(avgTemp.toFixed(1));
    const rainProbability = Math.max(
      0,
      Math.min(100, Math.max(...points.map((p) => Math.round(p.rainProbability)))),
    );
    const weatherCode = Math.max(...points.map((p) => p.weatherCode));

    return {
      timeSlot: slot,
      temperatureC,
      rainProbability,
      weatherCode,
      conditionTag: mapWmoCodeToConditionTag(
        weatherCode,
        rainProbability,
        temperatureC,
      ),
    };
  });
}

const CITY_COORDINATES: Record<
  string,
  { canonicalCity: string; lat: number; lng: number }
> = {
  'da lat': { canonicalCity: 'Da Lat', lat: 11.9404, lng: 108.4583 },
  dalat: { canonicalCity: 'Da Lat', lat: 11.9404, lng: 108.4583 },
  'da nang': { canonicalCity: 'Da Nang', lat: 16.0544, lng: 108.2022 },
  danang: { canonicalCity: 'Da Nang', lat: 16.0544, lng: 108.2022 },
  'ha noi': { canonicalCity: 'Ha Noi', lat: 21.0285, lng: 105.8542 },
  hanoi: { canonicalCity: 'Ha Noi', lat: 21.0285, lng: 105.8542 },
  'ninh binh': { canonicalCity: 'Ninh Binh', lat: 20.2506, lng: 105.9745 },
  'trang an': { canonicalCity: 'Ninh Binh', lat: 20.2506, lng: 105.9745 },
  'tam coc': { canonicalCity: 'Ninh Binh', lat: 20.2506, lng: 105.9745 },
  'ha long': { canonicalCity: 'Ha Long', lat: 20.9599, lng: 107.0425 },
  halong: { canonicalCity: 'Ha Long', lat: 20.9599, lng: 107.0425 },
  'quang ninh': { canonicalCity: 'Ha Long', lat: 20.9599, lng: 107.0425 },
  'tam dao': { canonicalCity: 'Tam Dao', lat: 21.4569, lng: 105.6431 },
  'vinh phuc': { canonicalCity: 'Tam Dao', lat: 21.4569, lng: 105.6431 },
  sapa: { canonicalCity: 'Sapa', lat: 22.3364, lng: 103.8438 },
  'sa pa': { canonicalCity: 'Sapa', lat: 22.3364, lng: 103.8438 },
  'lao cai': { canonicalCity: 'Sapa', lat: 22.3364, lng: 103.8438 },
  'mai chau': { canonicalCity: 'Mai Chau', lat: 20.6594, lng: 105.0725 },
  'hoa binh': { canonicalCity: 'Mai Chau', lat: 20.6594, lng: 105.0725 },
  'moc chau': { canonicalCity: 'Moc Chau', lat: 20.8469, lng: 104.6417 },
  'son la': { canonicalCity: 'Moc Chau', lat: 20.8469, lng: 104.6417 },
  'ho chi minh': { canonicalCity: 'Ho Chi Minh', lat: 10.8231, lng: 106.6297 },
};

export function normalizeCitySlug(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export function resolveCityCoordinates(
  city: string,
): { canonicalCity: string; lat: number; lng: number } | null {
  const normalized = normalizeCitySlug(city);
  return CITY_COORDINATES[normalized] ?? null;
}

export function buildWeatherCacheKey(
  cityOrCoords: string,
  date: string,
): string {
  const keySlug = normalizeCitySlug(cityOrCoords).replace(/\s+/g, '-');
  return `weather:hourly:${keySlug}:${date}`;
}
