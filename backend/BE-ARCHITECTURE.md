Write ARCHITECTURE.md for Backend (Feature-based) based on:
- Project context above
- DATABASE.md: 8 tables + Redis cache grouped into 6 features (`auth`, `discovery`, `stays`, `trips`, `weather`, `ai-copilot`)
- PROJECT-RULES.md: NestJS v11, TypeORM + PostGIS, Redis, `@nestjs/schedule`, LLM Function Calling, feature-based organization

## Requirements

### 1. System Overview
- High-level architecture diagram (mermaid)
- Modular Monolith with feature-based NestJS modules
- Feature-based organization rationale:
  - Each feature = 1 self-contained NestJS module (`controller + service + repository + entities + dto`)
  - Fast in-process communication for PostGIS spatial calculations, weather conflict checks, and AI tool calls
  - Easy to extract high-load modules (e.g., `weather` poller or `ai-copilot`) into microservices later if needed

System components:
- Client (Next.js 15 App Router) → NestJS v11 REST API (`/api/v1`)
- PostgreSQL 16 + PostGIS 3.4 (Spatial engine: `ST_DWithin`, `ST_Centroid`, `ST_DistanceSphere`, KNN `<->`)
- Redis 7 Cache (Weather forecast TTL = 30m, session & rate limit)
- External Integrations:
  - Open-Meteo API (Hourly weather & precipitation probability)
  - Gemini / OpenAI API (Function Calling / Tool Use grounded 100% in PostGIS data)

### 2. Folder Structure
```
src/
├── main.ts                         # Bootstrap application, global pipes/filters/swagger
├── app.module.ts                   # Root module, imports core & all feature modules
├── config/
│   ├── database.config.ts          # TypeORM + PostGIS configuration
│   ├── redis.config.ts             # Redis cache settings (TTL 30m)
│   ├── jwt.config.ts               # JWT access & refresh settings
│   ├── weather.config.ts           # Open-Meteo base URL & cron thresholds
│   └── ai.config.ts                # Gemini/OpenAI API keys & model settings
├── shared/
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── roles.decorator.ts
│   │   └── public.decorator.ts
│   ├── filters/
│   │   └── all-exceptions.filter.ts
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── trip-owner.guard.ts
│   ├── interceptors/
│   │   ├── transform.interceptor.ts
│   │   └── logging.interceptor.ts
│   ├── pipes/
│   │   └── validation.pipe.ts
│   ├── utils/
│   │   ├── geo.util.ts             # toWktPoint(lng, lat), distance formatters
│   │   ├── time-slot.util.ts       # Maps hours to morning/lunch/afternoon/dinner
│   │   └── hash.util.ts            # bcrypt & SHA-256 token hashing
│   └── types/
│       ├── response.type.ts
│       ├── coordinates.type.ts
│       └── pagination.type.ts
├── core/
│   ├── database/
│   │   └── database.module.ts      # TypeORM + PostGIS connection pool
│   ├── cache/
│   │   └── redis.module.ts         # ioredis global client & cache wrapper
│   ├── logger/
│   │   └── logger.module.ts        # Structured logger setup
│   └── integrations/
│       ├── open-meteo.client.ts    # HTTP adapter for Open-Meteo API
│       └── llm-tool.client.ts      # Gemini/OpenAI Function Calling adapter
└── features/
    ├── auth/                       # users, refresh_tokens, JWT
    ├── discovery/                  # places, Proximity Radar (ST_DWithin), food discovery
    ├── stays/                      # stays, Trip Centroid calculation, KNN stay finder
    ├── trips/                      # trips, itinerary_items, 4-slot Drag & Drop timeline
    ├── weather/                    # weather_snapshots, Cron poller, conflict flagger
    └── ai-copilot/                 # plan_b_swaps, AI Tool Calling, 1-click Plan B swap
```

