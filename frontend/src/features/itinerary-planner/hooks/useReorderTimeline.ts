'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { tripService } from '../services/trip.service';
import type {
  ItineraryItem,
  ReorderItemEntry,
  TripDetail,
} from '../types/trip.types';

export interface ReorderTimelineVariables {
  payload: ReorderItemEntry[];
  optimisticItems: ItineraryItem[];
}

export function useReorderTimeline(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload }: ReorderTimelineVariables) =>
      tripService.reorderItems(tripId, payload),
    onMutate: async ({ optimisticItems }) => {
      await queryClient.cancelQueries({ queryKey: ['trip', tripId] });
      const previousTrip = queryClient.getQueryData<TripDetail>([
        'trip',
        tripId,
      ]);

      if (previousTrip) {
        queryClient.setQueryData<TripDetail>(['trip', tripId], {
          ...previousTrip,
          items: optimisticItems,
        });
      }

      return { previousTrip };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousTrip) {
        queryClient.setQueryData(['trip', tripId], context.previousTrip);
      }
      toast.error('Không thể lưu thứ tự mới. Đã khôi phục vị trí cũ.');
    },
    onSuccess: (result) => {
      queryClient.setQueryData<TripDetail>(['trip', tripId], (current) =>
        current
          ? {
              ...current,
              centroidLocation: result.centroidLocation,
              items: result.updatedItems,
            }
          : current,
      );
      queryClient.invalidateQueries({ queryKey: ['centroid-stays', tripId] });
    },
  });
}
