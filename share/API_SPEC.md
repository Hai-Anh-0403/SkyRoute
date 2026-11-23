Write API_SPEC.md based on:

# SkyRoute REST API Contract

## API conventions

- **Base URL:** `/api/v1`; a breaking change is released under a new path version such as `/api/v2`.
- **Media type:** `application/json; charset=utf-8`.
- **Payloads:** request and response properties use `camelCase`; query parameters retain the established `snake_case` names, such as `radius_km`.
- **IDs:** positive integer path parameters. Coordinates always use `{ "lat": number, "lng": number }`; the server maps them to `ST_MakePoint(lng, lat)`.
- **Pagination:** `page` defaults to `1`; `limit` defaults to `12` and is at most `100`.
- **Sorting:** `sort` and `order` (`asc` or `desc`) are only accepted where documented. Unsupported filters are rejected with `SYS_002`.

### Response envelope

```json
{ "success": true, "data": {}, "message": "Optional message", "meta": {} }
```

```json
{
  "success": false,
  "error": {
    "code": "WTHR_002",
    "message": "Outdoor activity conflicts with high rain probability (75%)",
    "details": { "itineraryItemId": 104, "timeSlot": "afternoon", "rainProbability": 75 }
  }
}
```

List responses use `meta: { page, limit, total, totalPages }`. Spatial lists additionally return `anchorPoint` and `radiusKm`.

## Authentication and authorization

- Send `Authorization: Bearer <accessToken>` for authenticated endpoints.
- Access tokens expire after **15 minutes**. A refresh token expires after **7 days**, is stored as an `httpOnly`, `Secure`, `SameSite=Lax` cookie, and only its SHA-256 hash is persisted.
- `401` means missing, expired, invalid, or revoked authentication. `403` means a valid user is not the trip owner or lacks the `admin` role.
- Public: authentication, discovery, stays, and weather forecast endpoints. Protected: `/auth/me`, all trip routes, and all `/ai/*` routes. Admin routes additionally require `@Roles('admin')`.
- `POST` create/action endpoints are not idempotent in v1. Clients must not retry them automatically after an unknown network outcome; this can change only with an atomically stored idempotency-key contract.

## Error codes

| Code | Status | Meaning |
|---|---:|---|
| `AUTH_001` | 401 | Invalid email or password |
| `AUTH_002` | 401 | Access token expired |
| `AUTH_003` | 401 | Refresh token invalid or revoked |
| `AUTH_004` | 403 | User is not authorized for this resource |
| `AUTH_005` | 409 | Email is already registered |
| `DISC_001` | 404 | Place not found |
| `DISC_002` | 400 | Invalid WGS84 coordinates |
| `DISC_003` | 400 | Radar radius is outside 1–5 km |
| `STAY_001` | 404 | Stay not found |
| `STAY_002` | 422 | Trip has no selected places for centroid calculation |
| `TRIP_001` | 404 | Trip not found |
| `TRIP_002` | 400 | `endDate` is before `startDate` |
| `TRIP_003` | 404 | Itinerary item not found |
| `TRIP_004` | 400 | Invalid day number or time slot |
| `WTHR_001` | 503 | Open-Meteo and persisted fallback are unavailable |
| `WTHR_002` | 409 | Outdoor item conflicts with rain probability of at least 60% |
| `AI_001` | 422 | No eligible indoor Plan B candidate within 3 km |
| `AI_002` | 504 | Function-calling provider timed out |
| `SYS_001` | 500 | Unexpected internal error |
| `SYS_002` | 400 | DTO or query validation failed |

## Auth feature

| Method | Path | Auth | Request / result |
|---|---|---|---|
| `POST` | `/auth/register` | Public | `{ email, password, fullName }` → user and access token |
| `POST` | `/auth/login` | Public | `{ email, password, deviceName? }` → user and access token; sets refresh cookie |
| `POST` | `/auth/refresh` | Refresh cookie | issues a new access token and rotates the cookie |
| `POST` | `/auth/logout` | Bearer | revokes the current refresh session |
| `POST` | `/auth/logout-all` | Bearer | revokes all sessions owned by the current user |
| `GET` | `/auth/me` | Bearer | current profile and preferences |
| `PATCH` | `/auth/me` | Bearer | partial `{ fullName?, avatarUrl?, preferences? }` update |

Registration validation: email is normalized and unique; password is validated by the auth DTO policy and never returned. User output contains `id`, `email`, `fullName`, `avatarUrl`, `preferences`, and `role` (`'traveler' | 'admin'`).

