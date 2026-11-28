'use client';

import { ArrowRight, CloudRain, History, X } from 'lucide-react';
import { useEffect } from 'react';
import { usePlanBHistory } from '../hooks/useWeatherFallback';

const SLOT_LABEL: Record<string, string> = {
  morning: 'Sáng',
  lunch: 'Trưa',
  afternoon: 'Chiều',
  dinner: 'Tối',
};

interface PlanBHistoryDrawerProps {
  tripId: number;
  isOpen: boolean;
  onClose: () => void;
}

export function PlanBHistoryDrawer({
  tripId,
  isOpen,
  onClose,
}: PlanBHistoryDrawerProps) {
  const historyQuery = usePlanBHistory(tripId, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const items = historyQuery.data ?? [];

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-b-history-title"
    >
      <div className="flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-[#FAFAF9] shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4">
          <div className="flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-sky-600" aria-hidden="true" />
            <h2
              id="plan-b-history-title"
              className="font-editorial text-lg font-bold text-slate-900"
            >
              Nhật ký Kế hoạch dự phòng
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng nhật ký Kế hoạch dự phòng"
            className="rounded-full p-1.5 text-slate-400 transition hover:bg-stone-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {historyQuery.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((n) => (
                <div
                  key={n}
                  className="h-24 animate-pulse rounded-2xl border border-stone-200 bg-white"
                />
              ))}
            </div>
          ) : historyQuery.isError ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700">
              Không thể tải nhật ký hoán đổi Kế hoạch dự phòng. Vui lòng thử lại
              sau.
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white p-6 text-center">
              <CloudRain
                className="mx-auto h-7 w-7 text-slate-300"
                aria-hidden="true"
              />
              <p className="mt-2 text-sm font-semibold text-slate-800">
                Chưa có lượt hoán đổi nào
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Khi thời tiết mưa ≥ 60% và bạn kích hoạt Kế hoạch dự phòng sang
                điểm trong nhà, lịch sử thích ứng sẽ được ghi nhận tại đây.
              </p>
            </div>
          ) : (
            <ol className="space-y-3">
              {items.map((entry) => (
                <li
                  key={entry.id}
                  className="rounded-2xl border border-stone-200/90 bg-white p-4 shadow-2xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 font-semibold text-rose-700">
                      <CloudRain className="h-3 w-3" aria-hidden="true" />
                      Mưa {entry.rainProbabilityAtSwap}%
                    </span>
                    <span className="text-slate-400">
                      {entry.dayNumber ? `Ngày ${entry.dayNumber}` : ''}
                      {entry.timeSlot
                        ? ` • ${SLOT_LABEL[entry.timeSlot] ?? entry.timeSlot}`
                        : ''}
                    </span>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2 text-xs">
                    <span className="line-through text-slate-500">
                      {entry.originalPlaceName}
                    </span>
                    <ArrowRight
                      className="h-3.5 w-3.5 shrink-0 text-sky-600"
                      aria-hidden="true"
                    />
                    <span className="font-semibold text-emerald-700">
                      {entry.replacementPlaceName}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                    <span>
                      Khoảng cách từ điểm trước:{' '}
                      <strong>{entry.distanceFromPrevKm.toFixed(2)} km</strong>
                    </span>
                    <time dateTime={entry.createdAt}>
                      {new Date(entry.createdAt).toLocaleDateString('vi-VN')}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
