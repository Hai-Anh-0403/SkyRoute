import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Stay } from '../entities/stay.entity';
import {
  CentroidStaySearchParams,
  CreateStayParams,
  RecommendedStayItem,
  StayFilterParams,
  StayResponseItem,
  StayType,
  UpdateStayParams,
} from '../types/stay.types';

interface RawStayRow {
  id: string;
  name: string;
  city: string;
  stay_type: StayType;
  price_per_night: string | number;
  rating: string | number;
  address: string | null;
  thumbnail_url: string | null;
  amenities: string[] | string;
  lat: string | number;
  lng: string | number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface RawRecommendedStayRow {
  id: string;
  name: string;
  stay_type: StayType;
  price_per_night: string | number;
  rating: string | number;
  address: string | null;
  thumbnail_url: string | null;
  amenities: string[] | string;
  lat: string | number;
  lng: string | number;
  distance_to_centroid_km: string | number;
  avg_distance_to_itinerary_places_km: string | number;
}

const STAY_SORT_COLUMNS: Record<StayFilterParams['sort'], string> = {
  price_per_night: 's.price_per_night',
  rating: 's.rating',
};

function parseAmenities(raw: string[] | string | null | undefined): string[] {
  if (Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

@Injectable()
export class StayRepository {
  constructor(
    @InjectRepository(Stay)
    private readonly repo: Repository<Stay>,
  ) {}

  async findActiveById(id: string): Promise<StayResponseItem | null> {
    const row = await this.baseSelectQuery()
      .andWhere('s.id = :id', { id })
      .getRawOne<RawStayRow>();
    return row ? this.mapRow(row) : null;
  }

  async findFiltered(
    params: StayFilterParams,
  ): Promise<{ items: StayResponseItem[]; total: number }> {
    const qb = this.baseSelectQuery();

    if (params.city) {
      qb.andWhere('LOWER(s.city) = LOWER(:city)', { city: params.city });
    }
    if (params.stayType) {
      qb.andWhere('s.stay_type = :stayType', { stayType: params.stayType });
    }
    if (params.minPrice !== undefined) {
      qb.andWhere('s.price_per_night >= :minPrice', {
        minPrice: params.minPrice,
      });
    }
    if (params.maxPrice !== undefined) {
      qb.andWhere('s.price_per_night <= :maxPrice', {
        maxPrice: params.maxPrice,
      });
    }

    const total = await qb.clone().getCount();
    const sortCol = STAY_SORT_COLUMNS[params.sort];
    const orderDir = params.order.toUpperCase() as 'ASC' | 'DESC';

    qb.orderBy(sortCol, orderDir)
      .addOrderBy('s.id', 'ASC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    const rows = await qb.getRawMany<RawStayRow>();
    return { items: rows.map((row) => this.mapRow(row)), total };
  }

  /**
   * Queries active stays nearest to the trip geometric centroid via PostGIS
   * GIST-indexed KNN distance operator (<->) with strict (lng, lat) ordering.
   */
  async findNearestToCentroid(
    params: CentroidStaySearchParams,
  ): Promise<RecommendedStayItem[]> {
    const sqlParams: unknown[] = [params.centroid.lng, params.centroid.lat];

    let avgDistExpr = `ROUND((ST_DistanceSphere(s."location", ST_SetSRID(ST_MakePoint($1, $2), 4326)) / 1000.0)::numeric, 2)`;
    if (params.placeLocations.length > 0) {
      const lngIdx = sqlParams.push(params.placeLocations.map((p) => p.lng));
      const latIdx = sqlParams.push(params.placeLocations.map((p) => p.lat));
      avgDistExpr = `(
        SELECT ROUND(
          AVG(
            ST_DistanceSphere(
              s."location",
              ST_SetSRID(ST_MakePoint(pt.lng, pt.lat), 4326)
            ) / 1000.0
          )::numeric,
          2
        )
        FROM unnest($${lngIdx}::float8[], $${latIdx}::float8[]) AS pt(lng, lat)
      )`;
    }

    const conditions: string[] = ['s."is_active" = TRUE'];
    if (params.city) {
      const idx = sqlParams.push(params.city);
      conditions.push(`LOWER(s."city") = LOWER($${idx})`);
    }
    if (params.stayType) {
      const idx = sqlParams.push(params.stayType);
      conditions.push(`s."stay_type" = $${idx}`);
    }
    if (params.minPrice !== undefined) {
      const idx = sqlParams.push(params.minPrice);
      conditions.push(`s."price_per_night" >= $${idx}`);
    }
    if (params.maxPrice !== undefined) {
      const idx = sqlParams.push(params.maxPrice);
      conditions.push(`s."price_per_night" <= $${idx}`);
    }

    const limitIdx = sqlParams.push(params.limit);

    const rows = (await this.repo.manager.query(
      `
      SELECT
        s."id",
        s."name",
        s."stay_type",
        s."price_per_night",
        s."rating",
        s."address",
        s."thumbnail_url",
        s."amenities",
        ST_Y(s."location") AS lat,
        ST_X(s."location") AS lng,
        ROUND(
          (ST_DistanceSphere(s."location", ST_SetSRID(ST_MakePoint($1, $2), 4326)) / 1000.0)::numeric,
          2
        ) AS distance_to_centroid_km,
        ${avgDistExpr} AS avg_distance_to_itinerary_places_km
      FROM "stays" s
      WHERE ${conditions.join(' AND ')}
      ORDER BY s."location" <-> ST_SetSRID(ST_MakePoint($1, $2), 4326) ASC, s."id" ASC
      LIMIT $${limitIdx};
      `,
      sqlParams,
    )) as RawRecommendedStayRow[];

    return rows.map((row) => ({
      id: Number(row.id),
      name: row.name,
      stayType: row.stay_type,
      pricePerNight: Number(row.price_per_night),
      rating: Number(row.rating),
      address: row.address,
      thumbnailUrl: row.thumbnail_url,
      location: {
        lat: Number(row.lat),
        lng: Number(row.lng),
      },
      distanceToCentroidKm: Number(row.distance_to_centroid_km),
      avgDistanceToItineraryPlacesKm: Number(
        row.avg_distance_to_itinerary_places_km,
      ),
      amenities: parseAmenities(row.amenities),
    }));
  }

  async createStay(params: CreateStayParams): Promise<StayResponseItem> {
    const rows = (await this.repo.manager.query(
      `
      INSERT INTO "stays" (
        "name", "city", "stay_type", "price_per_night", "rating",
        "address", "thumbnail_url", "amenities", "location"
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8::jsonb, ST_SetSRID(ST_MakePoint($9, $10), 4326)
      )
      RETURNING
        "id", "name", "city", "stay_type", "price_per_night", "rating",
        "address", "thumbnail_url", "amenities", "is_active",
        "created_at", "updated_at",
        ST_Y("location") AS lat, ST_X("location") AS lng;
      `,
      [
        params.name,
        params.city,
        params.stayType,
        params.pricePerNight,
        params.rating,
        params.address,
        params.thumbnailUrl,
        JSON.stringify(params.amenities),
        params.location.lng,
        params.location.lat,
      ],
    )) as RawStayRow[];

    return this.mapRow(rows[0]);
  }

  async updateStay(
    id: string,
    patch: UpdateStayParams,
  ): Promise<StayResponseItem | null> {
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
    addField('stay_type', patch.stayType);
    addField('price_per_night', patch.pricePerNight);
    addField('rating', patch.rating);
    addField('address', patch.address);
    addField('thumbnail_url', patch.thumbnailUrl);
    if (patch.amenities !== undefined) {
      addField('amenities', JSON.stringify(patch.amenities), '::jsonb');
    }
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
      UPDATE "stays"
      SET ${sets.join(', ')}
      WHERE "id" = $${idIdx}
      RETURNING
        "id", "name", "city", "stay_type", "price_per_night", "rating",
        "address", "thumbnail_url", "amenities", "is_active",
        "created_at", "updated_at",
        ST_Y("location") AS lat, ST_X("location") AS lng;
      `,
      values,
    )) as RawStayRow[];

    return rows[0] ? this.mapRow(rows[0]) : null;
  }

  async softDeleteStay(id: string): Promise<boolean> {
    const rows = (await this.repo.manager.query(
      `
      UPDATE "stays"
      SET "is_active" = FALSE, "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = $1 AND "is_active" = TRUE
      RETURNING "id";
      `,
      [id],
    )) as Array<{ id: string }>;

    return rows.length > 0;
  }

  private baseSelectQuery(): SelectQueryBuilder<Stay> {
    return this.repo
      .createQueryBuilder('s')
      .select([
        's.id AS id',
        's.name AS name',
        's.city AS city',
        's.stay_type AS stay_type',
        's.price_per_night AS price_per_night',
        's.rating AS rating',
        's.address AS address',
        's.thumbnail_url AS thumbnail_url',
        's.amenities AS amenities',
        's.is_active AS is_active',
        's.created_at AS created_at',
        's.updated_at AS updated_at',
      ])
      .addSelect('ST_Y(s.location)', 'lat')
      .addSelect('ST_X(s.location)', 'lng')
      .where('s.is_active = TRUE');
  }

  private mapRow(row: RawStayRow): StayResponseItem {
    return {
      id: Number(row.id),
      name: row.name,
      city: row.city,
      stayType: row.stay_type,
      pricePerNight: Number(row.price_per_night),
      rating: Number(row.rating),
      address: row.address,
      thumbnailUrl: row.thumbnail_url,
      location: {
        lat: Number(row.lat),
        lng: Number(row.lng),
      },
      amenities: parseAmenities(row.amenities),
      isActive: Boolean(row.is_active),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
