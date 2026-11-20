import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { DiscoveryService } from '../../discovery/services/discovery.service';
import {
  AddItineraryItemDto,
  CreateTripDto,
  ListTripsQueryDto,
  UpdateItineraryItemDto,
  UpdateTripDto,
} from '../dto/trips.dto';
import { ItineraryItemRepository } from '../repositories/itinerary-item.repository';
import {
  calculateDaySpan,
  TripRepository,
} from '../repositories/trip.repository';
import {
  Coordinates,
  ItineraryItemResponse,
  TIME_SLOTS,
  TimeSlotType,
  TRIP_ITEMS_CHANGED_EVENT,
  TripDetailResponse,
  TripItemsChangedEvent,
  TripSummaryResponse,
} from '../types/trip.types';

@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    private readonly tripRepo: TripRepository,
    private readonly itemRepo: ItineraryItemRepository,
    private readonly discoveryService: DiscoveryService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async listTrips(userId: string, query: ListTripsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 12;

    const { items, total } = await this.tripRepo.findByUserPaginated(userId, {
      page,
      limit,
      status: query.status,
    });

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
      },
    };
  }

  async createTrip(
    userId: string,
    dto: CreateTripDto,
  ): Promise<TripSummaryResponse> {
    this.assertValidDateRange(dto.startDate, dto.endDate);

    const trip = await this.tripRepo.create({
      userId,
      title: dto.title.trim(),
      destinationCity: dto.destinationCity.trim(),
      startDate: dto.startDate.slice(0, 10),
      endDate: dto.endDate.slice(0, 10),
    });

    this.logger.log(
      `[Trips] createTrip - tripId=${trip.id},userId=${userId},city=${trip.destinationCity}`,
    );
    return trip;
  }

  async getTripDetail(
    userId: string,
    tripId: string,
  ): Promise<TripDetailResponse> {
    const trip = await this.requireOwnedTrip(userId, tripId);
    const items = await this.itemRepo.findByTripOrdered(tripId);
    return { ...trip, items };
  }

  async updateTrip(
    userId: string,
    tripId: string,
    dto: UpdateTripDto,
  ): Promise<TripSummaryResponse> {
    const existing = await this.requireOwnedTrip(userId, tripId);
    const nextStart = (dto.startDate ?? existing.startDate).slice(0, 10);
    const nextEnd = (dto.endDate ?? existing.endDate).slice(0, 10);
    this.assertValidDateRange(nextStart, nextEnd);

    const updated = await this.tripRepo.update(tripId, {
      ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
      ...(dto.destinationCity !== undefined
        ? { destinationCity: dto.destinationCity.trim() }
        : {}),
      ...(dto.startDate !== undefined ? { startDate: nextStart } : {}),
      ...(dto.endDate !== undefined ? { endDate: nextEnd } : {}),
      ...(dto.status !== undefined ? { status: dto.status } : {}),
    });

    if (!updated) {
      throw new DomainException(
        'TRIP_001',
        'Trip not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return updated;
  }

  async deleteTrip(userId: string, tripId: string): Promise<void> {
    await this.requireOwnedTrip(userId, tripId);
    await this.tripRepo.deleteById(tripId);
    this.logger.log(`[Trips] deleteTrip - tripId=${tripId},userId=${userId}`);
  }

  async addItem(
    userId: string,
    tripId: string,
    dto: AddItineraryItemDto,
  ): Promise<{
    item: ItineraryItemResponse;
    centroidLocation: Coordinates | null;
  }> {
    const trip = await this.requireOwnedTrip(userId, tripId);

    const hasPlace = dto.placeId !== undefined;
    const hasStay = dto.stayId !== undefined;
    if (hasPlace === hasStay) {
      throw new DomainException(
        'TRIP_004',
        'Exactly one of placeId or stayId is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (
      dto.dayNumber < 1 ||
      dto.dayNumber > trip.totalDays ||
      !TIME_SLOTS.includes(dto.timeSlot as TimeSlotType)
    ) {
      throw new DomainException(
        'TRIP_004',
        'Invalid day number or time slot',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (hasPlace) {
      await this.discoveryService.getPlaceById(String(dto.placeId));
    } else if (hasStay) {
      const exists = await this.itemRepo.existsActiveStay(String(dto.stayId));
      if (!exists) {
        throw new DomainException(
          'STAY_001',
          'Stay not found',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    const timeSlot = dto.timeSlot as TimeSlotType;
    const orderIndex =
      dto.orderIndex ??
      (await this.itemRepo.getNextOrderIndex(tripId, dto.dayNumber, timeSlot));

    const created = await this.itemRepo.create({
      tripId,
      placeId: hasPlace ? String(dto.placeId) : null,
      stayId: hasStay ? String(dto.stayId) : null,
      dayNumber: dto.dayNumber,
      timeSlot,
      orderIndex,
      note: dto.note?.trim() ?? null,
    });

    await this.itemRepo.recalculateDayDistances(tripId, [dto.dayNumber], 8.0);
    const centroidLocation = await this.tripRepo.recalculateCentroid(tripId);
    const item =
      (await this.itemRepo.findByIdInTrip(tripId, String(created.id))) ?? created;
    this.emitItemsChanged(tripId, [dto.dayNumber]);

    return { item, centroidLocation };
  }

  async updateItem(
    userId: string,
    tripId: string,
    itemId: string,
    dto: UpdateItineraryItemDto,
  ): Promise<{
    item: ItineraryItemResponse;
    centroidLocation: Coordinates | null;
  }> {
    await this.requireOwnedTrip(userId, tripId);
    const existing = await this.itemRepo.findByIdInTrip(tripId, itemId);
    if (!existing) {
      throw new DomainException(
        'TRIP_003',
        'Itinerary item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.placeId !== undefined && dto.stayId !== undefined) {
      throw new DomainException(
        'TRIP_004',
        'Exactly one of placeId or stayId is allowed',
        HttpStatus.BAD_REQUEST,
      );
    }

    const patch: {
      placeId?: string | null;
      stayId?: string | null;
      note?: string | null;
    } = {};

    if (dto.placeId !== undefined) {
      await this.discoveryService.getPlaceById(String(dto.placeId));
      patch.placeId = String(dto.placeId);
      patch.stayId = null;
    } else if (dto.stayId !== undefined) {
      const exists = await this.itemRepo.existsActiveStay(String(dto.stayId));
      if (!exists) {
        throw new DomainException(
          'STAY_001',
          'Stay not found',
          HttpStatus.NOT_FOUND,
        );
      }
      patch.stayId = String(dto.stayId);
      patch.placeId = null;
    }

    if (dto.note !== undefined) {
      patch.note = dto.note.trim() || null;
    }

    const updated = await this.itemRepo.update(tripId, itemId, patch);
    if (!updated) {
      throw new DomainException(
        'TRIP_003',
        'Itinerary item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.itemRepo.recalculateDayDistances(
      tripId,
      [existing.dayNumber],
      8.0,
    );
    const centroidLocation = await this.tripRepo.recalculateCentroid(tripId);
    const refreshed =
      (await this.itemRepo.findByIdInTrip(tripId, itemId)) ?? updated;
    this.emitItemsChanged(tripId, [existing.dayNumber]);

    return { item: refreshed, centroidLocation };
  }

  async deleteItem(
    userId: string,
    tripId: string,
    itemId: string,
  ): Promise<void> {
    await this.requireOwnedTrip(userId, tripId);
    const existing = await this.itemRepo.findByIdInTrip(tripId, itemId);
    if (!existing) {
      throw new DomainException(
        'TRIP_003',
        'Itinerary item not found',
        HttpStatus.NOT_FOUND,
      );
    }

    await this.itemRepo.deleteById(tripId, itemId);
    await this.itemRepo.recalculateDayDistances(
      tripId,
      [existing.dayNumber],
      8.0,
    );
    await this.tripRepo.recalculateCentroid(tripId);
    this.emitItemsChanged(tripId, [existing.dayNumber]);
  }

  async requireOwnedTrip(
    userId: string,
    tripId: string,
  ): Promise<TripSummaryResponse> {
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

  private assertValidDateRange(startDate: string, endDate: string): number {
    const start = startDate.slice(0, 10);
    const end = endDate.slice(0, 10);
    const days = calculateDaySpan(start, end);
    if (!Number.isFinite(days) || days < 1) {
      throw new DomainException(
        'TRIP_002',
        'endDate must be on or after startDate',
        HttpStatus.BAD_REQUEST,
      );
    }
    return days;
  }

  private emitItemsChanged(tripId: string, affectedDays?: number[]): void {
    const event: TripItemsChangedEvent = { tripId, affectedDays };
    this.eventEmitter.emit(TRIP_ITEMS_CHANGED_EVENT, event);
  }
}
