# SkyRoute Backend Project Rules

## Stack and non-negotiable boundaries

- Node.js 20 LTS, TypeScript strict mode, NestJS v11, TypeORM, PostgreSQL 16/PostGIS 3.4, Redis 7 (`ioredis`), and `@nestjs/schedule`.
- The backend is a feature-based modular monolith. Organize by business capability, never by horizontal layer.
- Controllers own HTTP concerns; services own orchestration; repositories own persistence and all PostGIS SQL.
- A feature may export its public service, but another feature must never import its repository, entity, DTO, or internal helper.

```text
src/
├── config/                         # Typed, validated configuration namespaces
├── core/
│   ├── cache/                      # Redis client and cache abstraction
│   ├── database/                   # TypeORM datasource and migrations
│   ├── integrations/               # OpenMeteoClient and LlmFunctionCallingClient
│   └── logger/                     # Structured logging setup
├── shared/
│   ├── decorators/                 # @CurrentUser, @Public, @Roles
│   ├── filters/                    # AllExceptionsFilter
│   ├── guards/                     # JwtAuthGuard, RolesGuard, TripOwnerGuard
│   ├── interceptors/               # TransformInterceptor, LoggingInterceptor
│   ├── pipes/                      # Validation and coordinate parsing
│   ├── types/                      # API envelope and pagination types
│   └── utils/                      # Stateless geo and time-slot helpers
└── features/
    ├── auth/ discovery/ stays/ trips/ weather/ ai-copilot/
    └── <feature>/{dto,entities,repositories,services,tests}/
```

Each feature has its own `<feature>.module.ts`, controller, public service, DTOs, entities, repositories, tests, and `CONTEXT.md` when its decisions need local explanation.

## Feature ownership

| Feature | Owns | May depend on |
|---|---|---|
| `auth` | users, refresh sessions, JWT | shared/core only |
| `discovery` | places, radar, food context | weather's exported data contract |
| `stays` | stays and centroid-nearest search | trips' exported centroid contract |
| `trips` | trips, itinerary items, timeline distance | discovery/stays public services |
| `weather` | forecasts, cache, cron, conflict flags | trips public events/contracts |
| `ai-copilot` | tool orchestration and Plan B audit | discovery, weather, and trips public services |

Use exported services for synchronous collaboration. Use `EventEmitter2` for side effects, for example `trip.items.changed` triggers cache invalidation and weather conflict re-evaluation. Do not use `forwardRef()` to hide a circular dependency.

## Naming and structure

- Folders and files: `kebab-case`: `ai-copilot`, `swap-plan-b.dto.ts`, `place.repository.ts`.
- Classes, DTOs, entities, and types: `PascalCase`: `PlanBService`, `ReorderItineraryDto`, `Trip`.
- Functions, variables, and response properties: `camelCase`: `findPlacesInRadar`, `rainProbability`.
- Database names remain `snake_case`; map them to camelCase at the TypeORM/API boundary.
- Constants are `UPPER_SNAKE_CASE`: `RAIN_CONFLICT_THRESHOLD_PCT`, `DETOUR_WARNING_KM`, `PLAN_B_RADIUS_METERS`.
- Prefer explicit type names such as `Coordinates` and `TimeSlot`; do not add an `I` prefix unless it disambiguates a public interface.

## HTTP contract rules

- Implement `/api/v1` exactly as documented in [API_SPEC.md](../../share/API_SPEC.md). A controller must not invent a second response shape.
- Success responses pass through `TransformInterceptor`: `{ success: true, data, message?, meta? }`.
- `AllExceptionsFilter` maps all errors to `{ success: false, error: { code, message, details? } }`. Use documented domain codes such as `DISC_003`, `WTHR_002`, and `AI_001`.
- Validate only at external boundaries with DTOs and global `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })`.
- Use `@Query()` for filters, `@Param('id', ParseIntPipe)` for identifiers, `@Body()` for JSON, and `@CurrentUser()` for identity.
- Use `@Public()` sparingly. Apply `JwtAuthGuard`, `RolesGuard`, and `TripOwnerGuard` to every route requiring them; ownership is not optional because an ID was validated.
- Document every controller endpoint with `@ApiTags`, `@ApiOperation`, and `@ApiResponse`; Swagger must mirror the API specification.
- Apply `@Throttle()` to `/auth/*` and `/ai/*`. Do not silently treat a state-changing POST as retry-safe; idempotency requires an atomic persistence contract first.

