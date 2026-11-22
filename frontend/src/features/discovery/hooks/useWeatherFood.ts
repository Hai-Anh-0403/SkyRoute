'use client';

import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { discoveryService } from '../services/discovery.service';
import type { FoodRecommendationQueryParams } from '../types/discovery.types';

export function useWeatherFood(params: FoodRecommendationQueryParams | null) {
  return useQuery({
    queryKey: ['places', 'food-recommendations', params],
    queryFn: () => discoveryService.getFoodRecommendations(params!),
    enabled: params !== null,
    placeholderData: keepPreviousData,
  });
}
