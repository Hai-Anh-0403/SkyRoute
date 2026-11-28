'use client';

import {
  ArrowLeft,
  Calendar,
  CloudRain,
  Compass,
  History,
  MapPin,
  Printer,
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
  onOpenPlanBHistory: () => void;
  onPrintItinerary: () => void;
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
  onOpenPlanBHistory,
  onPrintItinerary,
}: TripWorkspaceHeaderProps) {
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-stone-200/80 bg-[#FAFAF9]/95 px-4 py-3 backdrop-blur-md sm:px-6 lg:px-8">
      <header className="sticky top-0 z-30 w-full border-b border-[#0a0a0a]/12 bg-[#f8f8f8] px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Back Navigation & Trip Identity */}
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href={ROUTES.TRIPS}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-stone-300 hover:bg-stone-100"
              className="sr-btn-tonal inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              Chuyến đi
            </Link>
            <div className="min-w-0">
              <h1 className="font-editorial truncate text-lg font-bold text-slate-900 sm:text-xl">
                <h1 className="truncate text-lg font-medium tracking-[-0.025em] text-[#0a0a0a] sm:text-xl">
                  {title}
                </h1>
                <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-[#6a6a6a]">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                      <MapPin className="h-3 w-3 text-[#6a6a6a]" aria-hidden="true" />
                      {destinationCity}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-flex items-center gap-1 font-mono">
                        <Calendar
                          className="h-3 w-3 text-slate-400"
                          className="h-3 w-3 text-[#6a6a6a]"
                          aria-hidden="true"
                        />
                        {startDate} → {endDate}
                      </span>
                  </p>
                </div>
            </div>

            {/* Right: Structured Actions & Day Switcher */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onOpenAiModal}
                className="inline-flex items-center gap-1.5 rounded-full bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:bg-slate-800"
                className="sr-btn-primary inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-medium"
              >
                <Sparkles className="h-3.5 w-3.5 text-sky-300" aria-hidden="true" />
                <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                Trợ lý tạo lịch trình
              </button>

              <button
                type="button"
                onClick={onToggleCentroidDrawer}
                aria-pressed={isCentroidOpen}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${className = {`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition ${isCentroidOpen
                      ? 'border-sky-600 bg-sky-600 text-white shadow-xs'
                      : 'border-stone-200 bg-white text-slate-700 hover:border-sky-300 hover:bg-sky-50 hover:text-sky-800'
                        ? 'border-[#1f6b3a] bg-[#1f6b3a] text-white'
                        : 'border-[#0a0a0a]/12 bg-white text-[#0a0a0a] hover:border-[#1f6b3a] hover:bg-[#e6f2ea] hover:text-[#17542d]'
                    }`}
          >
            <Compass className="h-3.5 w-3.5" aria-hidden="true" />
            Tâm Lưu trú
          </button>

          <button
            type="button"
            disabled={isWeatherSyncing}
            onClick={onSyncWeather}
            className="inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-700 disabled:opacity-60"
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#0a0a0a]/12 bg-white px-3 py-2 text-xs font-medium text-[#0a0a0a] transition hover:border-[#0a0a0a]/25 hover:bg-[#eeeeee] disabled:opacity-60"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isWeatherSyncing ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
              Đồng bộ Thời tiết
            </button>

            <div className="flex items-center gap-1.5 border-l border-stone-200 pl-2">
              <div className="flex items-center gap-1.5 border-l border-[#0a0a0a]/12 pl-2">
                <button
                  type="button"
                  disabled={isWeatherSyncing}
                  onClick={onSimulateRain}
                  title="Chế độ demo: giả lập xác suất mưa 75% để kiểm thử Kế hoạch dự phòng"
                  className="inline-flex items-center gap-1.5 rounded-full border border-rose-200/90 bg-white px-3 py-1.5 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                >
                  <CloudRain className="h-3.5 w-3.5" aria-hidden="true" />
                  Giả lập Mưa 75%
                </button>

                <button
                  type="button"
                  onClick={onOpenPlanBHistory}
                  title="Xem nhật ký hoán đổi Kế hoạch dự phòng"
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-stone-100"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#0a0a0a]/12 bg-white px-2.5 py-2 text-xs font-medium text-[#0a0a0a] transition hover:bg-[#eeeeee]"
                >
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">Nhật ký dự phòng</span>
                </button>

                <button
                  type="button"
                  onClick={onPrintItinerary}
                  title="Xuất PDF / In lịch trình"
                  className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-stone-100"
                  className="inline-flex items-center gap-1 rounded-lg border border-[#0a0a0a]/12 bg-white px-2.5 py-2 text-xs font-medium text-[#0a0a0a] transition hover:bg-[#eeeeee]"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden xl:inline">Xuất PDF</span>
                </button>
              </div>

              <div
                role="group"
                aria-label="Chọn ngày trong chuyến đi"
                className="inline-flex items-center gap-1 rounded-full border border-stone-200 bg-white p-1"
                className="inline-flex items-center gap-1 rounded-lg border border-[#0a0a0a]/12 bg-white p-1"
              >
                {days.map((day) => (
                  <button
                    key={day}
                    type="button"
                    aria-pressed={activeDayNumber === day}
                    onClick={() => onSelectDay(day)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${className = {`rounded-md px-3 py-1 text-xs font-medium transition ${activeDayNumber === day
                          ? 'bg-sky-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-stone-100 hover:text-slate-900'
                            ? 'bg-[#1f6b3a] text-white'
                            : 'text-[#6a6a6a] hover:bg-[#eeeeee] hover:text-[#0a0a0a]'
                        }`}
              >
                Ngày {day}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}
