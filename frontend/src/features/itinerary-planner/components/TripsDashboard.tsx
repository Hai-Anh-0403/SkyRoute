'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Calendar,
  MapPin,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ProfilePreferencesModal } from '@/features/auth';
import { SKYROUTE_CITIES } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';
import {
  useCreateTrip,
  useDeleteTrip,
  useTripsList,
} from '../hooks/useTripQueries';
import type { TripStatusType, TripSummary } from '../types/trip.types';
import { TripEditModal } from './TripEditModal';

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

const STATUS_BADGE: Record<TripStatusType, string> = {
  draft: 'Nháp',
  active: 'Đang lên lịch',
  completed: 'Hoàn thành',
  archived: 'Lưu trữ',
};

export function TripsDashboard() {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripSummary | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const tripsQuery = useTripsList();
  const createMutation = useCreateTrip();
  const deleteMutation = useDeleteTrip();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateTripFormValues>({
    resolver: zodResolver(createTripSchema),
    defaultValues: {
      title: '',
      destinationCity: 'Da Lat',
      startDate: '2026-12-01',
      endDate: '2026-12-03',
    },
  });

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Chuyến đi của bạn
          </h1>
          <p className="text-sm text-slate-500">
            Tạo mới, chỉnh sửa hoặc mở không gian lập lịch trình thích ứng thời
            tiết.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsProfileOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3.5 py-2 text-xs font-semibold text-sky-700 hover:bg-sky-100"
          >
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Hồ sơ & Sở thích
          </button>
          <Link
            href={ROUTES.EXPLORE_CITY('da-lat')}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Khám phá Radar Đà Lạt
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <form
          onSubmit={handleSubmit((v) => createMutation.mutate(v))}
          noValidate
          className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-5"
        >
          <h2 className="flex items-center gap-1.5 text-base font-semibold text-slate-900">
            <Plus className="h-4 w-4 text-sky-600" />
            Tạo chuyến đi mới
          </h2>

          <div>
            <label
              htmlFor="trip-title"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Tên chuyến đi
            </label>
            <input
              id="trip-title"
              type="text"
              placeholder="Đà Lạt 3N2Đ Chữa Lành"
              {...register('title')}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
            {errors.title && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.title.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="trip-city"
              className="mb-1 block text-xs font-medium text-slate-700"
            >
              Điểm đến
            </label>
            <select
              id="trip-city"
              {...register('destinationCity')}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
            >
              {SKYROUTE_CITIES.map((city) => (
                <option key={city.slug} value={city.canonicalName}>
                  {city.displayName} ({city.region})
                </option>
              ))}
            </select>
            {errors.destinationCity && (
              <p className="mt-1 text-xs text-rose-600">
                {errors.destinationCity.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="trip-start"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Từ ngày
              </label>
              <input
                id="trip-start"
                type="date"
                {...register('startDate')}
                className="w-full rounded-lg border border-slate-300 px-2.5 py-2 text-sm"
              />
            </div>
            <div>
              <label
                htmlFor="trip-end"
                className="mb-1 block text-xs font-medium text-slate-700"
              >
                Đến ngày
              </label>
              <input
                id="trip-end"
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

          <button
            type="submit"
            disabled={createMutation.isPending}
            className="w-full rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {createMutation.isPending ? 'Đang tạo...' : 'Tạo & Mở Workspace'}
          </button>
        </form>

        <div className="space-y-3 lg:col-span-7">
          {tripsQuery.isLoading && (
            <div className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-white" />
          )}

          {tripsQuery.isError && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
              Hãy{' '}
              <Link href={ROUTES.LOGIN} className="font-semibold underline">
                đăng nhập
              </Link>{' '}
              để xem và lưu danh sách chuyến đi của bạn.
            </div>
          )}

          {(tripsQuery.data ?? []).map((trip) => (
            <article
              key={trip.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-sky-300"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={ROUTES.TRIP_WORKSPACE(trip.id)}
                      className="font-semibold text-slate-900 hover:text-sky-600"
                    >
                      {trip.title}
                    </Link>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      {STATUS_BADGE[trip.status]}
                    </span>
                    <span className="rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700">
                      {trip.totalDays} ngày
                    </span>
                  </div>
                  <div className="mt-1.5 flex items-center gap-4 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {trip.destinationCity}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" /> {trip.startDate} →{' '}
                      {trip.endDate}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Link
                    href={ROUTES.TRIP_WORKSPACE(trip.id)}
                    className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                  >
                    Mở Workspace
                  </Link>
                  <button
                    type="button"
                    aria-label={`Sửa chuyến đi ${trip.title}`}
                    onClick={() => setEditingTrip(trip)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Sửa
                  </button>
                  {confirmDeleteId === trip.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={deleteMutation.isPending}
                        onClick={() =>
                          deleteMutation.mutate(trip.id, {
                            onSuccess: () => setConfirmDeleteId(null),
                          })
                        }
                        className="rounded-lg bg-rose-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                      >
                        Xác nhận xóa
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
                      >
                        Hủy
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      aria-label={`Xóa chuyến đi ${trip.title}`}
                      onClick={() => setConfirmDeleteId(trip.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Xóa
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <ProfilePreferencesModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />
      <TripEditModal
        trip={editingTrip}
        onClose={() => setEditingTrip(null)}
      />
    </div>
  );
}
