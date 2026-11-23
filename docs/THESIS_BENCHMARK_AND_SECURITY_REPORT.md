# SkyRoute — Thesis Benchmark, Architecture & Security Report

> **Project:** SkyRoute (Smart Travel Companion — Context-Aware & Weather-Adaptive Travel Planner)
> **Scope Covered:** Backend (NestJS v11 + TypeORM + PostgreSQL 16/PostGIS 3.4 + Redis 7), Frontend (Next.js 15 + React 19 + Leaflet + `@dnd-kit`), Observability, Security Hardening, CI/CD, and Production Containerization.

---

## 1. Spatial Performance Benchmarks (Live PostgreSQL 16 + PostGIS 3.4.3)

Measured via `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` (`npm --prefix backend run benchmark:spatial`) on seeded Da Lat PoC catalog (**125** active `places`, **40** active `stays`):

| Query | Spatial Operator & Filter | Index Used | Cold Session Init | Warm Pooled Execution | Planning Time (Warm) | `< 10 ms` SLA |
|---|---|---|---:|---:|---:|---|
| Proximity Radar (3 km) | `ST_DWithin(p.location::geography, anchor::geography, 3000)` + `ST_DistanceSphere` | `idx_places_location_geography` (`GIST`) | `6.027 ms` (`7.235 ms` plan) | **`0.281 ms`** (`psql`: `0.233 ms`) | `0.124 ms` | **PASS** |
| Centroid Stays KNN | `ORDER BY s.location <-> ST_SetSRID(ST_MakePoint(lng, lat), 4326)` | `idx_stays_location` (`GIST`) | `0.196 ms` (`0.116 ms` plan) | **`0.082 ms`** | `0.064 ms` | **PASS** |

- **Coordinate Invariant:** All REST contracts accept `{ lat, lng }`; repository spatial SQL strictly constructs points via `ST_SetSRID(ST_MakePoint(lng, lat), 4326)`.
- **Redis 7 Lifecycle Fix:** Fixed `RedisService` (`lazyConnect: true` + `enableOfflineQueue: false`) by connecting via `OnModuleInit` + single-flight `ensureConnected()`, verified end-to-end on live Redis 7:
  - `weather:hourly:da-lat:<yyyy-mm-dd>` cached with `1800s` TTL (`redis-cli TTL` measured `1772s`).
  - `trip:centroid:<tripId>` cached with `3600s` TTL and invalidated (`TTL = -2`) asynchronously on `trip.items.changed`.

---

## 2. Automated Verification Matrix

| Suite / Gate | Scope | Verified Result |
|---|---|---|
| Backend ESLint | `eslint "{src,test}/**/*.ts"` (non-interactive ESLint 9/10 flat config) | **Exit 0** (0 errors) |
| Backend Typecheck | `npx tsc --noEmit -p backend/tsconfig.json` | **Exit 0** |
| Backend Unit Tests | `jest` across Geo, Auth, RBAC, Discovery, Trips, Timeline, Weather, Stays, Plan B, AI Copilot, Logger, Health | **14 suites, 81 tests passed** |
| Backend E2E (In-Memory) | `test/skyroute.e2e-spec.ts` | **1 suite, 8 tests passed** |
| Backend E2E (Live PostGIS/Redis) | `E2E_USE_LIVE_DB=true` (`test/live-infra.e2e-spec.ts`) | **1 suite, 1 test passed** (`1353 ms`) |
| Backend Production Build | `nest build` | **Exit 0** |
| Frontend ESLint | `eslint src` (`@next/eslint-plugin-next` + `react-hooks` flat config) | **Exit 0** (0 errors) |
| Frontend Typecheck | `npx tsc --noEmit -p frontend/tsconfig.json` | **Exit 0** |
| Frontend Unit Tests | `vitest run` | **17 files, 28 tests passed** |
| Frontend Production Build | `next build` (`Next.js 15.5.29`, `output: 'standalone'`, zero SSR Leaflet failures) | **Exit 0** (7 routes) |
| Reversible Migrations | `EnablePostgisAndInitSchema1710000000000` & `AddUserRoleColumn1710000001000` (`up`/`down`/`up`) | **Verified clean** |
| Prod Docker Compose Smoke | Multi-stage `backend/Dockerfile` (`USER node`) + `frontend/Dockerfile` (`USER nextjs`) | Both `Up (healthy)`; `/api/v1/health/ready` HTTP `200` (`database: up 2ms`, `redis: up 1ms`); `/` HTTP `200` |
| Chrome DevTools Live Audit (Task 20) | Real-browser Playwright/Chrome DevTools pass (`320px`–`1440px`) | **Pending** Chrome Remote Debugging (`chrome://inspect/#remote-debugging`) on host |

---

## 3. Security Hardening & Dependency Audit Triage (`npm audit --omit=dev`)

### Defense-in-Depth Controls
- **Authentication & RBAC:** Multi-device JWT access tokens (`15m`), SHA-256 hashed rotating refresh cookies (`7d`, `httpOnly`, `SameSite=Lax`), `bcrypt` work factor `12` (`bcrypt@6.0.0`), global `JwtAuthGuard` + `RolesGuard` (`403 AUTH_004` on `/admin/*` for `'traveler'`), `TripOwnerGuard`.
- **Input & AI Safety:** Global `ValidationPipe` (`whitelist: true`, `forbidNonWhitelisted: true`, `transform: true`), Joi startup `envValidationSchema`, parameterized PostGIS SQL (`$1..$N`), and 100% PostGIS `placeId` grounding (`AiCopilotService`).
- **Transport & Logging Security:** Disabled `x-powered-by`; enforced `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, and production `Strict-Transport-Security`. Single-line JSON logs redact `password`, `token`, `secret`, `authorization`, `cookie`, `api_key`, and `prompt`.
- **Least-Privilege Runtime Containers:** Both production Dockerfiles drop privileges to non-root users (`node` on Backend, `nextjs:nodejs` UID 1001 on Frontend).

### Production Dependency Audit Triage (`--omit=dev`, no breaking `--force`)

| Package | Workspace | Severity | Action & Reachability Triage | Status |
|---|---|---|---|---|
| `tar` (`<=7.5.20`) via `@mapbox/node-pre-gyp` | `backend` | Critical / High | **Remediated:** Upgraded `bcrypt` `^5.1.1` → `^6.0.0` (`node-gyp-build` N-API), removing `@mapbox/node-pre-gyp` and `tar` completely | **Resolved (0 critical, 0 high)** |
| `glob` / `minimatch` via `typeorm@0.3.21` | `backend` | Moderate (3) | Retained (`typeorm@1.1.3` is a breaking major rewrite). Only invoked by TypeORM migration/CLI file loading, never by untrusted HTTP user input | **Accepted / Tracked** |
| `postcss` (`<=8.5.22`) via `next@15.3.0` | `frontend` | High (1) / Mod (1) | Retained (`next@16.4.6` is a breaking major upgrade). Build-time CSS compilation only; never parses untrusted runtime CSS on client/server | **Accepted / Build-only** |
| `zod` (`3.24.2`, `<4.6.6`) | `frontend` | High (1) | Retained (`zod@4.6.7` has breaking schema API changes with `@hookform/resolvers`). Client-side forms enforce bounded `maxLength` strings (`<= 600` chars) | **Accepted / Bounded** |
