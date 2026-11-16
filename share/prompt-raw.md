# Prompts viết Docs - SkyRoute (Smart Travel Companion)

---

## Master Prompt

```markdown
You are a senior software architect and business analyst helping me create enterprise-grade technical documentation for a production-ready applied software engineering project.

## Project Info
- Project name: SkyRoute (Smart Travel Companion: Context-Aware & Weather-Adaptive Travel Recommendation Platform)
- Description: A one-stop context-aware travel planning platform that transforms static schedules into living, weather-adaptive itineraries by integrating spatial queries (PostGIS), real-time hourly weather forecasts (Open-Meteo), "Trip Centroid" accommodation matching, and AI Function Calling for one-click "Plan B" indoor fallbacks.
- Tech stack:
  - Frontend: Next.js 15 (App Router, TypeScript), Tailwind CSS, `shadcn/ui`, TanStack Query v5, Zustand, React Leaflet (loaded via `next/dynamic` with `ssr: false`), `@dnd-kit` (Drag & Drop Timeline)
  - Backend: Node.js (NestJS 10 with TypeScript), TypeORM (with PostGIS Spatial SQL), `@nestjs/schedule` (Cron Jobs), Gemini / OpenAI API (Function Calling / Tool Use)
  - Database: PostgreSQL 16 + PostGIS Extension (`GEOMETRY(Point, 4326)` + `GIST` index), Redis 7 (Weather forecast cache TTL = 30m, session & rate limiting)
- Team size: 3-4 developers
- Architecture: Modular Monolith (Clean Architecture principles)
- Code organization: Feature-based (NOT layer-based)

## Documentation Requirements
- Language: English
- Goal: Maintainable & scalable for team collaboration and AI-assisted development
- Style: Concise, bullet points, with concrete domain examples (Places, Stays, Trips, Weather Slots, Plan B Swaps)
- Audience: Developers (new team members + AI coding assistants)

## Architecture Principle
- Organize code by FEATURES (`discovery`, `trips`, `stays`, `weather`, `ai-copilot`, `auth`), not by technical layers
- Each feature is self-contained (owns its controller, service, repository, DTOs, entities, and tests)
- Shared code goes to separate `shared/` and `core/` folders
- Minimize cross-feature dependencies; communicate only via exported feature services or domain events

Keep this context for all following documentation requests.
```

---

## 1. DATABASE.md

