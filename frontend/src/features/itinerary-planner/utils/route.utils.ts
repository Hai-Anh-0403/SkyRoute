import type { MapRouteSegment, TimeSlotType } from '@/shared/types/geo.types';
import type { ItineraryItem, ReorderItemEntry } from '../types/trip.types';

export const SLOT_ORDER: Record<TimeSlotType, number> = {
  morning: 0,
  lunch: 1,
  afternoon: 2,
  dinner: 3,
};

export function sortDayItems(
  items: ItineraryItem[],
  dayNumber: number,
): ItineraryItem[] {
  return items
    .filter((item) => item.dayNumber === dayNumber)
    .slice()
    .sort((a, b) => {
      const slotDiff = SLOT_ORDER[a.timeSlot] - SLOT_ORDER[b.timeSlot];
      if (slotDiff !== 0) {
        return slotDiff;
      }
      if (a.orderIndex !== b.orderIndex) {
        return a.orderIndex - b.orderIndex;
      }
      return a.id - b.id;
    });
}

export function buildDailyRouteSegments(
  items: ItineraryItem[],
  dayNumber: number,
): MapRouteSegment[] {
  const sorted = sortDayItems(items, dayNumber);
  const stops = sorted
    .map((item) => {
      const location = item.place?.location ?? item.stay?.location;
      const label = item.place?.name ?? item.stay?.name ?? 'Điểm dừng';
      return location ? { item, location, label } : null;
    })
    .filter((stop): stop is NonNullable<typeof stop> => stop !== null);

  const segments: MapRouteSegment[] = [];
  for (let i = 1; i < stops.length; i++) {
    const prev = stops[i - 1];
    const curr = stops[i];
    segments.push({
      id: `${prev.item.id}-${curr.item.id}`,
      from: prev.location,
      to: curr.location,
      distanceKm: curr.item.distanceFromPrevKm,
      isDetourWarning: curr.item.isDetourWarning,
      fromLabel: prev.label,
      toLabel: curr.label,
    });
  }
  return segments;
}

export function computeReorderedDayState(
  allItems: ItineraryItem[],
  activeItemId: number,
  targetSlot: TimeSlotType,
  targetIndex: number,
  dayNumber: number,
): { nextItems: ItineraryItem[]; payload: ReorderItemEntry[] } {
  const moving = allItems.find((item) => item.id === activeItemId);
  if (!moving) {
    return { nextItems: allItems, payload: [] };
  }

  const dayItemsWithoutActive = sortDayItems(allItems, dayNumber).filter(
    (item) => item.id !== activeItemId,
  );

  const bySlot: Record<TimeSlotType, ItineraryItem[]> = {
    morning: [],
    lunch: [],
    afternoon: [],
    dinner: [],
  };

  for (const item of dayItemsWithoutActive) {
    bySlot[item.timeSlot].push(item);
  }

  const targetList = bySlot[targetSlot];
  const clampedIndex = Math.max(0, Math.min(targetIndex, targetList.length));
  targetList.splice(clampedIndex, 0, {
    ...moving,
    dayNumber,
    timeSlot: targetSlot,
  });

  const updatedDayItems: ItineraryItem[] = [];
  const payload: ReorderItemEntry[] = [];

  (['morning', 'lunch', 'afternoon', 'dinner'] as TimeSlotType[]).forEach(
    (slot) => {
      bySlot[slot].forEach((item, index) => {
        const updatedItem: ItineraryItem = {
          ...item,
          dayNumber,
          timeSlot: slot,
          orderIndex: index,
        };
        updatedDayItems.push(updatedItem);
        payload.push({
          itemId: updatedItem.id,
          dayNumber,
          timeSlot: slot,
          orderIndex: index,
        });
      });
    },
  );

  const otherDayItems = allItems.filter((item) => item.dayNumber !== dayNumber);
  return {
    nextItems: [...otherDayItems, ...updatedDayItems],
    payload,
  };
}
