import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { RedisService } from '../src/core/cache/redis.service';

const describeLive =
  process.env.E2E_USE_LIVE_DB === 'true' ? describe : describe.skip;

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const r = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

describeLive('SkyRoute Live PostGIS + Redis 7 E2E', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redisService: RedisService;

  let accessToken = '';
  let userId = '';
  let tripId = 0;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    dataSource = moduleRef.get(DataSource);
    redisService = moduleRef.get(RedisService);
  }, 30_000);

  afterAll(async () => {
    try {
      if (tripId && accessToken) {
        await request(app.getHttpServer())
          .delete(`/api/v1/trips/${tripId}`)
          .set('Authorization', `Bearer ${accessToken}`);
        await redisService.del(`trip:centroid:${tripId}`);
      }
      if (userId && dataSource?.isInitialized) {
        await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
      }
    } finally {
      if (app) {
        await app.close();
      }
    }
  });

  it('exercises live PostGIS spatial queries, Redis TTL caching + invalidation, and Plan B swap', async () => {
    const server = app.getHttpServer();
    const uniqueEmail = `live-e2e-${Date.now()}@skyroute.dev`;

    // 1. Register + update profile preferences
    const regRes = await request(server)
      .post('/api/v1/auth/register')
      .send({
        email: uniqueEmail,
        password: 'LiveE2EPassword123!',
        fullName: 'Live Infra Tester',
      })
      .expect(201);

    accessToken = regRes.body.data.accessToken;
    userId = String(regRes.body.data.user.id);

    const prefRes = await request(server)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        preferences: {
          interests: ['nature', 'hotpot'],
          budget: 'medium',
          preferIndoor: false,
        },
      })
      .expect(200);
    expect(prefRes.body.data.preferences.budget).toBe('medium');

    // 2. Live PostGIS Radar, Food Recommendations, and Stays queries
    const radarRes = await request(server)
      .get('/api/v1/places/radar?lat=11.9404&lng=108.4583&radius_km=3&limit=20')
      .expect(200);
    expect(radarRes.body.data.length).toBeGreaterThan(5);

    const foodRes = await request(server)
      .get(
        '/api/v1/places/food-recommendations?city=Da%20Lat&temperature_c=16&rain_probability=75',
      )
      .expect(200);
    expect(foodRes.body.data.length).toBeGreaterThan(0);

    const staysRes = await request(server)
      .get('/api/v1/stays?city=Da%20Lat&limit=10')
      .expect(200);
    expect(staysRes.body.data.length).toBeGreaterThan(0);

    // Fetch central outdoor + distant (>8km) seeded Da Lat places
    const catalogRes = await request(server)
      .get('/api/v1/places?city=Da%20Lat&limit=100')
      .expect(200);
    const catalog: Array<{
      id: number;
      name: string;
      isOutdoor: boolean;
      location: { lat: number; lng: number };
    }> = catalogRes.body.data;

    const centralOutdoors = catalog.filter(
      (p) =>
        p.isOutdoor &&
        haversineKm(p.location, { lat: 11.9404, lng: 108.445 }) < 2.5,
    );
    expect(centralOutdoors.length).toBeGreaterThanOrEqual(2);
    const outdoorCenter = centralOutdoors[0];
    const secondCentralOutdoor = centralOutdoors[1];

    const farPlace = catalog.find(
      (p) =>
        p.id !== outdoorCenter.id &&
        p.id !== secondCentralOutdoor.id &&
        haversineKm(p.location, outdoorCenter.location) > 8.5,
    );
    expect(farPlace).toBeDefined();

    // 3. Create trip & add distant places -> verify ST_DistanceSphere detour detection
    const todayIso = new Date().toISOString().slice(0, 10);
    const tomorrowIso = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);

    const tripRes = await request(server)
      .post('/api/v1/trips')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        title: 'Live Infra Da Lat Verification',
        destinationCity: 'Da Lat',
        startDate: todayIso,
        endDate: tomorrowIso,
      })
      .expect(201);
    tripId = tripRes.body.data.id;

    const add1 = await request(server)
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        placeId: outdoorCenter.id,
        dayNumber: 1,
        timeSlot: 'morning',
      })
      .expect(201);

    const add2 = await request(server)
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        placeId: farPlace!.id,
        dayNumber: 1,
        timeSlot: 'afternoon',
      })
      .expect(201);

    const item1Id = add1.body.data.item.id;
    const item2Id = add2.body.data.item.id;
    expect(add2.body.data.item.distanceFromPrevKm).toBeGreaterThan(8.0);
    expect(add2.body.data.item.isDetourWarning).toBe(true);

    // Reorder Day 1 & confirm ST_DistanceSphere recalculation via updatedItems
    const reorderRes = await request(server)
      .patch(`/api/v1/trips/${tripId}/items/reorder`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [
          { itemId: item2Id, dayNumber: 1, timeSlot: 'morning', orderIndex: 0 },
          { itemId: item1Id, dayNumber: 1, timeSlot: 'afternoon', orderIndex: 0 },
        ],
      })
      .expect(200);

    const reorderedSecond = reorderRes.body.data.updatedItems.find(
      (i: { id: number }) => i.id === item1Id,
    );
    expect(reorderedSecond).toBeDefined();
    expect(reorderedSecond.isDetourWarning).toBe(true);
    expect(reorderedSecond.distanceFromPrevKm).toBeGreaterThan(8.0);

    // 4. Centroid Stays KNN (<->) + Redis TTL verification (<= 3600s)
    const centroidRes = await request(server)
      .get(`/api/v1/trips/${tripId}/centroid-stays?limit=5`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    expect(centroidRes.body.data.centroidLocation).toBeDefined();
    expect(centroidRes.body.data.recommendedStays.length).toBe(5);

    const centroidKey = `trip:centroid:${tripId}`;
    const centroidTtl = await redisService.getTtl(centroidKey);
    expect(centroidTtl).toBeGreaterThan(0);
    expect(centroidTtl).toBeLessThanOrEqual(3600);

    // 5. Adding a Day 2 central outdoor item emits trip.items.changed -> invalidates trip:centroid:{id}
    const addDay2 = await request(server)
      .post(`/api/v1/trips/${tripId}/items`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        placeId: secondCentralOutdoor.id,
        dayNumber: 2,
        timeSlot: 'morning',
      })
      .expect(201);
    const day2ItemId = addDay2.body.data.item.id;

    await new Promise((resolve) => setTimeout(resolve, 150));
    const invalidatedTtl = await redisService.getTtl(centroidKey);
    expect(invalidatedTtl).toBe(-2);

    // 6. Weather sync rain simulation -> Plan B indoor <3km candidates + 1-click swap
    const weatherSyncRes = await request(server)
      .post(`/api/v1/trips/${tripId}/weather-sync`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        simulateRain: {
          dayNumber: 2,
          timeSlot: 'morning',
          rainProbability: 80,
        },
      })
      .expect(200);

    expect(weatherSyncRes.body.data.conflictCount).toBeGreaterThanOrEqual(1);

    const candidatesRes = await request(server)
      .get(`/api/v1/trips/${tripId}/items/${day2ItemId}/plan-b-candidates`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const candidates: Array<{
      placeId: number;
      isOutdoor: boolean;
      distanceFromPrevKm: number;
    }> = candidatesRes.body.data.candidates;
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].isOutdoor).toBe(false);
    expect(candidates[0].distanceFromPrevKm).toBeLessThanOrEqual(3.0);

    const swapRes = await request(server)
      .post(`/api/v1/trips/${tripId}/items/${day2ItemId}/swap-plan-b`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ replacementPlaceId: candidates[0].placeId })
      .expect(200);

    expect(swapRes.body.data.updatedItem.placeId).toBe(candidates[0].placeId);
    expect(swapRes.body.data.updatedItem.weatherAlertFlag).toBe(false);

    // 7. Live weather forecast + Redis 30m TTL check (when Open-Meteo is reachable)
    const weatherRes = await request(server)
      .get(`/api/v1/weather/forecast?city=Da%20Lat&date=${todayIso}`)
      .expect(200);

    expect(['open-meteo', 'redis', 'database']).toContain(
      weatherRes.body.data.source,
    );
    if (
      weatherRes.body.data.source === 'open-meteo' ||
      weatherRes.body.data.source === 'redis'
    ) {
      const weatherKey = `weather:hourly:da-lat:${todayIso}`;
      const weatherTtl = await redisService.getTtl(weatherKey);
      expect(weatherTtl).toBeGreaterThan(0);
      expect(weatherTtl).toBeLessThanOrEqual(1800);
    }
  }, 45_000);
});