```markdown
Write DATABASE.md based on the project context above.

## Core Features
- `auth` (User Management): `users`
- `discovery` (Spatial Discovery & Proximity Radar): `places` (attractions, restaurants, cafes with spatial coordinates, indoor/outdoor flags, and weather suitability tags)
- `stays` (Centroid Stay Finder): `stays` (hotels, homestays, resorts with spatial coordinates and JSONB amenities)
- `trips` (Interactive Timeline Planner): `trips` (trip metadata, date range, geometric `centroid_location`), `itinerary_items` (slot-based items: morning, lunch, afternoon, dinner, order index, weather alert flag)
- `weather` (Weather Poller & Alerting): `weather_logs` (optional historical/cached hourly weather snapshots per destination grid, complementing Redis TTL cache)
- `ai-copilot` (Adaptive Plan B & Contextual Ranking): `plan_b_swaps` (audit log of weather-triggered indoor replacement suggestions and user swaps)

## Requirements

### 1. Overview
- Database type & version: PostgreSQL 16 + PostGIS 3.4 Extension (`CREATE EXTENSION IF NOT EXISTS postgis;`), Redis 7.x for caching
- ORM / Query builder: TypeORM 0.3.x (using QueryBuilder with parameterized PostGIS spatial functions `ST_DWithin`, `ST_DistanceSphere`, `ST_SetSRID`, `ST_MakePoint`, `ST_Centroid`)
- Naming conventions:
  - Tables: `snake_case`, plural (e.g., `places`, `stays`, `trips`, `itinerary_items`)
  - Columns: `snake_case` (e.g., `is_outdoor`, `suitable_weather`, `centroid_location`, `weather_alert_flag`)
  - Primary keys: `id`
  - Foreign keys: `[singular_table_name]_id` (e.g., `trip_id`, `place_id`, `stay_id`)
  - Spatial Indexes: `idx_[table]_[column]` using `GIST` (e.g., `idx_places_location`, `idx_stays_location`)

### 2. Entities by Feature
Group entities by feature:
- Feature `discovery`: `places`
  - Key fields: `id`, `name`, `category` (`'attraction' | 'restaurant' | 'cafe'`), `subcategory` (`'hotpot' | 'bbq' | 'museum' | 'nature' | 'refreshment'`), `is_outdoor` (BOOLEAN), `suitable_weather` (`VARCHAR(50)[]` e.g., `ARRAY['sunny', 'cloudy', 'rainy']`), `has_ac` (BOOLEAN), `price_level` (INT 1..3), `rating` (DECIMAL(2,1)), `address` (TEXT), `location` (`GEOMETRY(Point, 4326)`), `created_at`
- Feature `stays`: `stays`
  - Key fields: `id`, `name`, `stay_type` (`'hotel' | 'homestay' | 'resort'`), `price_per_night` (DECIMAL(12,2)), `rating` (DECIMAL(2,1)), `address` (TEXT), `location` (`GEOMETRY(Point, 4326)`), `amenities` (JSONB), `created_at`
- Feature `trips`: `trips`, `itinerary_items`
  - `trips`: `id`, `user_id`, `title`, `destination_city`, `start_date` (DATE), `end_date` (DATE), `centroid_location` (`GEOMETRY(Point, 4326)`), `created_at`, `updated_at`
  - `itinerary_items`: `id`, `trip_id` (FK -> `trips.id` ON DELETE CASCADE), `place_id` (FK -> `places.id`), `stay_id` (FK -> `stays.id` NULLABLE), `day_number` (INT), `time_slot` (`'morning' | 'lunch' | 'afternoon' | 'dinner'`), `order_index` (INT), `distance_from_prev_km` (DECIMAL(5,2)), `weather_alert_flag` (BOOLEAN DEFAULT false), `rain_probability` (INT), `note` (TEXT)
- Feature `auth` (Shared/Core): `users`

For each entity:
- Table name
- Fields (name, PostgreSQL/PostGIS type, constraints, default values)
- Spatial & B-Tree Indexes

### 3. Relationships
- ERD diagram (Mermaid `erDiagram`)
- Relationship conventions (`1:N` between `trips` and `itinerary_items`; `N:1` from `itinerary_items` to `places` and `stays`)
- Cross-feature relationships (how `itinerary_items` references `places` and `stays` via IDs)

### 4. Conventions
- Primary key strategy: Auto-increment `SERIAL` / `GENERATED BY DEFAULT AS IDENTITY` (or UUIDv4 where external exposure is needed)
- Spatial coordinate standard: WGS84 (`SRID 4326`), stored as `GEOMETRY(Point, 4326)` where point creation uses `ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)`
- Soft delete strategy: `deleted_at TIMESTAMP NULL` on `trips` and `users`; hard cascade delete on `itinerary_items` when a trip is deleted
- Timestamps: `created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`, `updated_at TIMESTAMP WITH TIME ZONE`
- Enum/Status handling: VARCHAR with CHECK constraints or PostgreSQL native ENUMs for `category`, `stay_type`, and `time_slot`

### 5. Migration Rules
- Naming format: `[timestamp]-[Feature]-[Action].ts` (e.g., `1710000000000-InitPostgisAndCoreTables.ts`)
- Versioning strategy: Sequential TypeORM migrations committed to Git; never use `synchronize: true` outside local test DB
- Rollback policy: Every `up()` migration must have a deterministic `down()` reversal

## Format
- Use tables for schema
- Group by feature
- Max 150-200 lines

## [TECH-SPECIFIC ADDITIONS]
- **PostGIS Spatial Queries:** Document exact SQL/QueryBuilder patterns for:
  1. **Proximity Radar (`ST_DWithin`):** Querying `places` within $1\text{km} - 5\text{km}$ using `GIST` index (`ST_DWithin(p.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)`) with sub-10ms execution target.
  2. **Trip Centroid Calculation:** Computing $\bar{x} = \frac{1}{n}\sum x_i, \bar{y} = \frac{1}{n}\sum y_i$ via `ST_Centroid(ST_Collect(p.location))` across all `places` in a trip, updating `trips.centroid_location`, and finding top $K$ nearest `stays` ordered by `stays.location <-> trips.centroid_location` (KNN index-assisted distance operator).
  3. **Detour / Backtracking Warning:** Calculating point-to-point distance between consecutive `itinerary_items` in the same `day_number` using `ST_DistanceSphere(p1.location, p2.location) / 1000.0`.
- **Redis Caching Schema:**
  - `weather:hourly:{city_or_grid}:{yyyy-mm-dd}` -> JSON payload from Open-Meteo (TTL = 1800 seconds / 30 minutes).
```

---

## 2. BE: PROJECT-RULES.md

