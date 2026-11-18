import { create } from 'zustand';

export type TimeSlotType = 'morning' | 'lunch' | 'afternoon' | 'dinner';

export interface Coordinates {
  lat: number;
  lng: number;
}

interface WorkspaceState {
  hoveredPlaceId: number | null;
  selectedItemId: number | null;
  activeDayNumber: number;
  activeSlot: TimeSlotType | null;
  radarAnchorCoords: Coordinates | null;
  radarRadiusKm: number;
  activePlanBItemId: number | null;
  setHoveredPlaceId: (id: number | null) => void;
  setSelectedItemId: (id: number | null) => void;
  setActiveDayNumber: (day: number) => void;
  setActiveSlot: (slot: TimeSlotType | null) => void;
  setRadarAnchorCoords: (coords: Coordinates | null) => void;
  setRadarRadiusKm: (radiusKm: number) => void;
  setActivePlanBItemId: (itemId: number | null) => void;
  resetWorkspace: () => void;
}

const initialState = {
  hoveredPlaceId: null,
  selectedItemId: null,
  activeDayNumber: 1,
  activeSlot: null,
  radarAnchorCoords: null,
  radarRadiusKm: 3,
  activePlanBItemId: null,
};

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  ...initialState,
  setHoveredPlaceId: (hoveredPlaceId) => set({ hoveredPlaceId }),
  setSelectedItemId: (selectedItemId) => set({ selectedItemId }),
  setActiveDayNumber: (activeDayNumber) => set({ activeDayNumber }),
  setActiveSlot: (activeSlot) => set({ activeSlot }),
  setRadarAnchorCoords: (radarAnchorCoords) => set({ radarAnchorCoords }),
  setRadarRadiusKm: (radarRadiusKm) =>
    set({ radarRadiusKm: Math.min(5, Math.max(1, radarRadiusKm)) }),
  setActivePlanBItemId: (activePlanBItemId) => set({ activePlanBItemId }),
  resetWorkspace: () => set(initialState),
}));
