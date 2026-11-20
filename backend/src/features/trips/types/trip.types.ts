export const TIME_SLOTS = ['morning', 'lunch', 'afternoon', 'dinner'] as const;

export type TimeSlotType = (typeof TIME_SLOTS)[number];

export type TripStatusType = 'draft' | 'active' | 'completed' | 'archived';

export const TRIP_ITEMS_CHANGED_EVENT = 'trip.items.changed';

export interface TripItemsChangedEvent {
  tripId: string;
  affectedDays?: number[];
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface TripSummaryResponse {
  id: number;
  userId: number;
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: TripStatusType;
  centroidLocation: Coordinates | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItineraryPlaceSummary {
  id: number;
  name: string;
  category: string;
  subcategory: string | null;
  isOutdoor: boolean;
  address: string | null;
  rating: number;
  location: Coordinates;
}

export interface ItineraryStaySummary {
  id: number;
  name: string;
  stayType: string;
  address: string | null;
  rating: number;
  pricePerNight: number;
  location: Coordinates;
}

export interface ItineraryItemResponse {
  id: number;
  tripId: number;
  placeId: number | null;
  stayId: number | null;
  dayNumber: number;
  timeSlot: TimeSlotType;
  orderIndex: number;
  distanceFromPrevKm: number;
  isDetourWarning: boolean;
  weatherCondition: string | null;
  temperatureC: number | null;
  rainProbability: number | null;
  weatherAlertFlag: boolean;
  note: string | null;
  place: ItineraryPlaceSummary | null;
  stay: ItineraryStaySummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TripDetailResponse extends TripSummaryResponse {
  items: ItineraryItemResponse[];
}
