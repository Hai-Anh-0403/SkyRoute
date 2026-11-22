'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ROUTES } from '@/shared/lib/routes';
import type { ApiErrorResponse } from '@/shared/types/api.types';
import { tripService } from '../services/trip.service';
import type {
  AddItineraryItemRequest,
  CreateTripRequest,
  UpdateTripRequest,
} from '../types/trip.types';

function extractError(err: unknown, fallback: string): string {
  const axiosError = err as AxiosError<ApiErrorResponse>;
  return axiosError?.response?.data?.error?.message ?? fallback;
}

export function useTripsList() {
  return useQuery({
    queryKey: ['trips'],
    queryFn: () => tripService.listTrips(),
  });
}

export function useCreateTrip() {
  const router = useRouter();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateTripRequest) => tripService.createTrip(payload),
    onSuccess: (trip) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success(`Đã tạo chuyến đi "${trip.title}"`);
      router.push(ROUTES.TRIP_WORKSPACE(trip.id));
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể tạo chuyến đi.'));
    },
  });
}

export function useTripDetail(tripId: number) {
  return useQuery({
    queryKey: ['trip', tripId],
    queryFn: () => tripService.getTripDetail(tripId),
    enabled: Number.isFinite(tripId) && tripId > 0,
  });
}

export function useAddTimelineItem(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddItineraryItemRequest) =>
      tripService.addItem(tripId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['centroid-stays', tripId] });
      toast.success('Đã thêm vào lịch trình');
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể thêm địa điểm vào lịch trình.'));
    },
  });
}

export function useDeleteTimelineItem(tripId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (itemId: number) => tripService.deleteItem(tripId, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trip', tripId] });
      queryClient.invalidateQueries({ queryKey: ['centroid-stays', tripId] });
      toast.success('Đã xóa khỏi lịch trình');
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể xóa mục khỏi lịch trình.'));
    },
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tripId,
      payload,
    }: {
      tripId: number;
      payload: UpdateTripRequest;
    }) => tripService.updateTrip(tripId, payload),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      queryClient.invalidateQueries({ queryKey: ['trip', updated.id] });
      toast.success(`Đã cập nhật chuyến đi "${updated.title}"`);
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể cập nhật chuyến đi.'));
    },
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (tripId: number) => tripService.deleteTrip(tripId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trips'] });
      toast.success('Đã xóa chuyến đi');
    },
    onError: (err) => {
      toast.error(extractError(err, 'Không thể xóa chuyến đi.'));
    },
  });
}
