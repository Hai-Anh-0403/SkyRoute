import { FunctionDeclaration, Type } from '@google/genai';

export interface SanitizedRadarToolArgs {
  lat: number;
  lng: number;
  radiusKm: number;
  category?: 'attraction' | 'restaurant' | 'cafe';
  isOutdoor?: boolean;
  weatherTag?: string;
  limit: number;
}

export interface SanitizedWeatherToolArgs {
  city: string;
  date: string;
}

export interface SanitizedFoodToolArgs {
  city: string;
  lat: number;
  lng: number;
  temperatureC?: number;
  rainProbability?: number;
  limit: number;
}

export const TRAVEL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'get_places_by_radius',
    description:
      'Query real places in PostgreSQL/PostGIS within 1 to 5 km of anchor coordinates, optionally filtered by category and indoor/outdoor status.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        lat: { type: Type.NUMBER, description: 'Latitude (-90 to 90)' },
        lng: { type: Type.NUMBER, description: 'Longitude (-180 to 180)' },
        radiusKm: {
          type: Type.NUMBER,
          description: 'Search radius in kilometers (1 to 5)',
        },
        category: {
          type: Type.STRING,
          description: 'Optional category: attraction, restaurant, or cafe',
        },
        isOutdoor: {
          type: Type.BOOLEAN,
          description: 'False for indoor venues when rain is expected',
        },
        weatherTag: {
          type: Type.STRING,
          description: 'Optional weather tag: sunny, cloudy, rainy, cold, hot',
        },
        limit: {
          type: Type.INTEGER,
          description: 'Max places to return (1 to 20)',
        },
      },
      required: ['lat', 'lng', 'radiusKm'],
    },
  },
  {
    name: 'get_weather_forecast',
    description:
      'Get 4-slot weather forecast (morning, lunch, afternoon, dinner) with temperature and rain probability for a city and YYYY-MM-DD date.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'Destination city name' },
        date: { type: Type.STRING, description: 'ISO date YYYY-MM-DD' },
      },
      required: ['city', 'date'],
    },
  },
  {
    name: 'get_food_recommendations',
    description:
      'Get context-aware restaurants and cafes matched to temperature and rain probability (e.g. hotpot/bbq when cold/rainy, AC venues when hot).',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'Destination city name' },
        lat: { type: Type.NUMBER, description: 'Anchor latitude' },
        lng: { type: Type.NUMBER, description: 'Anchor longitude' },
        temperatureC: { type: Type.NUMBER, description: 'Expected temperature C' },
        rainProbability: {
          type: Type.NUMBER,
          description: 'Expected rain probability 0..100',
        },
      },
      required: ['city', 'lat', 'lng'],
    },
  },
];

function validLat(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= -90 && n <= 90 ? n : fallback;
}

function validLng(raw: unknown, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= -180 && n <= 180 ? n : fallback;
}

export function sanitizeRadarToolArgs(
  raw: Record<string, unknown>,
  fallbackCenter: { lat: number; lng: number },
): SanitizedRadarToolArgs {
  const rawRadius = Number(raw.radiusKm);
  const radiusKm = Number.isFinite(rawRadius)
    ? Math.min(5, Math.max(1, rawRadius))
    : 5;

  const rawLimit = Number(raw.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.min(20, Math.max(1, Math.round(rawLimit)))
    : 15;

  const category =
    raw.category === 'attraction' ||
    raw.category === 'restaurant' ||
    raw.category === 'cafe'
      ? raw.category
      : undefined;

  return {
    lat: validLat(raw.lat, fallbackCenter.lat),
    lng: validLng(raw.lng, fallbackCenter.lng),
    radiusKm,
    ...(category ? { category } : {}),
    ...(typeof raw.isOutdoor === 'boolean'
      ? { isOutdoor: raw.isOutdoor }
      : {}),
    ...(typeof raw.weatherTag === 'string' && raw.weatherTag.trim()
      ? { weatherTag: raw.weatherTag.trim().slice(0, 30) }
      : {}),
    limit,
  };
}

export function sanitizeWeatherToolArgs(
  raw: Record<string, unknown>,
  fallbackCity: string,
  fallbackDate: string,
): SanitizedWeatherToolArgs {
  const city =
    typeof raw.city === 'string' && raw.city.trim()
      ? raw.city.trim().slice(0, 100)
      : fallbackCity;
  const dateStr =
    typeof raw.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw.date.trim())
      ? raw.date.trim()
      : fallbackDate;
  return { city, date: dateStr };
}

export function sanitizeFoodToolArgs(
  raw: Record<string, unknown>,
  fallbackCity: string,
  fallbackCenter: { lat: number; lng: number },
): SanitizedFoodToolArgs {
  const city =
    typeof raw.city === 'string' && raw.city.trim()
      ? raw.city.trim().slice(0, 100)
      : fallbackCity;
  const temp = Number(raw.temperatureC);
  const rain = Number(raw.rainProbability);
  return {
    city,
    lat: validLat(raw.lat, fallbackCenter.lat),
    lng: validLng(raw.lng, fallbackCenter.lng),
    ...(Number.isFinite(temp) ? { temperatureC: temp } : {}),
    ...(Number.isFinite(rain)
      ? { rainProbability: Math.min(100, Math.max(0, rain)) }
      : {}),
    limit: 12,
  };
}
