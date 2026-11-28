'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, X } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { SKYROUTE_CITIES } from '@/shared/lib/cities';
import { useCreateTrip } from '../hooks/useTripQueries';

const createTripSchema = z
  .object({
    title: z.string().trim().min(2, 'Tên chuyến đi tối thiểu 2 ký tự'),
    destinationCity: z.string().trim().min(2, 'Vui lòng nhập thành phố'),
    startDate: z.string().min(1, 'Chọn ngày bắt đầu'),
    endDate: z.string().min(1, 'Chọn ngày kết thúc'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu',
    path: ['endDate'],
  });

type CreateTripFormValues = z.infer<typeof createTripSchema>;

export interface CreateTripPrefill {
  title?: string;
  destinationCity?: string;
  startDate?: string;
  endDate?: string;
}

interface CreateTripModalProps {
  isOpen: boolean;
  prefill?: CreateTripPrefill | null;
  onClose: () => void;
}

function getDefaultDates(days = 3): { startDate: string; endDate: string } {
  const start = new Date();
  start.setDate(start.getDate() + 7);
  const end = new Date(start);
  end.setDate(start.getDate() + Math.max(1, days - 1));
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { startDate: fmt(start), endDate: fmt(end) };
}

export function CreateTripModal({
  isOpen,
  prefill,
  onClose,
}: CreateTripModalProps) {
  const createMutation = useCreateTrip();
  const defaults = getDefaultDates(3);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateTripFormValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: prefill?.title ?? '',
      destinationCity: prefill?.destinationCity ?? 'Da Lat',
      startDate: prefill?.startDate ?? defaults.startDate,
      endDate: prefill?.endDate ?? defaults.endDate,
    },
  });

  useEffect(() => {
    if (!isOpen) return;
    const nextDefaults = getDefaultDates(3);
    reset({
      title: prefill?.title ?? '',
      destinationCity: prefill?.destinationCity ?? 'Da Lat',
      startDate: prefill?.startDate ?? nextDefaults.startDate,
      endDate: prefill?.endDate ?? nextDefaults.endDate,
    });
  }, [isOpen, prefill, reset]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-trip-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2
              id="create-trip-modal-title"
              className="font-editorial flex items-center gap-2 text-xl font-bold text-slate-900"
            >
              <Plus className="h-5 w-5 text-sky-600" aria-hidden="true" />
              Tạo chuyến đi mới
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Chọn điểm đến và ngày đi để mở không gian lập lịch 4 khung giờ.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ tạo chuyến đi"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit((values) => {
            createMutation.mutate(values, {
              onSuccess: () => onClose(),
            });
          })}
          noValidate
          className="space-y-4"
        >
          <div>
            <label
              htmlFor="modal-trip-title"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Tên chuyến đi
            </label>
            <input
              id="modal-trip-title"
              type="text"
              placeholder="Đà Lạt 3N2Đ Chữa Lành"
              {...register('title')}
              className="w-full rounded-xl border border-stone-300 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            {errors.title && (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="modal-trip-city"
              className="mb-1 block text-xs font-semibold text-slate-700"
            >
              Điểm đến
            </label>
            <select
              id="modal-trip-city"
              {...register('destinationCity')}
              className="w-full rounded-xl border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            >
              {SKYROUTE_CITIES.map((city) => (
                <option key={city.slug} value={city.canonicalName}>
                  {city.displayName} ({city.region})
                </option>
              ))}
            </select>
            {errors.destinationCity && (
              <p role="alert" className="mt-1 text-xs text-rose-600">
                {errors.destinationCity.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="modal-trip-start"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Từ ngày
              </label>
              <input
                id="modal-trip-start"
                type="date"
                {...register('startDate')}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
            </div>
            <div>
              <label
                htmlFor="modal-trip-end"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Đến ngày
              </label>
              <input
                id="modal-trip-end"
                type="date"
                {...register('endDate')}
                className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              />
              {errors.endDate && (
                <p role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.endDate.message}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-stone-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-stone-100"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-60"
            >
              {createMutation.isPending ? 'Đang tạo...' : 'Tạo & Mở Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
