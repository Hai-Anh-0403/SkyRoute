'use client';

import { LocateFixed, Radar } from 'lucide-react';
import { resolveCityPreset } from '@/shared/lib/cities';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';

interface ProximityRadarControlProps {
  totalFound?: number;
  city?: string;
}

export function ProximityRadarControl({
  totalFound,
  city = 'Da Lat',
}: ProximityRadarControlProps) {
  const radarRadiusKm = useWorkspaceStore((s) => s.radarRadiusKm);
  const radarAnchorCoords = useWorkspaceStore((s) => s.radarAnchorCoords);
  const setRadarRadiusKm = useWorkspaceStore((s) => s.setRadarRadiusKm);
  const setRadarAnchorCoords = useWorkspaceStore((s) => s.setRadarAnchorCoords);

  const cityPreset = resolveCityPreset(city);
  const anchor = radarAnchorCoords ?? cityPreset.center;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Radar className="h-4 w-4 text-sky-600" />
          <span>Radar lân cận</span>
          <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-700">
            {radarRadiusKm} km
          </span>
        </div>

        <button
          type="button"
          onClick={() => setRadarAnchorCoords(cityPreset.center)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <LocateFixed className="h-3.5 w-3.5" />
          Đặt lại tâm {cityPreset.displayName.split(' (')[0]}
        </button>
      </div>

      <div className="mt-3">
        <input
          type="range"
          aria-label="Bán kính Radar"
          min={1}
          max={5}
          step={0.5}
          value={radarRadiusKm}
          onChange={(e) => setRadarRadiusKm(Number(e.target.value))}
          className="w-full cursor-pointer accent-sky-600"
        />
        <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
          <span>1 km</span>
          <span>
            Tâm: {anchor.lat.toFixed(4)}, {anchor.lng.toFixed(4)}
            {totalFound !== undefined ? ` • ${totalFound} điểm` : ''}
          </span>
          <span>5 km</span>
        </div>
      </div>
    </div>
  );
}