## Persistence and PostGIS

- TypeORM entities use `@Entity`; point columns use `@Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })`.
- Always convert `{ lat, lng }` through one helper to `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)`. `ST_MakePoint(lat, lng)` is a correctness bug.
- Put `ST_DWithin`, `ST_DistanceSphere`, `ST_Centroid`, and KNN `<->` only in repositories with bound parameters. Controllers and services do not contain raw spatial SQL.
- Radar with `location::geography` requires the functional GIST index on `(location::geography)` documented in `DATABASE.md`; do not claim that a geometry-only index covers this cast.
- Recalculate `trips.centroid_location` from place points only. Do not include stay timeline items in the trip centroid.
- All migrations are reversible, named `[timestamp]_[description].ts`, and never rely on `synchronize: true` outside local test environments.

## Domain invariants

| Rule | Required implementation |
|---|---|
| Timeline activity | Exactly one of `placeId` or `stayId`; enforce in DTO and database constraint |
| Weather conflict | `isOutdoor === true && rainProbability >= 60` |
| Detour | Consecutive same-day distance is over 8 km |
| Plan B | Active, indoor, rainy-suitable place within 3 km of the preceding stop |
| AI grounding | LLM may explain/rank results but can return only IDs queried through internal PostGIS tools |
| Weather resilience | Redis (30m) → Open-Meteo → `weather_snapshots` fallback |

Use one `DataSource.transaction()` or `QueryRunner` for timeline reorder and Plan B swap. A Plan B transaction replaces the place, writes `plan_b_swaps`, recalculates route distances and the centroid, then emits the post-commit domain event.

## Configuration, security, and logging

- Read configuration only through `ConfigService`; validate required environment variables at bootstrap.
- Keep secrets in `.env`, never in source or logs: database password, Redis password, JWT secrets, and AI-provider key.
- Hash passwords with bcrypt and refresh tokens with SHA-256. Refresh cookies are `httpOnly`, `Secure`, and `SameSite=Lax` in production.
- Validate Open-Meteo and LLM responses as untrusted external input before using them.
- Log in services and integration clients, not controllers. Include feature, action, safe identifiers, duration, and outcome; never log token values, passwords, or complete prompts containing sensitive data.

```ts
// Good: repository owns the parameterized spatial query.
return this.dataSource.query(sql, [lng, lat, radiusMeters]);

// Bad: controller contains spatial SQL or receives unvalidated coordinates.
return this.dataSource.query(`SELECT * FROM places WHERE ... ${req.query.lat}`);
```

## Testing and delivery

- Place unit tests under `features/<feature>/tests/` or co-locate `*.spec.ts`; use `*.e2e-spec.ts` for end-to-end tests.
- Follow Arrange–Act–Assert. Mock Redis, Open-Meteo, and LLM clients in unit tests; use a real PostGIS test database for repository integration tests.
- Minimum coverage targets: services 80%, controllers 70%, repositories 60%. Prioritize tests for coordinate ordering, ownership, weather threshold, detour threshold, transactions, and AI grounding.
- Before a PR: run lint, type-check, unit/integration tests, and relevant migration up/down tests. Schema changes require a reversible migration and matching updates to `DATABASE.md` and `API_SPEC.md`.
- Branches use `feature/<feature>-<summary>` or `fix/<feature>-<summary>`; commits use Conventional Commit style, e.g. `feat(discovery): add proximity radar query`.

## Do / do not

| Do | Do not |
|---|---|
| Inject `DiscoveryService` through its exported module API | Import `discovery/repositories/place.repository` from `ai-copilot` |
| Cache and fall back before failing weather requests | Call Open-Meteo for every request |
| Use a transaction for multi-table timeline mutations | Update itinerary, audit, and centroid independently |
| Return real `placeId` records after tool calls | Let the model invent a venue or address |
| Use configuration for thresholds | Hardcode `60`, `8`, or `3000` inside controllers |
