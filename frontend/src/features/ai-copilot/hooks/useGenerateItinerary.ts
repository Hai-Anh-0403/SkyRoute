'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { tripService } from '@/features/itinerary-planner';
import { weatherFallbackService } from '@/features/weather-fallback';
import type { ApiErrorResponse } from '@/shared/types/api.types';
import { aiCopilotService } from '../services/ai-copilot.service';
import type {
  GeneratedItinerarySlotItem,
  GenerateItineraryRequest,
} from '../types/ai-copilot.types';

function extractError(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<ApiErrorResponse>;
  return axiosError?.response?.data?.error?.message ?? fallback;
}

export function useGenerateItinerary() {
  return useMutation({
    mutationFn: (payload: GenerateItineraryRequest) =>
      aiCopilotService.generateItinerary(payload),
    onError: (err) => {
      toast.error(extractError(err, 'Không thể tạo gợi ý lịch trình từ AI.'));
    },
  });
}

export function useApplyGeneratedItinerary(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (items: GeneratedItinerarySlotItem[]) => {
      for (const item of items) {
        await tripService.addItem(tripId, {
          placeId: item.placeId,
          dayNumber: item.dayNumber,
          timeSlot: item.timeSlot,
          note: item.reason,
        });
      }
      try {
        await weatherFallbackService.syncTripWeather(tripId);
      } catch {
        // Weather sync after bulk apply is best-effort
      }
      return items.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['centroid-stays', tripId] });
      toast.success(`Đã áp dụng ${count} địa điểm thực tế vào lịch trình!`);
    },
    onError: (err) => {
      toast.error(
        extractError(err, 'Không thể áp dụng toàn bộ địa điểm vào lịch trình.'),
      );
    },
  });
}
