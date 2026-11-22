'use client';

import { CloudRain, Sparkles } from 'lucide-react';

interface WeatherConflictBannerProps {
  itemId: number;
  rainProbability: number | null;
  onOpenPlanB: (itemId: number) => void;
}

export function WeatherConflictBanner({
  itemId,
  rainProbability,
  onOpenPlanB,
}: WeatherConflictBannerProps) {
  return (
    <div
      role="alert"
      className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-2 text-xs text-rose-800"
    >
      <div className="flex items-center gap-1.5 font-medium">
        <CloudRain className="h-3.5 w-3.5 shrink-0 text-rose-600" />
        <span>
          Hoạt động ngoài trời xung đột mưa ({rainProbability ?? 60}%)
        </span>
      </div>
      <button
        type="button"
        onClick={() => onOpenPlanB(itemId)}
        className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white transition hover:bg-rose-700"
      >
        <Sparkles className="h-3 w-3" />
        Tìm Kế hoạch B (Indoor)
      </button>
    </div>
  );
}
