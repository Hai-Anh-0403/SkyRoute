import type { BudgetPreference } from '@/features/auth';
import type { ItineraryItem } from '../types/trip.types';

const CATEGORY_ESTIMATE_VND: Record<string, number> = {
  restaurant: 220_000,
  cafe: 80_000,
  attraction: 120_000,
};

const BUDGET_DAILY_CEILING_VND: Record<BudgetPreference, number> = {
  low: 800_000,
  medium: 1_800_000,
  high: 4_000_000,
};

const BUDGET_LABEL: Record<BudgetPreference, string> = {
  low: 'Tiết kiệm',
  medium: 'Ngân sách vừa',
  high: 'Cao cấp',
};

export interface TripBudgetEstimate {
  activitiesTotalVnd: number;
  staysTotalVnd: number;
  grandTotalVnd: number;
  perDayVnd: number;
  nightsCount: number;
  status: 'aligned' | 'over' | 'unknown';
  targetLabel: string | null;
}

export function estimateTripBudget(
  items: ItineraryItem[],
  totalDays: number,
  userBudget?: BudgetPreference,
): TripBudgetEstimate {
  const safeDays = Math.max(1, totalDays);
  const nightsCount = Math.max(1, safeDays - 1);

  let activitiesTotalVnd = 0;
  let stayPricePerNight = 0;

  for (const item of items) {
    if (item.place) {
      const base =
        CATEGORY_ESTIMATE_VND[item.place.category] ??
        CATEGORY_ESTIMATE_VND.attraction;
      activitiesTotalVnd += base;
    }
    if (item.stay && item.stay.pricePerNight > 0) {
      // Use the selected stay's nightly rate once across the trip nights
      stayPricePerNight = Math.max(stayPricePerNight, item.stay.pricePerNight);
    }
  }

  const staysTotalVnd = stayPricePerNight * nightsCount;
  const grandTotalVnd = activitiesTotalVnd + staysTotalVnd;
  const perDayVnd = Math.round(grandTotalVnd / safeDays);

  let status: TripBudgetEstimate['status'] = 'unknown';
  let targetLabel: string | null = null;

  if (userBudget) {
    targetLabel = BUDGET_LABEL[userBudget];
    status =
      perDayVnd <= BUDGET_DAILY_CEILING_VND[userBudget] ? 'aligned' : 'over';
  }

  return {
    activitiesTotalVnd,
    staysTotalVnd,
    grandTotalVnd,
    perDayVnd,
    nightsCount,
    status,
    targetLabel,
  };
}

export function formatVnd(amount: number): string {
  return `${Math.round(amount).toLocaleString('vi-VN')} đ`;
}
