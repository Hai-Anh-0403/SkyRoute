'use client';

import type { AxiosError } from 'axios';
import { Compass, RefreshCw, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { ApiErrorResponse } from '@/shared/types/api.types';
import { useCentroidStays } from '../hooks/useCentroidStays';
import type { StayType } from '../types/stay-finder.types';
import { StayComparisonCard } from './StayComparisonCard';

interface CentroidStayDrawerProps {
  tripId: number;
  onAddStay?: (stayId: number) => void;
  isAddingStay?: boolean;
}

const STAY_FILTER_OPTIONS: Array<{ value: StayType | 'all'; label: string }> = [
  { value: 'all', label: 'Tất cả' },
  { value: 'hotel', label: 'Khách sạn' },
  { value: 'homestay', label: 'Homestay' },
  { value: 'resort', label: 'Resort' },
];

export function CentroidStayDrawer({
  tripId,
  onAddStay,
  isAddingStay = false,
}: CentroidStayDrawerProps) {
  const isOpen = useWorkspaceStore((s) => s.isCentroidStayDrawerOpen);
  const setOpen = useWorkspaceStore((s) => s.setCentroidStayDrawerOpen);
  const hoveredStayId = useWorkspaceStore((s) => s.hoveredStayId);
  const setHoveredStayId = useWorkspaceStore((s) => s.setHoveredStayId);
  const setFocusedMapCoords = useWorkspaceStore((s) => s.setFocusedMapCoords);

  const [stayTypeFilter, setStayTypeFilter] = useState<StayType | 'all'>('all');
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const staysQuery = useCentroidStays(
    tripId,
    isOpen,
    stayTypeFilter === 'all' ? undefined : { stayType: stayTypeFilter },
  );

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, setOpen]);

  if (!isOpen) {
    return null;
  }

  const axiosErr = staysQuery.error as AxiosError<ApiErrorResponse> | null;
  const errorCode = axiosErr?.response?.data?.error?.code;
  const isEmptyTripError =
    axiosErr?.response?.status === 422 || errorCode === 'STAY_002';

  const data = staysQuery.data;

  return (
    <div
      role="dialog"
      aria-label="Gợi ý Lưu trú tại Tâm Chuyến Đi"
      className="fixed inset-y-0 right-0 z-40 flex w-full max-w-md flex-col border-l border-slate-200 bg-slate-50 shadow-2xl"
    >
      <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
        <div>
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700">
            <Compass className="h-3.5 w-3.5" />
            Lưu trú tại Tâm Chuyến Đi (Centroid)
          </span>
          <h3 className="mt-0.5 text-base font-bold text-slate-900">
            Khách sạn & Homestay tối ưu quãng đường
          </h3>
        </div>
        <button
          ref={closeButtonRef}
          type="button"
          aria-label="Đóng gợi ý lưu trú"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-sky-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 bg-white px-4 py-2.5">
        {STAY_FILTER_OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setStayTypeFilter(option.value)}
            className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
              stayTypeFilter === option.value
                ? 'bg-amber-500 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {staysQuery.isLoading && (
          <div className="space-y-3" aria-busy="true" aria-label="Đang tải lưu trú">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 animate-pulse rounded-xl border border-slate-200 bg-white"
              />
            ))}
          </div>
        )}

        {staysQuery.isError && isEmptyTripError && (
          <div
            role="status"
            className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            Hãy thêm ít nhất 1 địa điểm tham quan hoặc quán ăn vào lịch trình
            để hệ thống tính trọng tâm chuyến đi và gợi ý chỗ ở tối ưu.
          </div>
        )}

        {staysQuery.isError && !isEmptyTripError && (
          <div className="space-y-2 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p>Không thể tải danh sách lưu trú gần tâm chuyến đi.</p>
            <button
              type="button"
              onClick={() => staysQuery.refetch()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Thử lại
            </button>
          </div>
        )}

        {data && (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-slate-700">
              Trọng tâm hình học từ{' '}
              <strong className="text-slate-900">
                {data.totalItineraryPlaces} địa điểm
              </strong>{' '}
              ({data.centroidLocation.lat.toFixed(4)},{' '}
              {data.centroidLocation.lng.toFixed(4)}) — xếp hạng bằng PostGIS
              KNN.
            </div>

            {data.recommendedStays.length === 0 ? (
              <div
                role="status"
                className="rounded-xl border border-slate-200 bg-white p-4 text-center text-sm text-slate-500"
              >
                Không tìm thấy cơ sở lưu trú phù hợp với bộ lọc hiện tại.
              </div>
            ) : (
              data.recommendedStays.map((stay, idx) => (
                <StayComparisonCard
                  key={stay.id}
                  stay={stay}
                  rank={idx + 1}
                  isHovered={hoveredStayId === stay.id}
                  onHover={setHoveredStayId}
                  onFocusMap={(coords) => setFocusedMapCoords(coords)}
                  onAddStay={onAddStay}
                  isAddingStay={isAddingStay}
                />
              ))
            )}
          </>
        )}
      </div>
    </div>
  );
}
