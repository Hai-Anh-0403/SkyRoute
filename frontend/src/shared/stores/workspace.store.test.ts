import { beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceStore } from './workspace.store';

describe('useWorkspaceStore', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  it('updates hoveredPlaceId and activeDayNumber', () => {
    useWorkspaceStore.getState().setHoveredPlaceId(42);
    useWorkspaceStore.getState().setActiveDayNumber(2);

    const state = useWorkspaceStore.getState();
    expect(state.hoveredPlaceId).toBe(42);
    expect(state.activeDayNumber).toBe(2);
  });

  it('clamps radarRadiusKm between 1 and 5 km', () => {
    useWorkspaceStore.getState().setRadarRadiusKm(0.2);
    expect(useWorkspaceStore.getState().radarRadiusKm).toBe(1);

    useWorkspaceStore.getState().setRadarRadiusKm(12);
    expect(useWorkspaceStore.getState().radarRadiusKm).toBe(5);
  });

  it('tracks activePlanBItemId and radarAnchorCoords', () => {
    useWorkspaceStore.getState().setActivePlanBItemId(103);
    useWorkspaceStore
      .getState()
      .setRadarAnchorCoords({ lat: 11.9404, lng: 108.4583 });

    const state = useWorkspaceStore.getState();
    expect(state.activePlanBItemId).toBe(103);
    expect(state.radarAnchorCoords).toEqual({ lat: 11.9404, lng: 108.4583 });
  });

  it('tracks centroid stay drawer, hoveredStayId, and focusedMapCoords', () => {
    useWorkspaceStore.getState().setCentroidStayDrawerOpen(true);
    useWorkspaceStore.getState().setHoveredStayId(7);
    useWorkspaceStore
      .getState()
      .setFocusedMapCoords({ lat: 11.9412, lng: 108.451 });

    const state = useWorkspaceStore.getState();
    expect(state.isCentroidStayDrawerOpen).toBe(true);
    expect(state.hoveredStayId).toBe(7);
    expect(state.focusedMapCoords).toEqual({ lat: 11.9412, lng: 108.451 });
  });
});
