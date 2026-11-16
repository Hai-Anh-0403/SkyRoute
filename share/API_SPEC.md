Write API_SPEC.md based on:
- Project context above
- DATABASE.md: 8 tables + Redis cache, 6 features (`auth`, `discovery`, `stays`, `trips`, `weather`, `ai-copilot`)
- BE ARCHITECTURE.md: NestJS v11, feature-based modules, JWT authentication, PostGIS spatial queries, Open-Meteo sync, LLM Function Calling

## Requirements

### 1. Overview
- Base URL: `/api/v1`
- API versioning: URL path (`/api/v1/`, `/api/v2/`)
- Content-Type: `application/json`
- Character encoding: `UTF-8`

### 2. Authentication
- Auth method: JWT Bearer Token
- Header format: `Authorization: Bearer <access_token>`
- Token flow:
  - Access token: short-lived (`15 minutes`)
  - Refresh token: long-lived (`7 days`), stored in `httpOnly` cookie and hashed (`token_hash`) in `refresh_tokens` table
  - Refresh endpoint to issue a new access token
- Protected routes: all `/trips/*`, `/ai/*`, and `/auth/me` endpoints; public routes include `/auth/login`, `/auth/register`, `/places/*`, `/stays/*`, and `/weather/forecast`
- Auth error responses:
  - `401 Unauthorized`: missing, invalid, or expired token
  - `403 Forbidden`: valid token but user does not own the requested trip or lacks admin role

### 3. Request Conventions

Pagination (query params):
- `page`: number (default: `1`)
- `limit`: number (default: `12`, max: `100`)
- Example: `GET /places?city=Da%20Lat&page=1&limit=12`

Sorting:
- `sort`: `distance | rating | price_level | contextual_score | created_at`
- `order`: `asc | desc`
- Example: `GET /places/radar?lat=11.9404&lng=108.4583&radius_km=3&sort=distance&order=asc`

Spatial & Context Filtering:
- Spatial anchor & radius: `?lat=11.9404&lng=108.4583&radius_km=3` (`radius_km` range: `1.0` to `5.0`)
- Multi-layer POI filters: `?city=Da%20Lat&category=restaurant&subcategory=hotpot,bbq`
- Environment & Weather filters: `?is_outdoor=false&has_ac=true&weather_tag=rainy`
- Price range: `?min_price=500000&max_price=2000000` (for stays)

Request body:
- JSON format
- `camelCase` for field names (automatically mapped to `snake_case` columns in TypeORM)
- Coordinates in JSON payloads always use `{ "lat": number, "lng": number }` (Backend maps to `ST_MakePoint(lng, lat)` in PostGIS)

### 4. Response Format
```json
// Success (single item)
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}

// Success (list with pagination & spatial metadata)
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 12,
    "total": 48,
    "totalPages": 4,
    "anchorPoint": { "lat": 11.9404, "lng": 108.4583 },
    "radiusKm": 3.0
  }
}

// Error
{
  "success": false,
  "error": {
    "code": "WTHR_002",
    "message": "Outdoor activity conflicts with high rain probability (75%)",
    "details": {
      "itineraryItemId": 104,
      "timeSlot": "afternoon",
      "rainProbability": 75
    }
  }
}
```

### 5. Error Codes

Code format: `[FEATURE]_[NUMBER]`
- `AUTH_001 - AUTH_099`: Authentication & session errors
- `DISC_001 - DISC_099`: Spatial Discovery & Proximity Radar errors
- `STAY_001 - STAY_099`: Centroid Stay Finder errors
- `TRIP_001 - TRIP_099`: Trip & Timeline Planner errors
- `WTHR_001 - WTHR_099`: Weather Sync & Conflict errors
- `AI_001 - AI_099`: AI Copilot & Plan B Fallback errors
- `SYS_001 - SYS_099`: System & Validation errors

