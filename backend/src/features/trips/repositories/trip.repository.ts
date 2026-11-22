import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Trip } from '../entities/trip.entity';
import {
  Coordinates,
  TripStatusType,
  TripSummaryResponse,
} from '../types/trip.types';

interface RawTripRow {
  id: string;
  user_id: string;
  title: string;
  destination_city: string;
  start_date: string | Date;
  end_date: string | Date;
  status: TripStatusType;
  centroid_lat: string | number | null;
  centroid_lng: string | number | null;
  created_at: Date;
  updated_at: Date;
}

function toDateOnly(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function calculateDaySpan(startDate: string, endDate: string): number {
  const startMs = Date.parse(`${startDate}T00:00:00Z`);
  const endMs = Date.parse(`${endDate}T00:00:00Z`);
  return Math.floor((endMs - startMs) / 86_400_000) + 1;
}

@Injectable()
export class TripRepository {
  constructor(
    @InjectRepository(Trip)
    private readonly repo: Repository<Trip>,
  ) {}

  async findOwnerById(
    id: string,
  ): Promise<{ id: string; userId: string } | null> {
    const trip = await this.repo.findOne({
      select: { id: true, userId: true },
      where: { id },
    });
    return trip ? { id: trip.id, userId: trip.userId } : null;
  }

  async findById(id: string): Promise<TripSummaryResponse | null> {
    const row = await this.baseSelectQuery()
      .where('t.id = :id', { id })
      .getRawOne<RawTripRow>();
    return row ? this.mapRow(row) : null;
  }

  async findByUserPaginated(
    userId: string,
    params: { page: number; limit: number; status?: TripStatusType },
  ): Promise<{ items: TripSummaryResponse[]; total: number }> {
    const qb = this.baseSelectQuery().where('t.user_id = :userId', { userId });
    if (params.status) {
      qb.andWhere('t.status = :status', { status: params.status });
    }

    const total = await qb.clone().getCount();

    qb.orderBy('t.created_at', 'DESC')
      .addOrderBy('t.id', 'DESC')
      .offset((params.page - 1) * params.limit)
      .limit(params.limit);

    const rows = await qb.getRawMany<RawTripRow>();
    return { items: rows.map((row) => this.mapRow(row)), total };
  }

  async create(data: {
    userId: string;
    title: string;
    destinationCity: string;
    startDate: string;
    endDate: string;
  }): Promise<TripSummaryResponse> {
    const saved = await this.repo.save(this.repo.create(data));
    return (await this.findById(saved.id))!;
  }

  async update(
    id: string,
    data: Partial<
      Pick<Trip, 'title' | 'destinationCity' | 'startDate' | 'endDate' | 'status'>
    >,
  ): Promise<TripSummaryResponse | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) {
      return null;
    }
    Object.assign(entity, data);
    await this.repo.save(entity);
    return this.findById(id);
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async recalculateCentroid(
    tripId: string,
    manager?: EntityManager,
  ): Promise<Coordinates | null> {
    const executor = manager ?? this.repo.manager;
    const rows = (await executor.query(
      `
      UPDATE "trips"
      SET "centroid_location" = (
        SELECT ST_Centroid(ST_Collect(p."location"))
        FROM "itinerary_items" ii
        INNER JOIN "places" p ON p."id" = ii."place_id"
        WHERE ii."trip_id" = $1 AND ii."place_id" IS NOT NULL
      ),
      "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = $1
      RETURNING ST_Y("centroid_location") AS lat, ST_X("centroid_location") AS lng;
      `,
      [tripId],
    )) as Array<{ lat: string | number | null; lng: string | number | null }>;

    const row = rows[0];
    if (!row || row.lat === null || row.lng === null) {
      return null;
    }
    return { lat: Number(row.lat), lng: Number(row.lng) };
  }

  async findPlaceCentroidStats(tripId: string): Promise<{
    centroidLocation: Coordinates | null;
    totalItineraryPlaces: number;
    placeLocations: Coordinates[];
  }> {
    const rows = (await this.repo.manager.query(
      `
      WITH place_pts AS (
        SELECT p."location"
        FROM "itinerary_items" ii
        INNER JOIN "places" p ON p."id" = ii."place_id"
        WHERE ii."trip_id" = $1 AND ii."place_id" IS NOT NULL
      ),
      summary AS (
        SELECT
          COUNT(*)::int AS total_places,
          ST_Y(ST_Centroid(ST_Collect("location"))) AS centroid_lat,
          ST_X(ST_Centroid(ST_Collect("location"))) AS centroid_lng
        FROM place_pts
      )
      SELECT
        s.total_places,
        s.centroid_lat,
        s.centroid_lng,
        ST_Y(pp."location") AS place_lat,
        ST_X(pp."location") AS place_lng
      FROM summary s
      LEFT JOIN place_pts pp ON TRUE;
      `,
      [tripId],
    )) as Array<{
      total_places: number;
      centroid_lat: string | number | null;
      centroid_lng: string | number | null;
      place_lat: string | number | null;
      place_lng: string | number | null;
    }>;

    const first = rows[0];
    if (!first || Number(first.total_places) === 0) {
      return {
        centroidLocation: null,
        totalItineraryPlaces: 0,
        placeLocations: [],
      };
    }

    const centroidLocation =
      first.centroid_lat !== null && first.centroid_lng !== null
        ? {
            lat: Number(first.centroid_lat),
            lng: Number(first.centroid_lng),
          }
        : null;

    const placeLocations: Coordinates[] = rows
      .filter((r) => r.place_lat !== null && r.place_lng !== null)
      .map((r) => ({
        lat: Number(r.place_lat),
        lng: Number(r.place_lng),
      }));

    return {
      centroidLocation,
      totalItineraryPlaces: Number(first.total_places),
      placeLocations,
    };
  }

  private baseSelectQuery(): SelectQueryBuilder<Trip> {
    return this.repo
      .createQueryBuilder('t')
      .select([
        't.id AS id',
        't.user_id AS user_id',
        't.title AS title',
        't.destination_city AS destination_city',
        't.start_date AS start_date',
        't.end_date AS end_date',
        't.status AS status',
        't.created_at AS created_at',
        't.updated_at AS updated_at',
      ])
      .addSelect('ST_Y(t.centroid_location)', 'centroid_lat')
      .addSelect('ST_X(t.centroid_location)', 'centroid_lng');
  }

  private mapRow(row: RawTripRow): TripSummaryResponse {
    const startDate = toDateOnly(row.start_date);
    const endDate = toDateOnly(row.end_date);
    const centroidLocation =
      row.centroid_lat !== null && row.centroid_lng !== null
        ? { lat: Number(row.centroid_lat), lng: Number(row.centroid_lng) }
        : null;

    return {
      id: Number(row.id),
      userId: Number(row.user_id),
      title: row.title,
      destinationCity: row.destination_city,
      startDate,
      endDate,
      totalDays: calculateDaySpan(startDate, endDate),
      status: row.status,
      centroidLocation,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
