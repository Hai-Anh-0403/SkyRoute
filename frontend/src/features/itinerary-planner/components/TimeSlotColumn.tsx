'use client';

import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import type { TimeSlotType } from '@/shared/types/geo.types';
import type { ItineraryItem } from '../types/trip.types';
import { TimelineItemCard } from './TimelineItemCard';

interface TimeSlotColumnProps {
  timeSlot: TimeSlotType;
  label: string;
  timeRange: string;
  items: ItineraryItem[];
  onDeleteItem: (itemId: number) => void;
  onAddFromRadar: (slot: TimeSlotType) => void;
}

export function TimeSlotColumn({
  timeSlot,
  label,
  timeRange,
  items,
  onDeleteItem,
  onAddFromRadar,
}: TimeSlotColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${timeSlot}`,
    data: { type: 'slot', timeSlot },
  });

  return (
    <section
      ref={setNodeRef}
      className={`rounded-xl border p-3 transition ${
        isOver
          ? 'border-sky-500 bg-sky-50/70'
          : 'border-slate-200 bg-slate-50/70'
      }`}
    >
      <div className="mb-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-900">{label}</span>
          <span className="text-xs text-slate-500">{timeRange}</span>
        </div>
        <button
          type="button"
          onClick={() => onAddFromRadar(timeSlot)}
          className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-sky-700 hover:bg-sky-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Thêm
        </button>
      </div>

      <SortableContext
        items={items.map((i) => i.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-300 bg-white/60 px-3 py-4 text-center text-xs text-slate-400">
              Kéo địa điểm vào khung giờ {label.toLowerCase()} hoặc bấm Thêm
            </div>
          ) : (
            items.map((item) => (
              <TimelineItemCard
                key={item.id}
                item={item}
                onDelete={onDeleteItem}
              />
            ))
          )}
        </div>
      </SortableContext>
    </section>
  );
}