### 3. Feature Anatomy
```
features/discovery/
├── discovery.module.ts
├── discovery.controller.ts
├── services/
│   ├── discovery.service.ts        # Multi-layer filter & Proximity Radar logic
│   └── food-discovery.service.ts   # Weather-aware food matching (hotpot/BBQ vs AC/chilled)
├── repositories/
│   └── place.repository.ts         # PostGIS ST_DWithin & ST_DistanceSphere queries
├── dto/
│   ├── radar-query.dto.ts
│   ├── filter-places.dto.ts
│   └── place-response.dto.ts
├── entities/
│   └── place.entity.ts
├── tests/
│   ├── discovery.controller.spec.ts
│   └── discovery.service.spec.ts
└── CONTEXT.md

features/trips/
├── trips.module.ts
├── trips.controller.ts
├── services/
│   ├── trips.service.ts            # Trip CRUD & centroid trigger
│   └── timeline.service.ts         # 4-slot Drag & Drop reorder & detour distance calculation
├── repositories/
│   ├── trip.repository.ts          # ST_Centroid(ST_Collect(location)) updates
│   └── itinerary-item.repository.ts
├── dto/
│   ├── create-trip.dto.ts
│   ├── add-itinerary-item.dto.ts
│   └── reorder-itinerary.dto.ts
├── entities/
│   ├── trip.entity.ts
│   └── itinerary-item.entity.ts
├── types/
│   └── time-slot.type.ts           # 'morning' | 'lunch' | 'afternoon' | 'dinner'
├── tests/
└── CONTEXT.md

features/ai-copilot/
├── ai-copilot.module.ts
├── ai-copilot.controller.ts
├── services/
│   ├── ai-copilot.service.ts       # LLM Function Calling orchestrator
│   ├── contextual-ranking.service.ts # Score = w1*Pref + w2*Weather + w3*Dist + w4*Rating
│   └── plan-b.service.ts           # Finds indoor candidates (<3km) & executes 1-click swap
├── repositories/
│   └── plan-b-swap.repository.ts
├── dto/
│   ├── swap-plan-b.dto.ts
│   └── generate-itinerary.dto.ts
├── entities/
│   └── plan-b-swap.entity.ts
├── tools/
│   └── travel-tools.definition.ts  # Tool schemas: get_places_by_radius, get_weather_forecast
├── tests/
└── CONTEXT.md
```

### 4. Request Flow
```
Request → Middleware → Guard → Controller → Service → Repository → PostgreSQL (PostGIS) / Redis
                                    ↓
                              Response ← TransformInterceptor
```
Layer responsibilities:
- Middleware: request correlation ID, CORS, cookie/body parsing
- Guard: `JwtAuthGuard` (token verification), `TripOwnerGuard` (verifies `trip.user_id === currentUser.id`)
- Controller: routing, DTO validation, invokes service, returns data
- Service: domain orchestration, contextual ranking math, AI tool execution, transaction management
- Repository: encapsulated TypeORM & PostGIS spatial queries (`ST_DWithin`, `<->`, `ST_Centroid`), zero business logic

Example flow 1 — One-Click Plan B Indoor Swap (`POST /trips/:id/items/:itemId/swap-plan-b`):
1. `JwtAuthGuard` and `TripOwnerGuard` validate user ownership of the trip
2. `AiCopilotController` validates `SwapPlanBDto` (`replacementPlaceId`)
3. `PlanBService`:
   - Verifies conflicted `ItineraryItem` and fetches replacement indoor `Place` (`is_outdoor = false`) via `DiscoveryService`
   - Starts DB transaction (`QueryRunner`):
     - Updates `itinerary_items.place_id = replacementPlaceId` and resets `weather_alert_flag = false`
     - Recalculates `distance_from_prev_km` and `is_detour_warning` for the affected day
     - Inserts audit record into `plan_b_swaps`
     - Recalculates `trips.centroid_location` via `ST_Centroid(ST_Collect(location))`
4. Emits `trip.itinerary.updated` event and returns updated slot item + new `centroidLocation`

Example flow 2 — Hourly Weather Cron Sync (`WeatherPollerService`):
1. `@Cron(CronExpression.EVERY_30_MINUTES)` triggers `syncActiveTripsWeather()`
2. Checks Redis key `weather:hourly:{city}:{date}`; if expired/missing, fetches from Open-Meteo API and caches for 30m
3. Aggregates hourly forecasts into the 4 daily slots (`morning`, `lunch`, `afternoon`, `dinner`)
4. Flags `weather_alert_flag = true` on any `itinerary_items` where `place.is_outdoor = true` AND `rain_probability >= 60%`

