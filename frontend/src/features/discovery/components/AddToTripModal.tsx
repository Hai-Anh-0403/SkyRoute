'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarPlus, CheckCircle2, MapPin, X } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth';
import {
  tripService,
  useTripsList,
  type TripSummary,
} from '@/features/itinerary-planner';
import { ROUTES } from '@/shared/lib/routes';
import type { TimeSlotType } from '@/shared/types/geo.types';
import type { PlaceItem } from '../types/discovery.types';

const SLOT_OPTIONS: { value: TimeSlotType; label: string }[] = [
  { value: 'morning', label: 'Sáng (08:00 – 11:00)' },
  { value: 'lunch', label: 'Trưa (11:00 – 13:00)' },
  { value: 'afternoon', label: 'Chiều (13:00 – 17:00)' },
  { value: 'dinner', label: 'Tối (17:00 – 22:00)' },
];

interface AddToTripModalProps {
  place: PlaceItem | null;
  onClose: () => void;
}

export function AddToTripModal({ place, onClose }: AddToTripModalProps) {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();
  const tripsQuery = useTripsList();

  const sortedTrips = useMemo<TripSummary[]>(() => {
    const list = tripsQuery.data ?? [];
    if (!place) return list;
    const targetCity = place.city.toLowerCase();
    return [...list].sort((a, b) => {
      const aMatch = a.destinationCity.toLowerCase() === targetCity ? 0 : 1;
      const bMatch = b.destinationCity.toLowerCase() === targetCity ? 0 : 1;
      return aMatch - bMatch;
    });
  }, [tripsQuery.data, place]);

  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [dayNumber, setDayNumber] = useState(1);
  const [timeSlot, setTimeSlot] = useState<TimeSlotType>('morning');

  const effectiveTripId = selectedTripId ?? sortedTrips[0]?.id ?? null;
  const activeTrip = useMemo(
    () => sortedTrips.find((t) => t.id === effectiveTripId) ?? null,
    [sortedTrips, effectiveTripId],
  );

  useEffect(() => {
    if (!place) return;
    setSelectedTripId(null);
    setDayNumber(1);
    setTimeSlot(
      place.category === 'restaurant'
        ? 'lunch'
        : place.category === 'cafe'
          ? 'afternoon'
          : 'morning',
    );
  }, [place]);

  useEffect(() => {
    if (!place) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [place, onClose]);

  const addMutation = useMutation({
    mutationFn: () => {
      if (!place || !effectiveTripId) {
        throw new Error('Missing trip or place');
      }
      return tripService.addItem(effectiveTripId, {
        placeId: place.id,
        dayNumber,
        timeSlot,
      });
    },
    onSuccess: () => {
      if (effectiveTripId) {
        queryClient.invalidateQueries({ queryKey: ['trip', effectiveTripId] });
        queryClient.invalidateQueries({
          queryKey: ['centroid-stays', effectiveTripId],
        });
      }
      toast.success(
        `Đã thêm "${place?.name}" vào ${activeTrip?.title ?? 'chuyến đi'}!`,
      );
      onClose();
    },
    onError: () => {
      toast.error('Không thể thêm địa điểm vào chuyến đi. Vui lòng thử lại.');
    },
  });

  if (!place) return null;

  const totalDays = activeTrip?.totalDays ?? 1;
  const dayOptions = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-to-trip-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-stone-200 bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="add-to-trip-title"
              className="font-editorial flex items-center gap-2 text-lg font-bold text-slate-900"
            >
              <CalendarPlus
                className="h-5 w-5 shrink-0 text-sky-600"
                aria-hidden="true"
              />
              Thêm vào chuyến đi
            </h2>
            <p className="mt-1 flex items-center gap-1 truncate text-xs text-slate-600">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-slate-400" />
              {place.name} • {place.city}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng hộp thoại thêm vào chuyến đi"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {!user ? (
          <div className="rounded-xl border border-stone-200 bg-[#FAFAF9] p-5 text-center">
            <p className="text-sm text-slate-700">
              Đăng nhập để lưu <strong>{place.name}</strong> vào lịch trình 4
              khung giờ của bạn.
            </p>
            <Link
              href={ROUTES.LOGIN}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white transition hover:bg-sky-700"
            >
              Đăng nhập ngay
            </Link>
          </div>
        ) : tripsQuery.isLoading ? (
          <div className="h-28 animate-pulse rounded-xl bg-stone-100" />
        ) : sortedTrips.length === 0 ? (
          <div className="rounded-xl border border-stone-200 bg-[#FAFAF9] p-5 text-center">
            <p className="text-sm text-slate-700">
              Bạn chưa có chuyến đi nào. Tạo chuyến đi đầu tiên để thêm địa điểm
              này nhé.
            </p>
            <Link
              href={ROUTES.TRIPS}
              className="mt-4 inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Tạo chuyến đi mới
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="add-trip-select"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Chọn chuyến đi
              </label>
              <select
                id="add-trip-select"
                value={effectiveTripId ?? ''}
                onChange={(e) => {
                  setSelectedTripId(Number(e.target.value));
                  setDayNumber(1);
                }}
                className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
              >
                {sortedTrips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title} ({trip.destinationCity} • {trip.totalDays} ngày)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="add-trip-day"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Ngày thứ
                </label>
                <select
                  id="add-trip-day"
                  value={dayNumber}
                  onChange={(e) => setDayNumber(Number(e.target.value))}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {dayOptions.map((d) => (
                    <option key={d} value={d}>
                      Ngày {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="add-trip-slot"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Khung giờ
                </label>
                <select
                  id="add-trip-slot"
                  value={timeSlot}
                  onChange={(e) => setTimeSlot(e.target.value as TimeSlotType)}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none"
                >
                  {SLOT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
                type="button"
                disabled={addMutation.isPending || !effectiveTripId}
                onClick={() => addMutation.mutate()}
                className="inline-flex items-center gap-1.5 rounded-full bg-sky-600 px-5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-sky-700 disabled:opacity-60"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {addMutation.isPending ? 'Đang thêm...' : 'Xác nhận thêm'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
