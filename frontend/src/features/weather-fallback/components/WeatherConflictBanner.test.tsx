import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { WeatherConflictBanner } from './WeatherConflictBanner';

describe('WeatherConflictBanner', () => {
  afterEach(() => {
    cleanup();
  });

  it('displays rain percentage warning and invokes onOpenPlanB with itemId', () => {
    const onOpenPlanB = vi.fn();
    render(
      <WeatherConflictBanner
        itemId={103}
        rainProbability={75}
        onOpenPlanB={onOpenPlanB}
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Hoạt động ngoài trời xung đột mưa (75%)',
    );

    fireEvent.click(
      screen.getByRole('button', { name: /Tìm Kế hoạch dự phòng/i }),
    );
    expect(onOpenPlanB).toHaveBeenCalledWith(103);
  });
});
