export type StayType = 'hotel' | 'homestay' | 'resort';

export interface StayCoordinates {
  lat: number;
  lng: number;
}

export interface StayResponseItem {
  id: number;
  name: string;
  city: string;
  stayType: StayType;
  pricePerNight: number;
  rating: number;
  address: string | null;
  thumbnailUrl: string | null;
  location: StayCoordinates;
  amenities: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface RecommendedStayItem {
  id: number;
  name: string;
  stayType: StayType;
  pricePerNight: number;
  rating: number;
  address: string | null;
  thumbnailUrl: string | null;
  location: StayCoordinates;
  distanceToCentroidKm: number;
  avgDistanceToItineraryPlacesKm: number;
  amenities: string[];
}

export interface CentroidStaysResponse {
  tripId: number;
  centroidLocation: StayCoordinates;
  totalItineraryPlaces: number;
  recommendedStays: RecommendedStayItem[];
}

export interface StayFilterParams {
  city?: string;
  stayType?: StayType;
  minPrice?: number;
  maxPrice?: number;
  page: number;
  limit: number;
  sort: 'price_per_night' | 'rating';
  order: 'asc' | 'desc';
}

export interface CentroidStaySearchParams {
  centroid: StayCoordinates;
  placeLocations: StayCoordinates[];
  city?: string;
  stayType?: StayType;
  minPrice?: number;
  maxPrice?: number;
  limit: number;
}

export interface CreateStayParams {
  name: string;
  city: string;
  stayType: StayType;
  pricePerNight: number;
  rating: number;
  address: string | null;
  thumbnailUrl: string | null;
  amenities: string[];
  location: StayCoordinates;
}

export interface UpdateStayParams {
  name?: string;
  city?: string;
  stayType?: StayType;
  pricePerNight?: number;
  rating?: number;
  address?: string | null;
  thumbnailUrl?: string | null;
  amenities?: string[];
  location?: StayCoordinates;
  isActive?: boolean;
}
