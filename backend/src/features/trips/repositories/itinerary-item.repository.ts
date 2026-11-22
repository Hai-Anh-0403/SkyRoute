import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository, SelectQueryBuilder } from 'typeorm';
import { Stay } from '../../stays/entities/stay.entity';
import { ItineraryItem } from '../entities/itinerary-item.entity';
import { ItineraryItemResponse, TimeSlotType } from '../types/trip.types';

interface RawItineraryRow {
  id: string;
  trip_id: string;
  place_id: string | null;
  stay_id: string | null;
  day_number: number;
  time_slot: TimeSlotType;
  order_index: number;
  distance_from_prev_km: string | number;
  is_detour_warning: boolean;
  weather_condition: string | null;
  temperature_c: string | number | null;
  rain_probability: number | null;
  weather_alert_flag: boolean;
  note: string | null;
  created_at: Date;
  updated_at: Date;
  p_id: string | null;
  p_name: string | null;
  p_category: string | null;
  p_subcategory: string | null;
  p_is_outdoor: boolean | null;
  p_address: string | null;
  p_rating: string | number | null;
  p_lat: string | number | null;
  p_lng: string | number | null;
  s_id: string | null;
  s_name: string | null;
  s_stay_type: string | null;
  s_address: string | null;
  s_rating: string | number | null;
  s_price_per_night: string | number | null;
  s_lat: string | number | null;
  s_lng: string | number | null;
}

@Injectable()
export class ItineraryItemRepository {
  constructor(
    @InjectRepository(ItineraryItem)
    private readonly repo: Repository<ItineraryItem>,
    @InjectRepository(Stay)
    private readonly stayRepo: Repository<Stay>,
  ) {}

  async findByTripOrdered(
    tripId: string,
    manager?: EntityManager,
  ): Promise<ItineraryItemResponse[]> {
    const slotOrder =
      "CASE ii.time_slot WHEN 'morning' THEN 0 WHEN 'lunch' THEN 1 WHEN 'afternoon' THEN 2 ELSE 3 END";

    const rows = await this.baseSelectQuery(manager)
      .where('ii.trip_id = :tripId', { tripId })
      .orderBy('ii.day_number', 'ASC')
      .addOrderBy(slotOrder, 'ASC')
      .addOrderBy('ii.order_index', 'ASC')
      .addOrderBy('ii.id', 'ASC')
      .getRawMany<RawItineraryRow>();

    return rows.map((row) => this.mapRow(row));
  }

  async findByIdInTrip(
    tripId: string,
    itemId: string,
    manager?: EntityManager,
  ): Promise<ItineraryItemResponse | null> {
    const row = await this.baseSelectQuery(manager)
      .where('ii.trip_id = :tripId AND ii.id = :itemId', { tripId, itemId })
      .getRawOne<RawItineraryRow>();
    return row ? this.mapRow(row) : null;
  }

  async findExistingIdsAndDays(
    tripId: string,
    itemIds: string[],
    manager?: EntityManager,
  ): Promise<Array<{ id: string; dayNumber: number }>> {
    if (itemIds.length === 0) {
      return [];
    }
    const repo = manager ? manager.getRepository(ItineraryItem) : this.repo;
    const rows = await repo
      .createQueryBuilder('ii')
      .select(['ii.id AS id', 'ii.day_number AS day_number'])
      .where('ii.trip_id = :tripId AND ii.id IN (:...itemIds)', {
        tripId,
        itemIds,
      })
      .getRawMany<{ id: string; day_number: number }>();

    return rows.map((r) => ({ id: String(r.id), dayNumber: Number(r.day_number) }));
  }

  async batchUpdatePositions(
    tripId: string,
    entries: Array<{
      itemId: string;
      dayNumber: number;
      timeSlot: TimeSlotType;
      orderIndex: number;
    }>,
    manager: EntityManager,
  ): Promise<void> {
    for (const entry of entries) {
      await manager.query(
        `
        UPDATE "itinerary_items"
        SET "day_number" = $1,
            "time_slot" = $2,
            "order_index" = $3,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = $4 AND "trip_id" = $5;
        `,
        [
          entry.dayNumber,
          entry.timeSlot,
          entry.orderIndex,
          entry.itemId,
          tripId,
        ],
      );
    }
  }

