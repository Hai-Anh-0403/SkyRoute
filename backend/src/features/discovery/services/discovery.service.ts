import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { FilterPlacesDto, RadarQueryDto } from '../dto/discovery-query.dto';
import { PlaceRepository } from '../repositories/place.repository';
import {
  PaginationMeta,
  PlaceLocation,
  PlaceResponseItem,
  RadarMeta,
} from '../types/discovery.types';

const MIN_RADAR_RADIUS_KM = 1;
const MAX_RADAR_RADIUS_KM = 5;

export function assertValidWgs84(lat: number, lng: number): void {
  if (
    !Number.isFinite(lat) ||
    lat < -90 ||
    lat > 90 ||
    !Number.isFinite(lng) ||
    lng < -180 ||
    lng > 180
  ) {
    throw new DomainException(
      'DISC_002',
      'Invalid WGS84 coordinates',
      HttpStatus.BAD_REQUEST,
    );
  }
}

export function parseSubcategories(raw?: string): string[] | undefined {
  if (!raw) {
    return undefined;
  }
  const items = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length > 0 ? items : undefined;
}

@Injectable()
export class DiscoveryService {
  private readonly logger = new Logger(DiscoveryService.name);

  constructor(private readonly placeRepo: PlaceRepository) {}

  async listPlaces(dto: FilterPlacesDto): Promise<{
    success: true;
    data: PlaceResponseItem[];
    meta: PaginationMeta;
  }> {
    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;

    const { items, total } = await this.placeRepo.findFiltered({
      city: dto.city,
      category: dto.category,
      subcategories: parseSubcategories(dto.subcategory),
      isOutdoor: dto.is_outdoor,
      hasAc: dto.has_ac,
      weatherTag: dto.weather_tag,
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

  async scanRadar(dto: RadarQueryDto): Promise<{
    success: true;
    data: PlaceResponseItem[];
    meta: RadarMeta;
  }> {
    assertValidWgs84(dto.lat, dto.lng);

    const radiusKm = dto.radius_km ?? 3;
    if (
      !Number.isFinite(radiusKm) ||
      radiusKm < MIN_RADAR_RADIUS_KM ||
      radiusKm > MAX_RADAR_RADIUS_KM
    ) {
      throw new DomainException(
        'DISC_003',
        'Radar radius must be between 1 and 5 km',
        HttpStatus.BAD_REQUEST,
      );
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;
    const startMs = Date.now();

    const { items, total } = await this.placeRepo.findInRadar({
      lat: dto.lat,
      lng: dto.lng,
      radiusMeters: radiusKm * 1000,
      city: dto.city,
      category: dto.category,
      subcategories: parseSubcategories(dto.subcategory),
      isOutdoor: dto.is_outdoor,
      hasAc: dto.has_ac,
      weatherTag: dto.weather_tag,
      page,
      limit,
      sort: dto.sort ?? 'distance',
      order: dto.order ?? 'asc',
    });

    this.logger.log(
      `[Discovery] scanRadar - lat=${dto.lat},lng=${dto.lng},radiusKm=${radiusKm},found=${total} (${Date.now() - startMs}ms)`,
    );

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        anchorPoint: { lat: dto.lat, lng: dto.lng },
        radiusKm,
      },
    };
  }

  async getPlaceById(id: string): Promise<PlaceResponseItem> {
    const place = await this.placeRepo.findActiveById(id);
    if (!place) {
      throw new DomainException(
        'DISC_001',
        'Place not found',
        HttpStatus.NOT_FOUND,
      );
    }
    return place;
  }

  /** Helper exported for AI Copilot Plan B indoor candidate retrieval. */
  async findIndoorWithinRadius(
    anchor: PlaceLocation,
    radiusMeters = 3000,
    limit = 10,
  ): Promise<PlaceResponseItem[]> {
    assertValidWgs84(anchor.lat, anchor.lng);
    const { items } = await this.placeRepo.findInRadar({
      lat: anchor.lat,
      lng: anchor.lng,
      radiusMeters,
      isOutdoor: false,
      weatherTag: 'rainy',
      page: 1,
      limit,
      sort: 'distance',
      order: 'asc',
    });
    return items;
  }
}
