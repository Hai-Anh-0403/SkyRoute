'use client';

import { useQuery } from '@tanstack/react-query';
import { stayFinderService } from '../services/stay-finder.service';
import type { CentroidStaysQueryParams } from '../types/stay-finder.types';

export function useCentroidStays(
  tripId: number,
  enabled = true,
  params?: CentroidStaysQueryParams,
) {
  return useQuery({
    queryKey: ['centroid-stays', tripId, params ?? {}],
    queryFn: () => stayFinderService.getCentroidStays(tripId, params),
    enabled: Number.isFinite(tripId) && tripId > 0 && enabled,
    retry: false,
  });
}
