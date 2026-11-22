'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useUpdateTrip } from '../hooks/useTripQueries';
import type { TripStatusType, TripSummary } from '../types/trip.types';

interface TripEditModalProps {
  trip: TripSummary | null;
  onClose: () => void;
}

const EDIT_TRIP_SCHEMA = z
  .object({
    title: z.string().trim().min(2, 'Tên chuyến đi tối thiểu 2 ký tự'),
    destinationCity: z.string().trim().min(2, 'Vui lòng nhập thành phố'),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    endDate: z.string().min(1, 'Chọn ngày kết thúc'),
    status: z.enum(['draft', 'active', 'completed', 'archived']),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
    path: ['endDate'],
  });

type EditTripFormValues = z.infer<typeof EDIT_TRIP_SCHEMA>;

const STATUS_OPTIONS: Array<{ value: TripStatusType; label: string }> = [
  { value: 'draft', label: 'Nháp' },
  { value: 'active', label: 'Đang lên lịch' },
  { value: 'completed', label: 'Hoàn thành' },
  { value: 'archived', label: 'Lưu trữ' },
];

export function TripEditModal({ trip, onClose }: TripEditModalProps) {
  const updateMutation = useUpdateTrip();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EditTripFormValues>({
    resolver: zodResolver(EDIT_TRIP_SCHEMA),
    defaultValues: {
      title: trip?.title ?? '',
      destinationCity: trip?.destinationCity ?? '',
      startDate: trip?.startDate ?? '',
      endDate: trip?.endDate ?? '',
      status: trip?.status ?? 'active',
    },
  });

  useEffect(() => {
    if (!trip) return;
    reset({
      title: trip.title,
      destinationCity: trip.destinationCity,
      startDate: trip.startDate,
      endDate: trip.endDate,
      status: trip.status,
    });
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [trip, reset, onClose]);

  if (!trip) {
    return null;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa chuyến đi"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">
            Chỉnh sửa chuyến đi
          </h2>
          <button
            type="button"
            aria-label="Đóng chỉnh sửa chuyến đi"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) =>
            updateMutation.mutate(
              { tripId: trip.id, payload: values },
              { onSuccess: () => onClose() },
            ),
          )}
          noValidate
          className="space-y-3.5 p-5"
        >
          <div>
            <label
              htmlFor="edit-trip-title"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Tên chuyến đi
            </label>
            <input
              id="edit-trip-title"
              type="text"
              {...register('title')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-trip-city"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Điểm đến
              </label>
              <input
                id="edit-trip-city"
                type="text"
                {...register('destinationCity')}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label
                htmlFor="edit-trip-status"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Trạng thái
              </label>
              <select
                id="edit-trip-status"
                {...register('status')}
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="edit-trip-start"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Từ ngày
              </label>
              <input
                id="edit-trip-start"
                type="date"
                {...register('startDate')}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="edit-trip-end"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Đến ngày
              </label>
              <input
                id="edit-trip-end"
                type="date"
                {...register('endDate')}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              />
              {errors.endDate && (
                <p className="mt-1 text-xs text-rose-600">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-lg bg-sky-600 px-4 py-2 text-xs font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
            >
              {updateMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
