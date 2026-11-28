'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { PublicStaysPanel } from '@/features/stay-finder';
import { AppHeader } from '@/shared/components/AppHeader';
import { SKYROUTE_CITIES, resolveCityPreset } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { useRadarPlaces } from '../hooks/useRadarPlaces';
import { useWeatherFood } from '../hooks/useWeatherFood';
import type { DiscoveryFilters, PlaceItem } from '../types/discovery.types';
import { AddToTripModal } from './AddToTripModal';
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

export function DiscoveryExplorer({
  initialCity,
  onSelectPlace,
}: DiscoveryExplorerProps) {
  const router = useRouter();
  const cityPreset = resolveCityPreset(initialCity);

  const [activeTab, setActiveTab] = useState<'radar' | 'food' | 'stays'>(
    'radar',
  );
  const [filters, setFilters] = useState<DiscoveryFilters>({
    city: cityPreset.canonicalName,
  });
  const [foodPresetId, setFoodPresetId] =
    useState<WeatherFoodPresetId>('cold_rainy');
  const [placeToAdd, setPlaceToAdd] = useState<PlaceItem | null>(null);

  const handlePlaceSelect = (place: PlaceItem) => {
    if (onSelectPlace) {
      onSelectPlace(place);
    } else {
      setPlaceToAdd(place);
    }
  };

  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);
  const hoveredPlaceId = useWorkspaceStore((s) => s.hoveredPlaceId);
  const setRadarAnchorCoords = useWorkspaceStore((s) => s.setRadarAnchorCoords);
  const setHoveredPlaceId = useWorkspaceStore((s) => s.setHoveredPlaceId);

  useEffect(() => {
    setFilters((prev) => ({ ...prev, city: cityPreset.canonicalName }));
    setRadarAnchorCoords(cityPreset.center);
  }, [cityPreset.canonicalName, cityPreset.center, setRadarAnchorCoords]);

  const anchor = radarAnchorCoords ?? cityPreset.center;
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
    <div className="flex min-h-screen flex-col bg-[#FAFAF9]">
      <AppHeader
        leftSlot={
          <select
            aria-label="Chọn điểm đến"
            value={cityPreset.slug}
            onChange={(e) => router.push(ROUTES.EXPLORE_CITY(e.target.value))}
            className="rounded-full border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:border-sky-400 focus:border-sky-500 focus:outline-none"
          >
            {SKYROUTE_CITIES.map((city) => (
              <option key={city.slug} value={city.slug}>
                {city.displayName} ({city.region})
              </option>
            ))}
          </select>
        }
      />

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
              <ProximityRadarControl
                city={cityPreset.canonicalName}
                totalFound={radarQuery.data?.meta?.total}
              />
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
                        <button
                          type="button"
                          onClick={() => handlePlaceSelect(place)}
                          className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                        >
                          {onSelectPlace ? '+ Thêm' : '+ Thêm vào chuyến đi'}
                        </button>
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
                onSelectPlace={handlePlaceSelect}
                actionLabel={onSelectPlace ? '+ Thêm' : '+ Thêm vào chuyến đi'}
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
            onSelectPlace={handlePlaceSelect}
          />
        </section>
      </div>

      <AddToTripModal
        place={placeToAdd}
        onClose={() => setPlaceToAdd(null)}
      />
    </div>
  );
}
