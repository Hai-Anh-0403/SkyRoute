'use client';

import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AlertTriangle, CloudRain, GripVertical, Trash2 } from 'lucide-react';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import type { ItineraryItem } from '../types/trip.types';

interface TimelineItemCardProps {
  item: ItineraryItem;
  onDelete: (itemId: number) => void;
}

export function TimelineItemCard({ item, onDelete }: TimelineItemCardProps) {
  const setHoveredPlaceId = useWorkspaceStore((s) => s.setHoveredPlaceId);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: 'item', item },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const title = item.place?.name ?? item.stay?.name ?? 'Hoạt động';
  const address = item.place?.address ?? item.stay?.address;
  const isPlace = item.place !== null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHoveredPlaceId(item.placeId)}
      onMouseLeave={() => setHoveredPlaceId(null)}
      className={`rounded-xl border bg-white p-3 shadow-xs transition ${
        isDragging
          ? 'z-20 border-sky-500 opacity-75 ring-2 ring-sky-200'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label="Kéo để sắp xếp"
          className="mt-0.5 cursor-grab touch-none rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h4 className="truncate text-sm font-semibold text-slate-900">
              {title}
            </h4>
            <button
              type="button"
              aria-label="Xóa khỏi lịch trình"
              onClick={() => onDelete(item.id)}
              className="shrink-0 rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {address && (
            <p className="mt-0.5 truncate text-xs text-slate-500">{address}</p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
            {isPlace && (
              <span
                className={`rounded-full px-2 py-0.5 font-medium ${
                  item.place!.isOutdoor
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {item.place!.isOutdoor ? 'Ngoài trời' : 'Trong nhà'}
              </span>
            )}

            {item.distanceFromPrevKm > 0 && (
              <span className="rounded-full bg-sky-50 px-2 py-0.5 font-medium text-sky-700">
                Cách điểm trước {item.distanceFromPrevKm.toFixed(1)} km
              </span>
            )}

            {item.isDetourWarning && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-800">
                <AlertTriangle className="h-3 w-3" />
                Ngược đường ({item.distanceFromPrevKm.toFixed(1)} km)
              </span>
            )}

            {item.weatherAlertFlag && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                <CloudRain className="h-3 w-3" />
                Mưa {item.rainProbability ?? 0}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
