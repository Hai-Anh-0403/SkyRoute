import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Place } from '../entities/place.entity';
import {
  CreatePlaceParams,
  FoodSearchParams,
  PlaceCategory,
  PlaceFilterParams,
  PlaceResponseItem,
  RadarSearchParams,
  UpdatePlaceParams,
} from '../types/discovery.types';

interface RawPlaceRow {
  id: string;
  name: string;
  city: string;
  category: PlaceCategory;
  subcategory: string | null;
  is_outdoor: boolean;
  has_ac: boolean;
  suitable_weather: string[];
  price_level: string | number;
  rating: string | number;
  address: string | null;
  description: string | null;
  thumbnail_url: string | null;
  lat: string | number;
  lng: string | number;
  distance_km?: string | number | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

const FILTER_SORT_COLUMNS: Record<PlaceFilterParams['sort'], string> = {
  rating: 'p.rating',
  price_level: 'p.price_level',
  created_at: 'p.created_at',
};

@Injectable()
export class PlaceRepository {
  constructor(
    @InjectRepository(Place)
    private readonly repo: Repository<Place>,
  ) {}

  async findActiveById(id: string): Promise<PlaceResponseItem | null> {
    const qb = this.baseSelectQuery().andWhere('p.id = :id', { id });
    const row = await qb.getRawOne<RawPlaceRow>();
    return row ? this.mapRow(row) : null;
  }

