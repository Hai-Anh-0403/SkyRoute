import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useWorkspaceStore } from '@/shared/stores/workspace.store';
import { ProximityRadarControl } from './ProximityRadarControl';

describe('ProximityRadarControl', () => {
  beforeEach(() => {
    useWorkspaceStore.getState().resetWorkspace();
  });

  afterEach(() => {
    cleanup();
  });

  it('updates radarRadiusKm in workspace store when slider moves', () => {
    render(<ProximityRadarControl totalFound={18} />);

    expect(screen.getByText('3 km')).toBeInTheDocument();
    expect(screen.getByText(/18 điểm/)).toBeInTheDocument();

    const slider = screen.getByLabelText('Bán kính Radar');
    fireEvent.change(slider, { target: { value: '4.5' } });

    expect(useWorkspaceStore.getState().radarRadiusKm).toBe(4.5);
    expect(screen.getByText('4.5 km')).toBeInTheDocument();
  });

  it('resets radarAnchorCoords back to Da Lat center', () => {
    useWorkspaceStore
      .getState()
      .setRadarAnchorCoords({ lat: 11.9814, lng: 108.4241 });

    render(<ProximityRadarControl />);
    fireEvent.click(
      screen.getByRole('button', { name: /Đặt lại tâm Đà Lạt/i }),
    );

    expect(useWorkspaceStore.getState().radarAnchorCoords).toEqual({
      lat: 11.9404,
      lng: 108.4583,
    });
  });
});