```markdown
Write PROJECT-RULES.md for Backend (Feature-based) based on the project context above.

## Tech Stack
- Language: TypeScript 5.x (Node.js 20 LTS)
- Framework: NestJS 10.x (Modular Monolith)
- ORM & Cache: TypeORM 0.3.x (PostgreSQL + PostGIS) + `ioredis` (Redis)

## Requirements

### 1. Feature Structure

src/features/[feature-name]/
├── [feature].module.ts
├── [feature].controller.ts
├── [feature].service.ts
├── [feature].repository.ts
├── dto/
│   ├── [action]-[feature].dto.ts
│   └── [feature]-response.dto.ts
├── entities/
│   └── [feature].entity.ts
├── types/
│   └── [feature].types.ts
├── utils/
│   └── [feature].util.ts
├── tests/
│   ├── [feature].service.spec.ts
│   └── [feature].controller.spec.ts
└── context.md

Features list: `discovery`, `trips`, `stays`, `weather`, `ai-copilot`, `auth`.

### 2. Naming Conventions
- Feature folders: `kebab-case` (e.g., `features/ai-copilot/`, `features/discovery/`)
- Files: `kebab-case` with role suffix (e.g., `centroid-stay.service.ts`, `swap-plan-b.dto.ts`)
- Classes / Functions: `PascalCase` for classes/DTOs/Entities (`DiscoveryService`, `PlaceEntity`), `camelCase` for methods/functions (`findIndoorAlternatives()`)
- Variables / Constants: `camelCase` for variables, `UPPER_SNAKE_CASE` for constants (`RAIN_ALERT_THRESHOLD_PERCENT = 60`, `WEATHER_CACHE_TTL_SEC = 1800`)
- Types / Interfaces: `PascalCase` without `I` prefix (`Coordinates`, `TimeSlot`, `ContextualScoreWeights`)

### 3. Feature Rules
- Feature must be self-contained inside `src/features/[feature-name]/`
- No direct imports of repositories, entities, or internal utilities between features
- Cross-feature communication via:
  - Exported NestJS Services (injected via module imports, e.g., `AiCopilotModule` imports `DiscoveryModule` and `WeatherModule`)
  - Domain Events (`@nestjs/event-emitter`, e.g., `trip.itinerary.updated` triggers centroid recalculation and weather conflict check)
  - Dependency Injection
- Shared code location: `src/shared/` (DTOs, decorators, geo helpers, pagination) and `src/core/` (PostGIS DB config, Redis client, Open-Meteo HTTP client, LLM client)

### 4. Code Patterns (MUST follow)
- Error handling pattern: Throw NestJS custom domain exceptions (`PlaceNotFoundException`, `WeatherSyncFailedException`) caught by a global `AllExceptionsFilter`
- Validation pattern: DTO classes with `class-validator` and `class-transformer` decorators enforced by global `ValidationPipe({ whitelist: true, transform: true })`
- Logging pattern: Structured JSON logging via NestJS `Logger` / Pino with correlation `requestId` and execution time for spatial queries
- Response format: Standardized envelope `{ success: boolean, data: T, meta?: PaginationOrSpatialMeta }` via global `TransformInterceptor`

### 5. Anti-patterns (MUST NOT do)
- Import directly from another feature's `repository.ts` or internal files
- Circular dependencies between feature modules (use `EventEmitter2` to decouple `trips` and `weather`)
- Business logic or PostGIS `ST_*` query strings inside Controllers
- Data queries outside `[feature].repository.ts`
- Allowing the AI LLM to generate unverified place names/addresses directly from pre-trained weights without calling internal PostGIS tools (`get_places_by_radius`, `find_indoor_alternatives`)
- Mixing up `(latitude, longitude)` order in PostGIS: `ST_MakePoint(lng, lat)` MUST always take **longitude first, latitude second**

### 6. Git Workflow
- Branch naming: `feat/[feature-name]-[short-desc]`, `fix/[feature-name]-[short-desc]`, `chore/[desc]` (e.g., `feat/discovery-proximity-radar`)
- Commit message: Conventional Commits (`feat(trips): calculate trip centroid on slot reorder`, `fix(weather): handle open-meteo timeout with redis fallback`)
- PR requirements: Passing unit/integration tests, zero ESLint/TypeScript errors, migration file included if entity changed

### 7. Testing
- Test file location: `src/features/[feature]/tests/` for unit tests, `test/` for E2E tests
- Test file naming: `*.spec.ts` (unit), `*.e2e-spec.ts` (E2E)
- Test structure: Arrange - Act - Assert (`given / when / then`)
- Coverage requirements: $\ge 80\%$ on domain services (`ContextualRanking`, `CentroidCalculation`, `WeatherConflictDetector`, `DetourCalculator`)

## Format
- Concrete examples for each rule (using SkyRoute domain: PostGIS radar, Plan B swap, Centroid stays)
- DO vs DON'T comparisons
- Max 100-150 lines

## [TECH-SPECIFIC ADDITIONS]
- **PostGIS Coordinate Guardrail:** Provide a shared helper `toWktPoint( { lat, lng }: Coordinates )` and custom Repository methods so developers never accidentally swap `lat` and `lng` in `ST_MakePoint(lng, lat)`.
- **AI Function Calling Guardrail:** Every AI suggestion returned to the client MUST reference an existing `place_id` or `stay_id` fetched via Tool Calling from PostgreSQL.
- **Weather Conflict Rule:** Centralize threshold constants (`RAIN_THRESHOLD = 60`, `DETOUR_WARNING_KM = 8.0`, `PLAN_B_RADIUS_M = 3000`).
```

---

## 3. BE: ARCHITECTURE.md

