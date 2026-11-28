import type { Coordinates, TimeSlotType } from '@/shared/types/geo.types';

export interface SimulateRainRequest {
  dayNumber: number;
  timeSlot: TimeSlotType;
  rainProbability?: number;
}

export interface SyncWeatherResponse {
  tripId: number;
  syncedCount: number;
  conflictCount: number;
}

export interface PlanBCandidate {
  placeId: number;
  name: string;
  category: string;
  subcategory: string | null;
  isOutdoor: boolean;
  address: string | null;
  rating: number;
  location: Coordinates;
  distanceFromPrevKm: number;
  contextualScore: number;
  aiReason: string;
}

export interface PlanBCandidatesResponse {
  conflictedItem: {
    id: number;
    placeId: number;
    placeName: string;
    dayNumber: number;
    timeSlot: TimeSlotType;
    rainProbability: number;
    temperatureC: number | null;
  };
  anchorLocation: Coordinates;
  radiusMeters: number;
  candidates: PlanBCandidate[];
}

export interface SwapPlanBRequest {
  replacementPlaceId: number;
  note?: string;
}

export interface SwapPlanBResponse {
  updatedItem: {
    id: number;
    placeId: number | null;
    weatherAlertFlag: boolean;
    distanceFromPrevKm: number;
    isDetourWarning: boolean;
  };
  newCentroidLocation: Coordinates | null;
}

export interface PlanBHistoryItem {
  id: number;
  itineraryItemId: number;
  dayNumber: number | null;
  timeSlot: TimeSlotType | null;
  originalPlaceName: string;
  replacementPlaceName: string;
  rainProbabilityAtSwap: number;
  distanceFromPrevKm: number;
  createdAt: string;
}

export interface PublicSlotWeather {
  timeSlot: TimeSlotType;
  temperatureC: number;
  rainProbability: number;
  weatherCode: number;
  conditionTag: string;
}

export interface PublicWeatherForecastResponse {
  city: string;
  date: string;
  source: 'redis' | 'open-meteo' | 'snapshot';
  slots: PublicSlotWeather[];
}
