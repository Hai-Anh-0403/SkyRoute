export type PlaceCategory = 'attraction' | 'restaurant' | 'cafe';

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface PlaceItem {
  id: number;
  name: string;
  city: string;
  category: PlaceCategory;
  subcategory: string | null;
  isOutdoor: boolean;
  hasAc: boolean;
  suitableWeather: string[];
  priceLevel: number;
  rating: number;
  address: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  location: PlaceLocation;
  distanceKm?: number;
}

export interface DiscoveryFilters {
  city?: string;
  category?: PlaceCategory;
  subcategory?: string;
  isOutdoor?: boolean;
  hasAc?: boolean;
  weatherTag?: string;
}

export interface RadarQueryParams extends DiscoveryFilters {
  lat: number;
  lng: number;
  radiusKm: number;
  page?: number;
  limit?: number;
  sort?: 'distance' | 'rating';
  order?: 'asc' | 'desc';
}

export interface RadarMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  anchorPoint: PlaceLocation;
  radiusKm: number;
}

export interface RadarPlacesResponse {
  data: PlaceItem[];
  meta: RadarMeta;
}

export interface PlaceListResponse {
  data: PlaceItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type WeatherFoodProfile = 'cold_rainy' | 'hot_sunny' | 'mild';

export interface FoodRecommendationQueryParams {
  city?: string;
  lat?: number;
  lng?: number;
  temperatureC?: number;
  rainProbability?: number;
  page?: number;
  limit?: number;
}

export interface FoodRecommendationsResponse {
  data: PlaceItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    weatherProfile: WeatherFoodProfile;
  };
}
