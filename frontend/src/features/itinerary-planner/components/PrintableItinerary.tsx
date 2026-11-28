'use client';

import { TIME_SLOT_META, type TripDetail } from '../types/trip.types';
import { estimateTripBudget, formatVnd } from '../utils/budget.utils';
import { sortDayItems } from '../utils/route.utils';

interface PrintableItineraryProps {
  trip: TripDetail;
}

export function PrintableItinerary({ trip }: PrintableItineraryProps) {
  const days = Array.from({ length: trip.totalDays }, (_, i) => i + 1);
  const budget = estimateTripBudget(trip.items, trip.totalDays);

  return (
    <div className="hidden bg-white p-8 text-slate-900 print:block">
      <div className="border-b-2 border-slate-900 pb-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
          SkyRoute — Lịch trình du lịch thích ứng thời tiết
        </p>
        <h1 className="font-editorial mt-1 text-3xl font-bold text-slate-900">
          {trip.title}
        </h1>
        <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 text-sm text-slate-600">
          <span>Điểm đến: {trip.destinationCity}</span>
          <span>
            Thời gian: {trip.startDate} → {trip.endDate} ({trip.totalDays} ngày)
          </span>
          <span>Ngân sách ước tính: {formatVnd(budget.grandTotalVnd)}</span>
        </div>
      </div>

      <div className="mt-6 space-y-6">
        {days.map((day) => {
          const dayItems = sortDayItems(trip.items, day);
          return (
            <section key={day} className="break-inside-avoid">
              <h2 className="font-editorial border-b border-stone-300 pb-1.5 text-xl font-bold text-slate-900">
                Ngày {day}
              </h2>

              {dayItems.length === 0 ? (
                <p className="mt-2 text-xs italic text-slate-500">
                  Chưa có hoạt động nào trong ngày này.
                </p>
              ) : (
                <div className="mt-3 space-y-3">
                  {TIME_SLOT_META.map((slotMeta) => {
                    const slotItems = dayItems.filter(
                      (i) => i.timeSlot === slotMeta.slot,
                    );
                    if (slotItems.length === 0) return null;

                    return (
                      <div key={slotMeta.slot}>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-sky-800">
                          {slotMeta.label} ({slotMeta.timeRange})
                        </h3>
                        <ul className="mt-1.5 space-y-1.5">
                          {slotItems.map((item) => {
                            const name =
                              item.place?.name ??
                              item.stay?.name ??
                              'Điểm dừng chân';
                            const address =
                              item.place?.address ?? item.stay?.address ?? '';
                            return (
                              <li
                                key={item.id}
                                className="rounded-lg border border-stone-200 px-3 py-2 text-xs"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold text-slate-900">
                                    {name}
                                  </span>
                                  {item.distanceFromPrevKm > 0 ? (
                                    <span className="text-slate-500">
                                      +{item.distanceFromPrevKm.toFixed(1)} km
                                    </span>
                                  ) : null}
                                </div>
                                {address ? (
                                  <p className="mt-0.5 text-slate-600">
                                    {address}
                                  </p>
                                ) : null}
                                {item.note ? (
                                  <p className="mt-0.5 italic text-slate-500">
                                    Ghi chú: {item.note}
                                  </p>
                                ) : null}
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
