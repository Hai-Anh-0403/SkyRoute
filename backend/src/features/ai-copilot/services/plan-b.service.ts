import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import { LlmToolClient } from '../../../core/integrations/llm-tool.client';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { resolveCityCoordinates } from '../../../shared/utils/time-slot.util';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import { ItineraryItemRepository } from '../../trips/repositories/itinerary-item.repository';
import { TripRepository } from '../../trips/repositories/trip.repository';
import { TimelineService } from '../../trips/services/timeline.service';
import {
  Coordinates,
  ItineraryItemResponse,
  TRIP_ITEMS_CHANGED_EVENT,
  TripItemsChangedEvent,
} from '../../trips/types/trip.types';
import { SwapPlanBDto } from '../dto/plan-b.dto';
import { PlanBSwapRepository } from '../repositories/plan-b-swap.repository';
import {
  PlanBCandidate,
  PlanBCandidatesResponse,
  SwapPlanBResponse,
} from '../types/ai-copilot.types';
import { ContextualRankingService } from './contextual-ranking.service';

const DEFAULT_PLAN_B_RADIUS_METERS = 3000;
const MAX_CANDIDATES = 3;

export function haversineDistanceKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * sinLng * sinLng;
  return 2 * r * Math.asin(Math.sqrt(h));
}

