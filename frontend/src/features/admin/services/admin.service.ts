import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type { Coordinates } from '@/shared/types/geo.types';

export interface AdminCreatePlaceRequest {
  name: string;
  city: string;
  category: 'attraction' | 'restaurant' | 'cafe';
  subcategory?: string;
  isOutdoor: boolean;
  hasAc?: boolean;
  suitableWeather: string[];
  priceLevel?: number;
  rating?: number;
  address?: string;
  description?: string;
  location: Coordinates;
}

export interface AdminCreateStayRequest {
  name: string;
  city: string;
  stayType: 'hotel' | 'homestay' | 'resort';
  pricePerNight: number;
  rating?: number;
  address?: string;
  amenities?: string[];
  location: Coordinates;
}

export const adminService = {
  async createPlace(payload: AdminCreatePlaceRequest) {
    const res = await apiClient.post<ApiResponse<unknown>>(
      '/admin/places',
      payload,
    );
    return res.data.data;
  },

  async softDeletePlace(id: number): Promise<void> {
    await apiClient.delete(`/admin/places/${id}`);
  },

  async createStay(payload: AdminCreateStayRequest) {
    const res = await apiClient.post<ApiResponse<unknown>>(
      '/admin/stays',
      payload,
    );
    return res.data.data;
  },

  async softDeleteStay(id: number): Promise<void> {
    await apiClient.delete(`/admin/stays/${id}`);
  },
};
