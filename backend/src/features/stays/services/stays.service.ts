import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { RedisService } from '../../../core/cache/redis.service';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { TripsService } from '../../trips/services/trips.service';
import {
  TRIP_ITEMS_CHANGED_EVENT,
  TripItemsChangedEvent,
} from '../../trips/types/trip.types';
import { CentroidStaysQueryDto, FilterStaysDto } from '../dto/stays-query.dto';
import { StayRepository } from '../repositories/stay.repository';
import {
  CentroidStaysResponse,
  StayCoordinates,
  StayResponseItem,
} from '../types/stay.types';

const CENTROID_CACHE_TTL_SEC = 3600;
const DEFAULT_CENTROID_STAYS_LIMIT = 10;

interface CachedTripCentroid {
  lat: number;
  lng: number;
  totalItineraryPlaces: number;
  destinationCity: string;
  placeLocations: StayCoordinates[];
  updatedAt: string;
}

export function buildTripCentroidCacheKey(tripId: string): string {
  return `trip:centroid:${tripId}`;
}

/**
 * Computes the arithmetic geometric centroid (mean lng, mean lat) of selected places.
 * Matches PostGIS ST_Centroid(ST_Collect(location)) for point geometries.
 */
export function computeGeometricCentroid(
  points: StayCoordinates[],
): StayCoordinates | null {
  if (points.length === 0) {
    return null;
  }
  const sum = points.reduce(
    (acc, pt) => ({
      lat: acc.lat + pt.lat,
      lng: acc.lng + pt.lng,
    }),
    { lat: 0, lng: 0 },
  );
  return {
    lat: Number((sum.lat / points.length).toFixed(6)),
    lng: Number((sum.lng / points.length).toFixed(6)),
  };
}

@Injectable()
export class StaysService {
  private readonly logger = new Logger(StaysService.name);

  constructor(
    private readonly stayRepo: StayRepository,
    private readonly tripsService: TripsService,
    private readonly redis: RedisService,
  ) {}

  async listStays(dto: FilterStaysDto): Promise<{
    success: true;
    data: StayResponseItem[];
    meta: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;

    const { items, total } = await this.stayRepo.findFiltered({
      city: dto.city,
      stayType: dto.stay_type,
      minPrice: dto.min_price,
      maxPrice: dto.max_price,
      page,
      limit,
      sort: dto.sort ?? 'rating',
      order: dto.order ?? 'desc',
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

  async getStayById(id: string): Promise<StayResponseItem> {
    const stay = await this.stayRepo.findActiveById(id);
    if (!stay) {
      throw new DomainException(
        'STAY_001',
        'Stay not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return stay;
  }

  async findNearestToTripCentroid(
    userId: string,
    tripId: string,
    query: CentroidStaysQueryDto = {},
  ): Promise<CentroidStaysResponse> {
    await this.tripsService.requireOwnedTrip(userId, tripId);

    const cacheKey = buildTripCentroidCacheKey(tripId);
    const cached = await this.redis.getJson<CachedTripCentroid>(cacheKey);

    let centroidLocation: StayCoordinates | null = null;
    let totalItineraryPlaces = 0;
    let destinationCity = '';
    let placeLocations: StayCoordinates[] = [];

    if (
      cached &&
      Number.isFinite(cached.lat) &&
      Number.isFinite(cached.lng) &&
      cached.totalItineraryPlaces > 0
    ) {
      centroidLocation = { lat: cached.lat, lng: cached.lng };
      totalItineraryPlaces = cached.totalItineraryPlaces;
      destinationCity = cached.destinationCity;
      placeLocations = cached.placeLocations ?? [];
    } else {
      const stats = await this.tripsService.getTripPlaceCentroidStats(
        userId,
        tripId,
      );
      totalItineraryPlaces = stats.totalItineraryPlaces;
      destinationCity = stats.destinationCity;
      placeLocations = stats.placeLocations;
      centroidLocation =
        stats.centroidLocation ?? computeGeometricCentroid(stats.placeLocations);

      if (totalItineraryPlaces === 0 || !centroidLocation) {
        throw new DomainException(
          'STAY_002',
          'Trip has no selected places for centroid calculation',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      const payload: CachedTripCentroid = {
        lat: centroidLocation.lat,
        lng: centroidLocation.lng,
        totalItineraryPlaces,
        destinationCity,
        placeLocations,
        updatedAt: new Date().toISOString(),
      };
      await this.redis.setJson(cacheKey, payload, CENTROID_CACHE_TTL_SEC);
    }

    const limit = query.limit ?? DEFAULT_CENTROID_STAYS_LIMIT;
    const recommendedStays = await this.stayRepo.findNearestToCentroid({
      centroid: centroidLocation,
      placeLocations,
      city: destinationCity || undefined,
      stayType: query.stay_type,
      minPrice: query.min_price,
      maxPrice: query.max_price,
      limit,
    });

    this.logger.log(
      `[Stays] findNearestToTripCentroid - tripId=${tripId},places=${totalItineraryPlaces},stays=${recommendedStays.length}`,
    );

    return {
      tripId: Number(tripId),
      centroidLocation,
      totalItineraryPlaces,
      recommendedStays,
    };
  }

  @OnEvent(TRIP_ITEMS_CHANGED_EVENT)
  async onTripItemsChanged(event: TripItemsChangedEvent): Promise<void> {
    await this.redis.del(buildTripCentroidCacheKey(event.tripId));
  }
}