@Injectable()
export class PlanBService {
  private readonly logger = new Logger(PlanBService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tripRepo: TripRepository,
    private readonly itemRepo: ItineraryItemRepository,
    private readonly timelineService: TimelineService,
    private readonly discoveryService: DiscoveryService,
    private readonly rankingService: ContextualRankingService,
    private readonly swapRepo: PlanBSwapRepository,
    private readonly llmClient: LlmToolClient,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async getPlanBHistory(userId: string, tripId: string) {
    await this.requireOwnedTrip(userId, tripId);
    const swaps = await this.swapRepo.findByTripWithDetails(tripId);
    return swaps.map((s) => ({
      id: Number(s.id),
      itineraryItemId: Number(s.itineraryItemId),
      dayNumber: s.itineraryItem?.dayNumber ?? null,
      timeSlot: s.itineraryItem?.timeSlot ?? null,
      originalPlaceName: s.originalPlace?.name ?? `Place #${s.originalPlaceId}`,
      replacementPlaceName:
        s.replacementPlace?.name ?? `Place #${s.replacementPlaceId}`,
      rainProbabilityAtSwap: Number(s.rainProbabilityAtSwap),
      distanceFromPrevKm: Number(s.distanceFromPrevKm),
      createdAt: s.createdAt.toISOString(),
    }));
  }

  async getPlanBCandidates(
    userId: string,
    tripId: string,
    itemId: string,
  ): Promise<PlanBCandidatesResponse> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const items = await this.itemRepo.findByTripOrdered(tripId);
    const targetItem = this.findTargetItem(items, itemId);

    if (!targetItem.place) {
      throw new DomainException(
        'TRIP_004',
        'Plan B indoor replacement only applies to place items',
        HttpStatus.BAD_REQUEST,
      );
    }

    const dayItems = items.filter((i) => i.dayNumber === targetItem.dayNumber);
    const anchorLocation = this.resolveAnchorLocation(
      dayItems,
      targetItem,
      trip.destinationCity,
    );

    const radiusMeters = this.getPlanBRadiusMeters();
    const nearbyIndoor = await this.discoveryService.findIndoorWithinRadius(
      anchorLocation,
      radiusMeters,
      15,
    );

    const scheduledPlaceIds = new Set(
      dayItems.map((i) => i.placeId).filter((id): id is number => id !== null),
    );
    const eligible = nearbyIndoor.filter((p) => !scheduledPlaceIds.has(p.id));

    if (eligible.length === 0) {
      throw new DomainException(
        'AI_001',
        'No eligible indoor Plan B candidate within 3 km',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const ranked = this.rankingService
      .rankIndoorCandidates(
        eligible,
        targetItem.place.category,
        radiusMeters / 1000,
      )
      .slice(0, MAX_CANDIDATES);

    const rainProbability = targetItem.rainProbability ?? 75;
    const reasons = await this.llmClient.generatePlanBReasons({
      conflictedPlaceName: targetItem.place.name,
      rainProbability,
      temperatureC: targetItem.temperatureC,
      candidates: ranked.map(({ place }) => ({
        placeId: place.id,
        name: place.name,
        subcategory: place.subcategory,
        distanceFromPrevKm:
          place.distanceKm ??
          Number(haversineDistanceKm(anchorLocation, place.location).toFixed(2)),
        rating: place.rating,
      })),
    });

    const candidates: PlanBCandidate[] = ranked.map(
      ({ place, contextualScore }) => {
        const distKm =
          place.distanceKm ??
          Number(haversineDistanceKm(anchorLocation, place.location).toFixed(2));
        return {
          placeId: place.id,
          name: place.name,
          category: place.category,
          subcategory: place.subcategory,
          isOutdoor: place.isOutdoor,
          address: place.address,
          rating: place.rating,
          location: place.location,
          distanceFromPrevKm: distKm,
          contextualScore,
          aiReason:
            reasons[place.id] ??
            `Điểm trong nhà cách điểm trước ${distKm.toFixed(1)} km.`,
        };
      },
    );

    this.logger.log(
      `[PlanB] getCandidates - tripId=${tripId},itemId=${itemId},candidates=${candidates.length}`,
    );

    return {
      conflictedItem: {
        id: targetItem.id,
        placeId: targetItem.place.id,
        placeName: targetItem.place.name,
        dayNumber: targetItem.dayNumber,
        timeSlot: targetItem.timeSlot,
        rainProbability,
        temperatureC: targetItem.temperatureC,
      },
      anchorLocation,
      radiusMeters,
      candidates,
    };
  }

  async swapPlanB(
    userId: string,
    tripId: string,
    itemId: string,
    dto: SwapPlanBDto,
  ): Promise<{
    success: true;
    data: SwapPlanBResponse;
    message: string;
  }> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const items = await this.itemRepo.findByTripOrdered(tripId);
    const targetItem = this.findTargetItem(items, itemId);

    if (targetItem.placeId === null) {
      throw new DomainException(
        'TRIP_004',
        'Plan B indoor swap only applies to place items',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (dto.replacementPlaceId === targetItem.placeId) {
      throw new DomainException(
        'TRIP_004',
        'Replacement place must be different from the current place',
        HttpStatus.BAD_REQUEST,
      );
    }

    const replacement = await this.discoveryService.getPlaceById(
      String(dto.replacementPlaceId),
    );

    const dayItems = items.filter((i) => i.dayNumber === targetItem.dayNumber);
    const anchorLocation = this.resolveAnchorLocation(
      dayItems,
      targetItem,
      trip.destinationCity,
    );
    const radiusKm = this.getPlanBRadiusMeters() / 1000;
    const distanceToAnchorKm = haversineDistanceKm(
      anchorLocation,
      replacement.location,
    );

    if (replacement.isOutdoor || distanceToAnchorKm > radiusKm + 0.05) {
      throw new DomainException(
        'AI_001',
        'Replacement place must be indoor and within 3 km of the anchor stop',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    const { updatedItem, newCentroidLocation } =
      await this.dataSource.transaction(async (manager) => {
        await this.itemRepo.swapPlaceInTransaction(
          tripId,
          itemId,
          String(dto.replacementPlaceId),
          dto.note,
          manager,
        );

        const centroid =
          await this.timelineService.recalculateTripSpatialState(
            tripId,
            [targetItem.dayNumber],
            manager,
          );

        const refreshed = await this.itemRepo.findByIdInTrip(
          tripId,
          itemId,
          manager,
        );
        if (!refreshed) {
          throw new DomainException(
            'TRIP_003',
            'Itinerary item not found',
            HttpStatus.NOT_FOUND,
          );
        }

        await this.swapRepo.createAudit(
          {
            tripId,
            itineraryItemId: itemId,
            originalPlaceId: String(targetItem.placeId),
            replacementPlaceId: String(dto.replacementPlaceId),
            rainProbabilityAtSwap: targetItem.rainProbability ?? 0,
            distanceFromPrevKm: refreshed.distanceFromPrevKm,
          },
          manager,
        );

        return { updatedItem: refreshed, newCentroidLocation: centroid };
      });

    const event: TripItemsChangedEvent = {
      tripId,
      affectedDays: [targetItem.dayNumber],
    };
    this.eventEmitter.emit(TRIP_ITEMS_CHANGED_EVENT, event);

    this.logger.log(
      `[PlanB] swapPlanB - tripId=${tripId},itemId=${itemId},from=${targetItem.placeId},to=${dto.replacementPlaceId}`,
    );

    return {
      success: true,
      data: {
        updatedItem,
        newCentroidLocation,
      },
      message: 'Plan B indoor swap completed',
    };
  }

  private async requireOwnedTrip(userId: string, tripId: string) {
    const trip = await this.tripRepo.findById(tripId);
    if (!trip) {
      throw new DomainException(
        'TRIP_001',
        'Trip not found',
        HttpStatus.NOT_FOUND,
      );
    }
    if (String(trip.userId) !== String(userId)) {
      throw new DomainException(
        'AUTH_004',
        'User is not authorized for this resource',
        HttpStatus.FORBIDDEN,
      );
    }
    return trip;
  }

  private findTargetItem(
    items: ItineraryItemResponse[],
    itemId: string,
  ): ItineraryItemResponse {
    const found = items.find((i) => String(i.id) === String(itemId));
    if (!found) {
      throw new DomainException(
        'TRIP_003',
        'Itinerary item not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return found;
  }

  private resolveAnchorLocation(
    dayItems: ItineraryItemResponse[],
    targetItem: ItineraryItemResponse,
    destinationCity: string,
  ): Coordinates {
    const idx = dayItems.findIndex((i) => i.id === targetItem.id);
    for (let i = idx - 1; i >= 0; i--) {
      const loc = dayItems[i].place?.location ?? dayItems[i].stay?.location;
      if (loc) {
        return loc;
      }
    }
    if (targetItem.place?.location) {
      return targetItem.place.location;
    }
    return (
      resolveCityCoordinates(destinationCity) ?? {
        lat: 11.9404,
        lng: 108.4583,
      }
    );
  }

  private getPlanBRadiusMeters(): number {
    const raw = Number(
      this.config.get('PLAN_B_RADIUS_METERS', DEFAULT_PLAN_B_RADIUS_METERS),
    );
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_PLAN_B_RADIUS_METERS;
  }
}
