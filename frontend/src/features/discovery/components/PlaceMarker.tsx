'use client';

import L from 'leaflet';
import { memo } from 'react';
import { Marker, Popup } from 'react-leaflet';
import type { PlaceCategory, PlaceItem } from '../types/discovery.types';

interface PlaceMarkerProps {
  place: PlaceItem;
  isHighlighted: boolean;
  onHover?: (id: number | null) => void;
  onSelectPlace?: (place: PlaceItem) => void;
}

const CATEGORY_COLORS: Record<PlaceCategory, string> = {
  attraction: '#0284c7', // sky-600
  restaurant: '#d97706', // amber-600
  cafe: '#7c3aed', // violet-600
};

const CATEGORY_GLYPH: Record<PlaceCategory, string> = {
  attraction: '★',
  restaurant: '🍴',
  cafe: '☕',
};

const iconCache = new Map<string, L.DivIcon>();

function getCategoryIcon(
  category: PlaceCategory,
  isOutdoor: boolean,
  isHighlighted: boolean,
): L.DivIcon {
  const key = `${category}-${isOutdoor}-${isHighlighted}`;
  const cached = iconCache.get(key);
  if (cached) {
    return cached;
  }

  const color = CATEGORY_COLORS[category];
  const size = isHighlighted ? 34 : 28;
  const ring = isHighlighted
    ? 'box-shadow: 0 0 0 4px rgba(14,165,233,0.45), 0 4px 10px rgba(0,0,0,0.3);'
    : 'box-shadow: 0 2px 6px rgba(0,0,0,0.28);';
  const badgeColor = isOutdoor ? '#16a34a' : '#475569';

  const icon = L.divIcon({
    className: 'skyroute-custom-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
    html: `<div style="position:relative;width:${size}px;height:${size}px;border-radius:9999px;background:${color};border:2px solid #ffffff;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:${isHighlighted ? 14 : 12}px;${ring}">
      <span>${CATEGORY_GLYPH[category]}</span>
      <span style="position:absolute;right:-3px;bottom:-3px;width:10px;height:10px;border-radius:9999px;background:${badgeColor};border:1.5px solid #fff;"></span>
    </div>`,
  });

  iconCache.set(key, icon);
  return icon;
}

export const PlaceMarker = memo(function PlaceMarker({
  place,
  isHighlighted,
  onHover,
  onSelectPlace,
}: PlaceMarkerProps) {
  const icon = getCategoryIcon(place.category, place.isOutdoor, isHighlighted);

  return (
    <Marker
      position={[place.location.lat, place.location.lng]}
      icon={icon}
      zIndexOffset={isHighlighted ? 500 : 0}
      eventHandlers={{
        mouseover: () => onHover?.(place.id),
        mouseout: () => onHover?.(null),
      }}
    >
      <Popup>
        <div className="min-w-[190px] space-y-1.5 text-slate-800">
          <div className="font-semibold text-slate-900">{place.name}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span
              className={`rounded px-1.5 py-0.5 font-medium ${
                place.isOutdoor
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-slate-100 text-slate-700'
              }`}
            >
              {place.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
            </span>
            <span className="font-medium text-amber-600">
              ★ {place.rating.toFixed(1)}
            </span>
            {place.distanceKm !== undefined && (
              <span className="text-sky-700">
                • {place.distanceKm.toFixed(2)} km
              </span>
            )}
          </div>
          {place.address && (
            <p className="text-xs text-slate-500">{place.address}</p>
          )}
          {onSelectPlace && (
            <button
              type="button"
              onClick={() => onSelectPlace(place)}
              className="mt-1 w-full rounded bg-sky-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-sky-700"
            >
              Thêm vào lịch trình
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
});
