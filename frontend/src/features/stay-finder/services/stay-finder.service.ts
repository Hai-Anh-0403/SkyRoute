import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  CentroidStaysQueryParams,
  CentroidStaysResponse,
  PublicStayItem,
  PublicStaysQueryParams,
  PublicStaysResponse,
} from '../types/stay-finder.types';

export const stayFinderService = {
  async getCentroidStays(
    tripId: number,
    params?: CentroidStaysQueryParams,
  ): Promise<CentroidStaysResponse> {
    const res = await apiClient.get<ApiResponse<CentroidStaysResponse>>(
      `/trips/${tripId}/centroid-stays`,
      {
        params: {
          ...(params?.stayType ? { stay_type: params.stayType } : {}),
          ...(params?.minPrice !== undefined
            ? { min_price: params.minPrice }
            : {}),
          ...(params?.maxPrice !== undefined
            ? { max_price: params.maxPrice }
            : {}),
          ...(params?.limit !== undefined ? { limit: params.limit } : {}),
        },
      },
    );
    return res.data.data;
  },

  async listPublicStays(
    params: PublicStaysQueryParams = {},
  ): Promise<PublicStaysResponse> {
    const res = await apiClient.get<ApiResponse<PublicStayItem[]>>('/stays', {
      params: {
        ...(params.city ? { city: params.city } : {}),
        ...(params.stayType ? { stay_type: params.stayType } : {}),
        ...(params.minPrice !== undefined
          ? { min_price: params.minPrice }
          : {}),
        ...(params.maxPrice !== undefined
          ? { max_price: params.maxPrice }
          : {}),
        sort: params.sort ?? 'rating',
        order: params.order ?? 'desc',
        page: params.page ?? 1,
        limit: params.limit ?? 20,
      },
    });
    return {
      data: res.data.data,
      meta: res.data.meta as unknown as PublicStaysResponse['meta'],
    };
  },
};
