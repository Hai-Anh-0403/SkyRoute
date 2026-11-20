'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ROUTES } from '@/shared/lib/routes';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { useRadarPlaces } from '../hooks/useRadarPlaces';
import type { DiscoveryFilters, PlaceItem } from '../types/discovery.types';
import { InteractiveMap } from './InteractiveMap';
import { MultiLayerFilterBar } from './MultiLayerFilterBar';
import { ProximityRadarControl } from './ProximityRadarControl';

interface DiscoveryExplorerProps {
  initialCity: string;
  onSelectPlace?: (place: PlaceItem) => void;
}

const DEFAULT_DALAT_CENTER = { lat: 11.9404, lng: 108.4583 };

export function DiscoveryExplorer({
  initialCity,
  onSelectPlace,
}: DiscoveryExplorerProps) {
  const [filters, setFilters] = useState<DiscoveryFilters>({
    city: initialCity,
  });

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
  const { data, isLoading, isError } = useRadarPlaces({
    ...filters,
    lat: anchor.lat,
    lng: anchor.lng,
    radiusKm: radarRadiusKm,
    limit: 50,
  });

  const places = data?.data ?? [];

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
            href={ROUTES.LOGIN}
            className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            Đăng nhập
          </Link>
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <aside className="flex flex-col gap-3 lg:col-span-5">
          <ProximityRadarControl totalFound={data?.meta?.total} />
          <MultiLayerFilterBar filters={filters} onChange={setFilters} />

          <div className="flex-1 space-y-2 overflow-y-auto pr-1 lg:max-h-[calc(100vh-310px)]">
            {isLoading && (
              <div className="space-y-2">
                {[1, 2, 3].map((n) => (
                  <div
                    key={n}
                    className="h-24 animate-pulse rounded-xl border border-slate-200 bg-white"
                  />
                ))}
              </div>
            )}

            {isError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                Không thể tải dữ liệu địa điểm từ API Radar. Vui lòng kiểm tra
                kết nối máy chủ.
              </div>
            )}

            {!isLoading && !isError && places.length === 0 && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Không tìm thấy địa điểm phù hợp trong bán kính {radarRadiusKm}{' '}
                km. Hãy mở rộng bán kính hoặc xóa bớt bộ lọc.
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
        </aside>

        <section className="min-h-[460px] lg:col-span-7 lg:h-[calc(100vh-92px)]">
          <InteractiveMap places={places} onSelectPlace={onSelectPlace} />
        </section>
      </div>
    </div>
  );
}
