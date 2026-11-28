import { apiClient } from '@/shared/lib/axios';
import type { ApiResponse } from '@/shared/types/api.types';
import type {
  PlanBCandidatesResponse,
  PlanBHistoryItem,
  PublicWeatherForecastResponse,
  SimulateRainRequest,
  SwapPlanBRequest,
  SwapPlanBResponse,
  SyncWeatherResponse,
} from '../types/weather-fallback.types';

export const weatherFallbackService = {
  async syncTripWeather(
    tripId: number,
    simulateRain?: SimulateRainRequest,
  ): Promise<SyncWeatherResponse> {
    const res = await apiClient.post<ApiResponse<SyncWeatherResponse>>(
      `/trips/${tripId}/weather-sync`,
      simulateRain ? { simulateRain } : {},
    );
    return res.data.data;
  },

  async getPlanBCandidates(
    tripId: number,
    itemId: number,
  ): Promise<PlanBCandidatesResponse> {
    const res = await apiClient.get<ApiResponse<PlanBCandidatesResponse>>(
      `/trips/${tripId}/items/${itemId}/plan-b-candidates`,
    );
    return res.data.data;
  },

  async swapPlanB(
    tripId: number,
    itemId: number,
    payload: SwapPlanBRequest,
  ): Promise<SwapPlanBResponse> {
    const res = await apiClient.post<ApiResponse<SwapPlanBResponse>>(
      `/trips/${tripId}/items/${itemId}/swap-plan-b`,
      payload,
    );
    return res.data.data;
  },

  async getPlanBHistory(tripId: number): Promise<PlanBHistoryItem[]> {
    const res = await apiClient.get<ApiResponse<PlanBHistoryItem[]>>(
      `/trips/${tripId}/plan-b-history`,
    );
    return res.data.data;
  },

  async getPublicForecast(city: string): Promise<PublicWeatherForecastResponse> {
    const res = await apiClient.get<ApiResponse<PublicWeatherForecastResponse>>(
      '/weather/forecast',
      { params: { city } },
    );
    return res.data.data;
  },
};
