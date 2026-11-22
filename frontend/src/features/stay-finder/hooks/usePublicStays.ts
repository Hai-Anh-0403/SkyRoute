'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { stayFinderService } from '../services/stay-finder.service';
import type { PublicStaysQueryParams } from '../types/stay-finder.types';

export function usePublicStays(params: PublicStaysQueryParams | null) {
  return useQuery({
    queryKey: ['stays', 'public', params],
    queryFn: () => stayFinderService.listPublicStays(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}
