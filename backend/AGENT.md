# SkyRoute Backend — Agent Context (`backend/AGENT.md`)

> Applies to work in `backend/`. Read [../AGENT.md](../AGENT.md) first, then use this file with [BE-PROJECT-RULES.md](BE-PROJECT-RULES.md), [BE-ARCHITECTURE.md](BE-ARCHITECTURE.md), and the shared contracts.

## Stack and source of truth

- NestJS v11, TypeScript strict mode, Node.js 20 LTS, TypeORM, PostgreSQL 16/PostGIS 3.4, Redis 7, Open-Meteo, scheduled jobs, and Gemini/OpenAI function calling.
- [../share/DATABASE.md](../share/DATABASE.md) defines persistence, PostGIS indexes, and cache keys.
- [../share/API_SPEC.md](../share/API_SPEC.md) defines public HTTP behavior, error codes, envelopes, and retry semantics.
- This folder's rules and architecture documents define module boundaries and implementation behavior; do not substitute a controller-local convention.

## Feature ownership

| Feature | Owns | Public collaboration |
|---|---|---|
| `auth` | users, refresh sessions, JWT lifecycle | `AuthService` |
| `discovery` | places, radar, weather-aware food | `DiscoveryService` |
| `trips` | trips, itinerary items, reordering | `TripsService`, `TimelineService`, `trip.items.changed` |
| `weather` | cache, snapshots, poller, conflicts | `WeatherService`; consumes trip events |
| `stays` | stays and centroid-nearest lookup | `StaysService`; consumes trip events |
| `ai-copilot` | tool orchestration, ranking, Plan B audits | `AiCopilotService`; emits trip events after swaps |

Import feature modules and inject exported services only. Never import another feature's repository, entity, DTO, or private helper. Replace circular dependencies with events rather than `forwardRef()`.

## Guardrails

1. Convert API coordinates `{ lat, lng }` only through `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`. Reversing this order is a correctness bug.
2. All spatial SQL (`ST_DWithin`, `ST_DistanceSphere`, `ST_Centroid`, KNN `<->`) belongs in parameterized repository methods. Geography radar queries rely on the functional GIST geography index.
3. Controllers bind DTOs and HTTP responses; services orchestrate; repositories persist. No spatial/business logic in controllers.
4. Protect trip mutations with JWT and ownership guards. Validate DTOs globally with whitelist, forbid-unknown, and transform enabled.
5. Return only the standard success/error envelopes and documented `AUTH_*`, `DISC_*`, `TRIP_*`, `WTHR_*`, `STAY_*`, `AI_*`, or `SYS_*` codes.
6. Timeline reorder and Plan B swap run as one database transaction. Plan B writes its audit row, recalculates route/centroid, then emits an event only after commit.
7. Weather source order is Redis (30-minute TTL), Open-Meteo, then `weather_snapshots`. A conflict requires outdoor activity and rain probability at least 60.
8. The LLM can rank/explain only place IDs returned by internal tools. Validate provider output as untrusted input; never return invented places or addresses.
9. Passwords use bcrypt, refresh tokens use SHA-256 hashes, and secrets/tokens must never enter logs.

## Implementation checklist

- Put code in `src/features/<feature>/` with its module, controller, services, repositories, DTOs, entities, tests, and public exports.
- Use `ConfigService`; validate all configuration at bootstrap. Do not hardcode thresholds, provider keys, or connection values.
- Use `@ApiTags`, `@ApiOperation`, and `@ApiResponse` so Swagger at `/api/docs` matches `API_SPEC.md`.
- Apply `@Throttle()` to authentication and AI routes. POST actions are not retry-safe until an atomic idempotency design is implemented.
- Write unit tests for domain behavior and integration tests for PostGIS repositories/transactions. Mock Redis and external providers in unit tests.
- For a schema or endpoint change, update migration, `DATABASE.md`, and `API_SPEC.md` together.

## Skill routing

| Backend task | Read first |
|---|---|
| Endpoint/DTO/module contract | `api-and-interface-design` |
| NestJS, TypeORM, or PostGIS API uncertainty | `source-driven-development` |
| Feature implementation | `incremental-implementation`, `test-driven-development` |
| Spatial, transaction, AI, or auth decision | `doubt-driven-development` |
| Security/auth hardening | `security-and-hardening` |
| Performance/cache/query timing | `performance-optimization`, `observability-and-instrumentation` |
| Runtime failure or migration diagnosis | `debugging-and-error-recovery` |
| Pre-merge review | `code-review-and-quality` |
