Write PROJECT-RULES.md for Backend (Feature-based) based on the project context above.

## Tech Stack
- Language: TypeScript 5.x (Node.js 20 LTS)
- Framework: NestJS v11 (Modular Monolith)
- ORM & Cache: TypeORM (with PostGIS Spatial SQL) + `ioredis` (Redis 7)
- Database: PostgreSQL 16 + PostGIS 3.4 Extension
- External Integrations: Open-Meteo API, `@nestjs/schedule` (Cron Jobs), Gemini / OpenAI API (Function Calling)

## Requirements

### 1. Feature Structure
```
src/
├── features/
│   ├── auth/           # users, refresh_tokens, JWT, guards
│   ├── discovery/      # places, multi-layer filters, Proximity Radar (ST_DWithin), weather-aware food
│   ├── stays/          # stays, Trip Centroid calculation (ST_Centroid), KNN nearest accommodation
│   ├── trips/          # trips, itinerary_items, 4-slot Drag & Drop reorder, detour distance alerts
│   ├── weather/        # weather_snapshots, hourly Open-Meteo cron sync, rain conflict flagger
│   └── ai-copilot/     # plan_b_swaps, LLM Tool Calling, contextual ranking, 1-click Plan B swap
├── shared/
│   ├── decorators/     # @CurrentUser(), @Public(), @Roles()
│   ├── filters/        # Global AllExceptionsFilter (maps domain error codes AUTH_001, WTHR_002...)
│   ├── guards/         # JwtAuthGuard, RolesGuard, TripOwnerGuard
│   ├── interceptors/   # TransformInterceptor ({ success, data, meta })
│   ├── pipes/          # ValidationPipe, ParseCoordinatesPipe
│   └── utils/          # Geo helpers (toWktPoint, haversine), slot time mappers
├── core/
│   ├── database/       # TypeORM + PostGIS data source & migrations
│   ├── cache/          # Redis client wrapper & TTL helpers
│   └── integrations/   # OpenMeteoClient, LlmFunctionCallingClient
└── config/             # Typed configuration namespaces
```
Each feature folder:
```
features/[feature-name]/
├── [feature].module.ts
├── [feature].controller.ts
├── [feature].service.ts
├── repositories/
│   └── [entity].repository.ts
├── dto/
│   ├── create-[entity].dto.ts
│   └── update-[entity].dto.ts
├── entities/
│   └── [entity].entity.ts
├── types/
│   └── [feature].types.ts
├── tests/
│   ├── [feature].controller.spec.ts
│   └── [feature].service.spec.ts
└── CONTEXT.md
```

### 2. Naming Conventions
- Feature folders: `kebab-case` (`ai-copilot`, `discovery`, `stays`, `trips`, `weather`, `auth`)
- Files: `kebab-case` (`swap-plan-b.dto.ts`, `itinerary-item.entity.ts`, `place.repository.ts`)
- Classes: `PascalCase` (`DiscoveryService`, `ReorderItineraryDto`, `PlanBSwapRepository`)
- Functions/Methods: `camelCase` (`findPlacesInRadar`, `calculateTripCentroid`, `swapToIndoorPlanB`)
- Variables: `camelCase` (`tripId`, `rainProbability`, `centroidCoords`)
- Constants: `UPPER_SNAKE_CASE` (`RAIN_CONFLICT_THRESHOLD_PCT = 60`, `DETOUR_WARNING_KM = 8.0`, `PLAN_B_RADIUS_METERS = 3000`, `WEATHER_CACHE_TTL_SEC = 1800`)
- Interfaces/Types: `PascalCase` with prefix `I` or suffix `Type` (`IUserPayload`, `TimeSlotType`, `ICoordinates`)
- Entities: `PascalCase` singular (`User`, `Place`, `Stay`, `Trip`, `ItineraryItem`, `PlanBSwap`)

### 3. Feature Rules
- Feature must be self-contained with its own `@Module()`
- No direct imports of internal files (repositories, entities, private helpers) between features
- Cross-feature communication via:
  - Module exports/imports through NestJS DI (export only `[Feature]Service`)
  - NestJS `EventEmitter2` for async domain events (e.g., `trip.items.changed` triggers centroid update in `stays` and weather conflict re-check in `weather`)
  - Shared utilities in `src/shared/`
- Shared code location: `src/shared/` (stateless utilities/decorators) and `src/core/` (DB, Redis, External API clients)
- Feature dependencies declared explicitly in `[feature].module.ts` imports

Feature boundaries for this project:
- `auth`: handles `users`, `refresh_tokens`, multi-device JWT authentication
- `discovery`: handles `places`, PostGIS Proximity Radar (`ST_DWithin`), and context-aware food discovery
- `stays`: handles `stays` and calculates nearest accommodations to `trips.centroid_location` via PostGIS KNN `<->`
- `trips`: handles `trips`, `itinerary_items`, 4-slot Drag & Drop reordering (`morning`, `lunch`, `afternoon`, `dinner`), and consecutive route distance / detour checks
- `weather`: handles `weather_snapshots`, Redis 30m caching, Open-Meteo hourly cron polling, and flagging `weather_alert_flag = true` when `is_outdoor = true` & `rain_probability >= 60%`
- `ai-copilot`: handles `plan_b_swaps`, LLM Function Calling (`get_places_by_radius`, `get_weather_forecast`), hybrid contextual ranking, and 1-click Plan B indoor swaps

