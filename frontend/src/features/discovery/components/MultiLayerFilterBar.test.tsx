import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MultiLayerFilterBar } from './MultiLayerFilterBar';

describe('MultiLayerFilterBar', () => {
  afterEach(() => {
    cleanup();
  });

  it('updates category, indoor/outdoor, weatherTag, and hasAc filters', () => {
    const onChange = vi.fn();
    render(
      <MultiLayerFilterBar filters={{ city: 'Da Lat' }} onChange={onChange} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Ẩm thực' }));
    expect(onChange).toHaveBeenLastCalledWith({
      city: 'Da Lat',
      category: 'restaurant',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Trong nhà (Indoor)' }));
    expect(onChange).toHaveBeenLastCalledWith({
      city: 'Da Lat',
      isOutdoor: false,
    });

    fireEvent.click(screen.getByRole('button', { name: 'Ngày mưa' }));
    expect(onChange).toHaveBeenLastCalledWith({
      city: 'Da Lat',
      weatherTag: 'rainy',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Có điều hòa' }));
    expect(onChange).toHaveBeenLastCalledWith({
      city: 'Da Lat',
      hasAc: true,
    });
  });

  it('clears all active filters back to city only', () => {
    const onChange = vi.fn();
    render(
      <MultiLayerFilterBar
        filters={{
          city: 'Da Lat',
          category: 'restaurant',
          isOutdoor: false,
          weatherTag: 'rainy',
        }}
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Xóa bộ lọc' }));
    expect(onChange).toHaveBeenCalledWith({ city: 'Da Lat' });
  });
});