  async recalculateDayDistances(
    tripId: string,
    dayNumbers: number[],
    detourThresholdKm: number,
    manager?: EntityManager,
  ): Promise<void> {
    if (dayNumbers.length === 0) {
      return;
    }
    const executor = manager ?? this.repo.manager;
    await executor.query(
      `
      WITH ordered AS (
        SELECT
          ii."id",
          COALESCE(p."location", s."location") AS loc,
          LAG(COALESCE(p."location", s."location")) OVER (
            PARTITION BY ii."day_number"
            ORDER BY
              CASE ii."time_slot"
                WHEN 'morning' THEN 0
                WHEN 'lunch' THEN 1
                WHEN 'afternoon' THEN 2
                ELSE 3
              END ASC,
              ii."order_index" ASC,
              ii."id" ASC
          ) AS prev_loc
        FROM "itinerary_items" ii
        LEFT JOIN "places" p ON p."id" = ii."place_id"
        LEFT JOIN "stays" s ON s."id" = ii."stay_id"
        WHERE ii."trip_id" = $1 AND ii."day_number" = ANY($2::smallint[])
      ),
      computed AS (
        SELECT
          "id",
          CASE
            WHEN prev_loc IS NULL OR loc IS NULL THEN 0
            ELSE ROUND((ST_DistanceSphere(prev_loc, loc) / 1000.0)::numeric, 2)
          END AS dist_km
        FROM ordered
      )
      UPDATE "itinerary_items" target
      SET
        "distance_from_prev_km" = computed.dist_km,
        "is_detour_warning" = (computed.dist_km > $3),
        "updated_at" = CURRENT_TIMESTAMP
      FROM computed
      WHERE target."id" = computed."id";
      `,
      [tripId, dayNumbers, detourThresholdKm],
    );
  }

  async updateWeatherBatch(
    updates: Array<{
      id: string;
      weatherCondition: string;
      temperatureC: number;
      rainProbability: number;
      weatherAlertFlag: boolean;
    }>,
    manager?: EntityManager,
  ): Promise<void> {
    if (updates.length === 0) {
      return;
    }
    const executor = manager ?? this.repo.manager;
    for (const u of updates) {
      await executor.query(
        `
        UPDATE "itinerary_items"
        SET "weather_condition" = $1,
            "temperature_c" = $2,
            "rain_probability" = $3,
            "weather_alert_flag" = $4,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = $5;
        `,
        [
          u.weatherCondition,
          u.temperatureC,
          u.rainProbability,
          u.weatherAlertFlag,
          u.id,
        ],
      );
    }
  }

  async swapPlaceInTransaction(
    tripId: string,
    itemId: string,
    replacementPlaceId: string,
    note: string | undefined,
    manager: EntityManager,
  ): Promise<void> {
    if (note !== undefined) {
      await manager.query(
        `
        UPDATE "itinerary_items"
        SET "place_id" = $1,
            "stay_id" = NULL,
            "weather_alert_flag" = FALSE,
            "note" = $2,
            "updated_at" = CURRENT_TIMESTAMP
        WHERE "id" = $3 AND "trip_id" = $4;
        `,
        [replacementPlaceId, note.trim() || null, itemId, tripId],
      );
      return;
    }

    await manager.query(
      `
      UPDATE "itinerary_items"
      SET "place_id" = $1,
          "stay_id" = NULL,
          "weather_alert_flag" = FALSE,
          "updated_at" = CURRENT_TIMESTAMP
      WHERE "id" = $2 AND "trip_id" = $3;
      `,
      [replacementPlaceId, itemId, tripId],
    );
  }

  async getNextOrderIndex(
    tripId: string,
    dayNumber: number,
    timeSlot: TimeSlotType,
  ): Promise<number> {
    const row = await this.repo
      .createQueryBuilder('ii')
      .select('MAX(ii.order_index)', 'maxIndex')
      .where(
        'ii.trip_id = :tripId AND ii.day_number = :dayNumber AND ii.time_slot = :timeSlot',
        { tripId, dayNumber, timeSlot },
      )
      .getRawOne<{ maxIndex: string | number | null }>();

    if (!row || row.maxIndex === null || row.maxIndex === undefined) {
      return 0;
    }
    return Number(row.maxIndex) + 1;
  }

  async existsActiveStay(stayId: string): Promise<boolean> {
    const count = await this.stayRepo.count({
      where: { id: stayId, isActive: true },
    });
    return count > 0;
  }

