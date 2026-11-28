'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { AiPromptModal } from '@/features/ai-copilot';
import {
  InteractiveMap,
  MultiLayerFilterBar,
  ProximityRadarControl,
  WeatherFoodPanel,
  useRadarPlaces,
  type DiscoveryFilters,
  type PlaceCategory,
  type PlaceItem,
} from '@/features/discovery';
import {
  CentroidMapPin,
  CentroidStayDrawer,
  useCentroidStays,
} from '@/features/stay-finder';
import {
  PlanBHistoryDrawer,
  PlanBSwapDrawer,
  usePlanBCandidates,
  useSyncTripWeather,
} from '@/features/weather-fallback';
import { resolveCityPreset } from '@/shared/lib/cities';
import { ROUTES } from '@/shared/lib/routes';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { MapPlanBPreview, TimeSlotType } from '@/shared/types/geo.types';
import { useReorderTimeline } from '../hooks/useReorderTimeline';
import {
  useAddTimelineItem,
  useDeleteTimelineItem,
  useTripDetail,
} from '../hooks/useTripQueries';
import { buildDailyRouteSegments, sortDayItems } from '../utils/route.utils';
import { PrintableItinerary } from './PrintableItinerary';
import { TimelineBoard } from './TimelineBoard';
import { TripBudgetSummary } from './TripBudgetSummary';
import { TripWorkspaceHeader } from './TripWorkspaceHeader';

interface TripWorkspaceProps {
  tripId: number;
}

