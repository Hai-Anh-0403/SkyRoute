'use client';

import { MapPin, Sparkles, Star } from 'lucide-react';
import type { PlanBCandidate } from '../types/weather-fallback.types';

interface PlanBCandidateCardProps {
  candidate: PlanBCandidate;
  isSwapping: boolean;
  onSwap: (placeId: number) => void;
}

export function PlanBCandidateCard({
  candidate,
  isSwapping,
  onSwap,
}: PlanBCandidateCardProps) {
  const matchPercent = Math.round(candidate.contextualScore * 100);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:border-emerald-400">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-semibold text-slate-900">{candidate.name}</h4>
          {candidate.address && (
            <p className="mt-0.5 text-xs text-slate-500">{candidate.address}</p>
          )}
        </div>
        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
          Trong nhà
        </span>
      </div>

      <p className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-700">
        {candidate.aiReason}
      </p>

      <div className="mt-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1 font-medium text-emerald-700">
            <MapPin className="h-3 w-3" />
            {candidate.distanceFromPrevKm.toFixed(1)} km
          </span>
          <span className="inline-flex items-center gap-0.5 font-medium text-amber-600">
            <Star className="h-3 w-3 fill-current" />
            {candidate.rating.toFixed(1)}
          </span>
          <span className="rounded bg-sky-50 px-1.5 py-0.5 font-medium text-sky-700">
            Phù hợp {matchPercent}%
          </span>
        </div>

        <button
          type="button"
          disabled={isSwapping}
          onClick={() => onSwap(candidate.placeId)}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {isSwapping ? 'Đang đổi...' : 'Hoán đổi 1-Click'}
        </button>
      </div>
    </div>
  );
}
