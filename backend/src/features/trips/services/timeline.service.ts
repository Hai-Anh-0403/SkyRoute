import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource, EntityManager } from 'typeorm';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { ReorderItineraryDto } from '../dto/reorder-itinerary.dto';
import { ItineraryItemRepository } from '../repositories/itinerary-item.repository';
import { TripRepository } from '../repositories/trip.repository';
import {
  Coordinates,
  ItineraryItemResponse,
  TIME_SLOTS,
  TimeSlotType,
  TRIP_ITEMS_CHANGED_EVENT,
  TripItemsChangedEvent,
} from '../types/trip.types';

const DEFAULT_DETOUR_WARNING_KM = 8.0;

@Injectable()
export class TimelineService {
  private readonly logger = new Logger(TimelineService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tripRepo: TripRepository,
    private readonly itemRepo: ItineraryItemRepository,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async reorderItems(
    userId: string,
    tripId: string,
    dto: ReorderItineraryDto,
  ): Promise<{
    success: true;
    data: {
      tripId: number;
      centroidLocation: Coordinates | null;
      updatedItems: ItineraryItemResponse[];
    };
    message: string;
  }> {
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

    const seenIds = new Set<number>();
    const normalizedEntries: Array<{
      itemId: string;
      dayNumber: number;
      timeSlot: TimeSlotType;
      orderIndex: number;
    }> = [];

    for (const entry of dto.items) {
      if (seenIds.has(entry.itemId)) {
        throw new DomainException(
          'TRIP_004',
          'Duplicate itemId in reorder payload',
          HttpStatus.BAD_REQUEST,
        );
      }
      seenIds.add(entry.itemId);

      if (
        entry.dayNumber < 1 ||
        entry.dayNumber > trip.totalDays ||
        !TIME_SLOTS.includes(entry.timeSlot as TimeSlotType)
      ) {
        throw new DomainException(
          'TRIP_004',
          'Invalid day number or time slot',
          HttpStatus.BAD_REQUEST,
        );
      }

      normalizedEntries.push({
        itemId: String(entry.itemId),
        dayNumber: entry.dayNumber,
        timeSlot: entry.timeSlot as TimeSlotType,
        orderIndex: entry.orderIndex,
      });
    }

    const itemIds = normalizedEntries.map((e) => e.itemId);
    const detourThresholdKm = this.getDetourThresholdKm();

    const { centroidLocation, updatedItems, affectedDays } =
      await this.dataSource.transaction(async (manager) => {
        const existing = await this.itemRepo.findExistingIdsAndDays(
          tripId,
          itemIds,
          manager,
        );

        if (existing.length !== itemIds.length) {
          throw new DomainException(
            'TRIP_003',
            'Itinerary item not found',
            HttpStatus.NOT_FOUND,
          );
        }

        const days = Array.from(
          new Set([
            ...existing.map((e) => e.dayNumber),
            ...normalizedEntries.map((e) => e.dayNumber),
          ]),
        );

        await this.itemRepo.batchUpdatePositions(
          tripId,
          normalizedEntries,
          manager,
        );

        const centroid = await this.recalculateTripSpatialState(
          tripId,
          days,
          manager,
          detourThresholdKm,
        );

        const ordered = await this.itemRepo.findByTripOrdered(tripId, manager);
        return {
          centroidLocation: centroid,
          updatedItems: ordered,
          affectedDays: days,
        };
      });

    const event: TripItemsChangedEvent = { tripId, affectedDays };
    this.eventEmitter.emit(TRIP_ITEMS_CHANGED_EVENT, event);

    this.logger.log(
      `[Trips] reorderItems - tripId=${tripId},items=${itemIds.length},days=${affectedDays.join(',')}`,
    );

    return {
      success: true,
      data: {
        tripId: Number(tripId),
        centroidLocation,
        updatedItems,
      },
      message: 'Timeline reordered successfully',
    };
  }

  /**
   * Recomputes same-day point-to-point route distances, detour flags, and trip centroid.
   * Exposed for reuse inside cross-feature transactions (e.g. Plan B indoor swap).
   */
  async recalculateTripSpatialState(
    tripId: string,
    affectedDays: number[],
    manager?: EntityManager,
    detourThresholdKm = this.getDetourThresholdKm(),
  ): Promise<Coordinates | null> {
    if (affectedDays.length > 0) {
      await this.itemRepo.recalculateDayDistances(
        tripId,
        affectedDays,
        detourThresholdKm,
        manager,
      );
    }
    return this.tripRepo.recalculateCentroid(tripId, manager);
  }

  private getDetourThresholdKm(): number {
    const raw = Number(this.config.get('DETOUR_WARNING_KM', DEFAULT_DETOUR_WARNING_KM));
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_DETOUR_WARNING_KM;
  }
}
