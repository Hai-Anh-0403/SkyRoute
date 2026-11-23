import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { assertValidWgs84 } from '../../../shared/utils/geo.util';
import { CreatePlaceDto, UpdatePlaceDto } from '../dto/admin-place.dto';
import { FilterPlacesDto, RadarQueryDto } from '../dto/discovery-query.dto';
import { PlaceRepository } from '../repositories/place.repository';
import {
  PaginationMeta,
  PlaceLocation,
  PlaceResponseItem,
  RadarMeta,
} from '../types/discovery.types';

export { assertValidWgs84 };

const MIN_RADAR_RADIUS_KM = 1;
const MAX_RADAR_RADIUS_KM = 5;

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

  async createPlace(dto: CreatePlaceDto): Promise<PlaceResponseItem> {
    assertValidWgs84(dto.location.lat, dto.location.lng);
    const created = await this.placeRepo.createPlace({
      name: dto.name.trim(),
      city: dto.city.trim(),
      category: dto.category,
      subcategory: dto.subcategory?.trim() ?? null,
      isOutdoor: dto.isOutdoor,
      hasAc: dto.hasAc ?? false,
      suitableWeather: dto.suitableWeather,
      priceLevel: dto.priceLevel ?? 2,
      rating: dto.rating ?? 4.0,
      address: dto.address?.trim() ?? null,
      description: dto.description?.trim() ?? null,
      thumbnailUrl: dto.thumbnailUrl?.trim() ?? null,
      location: { lat: dto.location.lat, lng: dto.location.lng },
    });
    this.logger.log(`[Discovery] admin createPlace - placeId=${created.id}`);
    return created;
  }

  async updatePlace(
    id: string,
    dto: UpdatePlaceDto,
  ): Promise<PlaceResponseItem> {
    if (dto.location) {
      assertValidWgs84(dto.location.lat, dto.location.lng);
    }

    const updated = await this.placeRepo.updatePlace(id, {
      ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
      ...(dto.city !== undefined ? { city: dto.city.trim() } : {}),
      ...(dto.category !== undefined ? { category: dto.category } : {}),
      ...(dto.subcategory !== undefined
        ? { subcategory: dto.subcategory.trim() }
        : {}),
      ...(dto.isOutdoor !== undefined ? { isOutdoor: dto.isOutdoor } : {}),
      ...(dto.hasAc !== undefined ? { hasAc: dto.hasAc } : {}),
      ...(dto.suitableWeather !== undefined
        ? { suitableWeather: dto.suitableWeather }
        : {}),
      ...(dto.priceLevel !== undefined ? { priceLevel: dto.priceLevel } : {}),
      ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
      ...(dto.address !== undefined ? { address: dto.address.trim() } : {}),
      ...(dto.description !== undefined
        ? { description: dto.description.trim() }
        : {}),
      ...(dto.thumbnailUrl !== undefined
        ? { thumbnailUrl: dto.thumbnailUrl.trim() }
        : {}),
      ...(dto.location !== undefined
        ? { location: { lat: dto.location.lat, lng: dto.location.lng } }
        : {}),
      ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
    });

    if (!updated) {
      throw new DomainException(
        'DISC_001',
        'Place not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.log(`[Discovery] admin updatePlace - placeId=${id}`);
    return updated;
  }

  async softDeletePlace(
    id: string,
  ): Promise<{ id: number; isActive: boolean }> {
    const deleted = await this.placeRepo.softDeletePlace(id);
    if (!deleted) {
      throw new DomainException(
        'DISC_001',
        'Place not found',
        HttpStatus.NOT_FOUND,
      );
    }
    this.logger.log(`[Discovery] admin softDeletePlace - placeId=${id}`);
    return { id: Number(id), isActive: false };
  }
}
