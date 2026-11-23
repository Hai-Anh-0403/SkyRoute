export type PlaceCategory = 'attraction' | 'restaurant' | 'cafe';

export type WeatherProfile = 'cold_rainy' | 'hot_sunny' | 'mild';

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface PlaceResponseItem {
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
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface RadarMeta extends PaginationMeta {
  anchorPoint: PlaceLocation;
  radiusKm: number;
}

export interface FoodMeta extends PaginationMeta {
  weatherProfile: WeatherProfile;
}

export interface PlaceFilterParams {
  city?: string;
  category?: PlaceCategory;
  subcategories?: string[];
  isOutdoor?: boolean;
  hasAc?: boolean;
  weatherTag?: string;
  page: number;
  limit: number;
  sort: 'rating' | 'price_level' | 'created_at';
  order: 'asc' | 'desc';
}

export interface RadarSearchParams {
  lat: number;
  lng: number;
  radiusMeters: number;
  city?: string;
  category?: PlaceCategory;
  subcategories?: string[];
  isOutdoor?: boolean;
  hasAc?: boolean;
  weatherTag?: string;
  page: number;
  limit: number;
  sort: 'distance' | 'rating';
  order: 'asc' | 'desc';
}

export interface FoodSearchParams {
  city?: string;
  lat?: number;
  lng?: number;
  preferIndoor?: boolean;
  preferHasAc?: boolean;
  preferredSubcategories: string[];
  weatherTag?: string;
  page: number;
  limit: number;
}

export interface CreatePlaceParams {
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
}

export interface UpdatePlaceParams {
  name?: string;
  city?: string;
  category?: PlaceCategory;
  subcategory?: string | null;
  isOutdoor?: boolean;
  hasAc?: boolean;
  suitableWeather?: string[];
  priceLevel?: number;
  rating?: number;
  address?: string | null;
  description?: string | null;
  thumbnailUrl?: string | null;
  location?: PlaceLocation;
  isActive?: boolean;
}
