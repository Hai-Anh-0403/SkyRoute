import { Injectable } from '@nestjs/common';
import { PlaceResponseItem } from '../../discovery/types/discovery.types';

export interface RankedCandidate {
  place: PlaceResponseItem;
  contextualScore: number;
}

@Injectable()
export class ContextualRankingService {
  rankIndoorCandidates(
    candidates: PlaceResponseItem[],
    targetCategory: string | undefined,
    maxRadiusKm: number,
  ): RankedCandidate[] {
    const safeRadius = maxRadiusKm > 0 ? maxRadiusKm : 3;

    return candidates
      .map((place) => {
        const prefScore =
          targetCategory && place.category === targetCategory
            ? 1.0
            : place.category === 'attraction' || place.category === 'cafe'
              ? 0.7
              : 0.5;

        const weatherScore =
          !place.isOutdoor && place.suitableWeather.includes('rainy')
            ? 1.0
            : !place.isOutdoor
              ? 0.7
              : 0;

        const distKm = place.distanceKm ?? safeRadius;
        const distanceScore = Math.max(0, Math.min(1, 1 - distKm / safeRadius));
        const ratingScore = Math.max(0, Math.min(1, place.rating / 5));

        const rawScore =
          0.25 * prefScore +
          0.3 * weatherScore +
          0.3 * distanceScore +
          0.15 * ratingScore;

        return {
          place,
          contextualScore: Number(rawScore.toFixed(2)),
        };
      })
      .sort((a, b) => b.contextualScore - a.contextualScore);
  }
}