```markdown
Write ARCHITECTURE.md for Backend (Feature-based) based on:
- Project context above
- DATABASE.md
- BE PROJECT-RULES.md

## Requirements

### 1. System Overview
- High-level architecture diagram (Mermaid `flowchart TD` showing Frontend -> NestJS Controllers -> Feature Services (`Trips`, `Discovery`, `Stays`, `Weather`, `AiCopilot`) -> PostGIS / Redis / Open-Meteo / Gemini LLM)
- Feature-based Modular Monolith rationale (clear domain boundaries, fast in-process spatial & AI tool orchestration, easy future extraction)

### 2. Folder Structure

src/
├── config/                  # Typed env configuration (database, redis, open-meteo, ai)
├── shared/                  # Reusable cross-feature utilities & contracts
│   ├── decorators/
│   ├── filters/             # Global exception filter
│   ├── interceptors/        # Standard response envelope interceptor
│   ├── utils/               # Geo/Haversine helpers, date-slot mappers
│   └── types/               # Coordinates, TimeSlot, Pagination types
├── core/                    # Infrastructure & external adapters
│   ├── database/            # TypeORM + PostGIS setup & migrations
│   ├── cache/               # Redis module & cache service
│   ├── logger/              # Structured logger
│   └── integrations/        # OpenMeteoClient, LlmToolCallingClient
└── features/
    ├── auth/
    ├── discovery/           # Places, multi-layer filters, Proximity Radar (ST_DWithin)
    ├── stays/               # Centroid calculation & KNN nearest accommodation finder
    ├── trips/               # Trip CRUD, 4-slot Drag & Drop timeline, detour alerts
    ├── weather/             # Hourly cron sync, slot weather mapping, conflict flagger
    └── ai-copilot/          # Contextual ranking, Tool Calling handler, 1-click Plan B swap

### 3. Feature Anatomy

features/[feature]/
├── [feature].module.ts      # Declares controllers, providers, exports public service
├── [feature].controller.ts  # REST routes, Swagger tags, DTO validation
├── [feature].service.ts     # Domain logic (e.g., Plan B scoring, Centroid update)
├── [feature].repository.ts  # TypeORM + PostGIS spatial queries (ST_DWithin, <->)
├── dto/
├── entities/
├── types/
├── utils/
├── tests/
└── context.md               # AI & developer context summary for this feature

### 4. Request Flow

Request → Controller → Service → Repository → PostgreSQL (PostGIS) / Redis
                ↓
            Response

- Controller: HTTP routing, DTO validation, response formatting
- Service: Business orchestration, contextual scoring ($Score = w_1 \cdot \text{Pref} + w_2 \cdot \text{Weather} + w_3 \cdot \text{Dist} + w_4 \cdot \text{Rating}$), AI tool execution
- Repository: Encapsulated TypeORM & PostGIS spatial queries only

### 5. Cross-feature Communication
- Allowed methods:
  - Exported Feature Services via NestJS DI (e.g., `AiCopilotService` calls `DiscoveryService.findIndoorWithinRadius()` and `WeatherService.getSlotForecast()`)
  - Domain Events via `EventEmitter2` (e.g., `TripsService` emits `trip.slots.changed` -> `StaysService` recalculates `centroid_location` and `WeatherService` re-evaluates `weather_alert_flag`)
- Forbidden: Direct repository/entity imports across feature boundaries

### 6. Shared vs Core
| Shared (`src/shared/`) | Core (`src/core/`) |
|------------------------|--------------------|
| Pure geo utilities, slot time constants | PostgreSQL/PostGIS connection pool |
| Common DTOs (`CoordinatesDto`, `PaginationDto`) | Redis connection & TTL cache wrapper |
| Response interceptors & exception filters | Open-Meteo HTTP adapter & LLM SDK client |

### 7. Configuration Management
- Environment variables validated at startup via `@nestjs/config` + `Joi` / `zod` (`DATABASE_URL`, `REDIS_URL`, `OPEN_METEO_BASE_URL`, `GEMINI_API_KEY`)
- Typed config namespaces (`database.config.ts`, `weather.config.ts`, `ai.config.ts`)
- Secrets handling via `.env` (never committed) and `.env.example`

## Format
- Mermaid diagrams (System Architecture + Plan B Fallback Sequence Diagram + Centroid Stay Calculation Flow)
- Folder structure with comments
- Max 150-200 lines

## [TECH-SPECIFIC ADDITIONS]
- **Weather Poller Cron Job (`@Cron(CronExpression.EVERY_30_MINUTES)`):** Explain how `WeatherPollerService` fetches hourly forecasts from Open-Meteo for active trips, caches them in Redis (TTL 30m), maps them to the 4 daily slots (`morning`: 08:00-11:00, `lunch`: 11:00-13:00, `afternoon`: 13:00-17:00, `dinner`: 17:00-22:00), and sets `weather_alert_flag = true` when `is_outdoor == true` AND `precipitation_probability >= 60%`.
- **AI Adaptive Controller & Function Calling Flow:** Detail the exact sequence where user prompt or Plan B trigger invokes LLM tools (`get_places_by_radius`, `get_weather_forecast`, `get_weather_aware_food`) and ranks indoor alternatives within a $3\text{km}$ radius using the hybrid contextual formula.
```

---

## 4. API_SPEC.md

```markdown
Write API_SPEC.md based on:
- Project context above
- DATABASE.md
- BE ARCHITECTURE.md

## Requirements

### 1. Overview
- Base URL pattern: `/api/v1`
- API versioning strategy: URI Versioning (`/api/v1/...`)
- Content-Type: `application/json; charset=utf-8`

### 2. Authentication
- Auth method: JWT (Bearer Access Token + Refresh Token)
- Header format: `Authorization: Bearer <access_token>`
- Token flow: Access token (15m expiry), Refresh token (7d expiry in HttpOnly cookie or refresh endpoint)
- Auth error handling: `401 Unauthorized` (`AUTH_001` Invalid/Expired token), `403 Forbidden` (`AUTH_002` Not trip owner)

### 3. Request Conventions
- Query params:
  - Spatial Radar: `lat` (float), `lng` (float), `radius_km` (float, default `3`, range `1..5`)
  - Discovery Filters: `category` (`attraction|restaurant|cafe`), `subcategory` (`hotpot|bbq|museum|nature|refreshment`), `is_outdoor` (`true|false`), `weather_tag` (`sunny|cloudy|rainy`), `has_ac` (`true|false`)
  - Pagination & Sorting: `page`, `limit`, `sort_by` (`distance|rating|price_level|contextual_score`)
- Request body format: `camelCase` JSON properties validated by DTOs
- Coordinate format: `{ "lat": 11.9404, "lng": 108.4583 }` (Dalat example)

### 4. Response Format

Success:
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "anchorPoint": { "lat": 11.9404, "lng": 108.4583 },
    "radiusKm": 3.0
  }
}
```

