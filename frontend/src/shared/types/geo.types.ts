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

export interface MapPlanBCandidatePin {
  placeId: number;
  name: string;
  location: Coordinates;
  distanceFromPrevKm: number;
  rating: number;
}

export interface MapPlanBPreview {
  anchor: Coordinates;
  radiusMeters: number;
  candidates: MapPlanBCandidatePin[];
}
