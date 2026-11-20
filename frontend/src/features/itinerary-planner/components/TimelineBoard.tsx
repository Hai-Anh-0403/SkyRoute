'use client';

import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import type { TimeSlotType } from '@/shared/types/geo.types';
import type { ReorderTimelineVariables } from '../hooks/useReorderTimeline';
import { TIME_SLOT_META, type ItineraryItem } from '../types/trip.types';
import { computeReorderedDayState, sortDayItems } from '../utils/route.utils';
import { TimeSlotColumn } from './TimeSlotColumn';

interface TimelineBoardProps {
  allItems: ItineraryItem[];
  dayNumber: number;
  onReorder: (vars: ReorderTimelineVariables) => void;
  onDeleteItem: (itemId: number) => void;
  onAddFromRadar: (slot: TimeSlotType) => void;
}

export function TimelineBoard({
  allItems,
  dayNumber,
  onReorder,
  onDeleteItem,
  onAddFromRadar,
}: TimelineBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const dayItems = sortDayItems(allItems, dayNumber);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const activeId = Number(active.id);
    const overData = over.data.current as
      | { type?: 'slot' | 'item'; timeSlot?: TimeSlotType; item?: ItineraryItem }
      | undefined;

    let targetSlot: TimeSlotType | undefined;
    let targetIndex = 0;

    if (overData?.type === 'slot' && overData.timeSlot) {
      targetSlot = overData.timeSlot;
      targetIndex = dayItems.filter(
        (i) => i.timeSlot === targetSlot && i.id !== activeId,
      ).length;
    } else if (overData?.type === 'item' && overData.item) {
      targetSlot = overData.item.timeSlot;
      const slotItems = dayItems.filter(
        (i) => i.timeSlot === targetSlot && i.id !== activeId,
      );
      const idx = slotItems.findIndex((i) => i.id === overData.item!.id);
      targetIndex = idx >= 0 ? idx : slotItems.length;
    }

    if (!targetSlot) {
      return;
    }

    const { nextItems, payload } = computeReorderedDayState(
      allItems,
      activeId,
      targetSlot,
      targetIndex,
      dayNumber,
    );

    if (payload.length > 0) {
      onReorder({ payload, optimisticItems: nextItems });
    }
  };

  return (
    <DndContext
      id="skyroute-timeline-dnd"
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {TIME_SLOT_META.map(({ slot, label, timeRange }) => (
          <TimeSlotColumn
            key={slot}
            timeSlot={slot}
            label={label}
            timeRange={timeRange}
            items={dayItems.filter((item) => item.timeSlot === slot)}
            onDeleteItem={onDeleteItem}
            onAddFromRadar={onAddFromRadar}
          />
        ))}
      </div>
    </DndContext>
  );
}
