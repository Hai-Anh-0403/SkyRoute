# SkyRoute Backend — Agent Context (`backend/AGENT.md`)

> **Scope:** Applies to all work inside `backend/`. Always read root [AGENT.md](../AGENT.md) first for full project context.

---

## 1. Backend Identity & Stack

- **Framework:** NestJS v11 (TypeScript 5.x, Node.js 20 LTS) — **Feature-based Modular Monolith**
- **Database & Spatial Engine:** PostgreSQL 16 + PostGIS 3.4 (`GEOMETRY(Point, 4326)`, `GIST` & `GIN` indexes)
- **ORM:** TypeORM (using parameterized `QueryBuilder` for PostGIS spatial SQL)
- **Cache & Scheduling:** Redis 7 (`ioredis`, weather TTL = `1800s` / 30m) + `@nestjs/schedule` (`@Cron`)
- **External APIs:** Open-Meteo API (hourly forecast), Gemini / OpenAI API (Function Calling / Tool Use)

### Reference Specs
- Schema & Spatial SQL: [../share/DATABASE.md](../share/DATABASE.md)
- API Contracts & Error Codes: [../share/API_SPEC.md](../share/API_SPEC.md)
- Architecture & Rules: [BE-ARCHITECTURE.md](BE-ARCHITECTURE.md), [BE-PROJECT-RULES.md](BE-PROJECT-RULES.md)

---

## 2. Feature Modules & Boundaries

All domain logic lives in `src/features/<feature-name>/`:
- `auth`: `users`, `refresh_tokens` (SHA-256 hashed), JWT access/refresh, `JwtAuthGuard`, `RolesGuard`, `TripOwnerGuard`.
- `discovery`: `places`, multi-layer filters, Proximity Radar (`ST_DWithin` $1\text{km}-5\text{km}$), weather-aware food recommendations.
- `stays`: `stays`, geometric Trip Centroid lookup via PostGIS KNN `<->`.
- `trips`: `trips`, `itinerary_items` (4 slots: `morning`, `lunch`, `afternoon`, `dinner`), Drag & Drop batch reorder, route detour detection ($> 8\text{km}$).
- `weather`: `weather_snapshots`, Redis 30m cache, `@Cron(EVERY_30_MINUTES)` Open-Meteo poller, conflict flagger (`is_outdoor && rain >= 60%`).
- `ai-copilot`: `plan_b_swaps`, LLM Tool Calling (`get_places_by_radius`, `get_weather_forecast`), hybrid contextual ranking, 1-click Plan B indoor swap ($< 3\text{km}$).

### Module Communication Rules
- **Allowed:** Import exported `[Feature]Module` and inject its `[Feature]Service`; emit async domain events via `@nestjs/event-emitter` (`trip.items.changed`).
- **Forbidden:** Direct imports of another feature's `repositories/`, `entities/`, or `dto/`; circular module dependencies (`forwardRef` avoided via events).

---

## 3. Critical Backend Guardrails

1. **PostGIS `(lng, lat)` Order:** NEVER write `ST_MakePoint(lat, lng)`. ALWAYS pass **longitude first, latitude second**: `ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)`.
2. **Encapsulated Spatial SQL:** All `ST_DWithin`, `ST_DistanceSphere`, `ST_Centroid`, and `<->` queries MUST stay inside `repositories/*.repository.ts`—never in Controllers or Services.
3. **Atomic Transactions:** Wrap multi-step writes (`PATCH /trips/:id/items/reorder` and `POST /trips/:id/items/:itemId/swap-plan-b`) in `DataSource.transaction()` / `QueryRunner` so slot updates, detour distances, `plan_b_swaps` audit logs, and `trips.centroid_location` stay consistent.
4. **AI Grounding:** The LLM may ONLY rank and recommend `place_id` / `stay_id` records returned by internal PostGIS tool calls.
5. **Standard Envelope & Errors:** Wrap responses via `TransformInterceptor` (`{ success, data, meta }`) and throw domain exceptions with feature codes (`DISC_002`, `WTHR_002`, `STAY_002`, `AI_001`) handled by `AllExceptionsFilter`.

---

## 4. Backend Skill Activation Guide

Read the corresponding `SKILL.md` in `../agent-skills/skills/` before executing:

| Backend Task | Skill to Load | Focus for SkyRoute |
|---|---|---|
| **Design Endpoints / DTOs** | `api-and-interface-design` | DTO `class-validator` rules, Swagger `@ApiTags`, error codes |
| **PostGIS / TypeORM / NestJS APIs** | `source-driven-development` | Verify exact TypeORM `QueryBuilder` & PostGIS syntax |
| **Implement Feature Slice** | `incremental-implementation`, `test-driven-development` | Unit test Services ($\ge 80\%$: ranking, centroid, detour, weather conflict) with mocked DB/Redis/LLM |
| **Spatial / Transaction / AI Logic** | `doubt-driven-development` | Verify `(lng, lat)` order, `QueryRunner` rollbacks, AI tool schemas |
| **Security & Auth** | `security-and-hardening` | JWT rotation, `TripOwnerGuard`, SQL injection prevention in spatial queries, rate limiting |
| **Performance & Caching** | `performance-optimization`, `observability-and-instrumentation` | `GIST` index usage (`< 10ms` radar target), Redis TTL hit rate, structured query timing logs |
| **Bug Triage** | `debugging-and-error-recovery` | Open-Meteo timeouts (`weather_snapshots` fallback), migration rollbacks |
| **Pre-Merge Check** | `code-review-and-quality` | Check feature isolation, zero business logic in controllers |
