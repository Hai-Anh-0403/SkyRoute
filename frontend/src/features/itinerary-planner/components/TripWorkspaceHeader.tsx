'use client';

import {
  ArrowLeft,
  Calendar,
  CloudRain,
  Compass,
  MapPin,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { ROUTES } from '@/shared/lib/routes';

interface TripWorkspaceHeaderProps {
  title: string;
  destinationCity: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  activeDayNumber: number;
  isWeatherSyncing: boolean;
  isCentroidOpen: boolean;
  onSelectDay: (day: number) => void;
  onSyncWeather: () => void;
  onSimulateRain: () => void;
  onToggleCentroidDrawer: () => void;
  onOpenAiModal: () => void;
}

export function TripWorkspaceHeader({
  title,
  destinationCity,
  startDate,
  endDate,
  totalDays,
  activeDayNumber,
  isWeatherSyncing,
  isCentroidOpen,
  onSelectDay,
  onSyncWeather,
  onSimulateRain,
  onToggleCentroidDrawer,
  onOpenAiModal,
}: TripWorkspaceHeaderProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3">
      <div className="flex items-center gap-3">
        <Link
          href={ROUTES.TRIPS}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Chuyến đi
        </Link>
        <div>
          <h1 className="text-base font-bold text-slate-900">{title}</h1>
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {destinationCity}
            </span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {startDate} → {endDate}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onOpenAiModal}
          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
        >
          <Sparkles className="h-3.5 w-3.5" />
          AI Tạo lịch trình
        </button>

        <button
          type="button"
          onClick={onToggleCentroidDrawer}
          aria-pressed={isCentroidOpen}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition ${
            isCentroidOpen
              ? 'border-amber-500 bg-amber-500 text-white'
              : 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100'
          }`}
        >
          <Compass className="h-3.5 w-3.5" />
          Tâm Lưu trú
        </button>

        <button
          type="button"
          disabled={isWeatherSyncing}
          onClick={onSyncWeather}
          className="inline-flex items-center gap-1 rounded-lg border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-100 disabled:opacity-60"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Đồng bộ Thời tiết
        </button>

        <button
          type="button"
          disabled={isWeatherSyncing}
          onClick={onSimulateRain}
          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
        >
          <CloudRain className="h-3.5 w-3.5" />
          Giả lập Mưa 75%
        </button>

        <div className="flex items-center gap-1.5">
          {days.map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => onSelectDay(day)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                activeDayNumber === day
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Ngày {day}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
