'use client';

import { ArrowLeft, Calendar, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  InteractiveMap,
  MultiLayerFilterBar,
  ProximityRadarControl,
  useRadarPlaces,
  type DiscoveryFilters,
  type PlaceCategory,
  type PlaceItem,
} from '@/features/discovery';
import { ROUTES } from '@/shared/lib/routes';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { TimeSlotType } from '@/shared/types/geo.types';
import { useReorderTimeline } from '../hooks/useReorderTimeline';
import {
  useAddTimelineItem,
  useDeleteTimelineItem,
  useTripDetail,
} from '../hooks/useTripQueries';
import { buildDailyRouteSegments, sortDayItems } from '../utils/route.utils';
import { TimelineBoard } from './TimelineBoard';

interface TripWorkspaceProps {
  tripId: number;
}

const DEFAULT_DALAT_CENTER = { lat: 11.9404, lng: 108.4583 };

export function TripWorkspace({ tripId }: TripWorkspaceProps) {
  const [panelTab, setPanelTab] = useState<'timeline' | 'radar'>('timeline');
  const [targetSlot, setTargetSlot] = useState<TimeSlotType>('morning');
  const [filters, setFilters] = useState<DiscoveryFilters>({ city: 'Da Lat' });

  const activeDayNumber = useWorkspaceStore((s) => s.activeDayNumber);
  const setActiveDayNumber = useWorkspaceStore((s) => s.setActiveDayNumber);
  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);

  const tripQuery = useTripDetail(tripId);
  const addMutation = useAddTimelineItem(tripId);
  const deleteMutation = useDeleteTimelineItem(tripId);
  const reorderMutation = useReorderTimeline(tripId);

  const anchor = radarAnchorCoords ?? DEFAULT_DALAT_CENTER;
  const radarQuery = useRadarPlaces(
    panelTab === 'radar'
      ? {
          ...filters,
          city: tripQuery.data?.destinationCity ?? filters.city,
          lat: anchor.lat,
          lng: anchor.lng,
          radiusKm: radarRadiusKm,
          limit: 30,
        }
      : null,
  );

  const trip = tripQuery.data;

  const dailyRouteSegments = useMemo(
    () => (trip ? buildDailyRouteSegments(trip.items, activeDayNumber) : []),
    [trip, activeDayNumber],
  );

  const mapPlaces = useMemo<PlaceItem[]>(() => {
    const byId = new Map<number, PlaceItem>();
    if (trip) {
      for (const item of sortDayItems(trip.items, activeDayNumber)) {
        if (item.place) {
          byId.set(item.place.id, {
            id: item.place.id,
            name: item.place.name,
            city: trip.destinationCity,
            category: item.place.category as PlaceCategory,
            subcategory: item.place.subcategory,
            isOutdoor: item.place.isOutdoor,
            hasAc: false,
            suitableWeather: [],
            priceLevel: 2,
            rating: item.place.rating,
            address: item.place.address,
            description: null,
            thumbnailUrl: null,
            location: item.place.location,
          });
        }
      }
    }
    if (panelTab === 'radar' && radarQuery.data?.data) {
      for (const p of radarQuery.data.data) {
        if (!byId.has(p.id)) {
          byId.set(p.id, p);
        }
      }
    }
    return Array.from(byId.values());
  }, [trip, activeDayNumber, panelTab, radarQuery.data]);

  const handleQuickAddPlace = (place: PlaceItem) => {
    addMutation.mutate({
      placeId: place.id,
      dayNumber: activeDayNumber,
      timeSlot: targetSlot,
    });
    setPanelTab('timeline');
  };

  if (tripQuery.isLoading) {
    return (
      <div className="p-6 text-sm text-slate-500">
        Đang tải không gian lập lịch trình...
      </div>
    );
  }

  if (tripQuery.isError || !trip) {
    return (
      <div className="mx-auto max-w-lg p-8 text-center">
        <p className="text-sm text-rose-600">
          Không thể tải thông tin chuyến đi. Vui lòng đăng nhập lại hoặc kiểm
          tra kết nối API.
        </p>
        <Link
          href={ROUTES.TRIPS}
          className="mt-4 inline-block rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white"
        >
          Quay lại danh sách
        </Link>
      </div>
    );
  }

  const days = Array.from({ length: trip.totalDays }, (_, i) => i + 1);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
        <div className="flex items-center gap-3">
          <Link
            href={ROUTES.TRIPS}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Chuyến đi
          </Link>
          <div>
            <h1 className="text-base font-bold text-slate-900">{trip.title}</h1>
            <p className="flex items-center gap-2 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {trip.destinationCity}
              </span>
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3 w-3" /> {trip.startDate} → {trip.endDate}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setActiveDayNumber(day)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeDayNumber === day
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ngày {day}
            </button>
          ))}
        </div>
      </header>

      <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
        <aside className="flex flex-col gap-3 lg:col-span-5">
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setPanelTab('timeline')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                panelTab === 'timeline'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Lịch trình Ngày {activeDayNumber}
            </button>
            <button
              type="button"
              onClick={() => setPanelTab('radar')}
              className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                panelTab === 'radar'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              Thêm từ Radar
            </button>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 lg:max-h-[calc(100vh-148px)]">
            {panelTab === 'timeline' ? (
              <TimelineBoard
                allItems={trip.items}
                dayNumber={activeDayNumber}
                onReorder={(vars) => reorderMutation.mutate(vars)}
                onDeleteItem={(itemId) => deleteMutation.mutate(itemId)}
                onAddFromRadar={(slot) => {
                  setTargetSlot(slot);
                  setPanelTab('radar');
                }}
              />
            ) : (
              <div className="space-y-3">
                <ProximityRadarControl totalFound={radarQuery.data?.meta?.total} />
                <MultiLayerFilterBar filters={filters} onChange={setFilters} />
                <div className="space-y-2">
                  {(radarQuery.data?.data ?? []).map((place) => (
                    <div
                      key={place.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-slate-900">
                          {place.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
                          {place.distanceKm !== undefined
                            ? ` • ${place.distanceKm.toFixed(2)} km`
                            : ''}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleQuickAddPlace(place)}
                        className="shrink-0 rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-sky-700"
                      >
                        + {targetSlot}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-[460px] lg:col-span-7 lg:h-[calc(100vh-92px)]">
          <InteractiveMap
            places={mapPlaces}
            routeSegments={dailyRouteSegments}
            showRadar={panelTab === 'radar'}
            onSelectPlace={handleQuickAddPlace}
          />
        </section>
      </div>
    </div>
  );
}