Error:
```json
{
  "success": false,
  "error": {
    "code": "WEATHER_002",
    "message": "Outdoor activity conflicts with high rain probability (75%)",
    "details": [{ "itemId": 104, "timeSlot": "afternoon", "rainProbability": 75 }]
  }
}
```

### 5. Error Codes
- Code format by feature: `[FEATURE]_[NUMBER]`
  - `AUTH_001` .. `AUTH_003`: Authentication & permission errors
  - `DISCOVERY_001` .. `DISCOVERY_003`: Invalid coordinates, radius out of bounds ($1\text{km}-5\text{km}$), place not found
  - `TRIP_001` .. `TRIP_004`: Trip not found, invalid date range, invalid slot reorder, detour threshold exceeded warning
  - `WEATHER_001` .. `WEATHER_003`: Open-Meteo sync error, weather conflict detected
  - `STAY_001` .. `STAY_002`: Empty itinerary (cannot compute centroid), stay not found
  - `AI_001` .. `AI_003`: Tool call timeout, no indoor Plan B found within radius
- HTTP status usage: `200 OK`, `201 Created`, `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `422 Unprocessable Entity`, `500 Internal Server Error`

### 6. Endpoints by Feature
For each feature, provide a table `| Method | Path | Description | Auth |`:
- **Discovery & Spatial Radar (`/api/v1/places`):**
  - `GET /api/v1/places`: Filter places by category, subcategory, indoor/outdoor, weather suitability
  - `GET /api/v1/places/radar`: Proximity Radar scan (`ST_DWithin`) within $1\text{km}-5\text{km}$ from anchor point
  - `GET /api/v1/places/food-recommendations`: Context-aware food discovery based on real-time temperature & rain (e.g., hotpot/BBQ when cold/rainy; AC & chilled drinks when $>35^\circ\text{C}$)
  - `GET /api/v1/places/:id`: Place details
- **Trips & Interactive Timeline (`/api/v1/trips`):**
  - `POST /api/v1/trips`: Create a new trip (city, start_date, end_date)
  - `GET /api/v1/trips/:id`: Get full trip with 4-slot daily timeline, route distances, detour warnings, weather badges, and `centroid_location`
  - `POST /api/v1/trips/:id/items`: Add a place/stay to a specific `(day_number, time_slot)`
  - `PATCH /api/v1/trips/:id/items/reorder`: Batch update `day_number`, `time_slot`, and `order_index` after Drag & Drop (recalculates route distances, detour warnings, and trip centroid)
  - `DELETE /api/v1/trips/:id/items/:itemId`: Remove item from slot
- **Weather & Adaptive Plan B (`/api/v1/weather` & `/api/v1/trips/:id/plan-b`):**
  - `GET /api/v1/weather/forecast`: Get cached hourly & slot-mapped weather forecast for coordinates/date
  - `POST /api/v1/trips/:id/weather-sync`: Force refresh weather forecast for all slots in a trip and flag conflicts (`is_outdoor = true` & `rain_prob >= 60%`)
  - `GET /api/v1/trips/:id/items/:itemId/plan-b-candidates`: Trigger AI + PostGIS to fetch top 2–3 nearest indoor (`is_outdoor = false`) alternatives within $3\text{km}$ of the preceding slot's location
  - `POST /api/v1/trips/:id/items/:itemId/swap-plan-b`: One-click swap replacing the conflicted outdoor place with the chosen indoor place on the timeline
- **Centroid Stay Finder (`/api/v1/trips/:id/centroid-stays`):**
  - `GET /api/v1/trips/:id/centroid-stays`: Compute geometric centroid $(\bar{x}, \bar{y})$ of all selected itinerary places and return nearest stays (`hotel | homestay | resort`) ranked by distance to centroid, price, and rating
- **AI Copilot (`/api/v1/ai`):**
  - `POST /api/v1/ai/generate-itinerary`: Generate or refine a weather-adaptive itinerary using LLM Function Calling (100% grounded in PostGIS DB places)

### 7. Endpoint Details (complex endpoints)
Provide full JSON request/response examples and error cases for:
1. `GET /api/v1/places/radar` (Proximity Radar with spatial & weather filters)
2. `PATCH /api/v1/trips/:id/items/reorder` (Drag & Drop timeline update returning detour warnings & updated centroid)
3. `GET /api/v1/trips/:id/items/:itemId/plan-b-candidates` & `POST .../swap-plan-b` (One-click Plan B fallback)
4. `GET /api/v1/trips/:id/centroid-stays` (Centroid calculation & optimal accommodation list)

## Format
- Group by feature
- Tables for endpoint list
- Code blocks for JSON examples

## [TECH-SPECIFIC ADDITIONS]
- **Swagger / OpenAPI Integration:** Document `@ApiTags`, `@ApiOperation`, and custom spatial query DTO decorators.
- **Time Slot Mapping Specification:** Explicitly define the 4 slots (`morning`: `08:00-11:00`, `lunch`: `11:00-13:00`, `afternoon`: `13:00-17:00`, `dinner`: `17:00-22:00`) and how hourly Open-Meteo data is aggregated (max `precipitation_probability`, average `temperature_2m`) per slot.
```