## Discovery feature

| Method | Path | Auth | Query / purpose |
|---|---|---|---|
| `GET` | `/places` | Public | `city`, `category`, `subcategory`, `is_outdoor`, `has_ac`, `weather_tag`, pagination, `sort=rating\|price_level\|created_at` |
| `GET` | `/places/radar` | Public | required `lat`, `lng`, `radius_km=1..5`; optional discovery filters and `sort=distance\|rating` |
| `GET` | `/places/food-recommendations` | Public | `city`, `lat`, `lng`, optional `temperature_c`, `rain_probability`, pagination |
| `GET` | `/places/:id` | Public | one active place |
| `POST` | `/admin/places` | Admin | create a place |
| `PATCH` | `/admin/places/:id` | Admin | partial place update |
| `DELETE` | `/admin/places/:id` | Admin | soft-deletes the place (`isActive=false`) returning `{ id, isActive: false }` |

Place create/update accepts `name`, `city`, `category`, `subcategory?`, `isOutdoor`, `hasAc?`, `suitableWeather`, `priceLevel?`, `rating?`, `address?`, `description?`, `thumbnailUrl?`, and `location`. A place response includes those fields plus `id`, `isActive`, `createdAt`, and `updatedAt`.

### Radar example

`GET /api/v1/places/radar?lat=11.9404&lng=108.4583&radius_km=3&category=restaurant&is_outdoor=false&weather_tag=rainy&limit=10`

```json
{
  "success": true,
  "data": [{
    "id": 42,
    "name": "Lẩu Gà Lá É Tao Ngộ",
    "category": "restaurant",
    "subcategory": "hotpot",
    "isOutdoor": false,
    "hasAc": false,
    "suitableWeather": ["rainy", "cold", "cloudy"],
    "rating": 4.6,
    "location": { "lat": 11.9362, "lng": 108.4451 },
    "distanceKm": 1.52
  }],
  "meta": { "page": 1, "limit": 10, "total": 1, "totalPages": 1,
    "anchorPoint": { "lat": 11.9404, "lng": 108.4583 }, "radiusKm": 3 }
}
```

The service uses `ST_DWithin` with the functional geography GIST index and returns exact meter-based distance via `ST_DistanceSphere`.

## Stays feature

| Method | Path | Auth | Query / purpose |
|---|---|---|---|
| `GET` | `/stays` | Public | `city`, `stay_type`, `min_price`, `max_price`, pagination, `sort=price_per_night\|rating` |
| `GET` | `/stays/:id` | Public | one active stay |
| `GET` | `/trips/:tripId/centroid-stays` | Bearer + owner | nearest stays to the trip centroid |
| `POST` | `/admin/stays` | Admin | create a stay |
| `PATCH` | `/admin/stays/:id` | Admin | partial stay update |
| `DELETE` | `/admin/stays/:id` | Admin | soft-deletes the stay (`isActive=false`) returning `{ id, isActive: false }` |

## Operations & health probes

| Method | Path | Auth | Response / purpose |
|---|---|---|---|
| `GET` | `/health` | Public | Liveness probe (`200 { status: "ok", service }`) |
| `GET` | `/health/ready` | Public | Deep readiness probe checking PostgreSQL (`SELECT 1`) and Redis (`PING`); returns `200 { status: "ready", checks }` or `503` when any dependency is down |

All responses echo an `x-request-id` correlation header for request tracing.

A centroid-stays response returns `tripId`, `centroidLocation`, `totalItineraryPlaces`, and `recommendedStays`. Each recommendation contains `id`, `name`, `stayType`, `pricePerNight`, `rating`, `address`, `location`, `distanceToCentroidKm`, `avgDistanceToItineraryPlacesKm`, and `amenities`.

## Trips feature

| Method | Path | Auth | Request / purpose |
|---|---|---|---|
| `GET` | `/trips` | Bearer | paginated trips owned by the current user |
| `POST` | `/trips` | Bearer | `{ title, destinationCity, startDate, endDate }` |
| `GET` | `/trips/:id` | Bearer + owner | complete itinerary, centroid, distance, and weather state |
| `PATCH` | `/trips/:id` | Bearer + owner | partial title, city, dates, or status update |
| `DELETE` | `/trips/:id` | Bearer + owner | deletes trip and dependent itinerary/audit records; `204` |
| `POST` | `/trips/:id/items` | Bearer + owner | add one place or stay to a timeline slot |
| `PATCH` | `/trips/:id/items/reorder` | Bearer + owner | atomic batch timeline reorder |
| `PATCH` | `/trips/:id/items/:itemId` | Bearer + owner | partial note or activity replacement |
| `DELETE` | `/trips/:id/items/:itemId` | Bearer + owner | removes one timeline item; `204` |

