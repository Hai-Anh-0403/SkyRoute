'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { toast } from 'sonner';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { ApiErrorResponse } from '@/shared/types/api.types';
import { weatherFallbackService } from '../services/weather-fallback.service';
import type {
  SimulateRainRequest,
  SwapPlanBRequest,
} from '../types/weather-fallback.types';

function extractError(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<ApiErrorResponse>;
  return axiosError?.response?.data?.error?.message ?? fallback;
}

export function useSyncTripWeather(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (simulateRain?: SimulateRainRequest) =>
      weatherFallbackService.syncTripWeather(tripId, simulateRain),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      if (res.conflictCount > 0) {
        toast.warning(
          `Phát hiện ${res.conflictCount} hoạt động ngoài trời có nguy cơ mưa lớn!`,
        );
      } else {
        toast.success('Đã đồng bộ thời tiết cho toàn bộ lịch trình');
      }
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể đồng bộ thời tiết.'));
    },
  });
}

export function usePlanBCandidates(tripId: number, itemId: number | null) {
  return useQuery({
    queryKey: ['plan-b', tripId, itemId],
    queryFn: () => weatherFallbackService.getPlanBCandidates(tripId, itemId!),
    enabled: Number.isFinite(tripId) && tripId > 0 && itemId !== null,
  });
}

export function useSwapPlanB(tripId: number) {
  const queryClient = useQueryClient();
  const setActivePlanBItemId = useWorkspaceStore((s) => s.setActivePlanBItemId);

  return useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: number;
      payload: SwapPlanBRequest;
    }) => weatherFallbackService.swapPlanB(tripId, itemId, payload),
    onSuccess: () => {
      setActivePlanBItemId(null);
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['centroid-stays', tripId] });
      toast.success('Đã hoán đổi sang địa điểm trong nhà thành công!');
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể thực hiện hoán đổi Kế hoạch B.'));
    },
  });
}
