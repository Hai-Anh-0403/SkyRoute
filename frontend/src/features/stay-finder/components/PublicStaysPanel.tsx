'use client';

import { BedDouble, MapPin, Star } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { usePublicStays } from '../hooks/usePublicStays';
import type { StayType } from '../types/stay-finder.types';

interface PublicStaysPanelProps {
  city: string;
}

const STAY_TYPE_OPTIONS: Array<{ value: StayType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hotel', label: 'Khách sạn' },
  { value: 'homestay', label: 'Homestay' },
  { value: 'resort', label: 'Resort' },
];

const STAY_LABELS: Record<StayType, string> = {
  hotel: 'Khách sạn',
  homestay: 'Homestay',
  resort: 'Resort',
};

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ/đêm`;
}

export function PublicStaysPanel({ city }: PublicStaysPanelProps) {
  const [stayType, setStayType] = useState<StayType | 'all'>('all');
  const [sortMode, setSortMode] = useState<'rating' | 'price'>('rating');

  const setFocusedMapCoords = useWorkspaceStore((s) => s.setFocusedMapCoords);

  const staysQuery = usePublicStays({
    city,
    ...(stayType === 'all' ? {} : { stayType }),
    sort: sortMode === 'rating' ? 'rating' : 'price_per_night',
    order: sortMode === 'rating' ? 'desc' : 'asc',
    limit: 24,
  });

  const stays = staysQuery.data?.data ?? [];

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <BedDouble className="h-3.5 w-3.5 text-teal-600" />
            Lưu trú tại {city}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => setSortMode('rating')}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                sortMode === 'rating'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Đánh giá cao
            </button>
            <button
              type="button"
              onClick={() => setSortMode('price')}
              className={`rounded-md px-2 py-0.5 text-[11px] font-medium ${
                sortMode === 'price'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Giá thấp nhất
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {STAY_TYPE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStayType(opt.value)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                stayType === opt.value
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {staysQuery.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải lưu trú">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      )}

      {staysQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Không thể tải danh sách cơ sở lưu trú.
        </div>
      )}

      {!staysQuery.isLoading && !staysQuery.isError && stays.length === 0 && (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500"
        >
          Chưa có cơ sở lưu trú phù hợp bộ lọc tại {city}.
        </div>
      )}

      <div className="space-y-2">
        {stays.map((stay) => (
          <article
            key={stay.id}
            className="rounded-xl border border-slate-200 bg-white p-3.5 hover:border-slate-300"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-[11px]">
                  <span className="rounded bg-teal-50 px-2 py-0.5 font-medium text-teal-700">
                    {STAY_LABELS[stay.stayType]}
                  </span>
                  <span className="inline-flex items-center gap-0.5 font-semibold text-amber-600">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-500" />
                    {stay.rating.toFixed(1)}
                  </span>
                </div>
                <h3 className="mt-1 truncate font-semibold text-slate-900">
                  {stay.name}
                </h3>
                {stay.address && (
                  <p className="mt-0.5 text-xs text-slate-500">{stay.address}</p>
                )}
              </div>
              <div className="shrink-0 text-right text-xs font-bold text-slate-900">
                {formatVnd(stay.pricePerNight)}
              </div>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-2">
              <div className="flex flex-wrap gap-1">
                {stay.amenities.slice(0, 3).map((amenity) => (
                  <span
                    key={amenity}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600"
                  >
                    {amenity}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setFocusedMapCoords(stay.location)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                <MapPin className="h-3.5 w-3.5" />
                Xem trên bản đồ
              </button>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