### 5. Cross-feature Communication

Allowed methods:
- Module imports (NestJS DI):
  - `StaysModule` imports `TripsModule` (or receives centroid coords) to query nearest accommodations via PostGIS KNN `<->`
  - `AiCopilotModule` imports `DiscoveryModule`, `WeatherModule`, and `TripsModule` to execute grounded LLM tool calls and Plan B swaps
- Shared utilities in `src/shared/` (`geo.util.ts`, `time-slot.util.ts`)
- Event-based (async via `@nestjs/event-emitter`):
  - `TripItemsChangedEvent` (`trip.items.changed`) → triggers `StaysService` to invalidate cached centroid stays and `WeatherService` to evaluate slot rain conflicts

Forbidden:
- Direct internal import: `import { PlaceRepository } from '../discovery/repositories/place.repository'` ❌
- Must use: Module exports (`exports: [DiscoveryService]`) + DI injection ✅

Feature dependencies:
- `auth`: standalone (no feature dependencies)
- `discovery`: depends on `weather` (for live temperature/rain in context-aware food recommendations)
- `weather`: standalone (uses `core/integrations/open-meteo.client.ts` + Redis)
- `trips`: depends on `discovery` (places), `stays` (stays), emits events to `weather`
- `stays`: depends on `trips` (reads `centroid_location` to find nearest stays)
- `ai-copilot`: depends on `discovery`, `weather`, `trips` (orchestrates Tool Calling & Plan B swaps)

### 6. Shared vs Core

| Shared (`src/shared/`) | Core (`src/core/`) |
|------------------------|--------------------|
| `@CurrentUser()`, `@Roles()`, `@Public()` decorators | TypeORM + PostGIS database connection pool |
| `JwtAuthGuard`, `RolesGuard`, `TripOwnerGuard` | Redis cache module (`ioredis`) |
| `AllExceptionsFilter`, `TransformInterceptor` | Open-Meteo HTTP client adapter |
| `geo.util.ts` (`toWktPoint`, `ST_MakePoint(lng, lat)` helper) | Gemini / OpenAI Function Calling SDK client |
| `time-slot.util.ts` (4-slot hour boundary mapping) | Structured Logger configuration |
| Response, Coordinates & Pagination types | Environment config validation (`@nestjs/config`) |

### 7. Configuration Management

Environment variables (`.env`):
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `WEATHER_CACHE_TTL=1800`
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRES_IN=15m`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRES_IN=7d`
- `OPEN_METEO_BASE_URL=https://api.open-meteo.com/v1`
- `GEMINI_API_KEY` (or `OPENAI_API_KEY`), `AI_MODEL_NAME`
- `PORT`, `NODE_ENV`

Config structure:
- `config/database.config.ts` → `TypeOrmModuleOptions` (with PostGIS support)
- `config/redis.config.ts` → Redis connection options
- `config/weather.config.ts` → Rain threshold (`60%`), detour threshold (`8km`), Plan B radius (`3000m`)
- Accessed exclusively via `@nestjs/config` `ConfigService`

Secrets handling:
- Never commit `.env` to git
- Keep `.env.example` updated with dummy placeholders
- Validate all required env variables on bootstrap using `Joi` / `zod` schema

## Format
- Mermaid diagrams for system overview, Plan B swap flow, and Centroid calculation flow
- Folder structure with inline comments
- Max 150-200 lines

## NestJS & PostGIS-Specific Additions
- Global modules: `ConfigModule`, `TypeOrmModule`, `RedisModule`, `ScheduleModule.forRoot()`, `EventEmitterModule.forRoot()`
- Avoid `forwardRef()` circular dependencies by using `EventEmitter2` for cross-feature side effects (`trips` → `weather` / `stays`)
- Register `ValidationPipe`, `AllExceptionsFilter`, and `TransformInterceptor` globally in `main.ts`
- Use `QueryRunner` / `DataSource.transaction()` for atomic multi-table updates (Timeline Drag & Drop reorder and Plan B indoor swap)
- Enforce strict LLM Tool Calling schema so AI responses only reference real `place_id` records queried from PostGIS