export function TripWorkspace({ tripId }: TripWorkspaceProps) {
  const [panelTab, setPanelTab] = useState<'timeline' | 'radar'>('timeline');
  const [radarSubMode, setRadarSubMode] = useState<'radar' | 'food'>('radar');
  const [targetSlot, setTargetSlot] = useState<TimeSlotType>('morning');
  const [filters, setFilters] = useState<DiscoveryFilters>({ city: 'Da Lat' });
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPlanBHistoryOpen, setIsPlanBHistoryOpen] = useState(false);

  const activeDayNumber = useWorkspaceStore((s) => s.activeDayNumber);
  const setActiveDayNumber = useWorkspaceStore((s) => s.setActiveDayNumber);
  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const setRadarAnchorCoords = useWorkspaceStore((s) => s.setRadarAnchorCoords);
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);
  const activePlanBItemId = useWorkspaceStore((s) => s.activePlanBItemId);
  const isCentroidStayDrawerOpen = useWorkspaceStore(
    (s) => s.isCentroidStayDrawerOpen,
  );
  const setCentroidStayDrawerOpen = useWorkspaceStore(
    (s) => s.setCentroidStayDrawerOpen,
  );
  const hoveredStayId = useWorkspaceStore((s) => s.hoveredStayId);
  const setHoveredStayId = useWorkspaceStore((s) => s.setHoveredStayId);
  const setFocusedMapCoords = useWorkspaceStore((s) => s.setFocusedMapCoords);

  const tripQuery = useTripDetail(tripId);
  const addMutation = useAddTimelineItem(tripId);
  const deleteMutation = useDeleteTimelineItem(tripId);
  const reorderMutation = useReorderTimeline(tripId);
  const syncWeatherMutation = useSyncTripWeather(tripId);
  const planBCandidatesQuery = usePlanBCandidates(tripId, activePlanBItemId);

  const trip = tripQuery.data;
  const cityCenter = useMemo(
    () => resolveCityPreset(trip?.destinationCity).center,
    [trip?.destinationCity],
  );

  useEffect(() => {
    if (trip?.destinationCity) {
      setRadarAnchorCoords(cityCenter);
    }
  }, [trip?.destinationCity, cityCenter, setRadarAnchorCoords]);

  const hasCentroid = Boolean(trip?.centroidLocation);
  const centroidStaysQuery = useCentroidStays(
    tripId,
    isCentroidStayDrawerOpen || hasCentroid,
  );

  const anchor = radarAnchorCoords ?? cityCenter;
  const radarQuery = useRadarPlaces(
    panelTab === 'radar'
      ? {
          ...filters,
          city: trip?.destinationCity ?? filters.city,
          lat: anchor.lat,
          lng: anchor.lng,
          radiusKm: radarRadiusKm,
          limit: 30,
        }
      : null,
  );

  const dailyRouteSegments = useMemo(
    () => (trip ? buildDailyRouteSegments(trip.items, activeDayNumber) : []),
    [trip, activeDayNumber],
  );

  const planBPreview = useMemo<MapPlanBPreview | null>(() => {
    const data = planBCandidatesQuery.data;
    if (activePlanBItemId === null || !data) {
      return null;
    }
    return {
      anchor: data.anchorLocation,
      radiusMeters: data.radiusMeters,
      candidates: data.candidates.map((c) => ({
        placeId: c.placeId,
        name: c.name,
        location: c.location,
        distanceFromPrevKm: c.distanceFromPrevKm,
        rating: c.rating,
      })),
    };
  }, [activePlanBItemId, planBCandidatesQuery.data]);

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

  const handleToggleCentroidDrawer = () => {
    const nextOpen = !isCentroidStayDrawerOpen;
    setCentroidStayDrawerOpen(nextOpen);
    const centroid =
      centroidStaysQuery.data?.centroidLocation ?? trip?.centroidLocation;
    if (nextOpen && centroid) {
      setFocusedMapCoords(centroid);
    }
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

  const activeCentroid =
    centroidStaysQuery.data?.centroidLocation ?? trip.centroidLocation;

  return (
    <>
      <PrintableItinerary trip={trip} />
      <div className="flex min-h-screen flex-col bg-[#FAFAF9] print:hidden">
        <TripWorkspaceHeader
          title={trip.title}
          destinationCity={trip.destinationCity}
          startDate={trip.startDate}
          endDate={trip.endDate}
          totalDays={trip.totalDays}
          activeDayNumber={activeDayNumber}
          isWeatherSyncing={syncWeatherMutation.isPending}
          isCentroidOpen={isCentroidStayDrawerOpen}
          onSelectDay={setActiveDayNumber}
          onSyncWeather={() => syncWeatherMutation.mutate(undefined)}
          onSimulateRain={() =>
            syncWeatherMutation.mutate({
              dayNumber: activeDayNumber,
              timeSlot: 'afternoon',
              rainProbability: 75,
            })
          }
          onToggleCentroidDrawer={handleToggleCentroidDrawer}
          onOpenAiModal={() => setIsAiModalOpen(true)}
          onOpenPlanBHistory={() => setIsPlanBHistoryOpen(true)}
          onPrintItinerary={() => window.print()}
        />

        <div className="grid flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-12">
          <aside className="flex flex-col gap-3 lg:col-span-5">
            <TripBudgetSummary items={trip.items} totalDays={trip.totalDays} />
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-stone-200 bg-white p-1">
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
                  setRadarSubMode(
                    slot === 'lunch' || slot === 'dinner' ? 'food' : 'radar',
                  );
                  setPanelTab('radar');
                }}
              />
            ) : (
              <div className="space-y-3">
                {(targetSlot === 'lunch' || targetSlot === 'dinner') && (
                  <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-white p-1">
                    <button
                      type="button"
                      onClick={() => setRadarSubMode('radar')}
                      className={`rounded-lg py-1 text-xs font-semibold ${
                        radarSubMode === 'radar'
                          ? 'bg-sky-600 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Quét Radar
                    </button>
                    <button
                      type="button"
                      onClick={() => setRadarSubMode('food')}
                      className={`rounded-lg py-1 text-xs font-semibold ${
                        radarSubMode === 'food'
                          ? 'bg-amber-600 text-white'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Ẩm thực theo thời tiết
                    </button>
                  </div>
                )}

                {radarSubMode === 'food' &&
                (targetSlot === 'lunch' || targetSlot === 'dinner') ? (
                  <WeatherFoodPanel
                    city={trip.destinationCity}
                    lat={anchor.lat}
                    lng={anchor.lng}
                    onSelectPlace={handleQuickAddPlace}
                    actionLabel={`+ ${targetSlot}`}
                  />
                ) : (
                  <>
                    <ProximityRadarControl
                      city={trip.destinationCity}
                      totalFound={radarQuery.data?.meta?.total}
                    />
                    <MultiLayerFilterBar
                      filters={filters}
                      onChange={setFilters}
                    />
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
                  </>
                )}
              </div>
            )}
          </div>
        </aside>

        <section className="min-h-[460px] lg:col-span-7 lg:h-[calc(100vh-92px)]">
          <InteractiveMap
            places={mapPlaces}
            routeSegments={dailyRouteSegments}
            planBPreview={planBPreview}
            showRadar={panelTab === 'radar'}
            onSelectPlace={handleQuickAddPlace}
          >
            {activeCentroid && (
              <CentroidMapPin
                centroidLocation={activeCentroid}
                totalItineraryPlaces={
                  centroidStaysQuery.data?.totalItineraryPlaces ??
                  trip.items.filter((i) => i.placeId !== null).length
                }
                stays={centroidStaysQuery.data?.recommendedStays ?? []}
                showStays={isCentroidStayDrawerOpen}
                hoveredStayId={hoveredStayId}
                onHoverStay={setHoveredStayId}
              />
            )}
          </InteractiveMap>
        </section>
      </div>

      <PlanBSwapDrawer tripId={tripId} />
      <PlanBHistoryDrawer
        tripId={tripId}
        isOpen={isPlanBHistoryOpen}
        onClose={() => setIsPlanBHistoryOpen(false)}
      />
      <CentroidStayDrawer
        tripId={tripId}
        isAddingStay={addMutation.isPending}
        onAddStay={(stayId) =>
          addMutation.mutate({
            stayId,
            dayNumber: activeDayNumber,
            timeSlot: 'dinner',
            note: 'Lưu trú tối ưu gần tâm chuyến đi',
          })
        }
      />
      <AiPromptModal
        tripId={tripId}
        destinationCity={trip.destinationCity}
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
      </div>
    </>
  );
}
