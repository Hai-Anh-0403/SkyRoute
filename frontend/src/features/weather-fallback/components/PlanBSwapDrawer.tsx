'use client';

import { CloudRain, X } from 'lucide-react';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { usePlanBCandidates, useSwapPlanB } from '../hooks/useWeatherFallback';
import { PlanBCandidateCard } from './PlanBCandidateCard';

interface PlanBSwapDrawerProps {
  tripId: number;
}

export function PlanBSwapDrawer({ tripId }: PlanBSwapDrawerProps) {
  const activePlanBItemId = useWorkspaceStore((s) => s.activePlanBItemId);
  const setActivePlanBItemId = useWorkspaceStore((s) => s.setActivePlanBItemId);

  const candidatesQuery = usePlanBCandidates(tripId, activePlanBItemId);
  const swapMutation = useSwapPlanB(tripId);

  if (activePlanBItemId === null) {
    return null;
  }

  const data = candidatesQuery.data;

  return (
    <div
      role="dialog"
      aria-label="Gợi ý Kế hoạch dự phòng trong nhà"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600">
            <CloudRain className="h-3.5 w-3.5" />
            Kế hoạch dự phòng thích ứng thời tiết
          </span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">
            {data?.conflictedItem.placeName ?? 'Đang tìm điểm thay thế...'}
          </h3>
        </div>
        <button
          type="button"
          aria-label="Đóng Kế hoạch dự phòng"
          onClick={() => setActivePlanBItemId(null)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {candidatesQuery.isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-32 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {candidatesQuery.isError && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            Không tìm thấy địa điểm trong nhà phù hợp trong bán kính 3 km hoặc
            đã hết điểm thay thế trong ngày.
          </div>
        )}

        {data && (
          <>
            <p className="text-xs text-slate-600">
              AI & PostGIS đã lọc{' '}
              <span className="font-semibold text-slate-900">
                {data.candidates.length} điểm trong nhà
              </span>{' '}
              gần điểm trước nhất (bán kính{' '}
              {(data.radiusMeters / 1000).toFixed(1)} km) để thay thế do dự báo
              mưa{' '}
              <span className="font-semibold text-rose-600">
                {data.conflictedItem.rainProbability}%
              </span>
              :
            </p>

            {data.candidates.map((candidate) => (
              <PlanBCandidateCard
                key={candidate.placeId}
                candidate={candidate}
                isSwapping={swapMutation.isPending}
                onSwap={(placeId) =>
                  swapMutation.mutate({
                    itemId: activePlanBItemId,
                    payload: {
                      replacementPlaceId: placeId,
                      note: `Hoán đổi Kế hoạch dự phòng tránh mưa ${data.conflictedItem.rainProbability}%`,
                    },
                  })
                }
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
