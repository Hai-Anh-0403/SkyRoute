'use client';

import L from 'leaflet';
import { memo, useMemo } from 'react';
import { CircleMarker, Marker, Popup, Tooltip } from 'react-leaflet';
import type { Coordinates } from '@/shared/types/geo.types';
import type { RecommendedStayItem } from '../types/stay-finder.types';

export interface CentroidMapPinProps {
  centroidLocation: Coordinates;
  totalItineraryPlaces?: number;
  stays?: RecommendedStayItem[];
  showStays?: boolean;
  hoveredStayId?: number | null;
  onHoverStay?: (id: number | null) => void;
}

const STAY_TYPE_LABELS: Record<RecommendedStayItem['stayType'], string> = {
  hotel: 'Khách sạn',
  homestay: 'Homestay',
  resort: 'Resort',
};

function createCentroidStarIcon(): L.DivIcon {
  return L.divIcon({
    className: 'skyroute-centroid-star-marker',
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -18],
    html: `<div style="width:38px;height:38px;border-radius:9999px;background:#f59e0b;border:3px solid #ffffff;box-shadow:0 0 0 4px rgba(245,158,11,0.35),0 4px 12px rgba(0,0,0,0.28);color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;">★</div>`,
  });
}

function formatVnd(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}

export const CentroidMapLayer = memo(function CentroidMapLayer({
  centroidLocation,
  totalItineraryPlaces = 0,
  stays = [],
  showStays = false,
  hoveredStayId = null,
  onHoverStay,
}: CentroidMapPinProps) {
  const starIcon = useMemo(() => createCentroidStarIcon(), []);

  return (
    <>
      <Marker
        position={[centroidLocation.lat, centroidLocation.lng]}
        icon={starIcon}
        zIndexOffset={600}
      >
        <Tooltip direction="top">Tâm chuyến đi (Centroid)</Tooltip>
        <Popup>
          <div className="min-w-[180px] space-y-1 text-xs text-slate-700">
            <div className="font-bold text-amber-700">
              ★ Tâm chuyến đi (Centroid)
            </div>
            <p>
              Tính từ{' '}
              <span className="font-semibold">{totalItineraryPlaces}</span> địa
              điểm trong lịch trình.
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              {centroidLocation.lat.toFixed(4)}, {centroidLocation.lng.toFixed(4)}
            </p>
          </div>
        </Popup>
      </Marker>

      {showStays &&
        stays.map((stay) => {
          const isHighlighted = hoveredStayId === stay.id;
          return (
            <CircleMarker
              key={`centroid-stay-${stay.id}`}
              center={[stay.location.lat, stay.location.lng]}
              radius={isHighlighted ? 11 : 8}
              pathOptions={{
                color: '#ffffff',
                fillColor: isHighlighted ? '#d97706' : '#0f766e',
                fillOpacity: 0.95,
                weight: isHighlighted ? 3 : 2,
              }}
              eventHandlers={{
                mouseover: () => onHoverStay?.(stay.id),
                mouseout: () => onHoverStay?.(null),
              }}
            >
              <Tooltip direction="top">
                {stay.name} • {STAY_TYPE_LABELS[stay.stayType]} •{' '}
                {formatVnd(stay.pricePerNight)} • Cách tâm{' '}
                {stay.distanceToCentroidKm.toFixed(2)} km
              </Tooltip>
            </CircleMarker>
          );
        })}
    </>
  );
});