  async findFiltered(
    params: PlaceFilterParams,
  ): Promise<{ items: PlaceResponseItem[]; total: number }> {
    const qb = this.baseSelectQuery();
    this.applyCommonFilters(qb, params);

    const total = await this.countMatches(qb);
    const sortCol = FILTER_SORT_COLUMNS[params.sort];
    const orderDir = params.order.toUpperCase() as 'ASC' | 'DESC';

    qb.orderBy(sortCol, orderDir)
      .addOrderBy('p.id', 'ASC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    const rows = await qb.getRawMany<RawPlaceRow>();
    return { items: rows.map((row) => this.mapRow(row)), total };
  }

  async findInRadar(
    params: RadarSearchParams,
  ): Promise<{ items: PlaceResponseItem[]; total: number }> {
    const qb = this.baseSelectQuery()
      .addSelect(
        'ROUND(CAST(ST_DistanceSphere(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) / 1000.0 AS numeric), 2)',
        'distance_km',
      )
      .andWhere(
        'ST_DWithin(CAST(p.location AS geography), CAST(ST_SetSRID(ST_MakePoint(:lng, :lat), 4326) AS geography), :radiusMeters)',
        {
          lng: params.lng,
          lat: params.lat,
          radiusMeters: params.radiusMeters,
        },
      );

    this.applyCommonFilters(qb, params);

    const total = await this.countMatches(qb);
    const sortExpr = params.sort === 'rating' ? 'p.rating' : 'distance_km';
    const orderDir = params.order.toUpperCase() as 'ASC' | 'DESC';

    qb.orderBy(sortExpr, orderDir)
      .addOrderBy('p.id', 'ASC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    const rows = await qb.getRawMany<RawPlaceRow>();
    return { items: rows.map((row) => this.mapRow(row)), total };
  }

  async findFoodRecommendations(
    params: FoodSearchParams,
  ): Promise<{ items: PlaceResponseItem[]; total: number }> {
    const qb = this.baseSelectQuery().andWhere(
      'p.category IN (:...foodCategories)',
      { foodCategories: ['restaurant', 'cafe'] },
    );

    if (params.city) {
      qb.andWhere('LOWER(p.city) = LOWER(:city)', { city: params.city });
    }
    if (params.preferIndoor) {
      qb.andWhere('p.is_outdoor = false');
    }
    if (params.preferHasAc) {
      qb.andWhere('p.has_ac = true');
    }

    const hasAnchor = params.lat !== undefined && params.lng !== undefined;
    if (hasAnchor) {
      qb.addSelect(
        'ROUND(CAST(ST_DistanceSphere(p.location, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)) / 1000.0 AS numeric), 2)',
        'distance_km',
      ).setParameters({ lng: params.lng, lat: params.lat });
    }

    const priorityParts: string[] = [];
    if (params.preferredSubcategories.length > 0) {
      priorityParts.push(
        'CASE WHEN p.subcategory IN (:...preferredSubcategories) THEN 0 ELSE 1 END',
      );
      qb.setParameter('preferredSubcategories', params.preferredSubcategories);
    }
    if (params.weatherTag) {
      priorityParts.push(
        'CASE WHEN :weatherTag = ANY(p.suitable_weather) THEN 0 ELSE 1 END',
      );
      qb.setParameter('weatherTag', params.weatherTag);
    }

    const total = await this.countMatches(qb);

    if (priorityParts.length > 0) {
      qb.addSelect(`(${priorityParts.join(' + ')})`, 'context_priority');
      qb.orderBy('context_priority', 'ASC');
    }

    if (hasAnchor) {
      qb.addOrderBy('distance_km', 'ASC');
    }
    qb.addOrderBy('p.rating', 'DESC')
      .addOrderBy('p.id', 'ASC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    const rows = await qb.getRawMany<RawPlaceRow>();
    return { items: rows.map((row) => this.mapRow(row)), total };
  }

  async createPlace(params: CreatePlaceParams): Promise<PlaceResponseItem> {
    const rows = (await this.repo.manager.query(
      `
      INSERT INTO "places" (
        "name", "city", "category", "subcategory", "is_outdoor", "has_ac",
        "suitable_weather", "price_level", "rating", "address", "description",
        "thumbnail_url", "location"
      )
      VALUES (
        $1, $2, $3, $4, $5, $6,
        $7::varchar[], $8, $9, $10, $11,
        $12, ST_SetSRID(ST_MakePoint($13, $14), 4326)
      )
      RETURNING
        "id", "name", "city", "category", "subcategory", "is_outdoor", "has_ac",
        "suitable_weather", "price_level", "rating", "address", "description",
        "thumbnail_url", "is_active", "created_at", "updated_at",
        ST_Y("location") AS lat, ST_X("location") AS lng;
      `,
      [
        params.name,
        params.city,
        params.category,
        params.subcategory,
        params.isOutdoor,
        params.hasAc,
        params.suitableWeather,
        params.priceLevel,
        params.rating,
        params.address,
        params.description,
        params.thumbnailUrl,
        params.location.lng,
        params.location.lat,
      ],
    )) as RawPlaceRow[];

    return this.mapRow(rows[0]);
  }

  async updatePlace(
    id: string,
    patch: UpdatePlaceParams,
  ): Promise<PlaceResponseItem | null> {
    const sets: string[] = [];
    const values: unknown[] = [];

    const addField = (column: string, val: unknown, cast = '') => {
      if (val !== undefined) {
        const idx = values.push(val);
        sets.push(`"${column}" = $${idx}${cast}`);
      }
    };

    addField('name', patch.name);
    addField('city', patch.city);
    addField('category', patch.category);
    addField('subcategory', patch.subcategory);
    addField('is_outdoor', patch.isOutdoor);
    addField('has_ac', patch.hasAc);
    addField('suitable_weather', patch.suitableWeather, '::varchar[]');
    addField('price_level', patch.priceLevel);
    addField('rating', patch.rating);
    addField('address', patch.address);
    addField('description', patch.description);
    addField('thumbnail_url', patch.thumbnailUrl);
    addField('is_active', patch.isActive);

    if (patch.location) {
      const lngIdx = values.push(patch.location.lng);
      const latIdx = values.push(patch.location.lat);
      sets.push(
        `"location" = ST_SetSRID(ST_MakePoint($${lngIdx}, $${latIdx}), 4326)`,
      );
    }

    sets.push('"updated_at" = CURRENT_TIMESTAMP');
    const idIdx = values.push(id);

    const rows = (await this.repo.manager.query(
      `
      UPDATE "places"
      SET ${sets.join(', ')}
      WHERE "id" = $${idIdx}
      RETURNING
        "id", "name", "city", "category", "subcategory", "is_outdoor", "has_ac",
        "suitable_weather", "price_level", "rating", "address", "description",
        "thumbnail_url", "is_active", "created_at", "updated_at",
        ST_Y("location") AS lat, ST_X("location") AS lng;
      `,
      values,
    )) as RawPlaceRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async softDeletePlace(id: string): Promise<boolean> {
    const rows = (await this.repo.manager.query(
      `
      UPDATE "places"
      SET "is_active" = FALSE, "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = $1 AND "is_active" = TRUE
      RETURNING "id";
      `,
      [id],
    )) as Array<{ id: string }>;

    return rows.length > 0;
  }

  private baseSelectQuery(): SelectQueryBuilder<Place> {
    return this.repo
      .createQueryBuilder('p')
      .select([
        'p.id AS id',
        'p.name AS name',
        'p.city AS city',
        'p.category AS category',
        'p.subcategory AS subcategory',
        'p.is_outdoor AS is_outdoor',
        'p.has_ac AS has_ac',
        'p.suitable_weather AS suitable_weather',
        'p.price_level AS price_level',
        'p.rating AS rating',
        'p.address AS address',
        'p.description AS description',
        'p.thumbnail_url AS thumbnail_url',
        'p.is_active AS is_active',
        'p.created_at AS created_at',
        'p.updated_at AS updated_at',
      ])
      .addSelect('ST_Y(p.location)', 'lat')
      .addSelect('ST_X(p.location)', 'lng')
      .where('p.is_active = true');
  }

  private applyCommonFilters(
    qb: SelectQueryBuilder<Place>,
    filters: {
      city?: string;
      category?: PlaceCategory;
      subcategories?: string[];
      isOutdoor?: boolean;
      hasAc?: boolean;
      weatherTag?: string;
    },
  ): void {
    if (filters.city) {
      qb.andWhere('LOWER(p.city) = LOWER(:city)', { city: filters.city });
    }
    if (filters.category) {
      qb.andWhere('p.category = :category', { category: filters.category });
    }
    if (filters.subcategories && filters.subcategories.length > 0) {
      qb.andWhere('p.subcategory IN (:...subcategories)', {
        subcategories: filters.subcategories,
      });
    }
    if (filters.isOutdoor !== undefined) {
      qb.andWhere('p.is_outdoor = :isOutdoor', {
        isOutdoor: filters.isOutdoor,
      });
    }
    if (filters.hasAc !== undefined) {
      qb.andWhere('p.has_ac = :hasAc', { hasAc: filters.hasAc });
    }
    if (filters.weatherTag) {
      qb.andWhere(':weatherTag = ANY(p.suitable_weather)', {
        weatherTag: filters.weatherTag,
      });
    }
  }

  private async countMatches(qb: SelectQueryBuilder<Place>): Promise<number> {
    return qb.clone().getCount();
  }

  private mapRow(row: RawPlaceRow): PlaceResponseItem {
    const item: PlaceResponseItem = {
      id: Number(row.id),
      name: row.name,
      city: row.city,
      category: row.category,
      subcategory: row.subcategory,
      isOutdoor: Boolean(row.is_outdoor),
      hasAc: Boolean(row.has_ac),
      suitableWeather: Array.isArray(row.suitable_weather)
        ? row.suitable_weather
        : [],
      priceLevel: Number(row.price_level),
      rating: Number(row.rating),
      address: row.address,
      description: row.description,
      thumbnailUrl: row.thumbnail_url,
      location: {
        lat: Number(row.lat),
        lng: Number(row.lng),
      },
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    if (row.distance_km !== undefined && row.distance_km !== null) {
      item.distanceKm = Number(row.distance_km);
    }

    return item;
  }
}
