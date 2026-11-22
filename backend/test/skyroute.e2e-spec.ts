import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { HealthController } from '../src/app.module';
import { configureApp, createSwaggerDocument } from '../src/app.setup';
import { envValidationSchema } from '../src/config/env.validation';
import { RedisService } from '../src/core/cache/redis.service';
import { LlmToolClient } from '../src/core/integrations/llm-tool.client';
import { OpenMeteoClient } from '../src/core/integrations/open-meteo.client';
import { AiCopilotController } from '../src/features/ai-copilot/ai-copilot.controller';
import { AiGenerateController } from '../src/features/ai-copilot/ai-generate.controller';
import { PlanBSwapRepository } from '../src/features/ai-copilot/repositories/plan-b-swap.repository';
import { AiCopilotService } from '../src/features/ai-copilot/services/ai-copilot.service';
import { ContextualRankingService } from '../src/features/ai-copilot/services/contextual-ranking.service';
import { PlanBService } from '../src/features/ai-copilot/services/plan-b.service';
import { AuthController } from '../src/features/auth/auth.controller';
import { AuthService } from '../src/features/auth/auth.service';
import { RefreshToken } from '../src/features/auth/entities/refresh-token.entity';
import { User } from '../src/features/auth/entities/user.entity';
import { RefreshTokenRepository } from '../src/features/auth/repositories/refresh-token.repository';
import { UserRepository } from '../src/features/auth/repositories/user.repository';
import { JwtStrategy } from '../src/features/auth/strategies/jwt.strategy';
import { DiscoveryController } from '../src/features/discovery/discovery.controller';
import { PlaceRepository } from '../src/features/discovery/repositories/place.repository';
import { DiscoveryService } from '../src/features/discovery/services/discovery.service';
import { FoodDiscoveryService } from '../src/features/discovery/services/food-discovery.service';
import { PlaceResponseItem } from '../src/features/discovery/types/discovery.types';
import { StayRepository } from '../src/features/stays/repositories/stay.repository';
import { StaysService } from '../src/features/stays/services/stays.service';
import { StaysController } from '../src/features/stays/stays.controller';
import { TripStaysController } from '../src/features/stays/trip-stays.controller';
import {
  CentroidStaySearchParams,
  RecommendedStayItem,
  StayResponseItem,
} from '../src/features/stays/types/stay.types';
import { TripOwnerGuard } from '../src/features/trips/guards/trip-owner.guard';
import { ItineraryItemRepository } from '../src/features/trips/repositories/itinerary-item.repository';
import { TripRepository } from '../src/features/trips/repositories/trip.repository';
import { TimelineService } from '../src/features/trips/services/timeline.service';
import { TripsService } from '../src/features/trips/services/trips.service';
import { TripsController } from '../src/features/trips/trips.controller';
import {
  Coordinates,
  ItineraryItemResponse,
  TIME_SLOTS,
  TimeSlotType,
  TripSummaryResponse,
} from '../src/features/trips/types/trip.types';
import { WeatherSnapshotRepository } from '../src/features/weather/repositories/weather-snapshot.repository';
import { WeatherConflictService } from '../src/features/weather/services/weather-conflict.service';
import { WeatherService } from '../src/features/weather/services/weather.service';
import { TripWeatherController } from '../src/features/weather/trip-weather.controller';
import { WeatherController } from '../src/features/weather/weather.controller';
import { JwtAuthGuard } from '../src/shared/guards/jwt-auth.guard';

function haversineKm(a: Coordinates, b: Coordinates): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Number((2 * r * Math.asin(Math.sqrt(h))).toFixed(2));
}

