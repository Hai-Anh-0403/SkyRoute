import type { Coordinates, TimeSlotType } from '@/shared/types/geo.types';

export type TripStatusType = 'draft' | 'active' | 'completed' | 'archived';

export interface TimeSlotMeta {
  slot: TimeSlotType;
  label: string;
  timeRange: string;
}

export const TIME_SLOT_META: TimeSlotMeta[] = [
  { slot: 'morning', label: 'Sáng', timeRange: '08:00 – 11:00' },
  { slot: 'lunch', label: 'Trưa', timeRange: '11:00 – 13:00' },
  { slot: 'afternoon', label: 'Chiều', timeRange: '13:00 – 17:00' },
  { slot: 'dinner', label: 'Tối', timeRange: '17:00 – 22:00' },
];

export interface TripSummary {
  id: number;
  userId: number;
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: TripStatusType;
  centroidLocation: Coordinates | null;
  createdAt: string;
  updatedAt: string;
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

export interface ItineraryItem {
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
  createdAt: string;
  updatedAt: string;
}

export interface TripDetail extends TripSummary {
  items: ItineraryItem[];
}

export interface CreateTripRequest {
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
}

export interface AddItineraryItemRequest {
  placeId?: number;
  stayId?: number;
  dayNumber: number;
  timeSlot: TimeSlotType;
  orderIndex?: number;
  note?: string;
}

export interface ReorderItemEntry {
  itemId: number;
  dayNumber: number;
  timeSlot: TimeSlotType;
  orderIndex: number;
}

export interface ReorderItineraryResponse {
  tripId: number;
  centroidLocation: Coordinates | null;
  updatedItems: ItineraryItem[];
}