Common error codes:
| Code | HTTP Status | Description |
|------|-------------|-------------|
| AUTH_001 | 401 | Invalid email or password |
| AUTH_002 | 401 | Access token expired |
| AUTH_003 | 401 | Invalid or revoked refresh token |
| AUTH_004 | 403 | Insufficient permissions (not trip owner / not admin) |
| AUTH_005 | 409 | Email already registered |
| DISC_001 | 404 | Place not found |
| DISC_002 | 400 | Invalid WGS84 coordinates (`lat` must be `-90..90`, `lng` `-180..180`) |
| DISC_003 | 400 | Radar radius out of bounds (must be between `1km` and `5km`) |
| STAY_001 | 404 | Stay accommodation not found |
| STAY_002 | 422 | Cannot calculate Trip Centroid: itinerary has no selected places yet |
| TRIP_001 | 404 | Trip not found |
| TRIP_002 | 400 | Invalid trip date range (`endDate` must be $\ge$ `startDate`) |
| TRIP_003 | 404 | Itinerary slot item not found |
| TRIP_004 | 400 | Invalid `dayNumber` or `timeSlot` (`morning`, `lunch`, `afternoon`, `dinner`) |
| WTHR_001 | 503 | Weather provider (Open-Meteo) unavailable and no cached snapshot found |
| WTHR_002 | 409 | Weather conflict detected (`is_outdoor = true` and `rain_probability >= 60%`) |
| AI_001 | 422 | No indoor Plan B candidates found within $3\text{km}$ radius |
| AI_002 | 504 | AI Function Calling timeout |
| SYS_001 | 500 | Internal server error |
| SYS_002 | 400 | DTO validation error |

HTTP status usage:
- `200`: Success (`GET`, `PATCH`, `POST` action)
- `201`: Created (`POST` resource creation)
- `204`: No content (`DELETE`)
- `400`: Bad request / DTO validation error
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not found
- `409`: Conflict (duplicate email or weather conflict state)
- `422`: Unprocessable Entity (business rule unmet, e.g., empty trip centroid)
- `500`: Internal server error

### 6. Endpoints by Feature

