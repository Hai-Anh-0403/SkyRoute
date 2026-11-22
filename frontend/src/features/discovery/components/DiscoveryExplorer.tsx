'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { PublicStaysPanel } from '@/features/stay-finder';
import { ROUTES } from '@/shared/lib/routes';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { useRadarPlaces } from '../hooks/useRadarPlaces';
import { useWeatherFood } from '../hooks/useWeatherFood';
import type { DiscoveryFilters, PlaceItem } from '../types/discovery.types';
import { InteractiveMap } from './InteractiveMap';
import { MultiLayerFilterBar } from './MultiLayerFilterBar';
import { ProximityRadarControl } from './ProximityRadarControl';
import {
  WEATHER_FOOD_PRESETS,
  WeatherFoodPanel,
  type WeatherFoodPresetId,
} from './WeatherFoodPanel';

interface DiscoveryExplorerProps {
  initialCity: string;
  onSelectPlace?: (place: PlaceItem) => void;
}

const DEFAULT_DALAT_CENTER = { lat: 11.9404, lng: 108.4583 };

export function DiscoveryExplorer({
  initialCity,
  onSelectPlace,
}: DiscoveryExplorerProps) {
  const [activeTab, setActiveTab] = useState<'radar' | 'food' | 'stays'>(
    'radar',
  );
  const [filters, setFilters] = useState<DiscoveryFilters>({
    city: initialCity,
  });
  const [foodPresetId, setFoodPresetId] =
    useState<WeatherFoodPresetId>('cold_rainy');

  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);
  const hoveredPlaceId = useWorkspaceStore((s) => s.hoveredPlaceId);
  const setRadarAnchorCoords = useWorkspaceStore((s) => s.setRadarAnchorCoords);
  const setHoveredPlaceId = useWorkspaceStore((s) => s.setHoveredPlaceId);

  useEffect(() => {
    if (!radarAnchorCoords) {
      setRadarAnchorCoords(DEFAULT_DALAT_CENTER);
    }
  }, [radarAnchorCoords, setRadarAnchorCoords]);

  const anchor = radarAnchorCoords ?? DEFAULT_DALAT_CENTER;
  const activeFoodPreset =
    WEATHER_FOOD_PRESETS.find((p) => p.id === foodPresetId) ??
    WEATHER_FOOD_PRESETS[0];

  const radarQuery = useRadarPlaces(
    activeTab === 'radar'
      ? {
          ...filters,
          lat: anchor.lat,
          lng: anchor.lng,
          radiusKm: radarRadiusKm,
          limit: 50,
        }
      : null,
  );

  const foodQuery = useWeatherFood(
    activeTab === 'food'
      ? {
          city: initialCity,
          lat: anchor.lat,
          lng: anchor.lng,
          temperatureC: activeFoodPreset.temperatureC,
          rainProbability: activeFoodPreset.rainProbability,
          limit: 15,
        }
      : null,
  );

  const places =
    activeTab === 'food'
      ? (foodQuery.data?.data ?? [])
      : (radarQuery.data?.data ?? []);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href={ROUTES.HOME} className="text-lg font-bold text-sky-600">
            SkyRoute
          </Link>
          <span className="text-sm text-slate-500">
            Khám phá Radar • {initialCity}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link
            href={ROUTES.TRIPS}
            className="rounded-lg bg-sky-600 px-3 py-1.5 font-medium text-white hover:bg-sky-700"
          >
            Lập lịch trình
          </Link>
          <Link
            href={ROUTES.LOGIN}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <aside className="flex flex-col gap-3 lg:col-span-5">
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setActiveTab('radar')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                activeTab === 'radar'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Radar Địa điểm
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('food')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                activeTab === 'food'
                  ? 'bg-amber-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Ẩm thực Thời tiết
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stays')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                activeTab === 'stays'
                  ? 'bg-teal-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Lưu trú
            </button>
          </div>

          {activeTab === 'radar' && (
            <>
              <ProximityRadarControl totalFound={radarQuery.data?.meta?.total} />
              <MultiLayerFilterBar filters={filters} onChange={setFilters} />

              <div className="flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-350px)]">
                {radarQuery.isLoading && (
                  <div className="space-y-2">
                    {[1, 2, 3].map((n) => (
                      <div
                        key={n}
                        className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
                      />
                    ))}
                  </div>
                )}

                {radarQuery.isError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    Không thể tải dữ liệu địa điểm từ API Radar. Vui lòng kiểm
                    tra kết nối máy chủ.
                  </div>
                )}

                {!radarQuery.isLoading &&
                  !radarQuery.isError &&
                  places.length === 0 && (
                    <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                      Không tìm thấy địa điểm phù hợp trong bán kính{' '}
                      {radarRadiusKm} km. Hãy mở rộng bán kính hoặc xóa bớt bộ
                      lọc.
                    </div>
                  )}

                {places.map((place) => {
                  const highlighted = hoveredPlaceId === place.id;
                  return (
                    <div
                      key={place.id}
                      onMouseEnter={() => setHoveredPlaceId(place.id)}
                      onMouseLeave={() => setHoveredPlaceId(null)}
                      className={`rounded-xl border bg-white p-3.5 transition ${
                        highlighted
                          ? 'border-sky-500 ring-2 ring-sky-200'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {place.name}
                          </h3>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {place.address ?? place.city}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            place.isOutdoor
                              ? 'bg-emerald-100 text-emerald-700'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-amber-600">
                            ★ {place.rating.toFixed(1)}
                          </span>
                          {place.subcategory && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5">
                              {place.subcategory}
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
                            className="font-medium text-sky-600 hover:underline"
                          >
                            + Thêm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {activeTab === 'food' && (
            <div className="flex-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-148px)]">
              <WeatherFoodPanel
                city={initialCity}
                lat={anchor.lat}
                lng={anchor.lng}
                presetId={foodPresetId}
                onPresetChange={(preset) => setFoodPresetId(preset.id)}
                onSelectPlace={onSelectPlace}
              />
            </div>
          )}

          {activeTab === 'stays' && (
            <div className="flex-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-148px)]">
              <PublicStaysPanel city={initialCity} />
            </div>
          )}
        </aside>

        <section className="min-h-[460px] lg:col-span-7 lg:h-[calc(100vh-92px)]">
          <InteractiveMap
            places={activeTab === 'stays' ? [] : places}
            showRadar={activeTab === 'radar'}
            onSelectPlace={onSelectPlace}
          />
        </section>
      </div>
    </div>
  );
}
