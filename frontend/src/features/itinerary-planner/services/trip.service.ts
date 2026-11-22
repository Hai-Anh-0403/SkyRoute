import type { Coordinates } from '@/shared/types/geo.types';
import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  AddItineraryItemRequest,
  CreateTripRequest,
  ItineraryItem,
  ReorderItemEntry,
  ReorderItineraryResponse,
  TripDetail,
  TripSummary,
  UpdateTripRequest,
} from '../types/trip.types';

export const tripService = {
  async listTrips(): Promise<TripSummary[]> {
    const res = await apiClient.get<ApiResponse<TripSummary[]>>('/trips', {
      params: { page: 1, limit: 50 },
    });
    return res.data.data;
  },

  async createTrip(payload: CreateTripRequest): Promise<TripSummary> {
    const res = await apiClient.post<ApiResponse<TripSummary>>(
      '/trips',
      payload,
    );
    return res.data.data;
  },

  async getTripDetail(tripId: number): Promise<TripDetail> {
    const res = await apiClient.get<ApiResponse<TripDetail>>(
      `/trips/${tripId}`,
    );
    return res.data.data;
  },

  async updateTrip(
    tripId: number,
    payload: UpdateTripRequest,
  ): Promise<TripSummary> {
    const res = await apiClient.patch<ApiResponse<TripSummary>>(
      `/trips/${tripId}`,
      payload,
    );
    return res.data.data;
  },

  async deleteTrip(tripId: number): Promise<void> {
    await apiClient.delete(`/trips/${tripId}`);
  },

  async addItem(
    tripId: number,
    payload: AddItineraryItemRequest,
  ): Promise<{ item: ItineraryItem; centroidLocation: Coordinates | null }> {
    const res = await apiClient.post<
      ApiResponse<{ item: ItineraryItem; centroidLocation: Coordinates | null }>
    >(`/trips/${tripId}/items`, payload);
    return res.data.data;
  },

  async reorderItems(
    tripId: number,
    items: ReorderItemEntry[],
  ): Promise<ReorderItineraryResponse> {
    const res = await apiClient.patch<ApiResponse<ReorderItineraryResponse>>(
      `/trips/${tripId}/items/reorder`,
      { items },
    );
    return res.data.data;
  },

  async deleteItem(tripId: number, itemId: number): Promise<void> {
    await apiClient.delete(`/trips/${tripId}/items/${itemId}`);
  },
};
