'use client';

import 'leaflet/dist/leaflet.css';
import type { ReactNode } from 'react';
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polyline,
  TileLayer,
  Tooltip,
} from 'react-leaflet';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { MapRouteSegment } from '@/shared/types/geo.types';
import type { PlaceItem } from '../types/discovery.types';
import { MapViewportController } from './MapViewportController';
import { PlaceMarker } from './PlaceMarker';

export const DA_LAT_CENTER = { lat: 11.9404, lng: 108.4583 };

export interface MapCanvasProps {
  places: PlaceItem[];
  routeSegments?: MapRouteSegment[];
  showRadar?: boolean;
  onSelectPlace?: (place: PlaceItem) => void;
  allowAnchorClick?: boolean;
  className?: string;
  children?: ReactNode;
}

export function MapCanvas({
  places,
  routeSegments = [],
  showRadar = true,
  onSelectPlace,
  allowAnchorClick = true,
  className = 'h-full w-full',
  children,
}: MapCanvasProps) {
  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);
  const hoveredPlaceId = useWorkspaceStore((s) => s.hoveredPlaceId);
  const setHoveredPlaceId = useWorkspaceStore((s) => s.setHoveredPlaceId);

  const anchor = radarAnchorCoords ?? DA_LAT_CENTER;

  return (
    <div className={className}>
      <MapContainer
        center={[anchor.lat, anchor.lng]}
        zoom={13}
        scrollWheelZoom
        className="z-0 h-full w-full rounded-xl"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewportController allowAnchorClick={allowAnchorClick} />

        {/* Layer 1: Proximity Radar Circle & Anchor Pin */}
        {showRadar && (
          <>
            <Circle
              center={[anchor.lat, anchor.lng]}
              radius={radarRadiusKm * 1000}
              pathOptions={{
                color: '#0284c7',
                fillColor: '#38bdf8',
                fillOpacity: 0.12,
                weight: 2,
              }}
            />
            <CircleMarker
              center={[anchor.lat, anchor.lng]}
              radius={7}
              pathOptions={{
                color: '#ffffff',
                fillColor: '#0284c7',
                fillOpacity: 1,
                weight: 2,
              }}
            >
              <Tooltip direction="top">
                Tâm Radar ({radarRadiusKm} km)
              </Tooltip>
            </CircleMarker>
          </>
        )}

        {/* Layer 2: Daily Route Polylines (dashed rose if detour > 8km) */}
        {routeSegments.map((seg) => (
          <Polyline
            key={seg.id}
            positions={[
              [seg.from.lat, seg.from.lng],
              [seg.to.lat, seg.to.lng],
            ]}
            pathOptions={
              seg.isDetourWarning
                ? {
                    color: '#e11d48',
                    weight: 4,
                    dashArray: '8 8',
                    opacity: 0.95,
                  }
                : { color: '#0284c7', weight: 3.5, opacity: 0.85 }
            }
          >
            <Tooltip sticky>
              {seg.fromLabel} → {seg.toLabel} ({seg.distanceKm.toFixed(1)} km
              {seg.isDetourWarning ? ' — Ngược đường > 8km' : ''})
            </Tooltip>
          </Polyline>
        ))}

        {/* Filtered POI Markers */}
        {places.map((place) => (
          <PlaceMarker
            key={place.id}
            place={place}
            isHighlighted={hoveredPlaceId === place.id}
            onHover={setHoveredPlaceId}
            onSelectPlace={onSelectPlace}
          />
        ))}

        {/* Extensible slot for Plan B Preview and Centroid Stay layers */}
        {children}
      </MapContainer>
    </div>
  );
}
