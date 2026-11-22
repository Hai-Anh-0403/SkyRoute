'use client';

import { BedDouble, MapPin, Navigation, Plus, Star } from 'lucide-react';
import type { Coordinates } from '@/shared/types/geo.types';
import type { RecommendedStayItem, StayType } from '../types/stay-finder.types';

interface StayComparisonCardProps {
  stay: RecommendedStayItem;
  rank: number;
  isHovered?: boolean;
  onHover?: (stayId: number | null) => void;
  onFocusMap: (coords: Coordinates) => void;
  onAddStay?: (stayId: number) => void;
  isAddingStay?: boolean;
}

const STAY_TYPE_BADGE: Record<StayType, { label: string; className: string }> = {
  hotel: { label: 'Khách sạn', className: 'bg-sky-50 text-sky-700 border-sky-200' },
  homestay: {
    label: 'Homestay',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  resort: {
    label: 'Resort',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
};

function formatPriceVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ/đêm`;
}

export function StayComparisonCard({
  stay,
  rank,
  isHovered = false,
  onHover,
  onFocusMap,
  onAddStay,
  isAddingStay = false,
}: StayComparisonCardProps) {
  const badge = STAY_TYPE_BADGE[stay.stayType];

  return (
    <article
      onMouseEnter={() => onHover?.(stay.id)}
      onMouseLeave={() => onHover?.(null)}
      onFocus={() => onHover?.(stay.id)}
      onBlur={() => onHover?.(null)}
      className={`rounded-xl border bg-white p-4 transition ${
        isHovered
          ? 'border-amber-400 ring-2 ring-amber-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-800">
              {rank}
            </span>
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${badge.className}`}
            >
              {badge.label}
            </span>
            <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-600">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500" />
              {stay.rating.toFixed(1)}
            </span>
          </div>
          <h4 className="mt-1.5 text-sm font-bold text-slate-900">
            {stay.name}
          </h4>
        </div>

        <div className="shrink-0 text-right">
          <div className="text-sm font-bold text-slate-900">
            {formatPriceVnd(stay.pricePerNight)}
          </div>
        </div>
      </div>

      <div className="mt-2.5 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2.5 text-xs">
        <div className="flex items-center gap-1.5 text-slate-700">
          <Navigation className="h-3.5 w-3.5 shrink-0 text-amber-600" />
          <span>
            Cách tâm:{' '}
            <strong className="text-slate-900">
              {stay.distanceToCentroidKm.toFixed(2)} km
            </strong>
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-slate-700">
          <BedDouble className="h-3.5 w-3.5 shrink-0 text-teal-600" />
          <span>
            TB điểm chơi:{' '}
            <strong className="text-slate-900">
              {stay.avgDistanceToItineraryPlacesKm.toFixed(2)} km
            </strong>
          </span>
        </div>
      </div>

      {stay.address && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-slate-500">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
          <span>{stay.address}</span>
        </p>
      )}

      {stay.amenities.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {stay.amenities.slice(0, 4).map((amenity) => (
            <span
              key={amenity}
              className="rounded bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600"
            >
              {amenity}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onFocusMap(stay.location)}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          <MapPin className="h-3.5 w-3.5" />
          Xem trên bản đồ
        </button>
        {onAddStay && (
          <button
            type="button"
            disabled={isAddingStay}
            onClick={() => onAddStay(stay.id)}
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-teal-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Ghim lưu trú
          </button>
        )}
      </div>
    </article>
  );
}
