import type { Coordinates, TimeSlotType } from '@/shared/types/geo.types';

export interface GenerateItineraryRequest {
  tripId: number;
  prompt: string;
}

export interface GeneratedSlotPlaceSummary {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  isOutdoor: boolean;
  priceLevel: number;
  rating: number;
  address: string | null;
  location: Coordinates;
}

export interface GeneratedSlotWeatherSummary {
  temperatureC: number;
  rainProbability: number;
  conditionTag: string;
}

export interface GeneratedItinerarySlotItem {
  dayNumber: number;
  timeSlot: TimeSlotType;
  placeId: number;
  place: GeneratedSlotPlaceSummary;
  weather: GeneratedSlotWeatherSummary;
  reason: string;
}

export interface GeneratedItineraryResponse {
  tripId: number;
  destinationCity: string;
  summary: string;
  providerMode: 'gemini-tools' | 'deterministic-grounded';
  weatherWarningsAvoided: number;
  items: GeneratedItinerarySlotItem[];
}