---

## 5. FE: PROJECT-RULES.md

```markdown
Write PROJECT-RULES.md for Frontend (Feature-based Next.js App Router) based on the project context above.

## Tech Stack
- Framework: Next.js 15 (App Router, React 18/19, TypeScript 5.x)
- State management: TanStack Query v5 (Client Server-cache & Optimistic UI) + Zustand (Global UI & Map-Timeline sync state)
- Styling: Tailwind CSS + `shadcn/ui` (Radix Primitives) + Lucide Icons
- Map & Drag-and-Drop: `react-leaflet` (Leaflet.js + OpenStreetMap, dynamically imported with `ssr: false`) & `@dnd-kit/core` + `@dnd-kit/sortable`
- HTTP client: Axios / Fetch wrapper (with centralized auth & error interceptors)

## Requirements

### 1. Feature Structure

Keep `src/app/` strictly as a thin routing & layout shell. All business/UI logic lives inside `src/features/`:

src/features/[feature-name]/
├── components/       # Server Components by default; add 'use client' for interactive leaves
├── hooks/            # Client hooks ('use client')
├── services/         # API client functions
├── stores/           # Feature-scoped Zustand stores (if needed)
├── types/
├── utils/
├── index.ts          # Public barrel exports ONLY
└── context.md

Frontend features list:
- `discovery` (Interactive Map layers, category/indoor/food filters, Proximity Radar control)
- `itinerary-planner` (Multi-day 4-slot Drag & Drop timeline, detour distance badges)
- `weather-fallback` (Hourly weather badges on slots, Red Conflict Alert banner, 1-click Plan B Swap Drawer)
- `stay-finder` (Trip Centroid pin on map, nearest hotels/homestays comparison cards)
- `ai-copilot` (Context-aware prompt builder & grounded AI itinerary generator)

### 2. Naming Conventions
- App Router files: Next.js reserved conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- Feature folders: `kebab-case` (`features/itinerary-planner`, `features/weather-fallback`)
- Components: `PascalCase.tsx` (`TimelineSlotCard.tsx`, `PlanBSwapModal.tsx`, `ProximityRadarLayer.tsx`)
- Hooks: `camelCase` starting with `use` (`useRadarPlaces.ts`, `useReorderTimeline.ts`, `usePlanBCandidates.ts`)
- Services: `camelCase` with `.service.ts` (`discovery.service.ts`, `trip.service.ts`)
- Types: `PascalCase` in `*.types.ts` (`PlaceMarker`, `TimelineSlotItem`, `PlanBCandidate`)

### 3. Feature Rules
- Feature must be self-contained inside `src/features/[feature-name]/`
- `src/app/**/page.tsx` files must be thin (< 50 lines): only handle route params/searchParams, SEO `generateMetadata`, and compose exported Feature components
- Export only via `index.ts` barrel file
- No direct imports from another feature's internal sub-folders (`❌ import { ... } from '@/features/discovery/components/PlaceCard'`)
- Cross-feature communication via:
  - Shared workspace store (`useWorkspaceStore` in `shared/stores/` for selected place, active slot, radar anchor, and centroid pin)
  - Next.js URL search params (`useSearchParams`, `useRouter` for `?day=2&radius=3&mode=radar`)
- Shared components location: `src/shared/components/ui/`

### 4. Component Rules (Server vs Client Components)
- One component per file
- Push `'use client'` as far down the component tree as possible (leaf interactive components, `@dnd-kit` containers, Leaflet map wrappers, Zustand/TanStack Query consumers)
- NEVER import `leaflet` or `react-leaflet` in a Server Component; always wrap the map entry component with `next/dynamic(() => import(...), { ssr: false })`
- Strict TypeScript props interface required (no `any`)
- Max 200 lines per component (extract sub-components like `WeatherAlertBadge` or custom hooks if larger)

### 5. Code Patterns (MUST follow)
- API calls: Client mutations/queries via `services/*.service.ts` wrapped in TanStack Query custom hooks (`useQuery`, `useMutation`)
- State: Server data in TanStack Query; cross-panel Map <-> Timeline selection in Zustand; shareable filter/day state in Next.js URL `searchParams`
- Optimistic UI: Drag & Drop reordering (`@dnd-kit`) MUST use TanStack Query optimistic updates (`onMutate`) so cards snap immediately without flicker, rolling back only on API error
- Error handling: Next.js route `error.tsx` boundaries + panel-level Error Boundaries + Toast notifications (`sonner`)
- Loading states: Next.js `loading.tsx` / `<Suspense>` + Skeleton loaders for timeline slots and radar cards
- Form handling: `react-hook-form` + `zod` resolver

### 6. Anti-patterns (MUST NOT do)
- Put business logic, complex state, or 500-line JSX inside `src/app/**/page.tsx`
- Import `react-leaflet` without `next/dynamic(..., { ssr: false })` (causes `ReferenceError: window is not defined` during Next.js SSR)
- Import from another feature's internal files bypassing `index.ts`
- Call `axios` or `fetch` directly inside Client `.tsx` components
- Put heavy geo calculations or route sorting logic inside JSX render functions
- Uncontrolled re-rendering of the Leaflet `MapContainer` on every timeline hover (use memoized markers and isolated Zustand selectors)

### 7. Git Workflow
- Branch naming: `feat/fe-[feature]-[short-desc]`, `fix/fe-[feature]-[short-desc]`
- Commit message: Conventional Commits (`feat(itinerary-planner): add dnd-kit optimistic slot reorder`)
- PR scope: Single feature vertical slice or shared UI component

### 8. Testing
- Test file location: Co-located `*.test.tsx` or `features/[feature]/tests/`
- What to test: Drag-and-drop slot state transitions, Weather Alert badge rendering when `isOutdoor && rainProb >= 60`, Plan B 1-click swap mutation flow
- Coverage focus: Custom hooks, utility functions, and critical interactive workflows (Vitest + React Testing Library)

## Format
- Concrete examples from SkyRoute UI (Next.js `dynamic` Map import, Drag & Drop slots, Plan B drawer)
- DO vs DON'T comparisons
- Max 100-150 lines

## [TECH-SPECIFIC ADDITIONS]
- **Next.js SSR Guardrail for Leaflet:** Provide the exact `next/dynamic` wrapper pattern (`const DynamicMapCanvas = dynamic(() => import('./MapCanvas'), { ssr: false, loading: () => <MapSkeleton /> })`) to prevent SSR `window` crashes.
- **React Leaflet Best Practices:** Wrap map fly-to animations (`map.flyTo([lat, lng], zoom)`) inside custom child controller components (`<MapViewportController />`) subscribing to Zustand selectors, and wrap custom markers (`Attraction`, `Restaurant`, `Stay`, `CentroidPin`) in `React.memo`.
- **`@dnd-kit` Hydration & Multi-Container Setup:** Use a stable `id` on `<DndContext id="skyroute-timeline-dnd">` to avoid Next.js SSR/client hydration ID mismatch warnings; each daily slot (`morning`, `lunch`, `afternoon`, `dinner`) acts as a droppable container (`useDroppable`).
```