### 4. Code Patterns (MUST follow)

**Error handling:**
- Use NestJS built-in exceptions or custom domain exceptions extending `HttpException` with feature error codes (`DISC_003`, `WTHR_002`, `STAY_002`, `AI_001`)
- Global exception filter in `shared/filters/all-exceptions.filter.ts` formats errors into `{ success: false, error: { code, message, details } }`

**Validation:**
- Use `class-validator` decorators in DTOs (`@IsLatitude()`, `@IsLongitude()`, `@Min(1)`, `@Max(5)`)
- Global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`

**Logging:**
- Use NestJS built-in `Logger`
- Log at service and external integration levels, not controller
- Format: `[FeatureName] action - context (durationMs)` (especially for PostGIS spatial queries and LLM tool calls)

**Response format:**
- Success: `{ success: true, data, message?, meta? }`
- Error: `{ success: false, error: { code, message, details? } }`
- Pagination & Radar Meta: `{ success: true, data, meta: { page, limit, total, totalPages, anchorPoint?, radiusKm? } }`

**Repository & Spatial Query pattern:**
- Each entity has a dedicated repository inside `features/[feature]/repositories/`
- All PostGIS spatial queries (`ST_DWithin`, `ST_DistanceSphere`, `ST_Centroid`, `ST_MakePoint`, `<->`) MUST reside inside repositories using parameterized `QueryBuilder`
- Always pass coordinates to PostGIS in **`(longitude, latitude)`** order: `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)`

### 5. Anti-patterns (MUST NOT do)
- Import directly from another feature's internal files (`repositories/`, `entities/`, `dto/`)
- Circular dependencies between features (`trips` <-> `weather` <-> `stays`; use `EventEmitter2` events instead)
- Business logic or spatial math in controllers (controllers only handle HTTP routing & DTOs)
- Raw SQL or PostGIS `ST_*` queries inside services or controllers (must be encapsulated in repositories)
- Swapping `lat` and `lng` in PostGIS (`ST_MakePoint(lat, lng)` is WRONG; must be `ST_MakePoint(lng, lat)`)
- Allowing the AI LLM to return unverified place names or addresses from its pre-trained weights without calling internal PostGIS tools (`get_places_by_radius`)
- Calling Open-Meteo API directly on every user request without checking Redis cache (`TTL = 30m`) first
- Hardcoded configurations or thresholds (use `ConfigService` and shared domain constants)
- Storing plain text passwords or plain refresh tokens (hash with bcrypt / SHA-256)

### 6. Git Workflow
- Branch naming: `[type]/[feature]-[short-description]`
  - `feature/discovery-proximity-radar`
  - `feature/ai-copilot-plan-b-swap`
  - `fix/trips-centroid-recalculation`
- Commit message: `[type]([feature]): [description]`
  - `feat(discovery): add PostGIS ST_DWithin proximity radar query`
  - `feat(ai-copilot): implement 1-click indoor Plan B swap transaction`
  - `fix(weather): fallback to weather_snapshots table when Open-Meteo times out`
- PR requirements:
  - Linked to issue/task
  - Passes all unit and integration tests
  - Zero ESLint / TypeScript errors
  - Reversible TypeORM migration included if schema changed

### 7. Testing
- Test file location: `features/[feature]/tests/` or co-located `[name].spec.ts`
- Test file naming: `[name].spec.ts` (unit), `[name].e2e-spec.ts` (integration/E2E)
- Test structure: `describe` → `it` (Arrange - Act - Assert)
- Coverage requirements:
  - Services: `80%+` (especially `ContextualRanking`, `WeatherConflictDetector`, `CentroidCalculator`, `DetourDetector`)
  - Controllers: `70%+`
  - Repositories: `60%+`
- Mock external dependencies (Redis, Open-Meteo HTTP API, Gemini/OpenAI LLM API) in unit tests

## Format
- Concrete examples for each rule (using SkyRoute domain: PostGIS radar, Plan B swap, Centroid stays)
- DO vs DON'T comparisons
- Max 100-150 lines

## NestJS & PostGIS-Specific Additions
- Use `@Module`, `@Controller`, `@Injectable` decorators properly
- Guards for authentication (`JwtAuthGuard`), authorization (`RolesGuard`), and ownership (`TripOwnerGuard`)
- Global `TransformInterceptor` for standard `{ success, data, meta }` envelope
- Custom decorators: `@CurrentUser()`, `@Roles()`, `@Public()`
- TypeORM entities use `@Entity`, `@Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })`, `@Index({ spatial: true })`
- Scheduled background tasks use `@Cron(CronExpression.EVERY_30_MINUTES)` inside `WeatherPollerService`
- Database transactions via `DataSource.transaction()` or `QueryRunner` for multi-step operations:
  - Drag & Drop timeline batch reorder (`PATCH /trips/:id/items/reorder`) + route distance recalculation + `centroid_location` update
  - One-click Plan B swap (`POST /trips/:id/items/:itemId/swap-plan-b`) + `plan_b_swaps` audit log insertion
