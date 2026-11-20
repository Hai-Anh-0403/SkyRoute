'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { discoveryService } from '../services/discovery.service';
import type {
  DiscoveryFilters,
  RadarQueryParams,
} from '../types/discovery.types';

export function useRadarPlaces(params: RadarQueryParams | null) {
  return useQuery({
    queryKey: ['places', 'radar', params],
    queryFn: () => discoveryService.getRadarPlaces(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}

export function usePlaces(filters: DiscoveryFilters) {
  return useQuery({
    queryKey: ['places', 'list', filters],
    queryFn: () => discoveryService.getPlaces(filters),
  });
}
