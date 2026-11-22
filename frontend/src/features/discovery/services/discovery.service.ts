import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  DiscoveryFilters,
  FoodRecommendationQueryParams,
  FoodRecommendationsResponse,
  PlaceItem,
  PlaceListResponse,
  RadarMeta,
  RadarPlacesResponse,
  RadarQueryParams,
} from '../types/discovery.types';

function mapFilterParams(filters: DiscoveryFilters): Record<string, unknown> {
  return {
    ...(filters.city ? { city: filters.city } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.subcategory ? { subcategory: filters.subcategory } : {}),
    ...(filters.isOutdoor !== undefined
      ? { is_outdoor: filters.isOutdoor }
      : {}),
    ...(filters.hasAc !== undefined ? { has_ac: filters.hasAc } : {}),
    ...(filters.weatherTag ? { weather_tag: filters.weatherTag } : {}),
  };
}

export const discoveryService = {
  async getRadarPlaces(
    params: RadarQueryParams,
  ): Promise<RadarPlacesResponse> {
    const res = await apiClient.get<ApiResponse<PlaceItem[]>>(
      '/places/radar',
      {
        params: {
          lat: params.lat,
          lng: params.lng,
          radius_km: params.radiusKm,
          page: params.page ?? 1,
          limit: params.limit ?? 20,
          sort: params.sort ?? 'distance',
          order: params.order ?? 'asc',
          ...mapFilterParams(params),
        },
      },
    );

    return {
      data: res.data.data,
      meta: res.data.meta as unknown as RadarMeta,
    };
  },

  async getPlaces(
    filters: DiscoveryFilters & { page?: number; limit?: number },
  ): Promise<PlaceListResponse> {
    const res = await apiClient.get<ApiResponse<PlaceItem[]>>('/places', {
      params: {
        page: filters.page ?? 1,
        limit: filters.limit ?? 20,
        ...mapFilterParams(filters),
      },
    });

    return {
      data: res.data.data,
      meta: res.data.meta as unknown as PlaceListResponse['meta'],
    };
  },

  async getPlaceById(id: number): Promise<PlaceItem> {
    const res = await apiClient.get<ApiResponse<PlaceItem>>(`/places/${id}`);
    return res.data.data;
  },

  async getFoodRecommendations(
    params: FoodRecommendationQueryParams,
  ): Promise<FoodRecommendationsResponse> {
    const res = await apiClient.get<ApiResponse<PlaceItem[]>>(
      '/places/food-recommendations',
      {
        params: {
          ...(params.city ? { city: params.city } : {}),
          ...(params.lat !== undefined ? { lat: params.lat } : {}),
          ...(params.lng !== undefined ? { lng: params.lng } : {}),
          ...(params.temperatureC !== undefined
            ? { temperature_c: params.temperatureC }
            : {}),
          ...(params.rainProbability !== undefined
            ? { rain_probability: params.rainProbability }
            : {}),
          page: params.page ?? 1,
          limit: params.limit ?? 15,
        },
      },
    );

    return {
      data: res.data.data,
      meta: res.data.meta as unknown as FoodRecommendationsResponse['meta'],
    };
  },
};
