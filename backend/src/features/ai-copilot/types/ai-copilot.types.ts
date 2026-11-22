import {
  Coordinates,
  ItineraryItemResponse,
  TimeSlotType,
} from '../../trips/types/trip.types';

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

export interface SwapPlanBResponse {
  updatedItem: ItineraryItemResponse;
  newCentroidLocation: Coordinates | null;
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
