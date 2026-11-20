'use client';

import type { DiscoveryFilters, PlaceCategory } from '../types/discovery.types';

interface MultiLayerFilterBarProps {
  filters: DiscoveryFilters;
  onChange: (next: DiscoveryFilters) => void;
}

const CATEGORY_OPTIONS: Array<{ label: string; value?: PlaceCategory }> = [
  { label: 'Tất cả' },
  { label: 'Tham quan', value: 'attraction' },
  { label: 'Ẩm thực', value: 'restaurant' },
  { label: 'Cà phê', value: 'cafe' },
];

const WEATHER_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Ngày mưa', value: 'rainy' },
  { label: 'Trời lạnh', value: 'cold' },
  { label: 'Trời nắng', value: 'sunny' },
];

export function MultiLayerFilterBar({
  filters,
  onChange,
}: MultiLayerFilterBarProps) {
  const hasActiveFilters =
    Boolean(filters.category) ||
    filters.isOutdoor !== undefined ||
    Boolean(filters.weatherTag) ||
    Boolean(filters.hasAc);

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Bộ lọc đa lớp
        </span>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => onChange({ city: filters.city })}
            className="text-xs font-medium text-rose-600 hover:underline"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-1.5">
        {CATEGORY_OPTIONS.map((opt) => {
          const active = filters.category === opt.value;
          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onChange({ ...filters, category: opt.value })}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                active
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Indoor / Outdoor Filter */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange({ ...filters, isOutdoor: undefined })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            filters.isOutdoor === undefined
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Mọi không gian
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, isOutdoor: false })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            filters.isOutdoor === false
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Trong nhà (Indoor)
        </button>
        <button
          type="button"
          onClick={() => onChange({ ...filters, isOutdoor: true })}
          className={`rounded-full px-3 py-1 text-xs font-medium transition ${
            filters.isOutdoor === true
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          Ngoài trời (Outdoor)
        </button>
      </div>

      {/* Weather & AC Chips */}
      <div className="flex flex-wrap gap-1.5">
        {WEATHER_OPTIONS.map((w) => {
          const active = filters.weatherTag === w.value;
          return (
            <button
              key={w.value}
              type="button"
              onClick={() =>
                onChange({
                  ...filters,
                  weatherTag: active ? undefined : w.value,
                })
              }
              className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                active
                  ? 'border-sky-600 bg-sky-50 text-sky-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              {w.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              hasAc: filters.hasAc ? undefined : true,
            })
          }
          className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
            filters.hasAc
              ? 'border-cyan-600 bg-cyan-50 text-cyan-700'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
          }`}
        >
          Có điều hòa
        </button>
      </div>
    </div>
  );
}
