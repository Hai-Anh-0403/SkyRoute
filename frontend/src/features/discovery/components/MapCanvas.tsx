'use client';

import 'leaflet/dist/leaflet.css';
import type { ReactNode } from 'react';
import { Circle, CircleMarker, MapContainer, TileLayer, Tooltip } from 'react-leaflet';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { PlaceItem } from '../types/discovery.types';
import { MapViewportController } from './MapViewportController';
import { PlaceMarker } from './PlaceMarker';

export const DA_LAT_CENTER = { lat: 11.9404, lng: 108.4583 };

export interface MapCanvasProps {
  places: PlaceItem[];
  onSelectPlace?: (place: PlaceItem) => void;
  allowAnchorClick?: boolean;
  className?: string;
  children?: ReactNode;
}

export function MapCanvas({
  places,
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

        {/* Extensible slot for Route Polylines, Plan B Preview, and Centroid Stay layers */}
        {children}
      </MapContainer>
    </div>
  );
}
