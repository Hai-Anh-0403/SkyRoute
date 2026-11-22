'use client';

import { Cloud, CloudRain, Sun } from 'lucide-react';

interface SlotWeatherBadgeProps {
  weatherCondition: string | null;
  temperatureC: number | null;
  rainProbability: number | null;
}

export function SlotWeatherBadge({
  weatherCondition,
  temperatureC,
  rainProbability,
}: SlotWeatherBadgeProps) {
  if (temperatureC === null && rainProbability === null) {
    return null;
  }

  const rainPct = rainProbability ?? 0;
  const isRainy = weatherCondition === 'rainy' || rainPct >= 60;
  const isSunny =
    !isRainy && (weatherCondition === 'sunny' || weatherCondition === 'hot');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
        isRainy
          ? 'bg-rose-100 text-rose-700'
          : isSunny
            ? 'bg-amber-50 text-amber-700'
            : 'bg-sky-50 text-sky-700'
      }`}
    >
      {isRainy ? (
        <CloudRain className="h-3 w-3" />
      ) : isSunny ? (
        <Sun className="h-3 w-3" />
      ) : (
        <Cloud className="h-3 w-3" />
      )}
      {temperatureC !== null && <span>{temperatureC.toFixed(0)}°C</span>}
      {rainProbability !== null && <span>• Mưa {rainPct}%</span>}
    </span>
  );
}
