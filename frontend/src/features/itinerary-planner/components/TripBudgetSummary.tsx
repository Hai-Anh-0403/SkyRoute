'use client';

import { Wallet } from 'lucide-react';
import { useAuthStore } from '@/features/auth';
import type { ItineraryItem } from '../types/trip.types';
import { estimateTripBudget, formatVnd } from '../utils/budget.utils';

interface TripBudgetSummaryProps {
  items: ItineraryItem[];
  totalDays: number;
}

export function TripBudgetSummary({
  items,
  totalDays,
}: TripBudgetSummaryProps) {
  const userBudget = useAuthStore((s) => s.user?.preferences?.budget);
  const estimate = estimateTripBudget(items, totalDays, userBudget);

  return (
    <div className="rounded-2xl border border-stone-200/90 bg-white px-4 py-3 shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-sky-50 text-sky-600">
            <Wallet className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-medium text-slate-500">
              Ước tính ngân sách ({totalDays} ngày)
            </p>
            <p className="text-sm font-bold text-slate-900">
              {formatVnd(estimate.grandTotalVnd)}
              <span className="ml-1.5 text-xs font-normal text-slate-500">
                (~{formatVnd(estimate.perDayVnd)}/ngày)
              </span>
            </p>
          </div>
        </div>

        {estimate.targetLabel ? (
          <span
            className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              estimate.status === 'aligned'
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {estimate.status === 'aligned'
              ? `Phù hợp • ${estimate.targetLabel}`
              : `Vượt nhẹ • ${estimate.targetLabel}`}
          </span>
        ) : null}
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-stone-100 pt-2 text-[11px] text-slate-500">
        <span>Hoạt động & Ăn uống: {formatVnd(estimate.activitiesTotalVnd)}</span>
        <span>
          Lưu trú ({estimate.nightsCount} đêm):{' '}
          {estimate.staysTotalVnd > 0
            ? formatVnd(estimate.staysTotalVnd)
            : 'Chưa chọn phòng'}
        </span>
      </div>
    </div>
  );
}