  async create(data: {
    tripId: string;
    placeId: string | null;
    stayId: string | null;
    dayNumber: number;
    timeSlot: TimeSlotType;
    orderIndex: number;
    note: string | null;
  }): Promise<ItineraryItemResponse> {
    const saved = await this.repo.save(this.repo.create(data));
    return (await this.findByIdInTrip(data.tripId, saved.id))!;
  }

  async update(
    tripId: string,
    itemId: string,
    data: Partial<Pick<ItineraryItem, 'placeId' | 'stayId' | 'note'>>,
  ): Promise<ItineraryItemResponse | null> {
    const entity = await this.repo.findOne({ where: { id: itemId, tripId } });
    if (!entity) {
      return null;
    }
    Object.assign(entity, data);
    await this.repo.save(entity);
    return this.findByIdInTrip(tripId, itemId);
  }

  async deleteById(tripId: string, itemId: string): Promise<void> {
    await this.repo.delete({ id: itemId, tripId });
  }

  private baseSelectQuery(
    manager?: EntityManager,
  ): SelectQueryBuilder<ItineraryItem> {
    const repo = manager ? manager.getRepository(ItineraryItem) : this.repo;
    return repo
      .createQueryBuilder('ii')
      .leftJoin('places', 'p', 'p.id = ii.place_id')
      .leftJoin('stays', 's', 's.id = ii.stay_id')
      .select([
        'ii.id AS id',
        'ii.trip_id AS trip_id',
        'ii.place_id AS place_id',
        'ii.stay_id AS stay_id',
        'ii.day_number AS day_number',
        'ii.time_slot AS time_slot',
        'ii.order_index AS order_index',
        'ii.distance_from_prev_km AS distance_from_prev_km',
        'ii.is_detour_warning AS is_detour_warning',
        'ii.weather_condition AS weather_condition',
        'ii.temperature_c AS temperature_c',
        'ii.rain_probability AS rain_probability',
        'ii.weather_alert_flag AS weather_alert_flag',
        'ii.note AS note',
        'ii.created_at AS created_at',
        'ii.updated_at AS updated_at',
        'p.id AS p_id',
        'p.name AS p_name',
        'p.category AS p_category',
        'p.subcategory AS p_subcategory',
        'p.is_outdoor AS p_is_outdoor',
        'p.address AS p_address',
        'p.rating AS p_rating',
        's.id AS s_id',
        's.name AS s_name',
        's.stay_type AS s_stay_type',
        's.address AS s_address',
        's.rating AS s_rating',
        's.price_per_night AS s_price_per_night',
      ])
      .addSelect('ST_Y(p.location)', 'p_lat')
      .addSelect('ST_X(p.location)', 'p_lng')
      .addSelect('ST_Y(s.location)', 's_lat')
      .addSelect('ST_X(s.location)', 's_lng');
  }

  private mapRow(row: RawItineraryRow): ItineraryItemResponse {
    return {
      id: Number(row.id),
      tripId: Number(row.trip_id),
      placeId: row.place_id !== null ? Number(row.place_id) : null,
      stayId: row.stay_id !== null ? Number(row.stay_id) : null,
      dayNumber: Number(row.day_number),
      timeSlot: row.time_slot,
      orderIndex: Number(row.order_index),
      distanceFromPrevKm: Number(row.distance_from_prev_km),
      isDetourWarning: Boolean(row.is_detour_warning),
      weatherCondition: row.weather_condition,
      temperatureC:
        row.temperature_c !== null ? Number(row.temperature_c) : null,
      rainProbability:
        row.rain_probability !== null ? Number(row.rain_probability) : null,
      weatherAlertFlag: Boolean(row.weather_alert_flag),
      note: row.note,
      place:
        row.p_id !== null && row.p_lat !== null && row.p_lng !== null
          ? {
              id: Number(row.p_id),
              name: row.p_name!,
              category: row.p_category!,
              subcategory: row.p_subcategory,
              isOutdoor: Boolean(row.p_is_outdoor),
              address: row.p_address,
              rating: Number(row.p_rating),
              location: { lat: Number(row.p_lat), lng: Number(row.p_lng) },
            }
          : null,
      stay:
        row.s_id !== null && row.s_lat !== null && row.s_lng !== null
          ? {
              id: Number(row.s_id),
              name: row.s_name!,
              stayType: row.s_stay_type!,
              address: row.s_address,
              rating: Number(row.s_rating),
              pricePerNight: Number(row.s_price_per_night),
              location: { lat: Number(row.s_lat), lng: Number(row.s_lng) },
            }
          : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
