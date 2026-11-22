'use client';

import { CloudRain, Flame, Sun, Utensils } from 'lucide-react';
import { useState } from 'react';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { useWeatherFood } from '../hooks/useWeatherFood';
import type { PlaceItem, WeatherFoodProfile } from '../types/discovery.types';

export type WeatherFoodPresetId = 'cold_rainy' | 'mild' | 'hot_sunny';

export interface WeatherFoodPreset {
  id: WeatherFoodPresetId;
  label: string;
  temperatureC: number;
  rainProbability: number;
}

export const WEATHER_FOOD_PRESETS: WeatherFoodPreset[] = [
  {
    id: 'cold_rainy',
    label: 'Lạnh / Mưa 16°C • 75%',
    temperatureC: 16,
    rainProbability: 75,
  },
  {
    id: 'mild',
    label: 'Mát mẻ 22°C • 15%',
    temperatureC: 22,
    rainProbability: 15,
  },
  {
    id: 'hot_sunny',
    label: 'Nắng nóng 34°C • 5%',
    temperatureC: 34,
    rainProbability: 5,
  },
];

const PROFILE_BADGE: Record<
  WeatherFoodProfile,
  { title: string; hint: string; className: string }
> = {
  cold_rainy: {
    title: 'Thời tiết se lạnh / mưa (cold_rainy)',
    hint: 'Ưu tiên lẩu, đồ nướng, món nóng trong nhà.',
    className: 'border-amber-200 bg-amber-50 text-amber-900',
  },
  hot_sunny: {
    title: 'Thời tiết nắng nóng (hot_sunny)',
    hint: 'Ưu tiên không gian có điều hòa và món giải khát.',
    className: 'border-sky-200 bg-sky-50 text-sky-900',
  },
  mild: {
    title: 'Thời tiết ôn hòa (mild)',
    hint: 'Đề xuất các quán ăn và cà phê đánh giá cao gần bạn.',
    className: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  },
};

interface WeatherFoodPanelProps {
  city: string;
  lat: number;
  lng: number;
  presetId?: WeatherFoodPresetId;
  onPresetChange?: (preset: WeatherFoodPreset) => void;
  onSelectPlace?: (place: PlaceItem) => void;
  actionLabel?: string;
}

export function WeatherFoodPanel({
  city,
  lat,
  lng,
  presetId,
  onPresetChange,
  onSelectPlace,
  actionLabel = '+ Thêm',
}: WeatherFoodPanelProps) {
  const [internalPresetId, setInternalPresetId] =
    useState<WeatherFoodPresetId>('cold_rainy');
  const setHoveredPlaceId = useWorkspaceStore((s) => s.setHoveredPlaceId);
  const hoveredPlaceId = useWorkspaceStore((s) => s.hoveredPlaceId);

  const activeId = presetId ?? internalPresetId;
  const activePreset =
    WEATHER_FOOD_PRESETS.find((p) => p.id === activeId) ??
    WEATHER_FOOD_PRESETS[0];

  const foodQuery = useWeatherFood({
    city,
    lat,
    lng,
    temperatureC: activePreset.temperatureC,
    rainProbability: activePreset.rainProbability,
    limit: 15,
  });

  const places = foodQuery.data?.data ?? [];
  const activeProfile =
    foodQuery.data?.meta?.weatherProfile ?? activePreset.id;
  const badge = PROFILE_BADGE[activeProfile];

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <Utensils className="h-3.5 w-3.5 text-amber-600" />
          Ngữ cảnh thời tiết ẩm thực
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WEATHER_FOOD_PRESETS.map((preset) => {
            const active = preset.id === activePreset.id;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setInternalPresetId(preset.id);
                  onPresetChange?.(preset);
                }}
                className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition ${
                  active
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {preset.id === 'cold_rainy' && (
                  <CloudRain className="h-3 w-3" />
                )}
                {preset.id === 'hot_sunny' && <Sun className="h-3 w-3" />}
                {preset.id === 'mild' && <Flame className="h-3 w-3" />}
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`rounded-xl border p-3 text-xs ${badge.className}`}>
        <div className="font-semibold">{badge.title}</div>
        <p className="mt-0.5 opacity-90">{badge.hint}</p>
      </div>

      {foodQuery.isLoading && (
        <div className="space-y-2" aria-busy="true" aria-label="Đang tải quán ăn">
          {[1, 2, 3].map((n) => (
            <div
              key={n}
              className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
            />
          ))}
        </div>
      )}

      {foodQuery.isError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          Không thể tải gợi ý ẩm thực theo thời tiết.
        </div>
      )}

      {!foodQuery.isLoading && !foodQuery.isError && places.length === 0 && (
        <div
          role="status"
          className="rounded-xl border border-slate-200 bg-white p-5 text-center text-sm text-slate-500"
        >
          Chưa có quán ăn phù hợp cho điều kiện thời tiết này tại {city}.
        </div>
      )}

      <div className="space-y-2">
        {places.map((place) => (
          <div
            key={place.id}
            onMouseEnter={() => setHoveredPlaceId(place.id)}
            onMouseLeave={() => setHoveredPlaceId(null)}
            className={`rounded-xl border bg-white p-3.5 transition ${
              hoveredPlaceId === place.id
                ? 'border-amber-500 ring-2 ring-amber-200'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-900">
                  {place.name}
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {place.address ?? place.city}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                {place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
              </span>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <span className="font-medium text-amber-600">
                  ★ {place.rating.toFixed(1)}
                </span>
                {place.subcategory && (
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 text-amber-800">
                    {place.subcategory}
                  </span>
                )}
                {place.hasAc && (
                  <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-cyan-800">
                    Điều hòa
                  </span>
                )}
                {place.distanceKm !== undefined && (
                  <span className="font-medium text-sky-700">
                    {place.distanceKm.toFixed(2)} km
                  </span>
                )}
              </div>
              {onSelectPlace && (
                <button
                  type="button"
                  onClick={() => onSelectPlace(place)}
                  className="rounded-lg bg-sky-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-sky-700"
                >
                  {actionLabel}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
