'use client';

import { useEffect } from 'react';
import { useMap, useMapEvents } from 'react-leaflet';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

interface MapViewportControllerProps {
  allowAnchorClick?: boolean;
}

export function MapViewportController({
  allowAnchorClick = true,
}: MapViewportControllerProps) {
  const map = useMap();
  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const setRadarAnchorCoords = useWorkspaceStore((s) => s.setRadarAnchorCoords);
  const focusedMapCoords = useWorkspaceStore((s) => s.focusedMapCoords);

  useEffect(() => {
    if (!radarAnchorCoords) {
      return;
    }
    map.flyTo(
      [radarAnchorCoords.lat, radarAnchorCoords.lng],
      Math.max(map.getZoom(), 13),
      { duration: 0.6 },
    );
  }, [map, radarAnchorCoords]);

  useEffect(() => {
    if (!focusedMapCoords) {
      return;
    }
    map.flyTo(
      [focusedMapCoords.lat, focusedMapCoords.lng],
      Math.max(map.getZoom(), 14),
      { duration: 0.6 },
    );
  }, [map, focusedMapCoords]);

  useMapEvents({
    click(event) {
      if (!allowAnchorClick) {
        return;
      }
      setRadarAnchorCoords({
        lat: Number(event.latlng.lat.toFixed(5)),
        lng: Number(event.latlng.lng.toFixed(5)),
      });
    },
  });

  return null;
}