Create-item input is `{ placeId? , stayId?, dayNumber, timeSlot, orderIndex?, note? }`. Exactly one of `placeId` or `stayId` is required. Valid slots are `morning`, `lunch`, `afternoon`, and `dinner`.

### Atomic timeline reorder

`PATCH /api/v1/trips/12/items/reorder`

```json
{
  "items": [
    { "itemId": 101, "dayNumber": 1, "timeSlot": "morning", "orderIndex": 0 },
    { "itemId": 102, "dayNumber": 1, "timeSlot": "lunch", "orderIndex": 0 },
    { "itemId": 103, "dayNumber": 1, "timeSlot": "afternoon", "orderIndex": 0 }
  ]
}
```

```json
{
  "success": true,
  "data": {
    "tripId": 12,
    "centroidLocation": { "lat": 11.9438, "lng": 108.4419 },
    "updatedItems": [{ "id": 103, "dayNumber": 1, "timeSlot": "afternoon",
      "orderIndex": 0, "distanceFromPrevKm": 11.8, "isDetourWarning": true,
      "weatherAlertFlag": true, "rainProbability": 75 }]
  }
}
```

The transaction updates order, recalculates affected-day distances and weather mapping, then recalculates the centroid. A detour flag is true when the preceding same-day stop is over 8 km away.

## Weather feature

| Method | Path | Auth | Query / purpose |
|---|---|---|---|
| `GET` | `/weather/forecast` | Public | `city` plus `date`, or `lat` and `lng`; returns hourly and four-slot forecast |
| `POST` | `/trips/:id/weather-sync` | Bearer + owner | synchronizes forecast to all trip items and detects conflicts |

Forecast results contain `city`, `date`, `hourly`, and `slots`. Each slot has `timeSlot`, `temperatureC`, `rainProbability`, `weatherCode`, and `conditionTag`. Weather uses Redis first (30-minute TTL), then Open-Meteo, then `weather_snapshots`; a total miss returns `WTHR_001`.

Weather sync sets `weatherAlertFlag` only when the scheduled item is a place with `isOutdoor=true` and its `rainProbability` is at least `60`.

## AI Copilot feature

| Method | Path | Auth | Request / purpose |
|---|---|---|---|
| `GET` | `/trips/:id/items/:itemId/plan-b-candidates` | Bearer + owner | 2–3 grounded indoor candidates within 3 km |
| `POST` | `/trips/:id/items/:itemId/swap-plan-b` | Bearer + owner | `{ replacementPlaceId, note? }`; atomically swaps a conflicted place |
| `POST` | `/ai/generate-itinerary` | Bearer | `{ tripId, prompt }`; generates a grounded itinerary proposal |

### Plan B example

`POST /api/v1/trips/12/items/103/swap-plan-b`

```json
{ "replacementPlaceId": 88, "note": "Swapped due to 75% afternoon rain forecast" }
```

```json
{
  "success": true,
  "data": {
    "updatedItem": { "id": 103, "placeId": 88, "isOutdoor": false,
      "timeSlot": "afternoon", "distanceFromPrevKm": 1.2,
      "isDetourWarning": false, "weatherAlertFlag": false, "rainProbability": 75 },
    "newCentroidLocation": { "lat": 11.9412, "lng": 108.451 }
  },
  "message": "Plan B indoor swap completed"
}
```

Candidates and generated itineraries may use LLM reasoning, but every returned place must be a real `places.id` selected by internal PostGIS tools. The swap validates that the replacement is active, indoor, rain-suitable, and within 3 km; it writes `plan_b_swaps`, recalculates the route and centroid, and clears the conflict in one transaction.

## NestJS implementation boundary

- Controllers use `@ApiTags`, `@ApiOperation`, and `@ApiResponse` so Swagger mirrors this contract.
- DTOs validate inputs with `class-validator`: use `@IsLatitude()`, `@IsLongitude()`, `@Min(1)`, and `@Max(5)` for radar constraints.
- Use `@Query()` for filters and pagination, `@Param(..., ParseIntPipe)` for IDs, `@Body()` for JSON, and `@CurrentUser()` for protected routes.
- Apply `@Throttle()` to `/auth/*` and `/ai/*`. A global validation pipe and response/error envelope are mandatory.