---

## 6. FE: ARCHITECTURE.md

```markdown
Write ARCHITECTURE.md for Frontend (Feature-based Next.js App Router) based on:
- Project context above
- API_SPEC.md
- FE PROJECT-RULES.md

## Requirements

### 1. Overview
- Feature-based Next.js App Router Split-Workspace Architecture (Thin App Router Shell + Self-contained Feature Modules)
- Tech stack justification (Next.js 15 App Router for SEO-friendly city guides & shareable trip OpenGraph previews, `next/dynamic` for client-only Leaflet rendering, TanStack Query v5 for instant cache invalidation on Plan B swaps & centroid updates, Zustand for 60fps Map-Timeline synchronization, `@dnd-kit` for accessible drag-and-drop)

### 2. Folder Structure

src/
├── app/                          # Next.js App Router (Thin routing & layout shell ONLY)
│   ├── layout.tsx                # Root layout, fonts, Providers
│   ├── providers.tsx             # Client Providers (QueryClientProvider, Theme, Toaster)
│   ├── (marketing)/              # Public SEO routes (Server Components)
│   │   ├── page.tsx              # Landing & Quick City Explorer
│   │   └── explore/[city]/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (workspace)/              # Authenticated interactive planner
│       └── trips/
│           ├── page.tsx          # User's trips list
│           └── [tripId]/
│               ├── page.tsx      # Split-Screen Adaptive Workspace shell
│               ├── loading.tsx   # Workspace skeleton
│               └── error.tsx     # Workspace error boundary
├── shared/
│   ├── components/
│   │   ├── ui/                   # Buttons, Drawers, Badges, Skeletons (shadcn/ui)
│   │   └── layout/               # SplitScreenLayout (Left: Timeline, Right: Dynamic Map)
│   ├── hooks/                    # useDebounce, useGeolocation
│   ├── services/
│   │   └── api-client.ts         # Base Axios/Fetch instance with auth & error interceptors
│   ├── stores/
│   │   └── workspace.store.ts    # Map <-> Timeline sync state (selectedPlaceId, activeSlot, radarAnchor)
│   ├── types/
│   └── utils/
├── features/                     # All domain & UI logic lives here
│   ├── discovery/                # Map markers, Radar circle overlay, Category/Weather filters
│   ├── itinerary-planner/        # Day tabs, 4-slot DnD timeline, route polylines & detour warnings
│   ├── weather-fallback/         # Slot weather pills, conflict detection UI, Plan B Swap Drawer
│   ├── stay-finder/              # Centroid marker, radius rings, optimal stay recommendation list
│   └── ai-copilot/               # AI travel assistant panel & smart filter presets
├── assets/
└── styles/

### 3. Feature Anatomy

features/[feature]/
├── components/
├── hooks/
├── services/
├── stores/
├── types/
├── utils/
├── index.ts
└── context.md

### 4. Data Flow

User Action (Drag Slot / Click Plan B Swap / Move Radar Pin)
   → Client Component (`TimelineBoard` / `PlanBDrawer` / `RadarControl`)
   → Custom Hook (`useSwapPlanBMutation` / `useRadarQuery`)
   → Feature Service (`trip.service.ts` / `discovery.service.ts`)
   → NestJS REST API (`/api/v1/...`)
   → TanStack Query Cache Invalidation (`['trip', tripId]`, `['centroid-stays', tripId]`)
   → Synchronized UI Update (Timeline Card updates + Map Marker & Route Polyline re-draw)

### 5. Cross-feature Communication
| Method | Use case |
|--------|----------|
| `useWorkspaceStore` (Zustand) | Hovering a Timeline card highlights its Map marker; clicking "Find Plan B" centers the Map on the conflicted slot and draws a $3\text{km}$ indoor search circle; toggling "Centroid Stays" pans Map to $(\bar{x}, \bar{y})$ |
| TanStack Query Cache Keys | Mutating timeline items in `itinerary-planner` automatically invalidates `['centroid-stays', tripId]` in `stay-finder` and `['trip-weather', tripId]` in `weather-fallback` |
| Next.js URL Search Params | Sharing or bookmarking active trip view (`/trips/12?day=2&mode=radar&radius=3`) |

### 6. Routing & Rendering Strategy (SSR vs CSR)
- **Public & Shareable Routes (`SSR / SSG`):** `/` and `/explore/[city]` and `/trips/[tripId]/share` use Next.js Server Components and `generateMetadata()` for fast initial paint and rich OpenGraph social previews.
- **Interactive Planner Workspace (`CSR Islands inside App Router`):** `/trips/[tripId]` renders the workspace shell and loads the Interactive Map (`next/dynamic` with `ssr: false`) and Drag-and-Drop Timeline (`'use client'`) on the client.

### 7. State Management Strategy
| State Type | Location | Example |
|------------|----------|---------|
| Server state | TanStack Query v5 | Places in radar, Trip timeline items, Hourly weather forecast, Centroid stays, Plan B candidates |
| Cross-feature Map/Timeline UI | `shared/stores/workspace.store.ts` (Zustand) | `hoveredPlaceId`, `activeDayNumber`, `activeSlot`, `radarAnchorCoords`, `radarRadiusKm`, `activePlanBItemId` |
| URL / Shareable UI state | Next.js `useSearchParams()` | Active `day`, `mode` (`timeline | radar | stays`), filter category |
| Auth state | `shared/stores/auth.store.ts` + Cookies | Current user profile, JWT tokens |
| Local component UI | React `useState` | Dropdown open, tooltip visibility, drag active state |

### 8. API Layer

shared/services/api-client.ts (Base HTTP client, JWT header, standard error unwrapping)
    ↓
features/[feature]/services/[feature].service.ts (Typed endpoint calls)
    ↓
features/[feature]/hooks/use[Action].ts (TanStack Query useQuery / useMutation + cache invalidation)
    ↓
features/[feature]/components/[Component].tsx ('use client' declarative UI rendering)

### 9. Shared vs Features vs App Router
| `src/app/` (Routing Shell) | `src/shared/` (Common) | `src/features/` (Domain Slices) |
|----------------------------|------------------------|---------------------------------|
| `page.tsx`, `layout.tsx`, route groups | Generic UI primitives (`Button`, `Badge`, `Drawer`) | Domain components (`TimelineSlot`, `PlanBCandidateCard`, `CentroidStayCard`) |
| `loading.tsx`, `error.tsx`, `generateMetadata` | Base API client & workspace Zustand store | Feature API services, query hooks & Leaflet layers |

## Format
- Mermaid diagrams (Next.js Server/Client Boundary + Split-Screen Map-Timeline Sync Sequence)
- Folder structure with comments
- Max 150-200 lines

## [TECH-SPECIFIC ADDITIONS]
- **Next.js Dynamic Import for Leaflet (`ssr: false`):** Explain why `react-leaflet` requires `window` and how `features/discovery/components/InteractiveMapSwitch.tsx` exports a `dynamic(() => import('./MapCanvas'), { ssr: false })` boundary.
- **Map & Timeline Real-Time Synchronization:** Document how the Leaflet map renders 4 distinct vector/marker layers:
  1. **Discovery / Radar Layer:** Circle overlay ($1\text{km}-5\text{km}$) + filtered POIs.
  2. **Daily Route Polyline Layer:** Connects consecutive places in the selected `day_number` (dashed red line if distance exceeds detour threshold).
  3. **Plan B Indoor Preview Layer:** Highlights the 2–3 candidate indoor replacements and their distance from the previous stop when a user clicks a red weather warning.
  4. **Centroid & Stay Layer:** Displays the geometric center star marker $(\bar{x}, \bar{y})$ of the trip and nearby hotels/homestays.
```

---

## Cách sử dụng

```
1. Copy từng khối prompt trong file này (bắt đầu từ Master Prompt, sau đó lần lượt từ mục 1 -> 6)
2. Gửi cho AI để sinh ra bộ 6 tài liệu chuẩn kiến trúc Feature-based cho dự án SkyRoute:
   - docs/DATABASE.md
   - docs/be/PROJECT-RULES.md
   - docs/be/ARCHITECTURE.md
   - docs/API_SPEC.md
   - docs/fe/PROJECT-RULES.md
   - docs/fe/ARCHITECTURE.md
3. Review & tinh chỉnh nếu muốn thay đổi công nghệ (ví dụ đổi NestJS sang Spring Boot 3 hoặc đổi React Leaflet sang Mapbox GL JS)
```