function createInMemoryState() {
  const now = new Date();
  const users: User[] = [];
  const refreshTokens: RefreshToken[] = [];
  const trips: Array<TripSummaryResponse & { userIdStr: string }> = [];
  const items: ItineraryItemResponse[] = [];
  const auditLogs: Array<Record<string, unknown>> = [];
  const redisStore = new Map<string, unknown>();

  const places: PlaceResponseItem[] = [
    {
      id: 1,
      name: 'Hồ Xuân Hương',
      city: 'Da Lat',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      hasAc: false,
      suitableWeather: ['sunny', 'cloudy'],
      priceLevel: 1,
      rating: 4.8,
      address: 'Phường 1, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.9404, lng: 108.445 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 2,
      name: 'Đồi Chè Cầu Đất',
      city: 'Da Lat',
      category: 'attraction',
      subcategory: 'nature',
      isOutdoor: true,
      hasAc: false,
      suitableWeather: ['sunny', 'cloudy'],
      priceLevel: 1,
      rating: 4.8,
      address: 'Trạm Hành, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.8256, lng: 108.5621 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 3,
      name: 'Bảo tàng Lâm Đồng',
      city: 'Da Lat',
      category: 'attraction',
      subcategory: 'museum',
      isOutdoor: false,
      hasAc: true,
      suitableWeather: ['rainy', 'cloudy'],
      priceLevel: 1,
      rating: 4.6,
      address: '4 Hùng Vương, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.9418, lng: 108.4589 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 4,
      name: 'Lẩu Gà Lá É Tao Ngộ',
      city: 'Da Lat',
      category: 'restaurant',
      subcategory: 'hotpot',
      isOutdoor: false,
      hasAc: false,
      suitableWeather: ['rainy', 'cold', 'cloudy'],
      priceLevel: 2,
      rating: 4.7,
      address: '5 Đường 3/4, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.9362, lng: 108.4451 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 5,
      name: 'Tiệm Cà Phê Túi Mơ To (Trong nhà)',
      city: 'Da Lat',
      category: 'cafe',
      subcategory: 'coffee',
      isOutdoor: false,
      hasAc: true,
      suitableWeather: ['rainy', 'cold', 'cloudy'],
      priceLevel: 2,
      rating: 4.7,
      address: 'Hẻm 31 Sào Nam, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.948, lng: 108.468 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 6,
      name: 'Bò Nướng Lạc Dương',
      city: 'Da Lat',
      category: 'restaurant',
      subcategory: 'bbq',
      isOutdoor: false,
      hasAc: false,
      suitableWeather: ['rainy', 'cold'],
      priceLevel: 2,
      rating: 4.6,
      address: 'Phường 2, Đà Lạt',
      description: null,
      thumbnailUrl: null,
      location: { lat: 11.9465, lng: 108.4385 },
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const stays: StayResponseItem[] = [
    {
      id: 10,
      name: 'Dalat Central Boutique Hotel',
      city: 'Da Lat',
      stayType: 'hotel',
      pricePerNight: 850000,
      rating: 4.7,
      address: 'Phường 1, Đà Lạt',
      thumbnailUrl: null,
      location: { lat: 11.941, lng: 108.448 },
      amenities: ['wifi', 'breakfast'],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 11,
      name: 'Ana Mandara Villas Dalat',
      city: 'Da Lat',
      stayType: 'resort',
      pricePerNight: 2100000,
      rating: 4.9,
      address: 'Lê Lai, Phường 5, Đà Lạt',
      thumbnailUrl: null,
      location: { lat: 11.9388, lng: 108.4265 },
      amenities: ['wifi', 'heater', 'spa'],
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];

  let nextUserId = 1;
  let nextTokenId = 1;
  let nextTripId = 1;
  let nextItemId = 1;

  const slotRank: Record<TimeSlotType, number> = {
    morning: 0,
    lunch: 1,
    afternoon: 2,
    dinner: 3,
  };

  function recalculateTrip(tripId: string, days: number[]) {
    for (const day of days) {
      const dayItems = items
        .filter((i) => String(i.tripId) === tripId && i.dayNumber === day)
        .sort(
          (a, b) =>
            slotRank[a.timeSlot] - slotRank[b.timeSlot] ||
            a.orderIndex - b.orderIndex ||
            a.id - b.id,
        );
      for (let idx = 0; idx < dayItems.length; idx++) {
        const curr = dayItems[idx];
        const prev = idx > 0 ? dayItems[idx - 1] : null;
        const currLoc = curr.place?.location ?? curr.stay?.location;
        const prevLoc = prev?.place?.location ?? prev?.stay?.location;
        if (currLoc && prevLoc) {
          const dist = haversineKm(prevLoc, currLoc);
          curr.distanceFromPrevKm = dist;
          curr.isDetourWarning = dist > 8.0;
        } else {
          curr.distanceFromPrevKm = 0;
          curr.isDetourWarning = false;
        }
      }
    }

    const trip = trips.find((t) => String(t.id) === tripId);
    const placePts = items
      .filter((i) => String(i.tripId) === tripId && i.place !== null)
      .map((i) => i.place!.location);

    const centroid =
      placePts.length === 0
        ? null
        : {
            lat: Number(
              (
                placePts.reduce((s, p) => s + p.lat, 0) / placePts.length
              ).toFixed(6),
            ),
            lng: Number(
              (
                placePts.reduce((s, p) => s + p.lng, 0) / placePts.length
              ).toFixed(6),
            ),
          };
    if (trip) {
      trip.centroidLocation = centroid;
    }
    return centroid;
  }

  return {
    users,
    refreshTokens,
    trips,
    items,
    auditLogs,
    places,
    stays,
    redisStore,
    recalculateTrip,
    userRepo: {
      findByEmail: async (email: string) =>
        users.find((u) => u.email.toLowerCase() === email.toLowerCase()) ?? null,
      findActiveById: async (id: string) =>
        users.find((u) => u.id === id && u.isActive) ?? null,
      create: async (data: {
        email: string;
        passwordHash: string;
        fullName: string;
      }) => {
        const user: User = {
          id: String(nextUserId++),
          email: data.email.toLowerCase(),
          passwordHash: data.passwordHash,
          fullName: data.fullName,
          avatarUrl: null,
          preferences: {},
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.push(user);
        return user;
      },
      update: async (
        id: string,
        data: Partial<Pick<User, 'fullName' | 'avatarUrl' | 'preferences'>>,
      ) => {
        const user = users.find((u) => u.id === id && u.isActive);
        if (!user) return null;
        Object.assign(user, data, { updatedAt: new Date() });
        return user;
      },
    },
    refreshTokenRepo: {
      create: async (data: Partial<RefreshToken>) => {
        const rt = {
          id: String(nextTokenId++),
          isRevoked: false,
          createdAt: new Date(),
          ...data,
        } as RefreshToken;
        refreshTokens.push(rt);
        return rt;
      },
      findByHash: async (hash: string) =>
        refreshTokens.find((t) => t.tokenHash === hash) ?? null,
      revokeById: async (id: string) => {
        const found = refreshTokens.find((t) => t.id === id);
        if (found) found.isRevoked = true;
      },
      revokeByHash: async (hash: string) => {
        const found = refreshTokens.find((t) => t.tokenHash === hash);
        if (found) found.isRevoked = true;
      },
      revokeAllForUser: async (userId: string) => {
        refreshTokens
          .filter((t) => t.userId === userId)
          .forEach((t) => {
            t.isRevoked = true;
          });
      },
    },
    placeRepo: {
      findActiveById: async (id: string) =>
        places.find((p) => String(p.id) === String(id)) ?? null,
      findFiltered: async (params: { city?: string; limit: number }) => {
        const filtered = places.filter(
          (p) =>
            !params.city ||
            p.city.toLowerCase() === params.city.toLowerCase(),
        );
        return { items: filtered.slice(0, params.limit), total: filtered.length };
      },
      findInRadar: async (params: {
        lat: number;
        lng: number;
        radiusMeters: number;
        isOutdoor?: boolean;
        weatherTag?: string;
        limit: number;
      }) => {
        const radiusKm = params.radiusMeters / 1000;
        const matched = places
          .map((p) => ({
            ...p,
            distanceKm: haversineKm({ lat: params.lat, lng: params.lng }, p.location),
          }))
          .filter((p) => {
            if ((p.distanceKm ?? 999) > radiusKm) return false;
            if (
              params.isOutdoor !== undefined &&
              p.isOutdoor !== params.isOutdoor
            ) {
              return false;
            }
            if (
              params.weatherTag &&
              !p.suitableWeather.includes(params.weatherTag)
            ) {
              return false;
            }
            return true;
          })
          .sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
        return { items: matched.slice(0, params.limit), total: matched.length };
      },
      findFoodRecommendations: async () => {
        const food = places.filter(
          (p) => p.category === 'restaurant' || p.category === 'cafe',
        );
        return { items: food, total: food.length };
      },
    },
    stayRepo: {
      findActiveById: async (id: string) =>
        stays.find((s) => String(s.id) === String(id)) ?? null,
      findFiltered: async () => ({ items: stays, total: stays.length }),
      findNearestToCentroid: async (
        params: CentroidStaySearchParams,
      ): Promise<RecommendedStayItem[]> => {
        return stays
          .filter((s) => !params.stayType || s.stayType === params.stayType)
          .map((s) => {
            const distCentroid = haversineKm(params.centroid, s.location);
            const avgPlace =
              params.placeLocations.length === 0
                ? distCentroid
                : Number(
                    (
                      params.placeLocations.reduce(
                        (sum, pt) => sum + haversineKm(pt, s.location),
                        0,
                      ) / params.placeLocations.length
                    ).toFixed(2),
                  );
            return {
              id: s.id,
              name: s.name,
              stayType: s.stayType,
              pricePerNight: s.pricePerNight,
              rating: s.rating,
              address: s.address,
              thumbnailUrl: s.thumbnailUrl,
              location: s.location,
              distanceToCentroidKm: distCentroid,
              avgDistanceToItineraryPlacesKm: avgPlace,
              amenities: s.amenities,
            };
          })
          .sort((a, b) => a.distanceToCentroidKm - b.distanceToCentroidKm)
          .slice(0, params.limit);
      },
    },
    tripRepo: {
      findOwnerById: async (id: string) => {
        const found = trips.find((t) => String(t.id) === String(id));
        return found ? { id: String(found.id), userId: found.userIdStr } : null;
      },
      findById: async (id: string) =>
        trips.find((t) => String(t.id) === String(id)) ?? null,
      findByUserPaginated: async (userId: string) => {
        const own = trips.filter((t) => t.userIdStr === String(userId));
        return { items: own, total: own.length };
      },
      create: async (data: {
        userId: string;
        title: string;
        destinationCity: string;
        startDate: string;
        endDate: string;
      }) => {
        const id = nextTripId++;
        const startMs = Date.parse(`${data.startDate}T00:00:00Z`);
        const endMs = Date.parse(`${data.endDate}T00:00:00Z`);
        const totalDays = Math.floor((endMs - startMs) / 86_400_000) + 1;
        const trip = {
          id,
          userId: Number(data.userId),
          userIdStr: String(data.userId),
          title: data.title,
          destinationCity: data.destinationCity,
          startDate: data.startDate,
          endDate: data.endDate,
          totalDays,
          status: 'active' as const,
          centroidLocation: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        trips.push(trip);
        return trip;
      },
      update: async (
        id: string,
        data: Partial<{
          title: string;
          destinationCity: string;
          startDate: string;
          endDate: string;
          status: 'draft' | 'active' | 'completed' | 'archived';
        }>,
      ) => {
        const trip = trips.find((t) => String(t.id) === String(id));
        if (!trip) return null;
        Object.assign(trip, data, { updatedAt: new Date() });
        return trip;
      },
      deleteById: async (id: string) => {
        const idx = trips.findIndex((t) => String(t.id) === String(id));
        if (idx >= 0) trips.splice(idx, 1);
      },
      recalculateCentroid: async (tripId: string) => recalculateTrip(tripId, []),
      findPlaceCentroidStats: async (tripId: string) => {
        const pts = items
          .filter((i) => String(i.tripId) === String(tripId) && i.place !== null)
          .map((i) => i.place!.location);
        if (pts.length === 0) {
          return {
            centroidLocation: null,
            totalItineraryPlaces: 0,
            placeLocations: [],
          };
        }
        return {
          centroidLocation: {
            lat: Number(
              (pts.reduce((s, p) => s + p.lat, 0) / pts.length).toFixed(6),
            ),
            lng: Number(
              (pts.reduce((s, p) => s + p.lng, 0) / pts.length).toFixed(6),
            ),
          },
          totalItineraryPlaces: pts.length,
          placeLocations: pts,
        };
      },
    },
    itemRepo: {
      findByTripOrdered: async (tripId: string) =>
        items
          .filter((i) => String(i.tripId) === String(tripId))
          .sort(
            (a, b) =>
              a.dayNumber - b.dayNumber ||
              slotRank[a.timeSlot] - slotRank[b.timeSlot] ||
              a.orderIndex - b.orderIndex,
          ),
      findByIdInTrip: async (tripId: string, itemId: string) =>
        items.find(
          (i) =>
            String(i.tripId) === String(tripId) &&
            String(i.id) === String(itemId),
        ) ?? null,
      findExistingIdsAndDays: async (tripId: string, ids: string[]) =>
        items
          .filter(
            (i) =>
              String(i.tripId) === String(tripId) &&
              ids.includes(String(i.id)),
          )
          .map((i) => ({ id: String(i.id), dayNumber: i.dayNumber })),
      batchUpdatePositions: async (
        tripId: string,
        entries: Array<{
          itemId: string;
          dayNumber: number;
          timeSlot: TimeSlotType;
          orderIndex: number;
        }>,
      ) => {
        for (const entry of entries) {
          const item = items.find(
            (i) =>
              String(i.tripId) === String(tripId) &&
              String(i.id) === String(entry.itemId),
          );
          if (item) {
            item.dayNumber = entry.dayNumber;
            item.timeSlot = entry.timeSlot;
            item.orderIndex = entry.orderIndex;
          }
        }
      },
      recalculateDayDistances: async (tripId: string, days: number[]) => {
        recalculateTrip(tripId, days);
      },
      updateWeatherBatch: async (
        updates: Array<{
          id: string;
          weatherCondition: string;
          temperatureC: number;
          rainProbability: number;
          weatherAlertFlag: boolean;
        }>,
      ) => {
        for (const u of updates) {
          const item = items.find((i) => String(i.id) === String(u.id));
          if (item) {
            item.weatherCondition = u.weatherCondition;
            item.temperatureC = u.temperatureC;
            item.rainProbability = u.rainProbability;
            item.weatherAlertFlag = u.weatherAlertFlag;
          }
        }
      },
      swapPlaceInTransaction: async (
        tripId: string,
        itemId: string,
        replacementPlaceId: string,
        note?: string,
      ) => {
        const item = items.find(
          (i) =>
            String(i.tripId) === String(tripId) &&
            String(i.id) === String(itemId),
        );
        const place = places.find(
          (p) => String(p.id) === String(replacementPlaceId),
        );
        if (item && place) {
          item.placeId = place.id;
          item.stayId = null;
          item.weatherAlertFlag = false;
          if (note !== undefined) item.note = note;
          item.place = {
            id: place.id,
            name: place.name,
            category: place.category,
            subcategory: place.subcategory,
            isOutdoor: place.isOutdoor,
            address: place.address,
            rating: place.rating,
            location: place.location,
          };
        }
      },
      getNextOrderIndex: async () => 0,
      existsActiveStay: async (stayId: string) =>
        stays.some((s) => String(s.id) === String(stayId)),
      create: async (data: {
        tripId: string;
        placeId: string | null;
        stayId: string | null;
        dayNumber: number;
        timeSlot: TimeSlotType;
        orderIndex: number;
        note: string | null;
      }) => {
        const place = data.placeId
          ? places.find((p) => String(p.id) === String(data.placeId)) ?? null
          : null;
        const stay = data.stayId
          ? stays.find((s) => String(s.id) === String(data.stayId)) ?? null
          : null;
        const item: ItineraryItemResponse = {
          id: nextItemId++,
          tripId: Number(data.tripId),
          placeId: place ? place.id : null,
          stayId: stay ? stay.id : null,
          dayNumber: data.dayNumber,
          timeSlot: data.timeSlot,
          orderIndex: data.orderIndex,
          distanceFromPrevKm: 0,
          isDetourWarning: false,
          weatherCondition: null,
          temperatureC: null,
          rainProbability: null,
          weatherAlertFlag: false,
          note: data.note,
          place: place
            ? {
                id: place.id,
                name: place.name,
                category: place.category,
                subcategory: place.subcategory,
                isOutdoor: place.isOutdoor,
                address: place.address,
                rating: place.rating,
                location: place.location,
              }
            : null,
          stay: stay
            ? {
                id: stay.id,
                name: stay.name,
                stayType: stay.stayType,
                address: stay.address,
                rating: stay.rating,
                pricePerNight: stay.pricePerNight,
                location: stay.location,
              }
            : null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        items.push(item);
        return item;
      },
      deleteById: async (tripId: string, itemId: string) => {
        const idx = items.findIndex(
          (i) =>
            String(i.tripId) === String(tripId) &&
            String(i.id) === String(itemId),
        );
        if (idx >= 0) items.splice(idx, 1);
      },
    },
    swapRepo: {
      createAudit: async (data: Record<string, unknown>) => {
        auditLogs.push(data);
        return data;
      },
    },
    weatherSnapshotRepo: {
      upsertSlots: async () => undefined,
      findByCityAndDate: async () => [],
    },
    redisService: {
      getJson: async (key: string) => redisStore.get(key) ?? null,
      setJson: async (key: string, val: unknown) => {
        redisStore.set(key, val);
      },
      del: async (key: string) => {
        redisStore.delete(key);
      },
    },
  };
}

describe('SkyRoute End-to-End Integration (E2E)', () => {
  let app: INestApplication;
  let state: ReturnType<typeof createInMemoryState>;
  let userAToken: string;
  let userBToken: string;
  let tripId: number;
  let distantItemId: number;
  let lakeItemId: number;

  beforeAll(async () => {
    state = createInMemoryState();

    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          ignoreEnvFile: true,
          load: [
            () => ({
              NODE_ENV: 'test',
              PORT: 3001,
              FRONTEND_URL: 'http://localhost:3000',
              JWT_ACCESS_SECRET: 'e2e_access_secret_32chars_minimum',
              JWT_REFRESH_SECRET: 'e2e_refresh_secret_32chars_minimum',
              JWT_ACCESS_EXPIRES_IN: '15m',
              JWT_REFRESH_EXPIRES_IN: '7d',
              BCRYPT_ROUNDS: 4,
              WEATHER_CACHE_TTL_SEC: 1800,
              RAIN_CONFLICT_THRESHOLD_PCT: 60,
              DETOUR_WARNING_KM: 8.0,
              PLAN_B_RADIUS_METERS: 3000,
            }),
          ],
          validationSchema: envValidationSchema,
        }),
        ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
        EventEmitterModule.forRoot(),
        PassportModule,
        JwtModule.register({}),
      ],
      controllers: [
        HealthController,
        AuthController,
        DiscoveryController,
        StaysController,
        TripStaysController,
        TripsController,
        WeatherController,
        TripWeatherController,
        AiCopilotController,
        AiGenerateController,
      ],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        TripOwnerGuard,
        DiscoveryService,
        FoodDiscoveryService,
        StaysService,
        TripsService,
        TimelineService,
        WeatherService,
        WeatherConflictService,
        ContextualRankingService,
        PlanBService,
        AiCopilotService,
        {
          provide: DataSource,
          useValue: {
            transaction: async (cb: (manager: unknown) => Promise<unknown>) =>
              cb({}),
          },
        },
        { provide: UserRepository, useValue: state.userRepo },
        { provide: RefreshTokenRepository, useValue: state.refreshTokenRepo },
        { provide: PlaceRepository, useValue: state.placeRepo },
        { provide: StayRepository, useValue: state.stayRepo },
        { provide: TripRepository, useValue: state.tripRepo },
        { provide: ItineraryItemRepository, useValue: state.itemRepo },
        {
          provide: WeatherSnapshotRepository,
          useValue: state.weatherSnapshotRepo,
        },
        { provide: PlanBSwapRepository, useValue: state.swapRepo },
        { provide: RedisService, useValue: state.redisService },
        {
          provide: OpenMeteoClient,
          useValue: {
            fetchDailyHourly: async (_lat: number, _lng: number, date: string) =>
              TIME_SLOTS.map((_, idx) => ({
                hour: [9, 12, 15, 19][idx],
                time: `${date}T0${[9, 12, 15, 19][idx]}:00`.replace(
                  'T01',
                  'T1',
                ),
                temperatureC: 17,
                rainProbability: idx === 2 ? 75 : 15,
                weatherCode: idx === 2 ? 63 : 1,
              })),
          },
        },
        {
          provide: LlmToolClient,
          useValue: {
            isConfigured: () => false,
            generatePlanBReasons: async (input: {
              candidates: Array<{ placeId: number; distanceFromPrevKm: number }>;
            }) => {
              const reasons: Record<number, string> = {};
              for (const c of input.candidates) {
                reasons[c.placeId] =
                  `Điểm trong nhà cách ${c.distanceFromPrevKm} km, an toàn tránh mưa.`;
              }
              return reasons;
            },
          },
        },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('exposes /api/v1/health with standard envelope & security headers', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(res.body).toEqual({
      success: true,
      data: { status: 'ok', service: 'skyroute-backend' },
    });
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('DENY');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('generates complete Swagger OpenAPI schema for all Phase 1–5 routes', () => {
    const doc = createSwaggerDocument(app);
    const paths = Object.keys(doc.paths);
    expect(paths).toContain('/api/v1/places/radar');
    expect(paths).toContain('/api/v1/trips/{id}/items/reorder');
    expect(paths).toContain('/api/v1/trips/{id}/weather-sync');
    expect(paths).toContain('/api/v1/trips/{id}/items/{itemId}/plan-b-candidates');
    expect(paths).toContain('/api/v1/trips/{id}/items/{itemId}/swap-plan-b');
    expect(paths).toContain('/api/v1/trips/{tripId}/centroid-stays');
    expect(paths).toContain('/api/v1/ai/generate-itinerary');
  });

  it('registers users, enforces JWT auth, and denies unauthenticated /auth/me', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);

    const regA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'userA@skyroute.vn',
        password: 'securePassword123',
        fullName: 'Traveler A',
      })
      .expect(201);

    userAToken = regA.body.data.accessToken;
    expect(regA.headers['set-cookie']).toBeDefined();

    const regB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({
        email: 'userB@skyroute.vn',
        password: 'securePassword123',
        fullName: 'Traveler B',
      })
      .expect(201);
    userBToken = regB.body.data.accessToken;

    const meRes = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(meRes.body.data.email).toBe('usera@skyroute.vn');
  });

  it('scans 1–5km proximity radar and rejects out-of-range radius with DISC_003', async () => {
    const okRes = await request(app.getHttpServer())
      .get('/api/v1/places/radar?lat=11.9404&lng=108.4583&radius_km=3')
      .expect(200);

    expect(okRes.body.success).toBe(true);
    expect(okRes.body.meta.anchorPoint).toEqual({
      lat: 11.9404,
      lng: 108.4583,
    });
    expect(okRes.body.data.length).toBeGreaterThan(0);

    const badRes = await request(app.getHttpServer())
      .get('/api/v1/places/radar?lat=11.9404&lng=108.4583&radius_km=10')
      .expect(400);
    expect(badRes.body.error.code).toBe('DISC_003');
  });

  it('enforces trip ownership (403 AUTH_004) and empty centroid guard (422 STAY_002)', async () => {
    const createRes = await request(app.getHttpServer())
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        title: 'Đà Lạt E2E',
        destinationCity: 'Da Lat',
        startDate: '2026-12-01',
        endDate: '2026-12-03',
      })
      .expect(201);

    tripId = createRes.body.data.id;

    const forbidRes = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${userBToken}`)
      .expect(403);
    expect(forbidRes.body.error.code).toBe('AUTH_004');

    const emptyCentroidRes = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}/centroid-stays`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(422);
    expect(emptyCentroidRes.body.error.code).toBe('STAY_002');
  });

  it('completes timeline detour (>8km), weather conflict (>=60%), Plan B 1-click swap, Centroid stays, and grounded AI generation', async () => {
    const addLake = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ placeId: 1, dayNumber: 1, timeSlot: 'morning' })
      .expect(201);
    lakeItemId = addLake.body.data.item.id;

    const addHill = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ placeId: 2, dayNumber: 1, timeSlot: 'afternoon' })
      .expect(201);
    distantItemId = addHill.body.data.item.id;

    const reorderRes = await request(app.getHttpServer())
      .patch(`/api/v1/trips/${tripId}/items/reorder`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        items: [
          { itemId: lakeItemId, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
          { itemId: distantItemId, dayNumber: 1, timeSlot: 'afternoon', orderIndex: 0 },
        ],
      })
      .expect(200);

    const hillAfterReorder = reorderRes.body.data.updatedItems.find(
      (i: { id: number }) => i.id === distantItemId,
    );
    expect(hillAfterReorder.isDetourWarning).toBe(true);
    expect(hillAfterReorder.distanceFromPrevKm).toBeGreaterThan(8);

    // Move outdoor place to morning & add lunch close to city center for <3km Plan B
    const addHotpot = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ placeId: 4, dayNumber: 1, timeSlot: 'lunch' })
      .expect(201);
    const hotpotId = addHotpot.body.data.item.id;

    await request(app.getHttpServer())
      .patch(`/api/v1/trips/${tripId}/items/reorder`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        items: [
          { itemId: hotpotId, dayNumber: 1, timeSlot: 'lunch', orderIndex: 0 },
          { itemId: distantItemId, dayNumber: 1, timeSlot: 'afternoon', orderIndex: 0 },
        ],
      })
      .expect(200);

    const syncRes = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/weather-sync`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        simulateRain: { dayNumber: 1, timeSlot: 'afternoon', rainProbability: 75 },
      })
      .expect(200);
    expect(syncRes.body.data.conflictCount).toBeGreaterThanOrEqual(1);

    const candRes = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}/items/${distantItemId}/plan-b-candidates`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(candRes.body.data.candidates.length).toBeGreaterThan(0);
    const replacementId = candRes.body.data.candidates[0].placeId;

    const swapRes = await request(app.getHttpServer())
      .post(`/api/v1/trips/${tripId}/items/${distantItemId}/swap-plan-b`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ replacementPlaceId: replacementId })
      .expect(200);
    expect(swapRes.body.data.updatedItem.weatherAlertFlag).toBe(false);
    expect(state.auditLogs.length).toBe(1);

    const staysRes = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}/centroid-stays`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(200);
    expect(staysRes.body.data.centroidLocation).toBeDefined();
    expect(staysRes.body.data.recommendedStays.length).toBeGreaterThan(0);
    expect(
      staysRes.body.data.recommendedStays[0].distanceToCentroidKm,
    ).toBeDefined();

    const aiRes = await request(app.getHttpServer())
      .post('/api/v1/ai/generate-itinerary')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        tripId,
        prompt: 'Đà Lạt 3N2Đ thích săn mây, lẩu nướng, ngân sách vừa',
      })
      .expect(200);
    const catalogIds = new Set(state.places.map((p) => p.id));
    expect(aiRes.body.data.items.length).toBeGreaterThan(0);
    for (const item of aiRes.body.data.items) {
      expect(catalogIds.has(item.placeId)).toBe(true);
    }

    await request(app.getHttpServer())
      .post('/api/v1/ai/generate-itinerary')
      .set('Authorization', `Bearer ${userBToken}`)
      .send({ tripId, prompt: 'Đà Lạt 3N2Đ' })
      .expect(403);
  });

  it('updates user profile preferences and edits/deletes an owned trip', async () => {
    const profileRes = await request(app.getHttpServer())
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${userAToken}`)
      .send({
        fullName: 'Traveler A Pro',
        preferences: {
          budget: 'low',
          interests: ['hotpot', 'museum'],
          preferIndoor: true,
        },
      })
      .expect(200);
    expect(profileRes.body.data.fullName).toBe('Traveler A Pro');
    expect(profileRes.body.data.preferences.budget).toBe('low');

    const patchTrip = await request(app.getHttpServer())
      .patch(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .send({ title: 'Đà Lạt Updated', status: 'completed' })
      .expect(200);
    expect(patchTrip.body.data.title).toBe('Đà Lạt Updated');
    expect(patchTrip.body.data.status).toBe('completed');

    await request(app.getHttpServer())
      .delete(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(204);

    const afterDelete = await request(app.getHttpServer())
      .get(`/api/v1/trips/${tripId}`)
      .set('Authorization', `Bearer ${userAToken}`)
      .expect(404);
    expect(afterDelete.body.error.code).toBe('TRIP_001');
  });
});