**Auth Feature (`auth`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/register` | Register a new user account | No |
| POST | `/auth/login` | Login and receive access token + refresh cookie | No |
| POST | `/auth/refresh` | Refresh access token using `httpOnly` cookie | No (uses refresh cookie) |
| POST | `/auth/logout` | Revoke current refresh token | Yes |
| POST | `/auth/logout-all` | Revoke all refresh tokens across devices | Yes |
| GET | `/auth/me` | Get current user profile & travel preferences | Yes |
| PATCH | `/auth/me` | Update user profile & travel preferences | Yes |

**Discovery & Spatial Radar Feature (`discovery`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/places` | List places with multi-layer filters (category, indoor/outdoor, weather) | No |
| GET | `/places/radar` | Proximity Radar scan (`ST_DWithin`) within $1\text{km}-5\text{km}$ of anchor point | No |
| GET | `/places/food-recommendations` | Context-aware food discovery based on live temp & rain (hotpot/BBQ vs AC/chilled) | No |
| GET | `/places/:id` | Get detailed place info & coordinates | No |
| --- Admin endpoints --- | | | |
| POST | `/admin/places` | Create a new POI/restaurant/cafe | Yes (Admin) |
| PATCH | `/admin/places/:id` | Update place attributes or coordinates | Yes (Admin) |
| DELETE | `/admin/places/:id` | Soft delete place (`is_active = false`) | Yes (Admin) |

**Centroid Stay Finder Feature (`stays`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/stays` | List accommodations (`hotel`, `homestay`, `resort`) by city & price | No |
| GET | `/stays/:id` | Get stay details, amenities, and coordinates | No |
| GET | `/trips/:tripId/centroid-stays` | Calculate trip geometric centroid $(\bar{x}, \bar{y})$ and return nearest stays via PostGIS KNN `<->` | Yes |

**Trips & Interactive Timeline Feature (`trips`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/trips` | List current user's trips | Yes |
| POST | `/trips` | Create a new trip (title, city, `startDate`, `endDate`) | Yes |
| GET | `/trips/:id` | Get full trip with 4-slot daily timeline, route distances, detour flags, weather badges, and `centroidLocation` | Yes |
| PATCH | `/trips/:id` | Update trip metadata or dates | Yes |
| DELETE | `/trips/:id` | Delete trip (cascades to `itinerary_items`) | Yes |
| POST | `/trips/:id/items` | Add a place or stay into a specific `(dayNumber, timeSlot)` | Yes |
| PATCH | `/trips/:id/items/reorder` | Drag & Drop batch update of `dayNumber`, `timeSlot`, and `orderIndex` | Yes |
| PATCH | `/trips/:id/items/:itemId` | Update slot item note or manually replace place | Yes |
| DELETE | `/trips/:id/items/:itemId` | Remove an item from the timeline | Yes |

**Weather Sync Feature (`weather`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/weather/forecast` | Get hourly & 4-slot aggregated weather forecast for city/coordinates (Redis cached 30m) | No |
| POST | `/trips/:id/weather-sync` | Sync latest weather onto all trip slots and flag conflicts (`is_outdoor = true` & `rain >= 60%`) | Yes |

**AI Copilot & Adaptive Plan B Feature (`ai-copilot`):**
| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/trips/:id/items/:itemId/plan-b-candidates` | Query AI + PostGIS for top 2–3 nearest indoor (`is_outdoor = false`) alternatives within $3\text{km}$ | Yes |
| POST | `/trips/:id/items/:itemId/swap-plan-b` | One-click swap replacing conflicted outdoor slot item with selected indoor place | Yes |
| POST | `/ai/generate-itinerary` | Generate a complete weather-adaptive itinerary using LLM Function Calling grounded 100% in PostGIS DB | Yes |

### 7. Endpoint Details (complex endpoints)

**GET /places/radar**
```
Query Params:
?lat=11.9404&lng=108.4583&radius_km=3&category=restaurant&is_outdoor=false&weather_tag=rainy&limit=10

Response (200):
{
  "success": true,
  "data": [
    {
      "id": 42,
      "name": "Lẩu Gà Lá É Tao Ngộ",
      "category": "restaurant",
      "subcategory": "hotpot",
      "isOutdoor": false,
      "hasAc": false,
      "suitableWeather": ["rainy", "cold", "cloudy"],
      "priceLevel": 2,
      "rating": 4.6,
      "address": "5 Đường 3/4, Phường 3, Đà Lạt",
      "location": { "lat": 11.9362, "lng": 108.4451 },
      "distanceKm": 1.52
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1,
    "anchorPoint": { "lat": 11.9404, "lng": 108.4583 },
    "radiusKm": 3.0
  }
}

Error cases:
- DISC_002: Invalid coordinates (400)
- DISC_003: Radius must be between 1.0 and 5.0 km (400)

Business logic:
- Execute PostGIS ST_DWithin using GIST index idx_places_location
- Compute exact distanceKm via ST_DistanceSphere
- Order by distanceKm ASC or hybrid contextual_score DESC
```

**PATCH /trips/:id/items/reorder**
```
Request:
{
  "items": [
    { "itemId": 101, "dayNumber": 1, "timeSlot": "morning", "orderIndex": 0 },
    { "itemId": 102, "dayNumber": 1, "timeSlot": "lunch", "orderIndex": 0 },
    { "itemId": 103, "dayNumber": 1, "timeSlot": "afternoon", "orderIndex": 0 }
  ]
}

Response (200):
{
  "success": true,
  "data": {
    "tripId": 12,
    "centroidLocation": { "lat": 11.9438, "lng": 108.4419 },
    "updatedItems": [
      {
        "id": 101,
        "dayNumber": 1,
        "timeSlot": "morning",
        "orderIndex": 0,
        "distanceFromPrevKm": 0,
        "isDetourWarning": false,
        "weatherAlertFlag": false
      },
      {
        "id": 102,
        "dayNumber": 1,
        "timeSlot": "lunch",
        "orderIndex": 0,
        "distanceFromPrevKm": 2.4,
        "isDetourWarning": false,
        "weatherAlertFlag": false
      },
      {
        "id": 103,
        "dayNumber": 1,
        "timeSlot": "afternoon",
        "orderIndex": 0,
        "distanceFromPrevKm": 11.8,
        "isDetourWarning": true,
        "weatherAlertFlag": true,
        "rainProbability": 75
      }
    ]
  },
  "message": "Timeline reordered successfully"
}

Error cases:
- TRIP_001: Trip not found (404)
- TRIP_004: Invalid timeSlot or dayNumber (400)

Business logic:
- Update day_number, time_slot, and order_index in a single DB transaction
- Recalculate consecutive point-to-point distances (ST_DistanceSphere) per day; set is_detour_warning = true if > 8.0 km
- Re-map slot weather forecast for items moved to a different time_slot or day_number
- Recalculate trips.centroid_location via ST_Centroid(ST_Collect(location))
```

**GET /trips/:id/items/:itemId/plan-b-candidates & POST /trips/:id/items/:itemId/swap-plan-b**
```
1. GET /trips/12/items/103/plan-b-candidates
Response (200):
{
  "success": true,
  "data": {
    "conflictedItem": {
      "id": 103,
      "placeName": "Đồi Chè Cầu Đất (Outdoor)",
      "dayNumber": 1,
      "timeSlot": "afternoon",
      "rainProbability": 75,
      "temperatureC": 16.5
    },
    "anchorLocation": { "lat": 11.9404, "lng": 108.4583 },
    "candidates": [
      {
        "placeId": 88,
        "name": "Bảo tàng Lâm Đồng",
        "category": "attraction",
        "subcategory": "museum",
        "isOutdoor": false,
        "distanceFromPrevKm": 1.2,
        "rating": 4.5,
        "contextualScore": 0.94,
        "aiReason": "Indoor cultural attraction 1.2km from your lunch spot, ideal for heavy afternoon rain (75%)."
      },
      {
        "placeId": 91,
        "name": "Biệt điện Trần Lệ Xuân (Khu trưng bày Mộc bản)",
        "category": "attraction",
        "subcategory": "museum",
        "isOutdoor": false,
        "distanceFromPrevKm": 2.1,
        "rating": 4.6,
        "contextualScore": 0.89,
        "aiReason": "Indoor UNESCO woodblock exhibition within 2.1km, sheltered from rain."
      }
    ]
  }
}

2. POST /trips/12/items/103/swap-plan-b
Request:
{
  "replacementPlaceId": 88,
  "note": "Swapped due to 75% afternoon rain forecast"
}

Response (200):
{
  "success": true,
  "data": {
    "updatedItem": {
      "id": 103,
      "placeId": 88,
      "placeName": "Bảo tàng Lâm Đồng",
      "isOutdoor": false,
      "dayNumber": 1,
      "timeSlot": "afternoon",
      "distanceFromPrevKm": 1.2,
      "isDetourWarning": false,
      "weatherAlertFlag": false,
      "rainProbability": 75
    },
    "newCentroidLocation": { "lat": 11.9412, "lng": 108.4510 }
  },
  "message": "Plan B indoor swap completed"
}

Error cases:
- TRIP_003: Itinerary item not found (404)
- AI_001: No indoor alternatives found within 3km radius (422)

Business logic:
- Replace place_id on itinerary_items with replacementPlaceId
- Clear weather_alert_flag = false (since replacement place has is_outdoor = false)
- Insert audit record into plan_b_swaps
- Recalculate distance_from_prev_km and trips.centroid_location inside a transaction
```

**GET /trips/:id/centroid-stays**
```
Response (200):
{
  "success": true,
  "data": {
    "tripId": 12,
    "centroidLocation": { "lat": 11.9412, "lng": 108.4510 },
    "totalItineraryPlaces": 8,
    "recommendedStays": [
      {
        "id": 15,
        "name": "The Kupid Dalat Homestay",
        "stayType": "homestay",
        "pricePerNight": 650000,
        "rating": 4.8,
        "address": "47 Đặng Thái Thân, Phường 3, Đà Lạt",
        "location": { "lat": 11.9395, "lng": 108.4528 },
        "distanceToCentroidKm": 0.27,
        "avgDistanceToItineraryPlacesKm": 1.85,
        "amenities": ["wifi", "parking", "mountain_view", "heater"]
      }
    ]
  }
}

Error cases:
- TRIP_001: Trip not found (404)
- STAY_002: Cannot calculate centroid when trip has 0 places (422)
```

## Format
- Group by feature
- Tables for endpoint list
- Code blocks for request/response examples

## NestJS-Specific Additions
- Use `@ApiTags`, `@ApiOperation`, `@ApiResponse` for Swagger documentation
- DTOs with `class-validator` decorators (`@IsLatitude()`, `@IsLongitude()`, `@Min(1)`, `@Max(5)`)
- Use `@Query()` for spatial radar, weather filter, and pagination params
- Use `@Param('id', ParseIntPipe)` for URL params
- Use `@Body()` for request body
- Custom `@CurrentUser()` decorator for authenticated user
- `@Roles('admin')` guard for POI/Stay seeding and management endpoints
- Apply `@Throttle()` rate limiting on `/auth/*` and `/ai/*` endpoints
