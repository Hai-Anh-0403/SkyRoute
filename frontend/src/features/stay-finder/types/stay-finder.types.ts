import type { Coordinates } from '@/shared/types/geo.types';

export type StayType = 'hotel' | 'homestay' | 'resort';

export interface RecommendedStayItem {
  id: number;
  name: string;
  stayType: StayType;
  pricePerNight: number;
  rating: number;
  address: string | null;
  thumbnailUrl: string | null;
  location: Coordinates;
  distanceToCentroidKm: number;
  avgDistanceToItineraryPlacesKm: number;
  amenities: string[];
}

export interface CentroidStaysResponse {
  tripId: number;
  centroidLocation: Coordinates;
  totalItineraryPlaces: number;
  recommendedStays: RecommendedStayItem[];
}

export interface CentroidStaysQueryParams {
  stayType?: StayType;
  minPrice?: number;
  maxPrice?: number;
  limit?: number;
}

export interface PublicStayItem {
  id: number;
  name: string;
  city: string;
  stayType: StayType;
  pricePerNight: number;
  rating: number;
  address: string | null;
  thumbnailUrl: string | null;
  location: Coordinates;
  amenities: string[];
}

export interface PublicStaysQueryParams {
  city?: string;
  stayType?: StayType;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'price_per_night' | 'rating';
  order?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface PublicStaysResponse {
  data: PublicStayItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
