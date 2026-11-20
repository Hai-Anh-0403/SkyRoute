import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { DomainException } from '../../../shared/exceptions/domain.exception';
import { FoodRecommendationQueryDto } from '../dto/discovery-query.dto';
import { PlaceRepository } from '../repositories/place.repository';
import {
  FoodMeta,
  PlaceResponseItem,
  WeatherProfile,
} from '../types/discovery.types';
import { assertValidWgs84 } from './discovery.service';

@Injectable()
export class FoodDiscoveryService {
  private readonly logger = new Logger(FoodDiscoveryService.name);

  constructor(private readonly placeRepo: PlaceRepository) {}

  async recommendFood(dto: FoodRecommendationQueryDto): Promise<{
    success: true;
    data: PlaceResponseItem[];
    meta: FoodMeta;
  }> {
    const hasLat = dto.lat !== undefined;
    const hasLng = dto.lng !== undefined;

    if (hasLat !== hasLng) {
      throw new DomainException(
        'DISC_002',
        'Invalid WGS84 coordinates',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (hasLat && hasLng) {
      assertValidWgs84(dto.lat!, dto.lng!);
    }

    const { weatherProfile, preferIndoor, preferHasAc, preferredSubcategories, weatherTag } =
      this.deriveWeatherContext(dto.temperature_c, dto.rain_probability);

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 12;

    const { items, total } = await this.placeRepo.findFoodRecommendations({
      city: dto.city,
      lat: dto.lat,
      lng: dto.lng,
      preferIndoor,
      preferHasAc,
      preferredSubcategories,
      weatherTag,
      page,
      limit,
    });

    this.logger.log(
      `[Discovery] recommendFood - profile=${weatherProfile},city=${dto.city ?? 'all'},found=${total}`,
    );

    return {
      success: true,
      data: items,
      meta: {
        page,
        limit,
        total,
        totalPages: total === 0 ? 0 : Math.ceil(total / limit),
        weatherProfile,
      },
    };
  }

  private deriveWeatherContext(
    temperatureC?: number,
    rainProbability?: number,
  ): {
    weatherProfile: WeatherProfile;
    preferIndoor?: boolean;
    preferHasAc?: boolean;
    preferredSubcategories: string[];
    weatherTag?: string;
  } {
    const isRainy = (rainProbability ?? 0) >= 50;
    const isCold = temperatureC !== undefined && temperatureC <= 20;
    const isHot = temperatureC !== undefined && temperatureC >= 30 && !isRainy;

    if (isRainy || isCold) {
      return {
        weatherProfile: 'cold_rainy',
        preferIndoor: true,
        preferredSubcategories: ['hotpot', 'bbq', 'noodles'],
        weatherTag: isRainy ? 'rainy' : 'cold',
      };
    }

    if (isHot) {
      return {
        weatherProfile: 'hot_sunny',
        preferHasAc: true,
        preferredSubcategories: ['refreshment', 'noodles'],
        weatherTag: 'hot',
      };
    }

    return {
      weatherProfile: 'mild',
      preferredSubcategories: [],
    };
  }
}
