export type TimeSlotType = 'morning' | 'lunch' | 'afternoon' | 'dinner';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface MapRouteSegment {
  id: string;
  from: Coordinates;
  to: Coordinates;
  distanceKm: number;
  isDetourWarning: boolean;
  fromLabel: string;
  toLabel: string;
}
