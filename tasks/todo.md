# SkyRoute — Actionable Task Checklist (`tasks/todo.md`)

> Track progress task-by-task. Each task is sized for a single focused implementation session (1–5 files) following `incremental-implementation` and `test-driven-development`.

---

## Phase 1: Foundation & Spatial Infrastructure
- [ ] **Task 1:** Docker Infrastructure (`docker-compose.yml` for PostgreSQL 16 + PostGIS 3.4 & Redis 7, `.env.example`)
- [ ] **Task 2:** Backend Bootstrap (`backend/` NestJS v11 init, Config, PostGIS TypeORM, Redis, `TransformInterceptor`, `AllExceptionsFilter`, `geo.util.ts` with `(lng, lat)` unit tests)
- [ ] **Task 3:** Frontend Bootstrap (`frontend/` Next.js 15 App Router, Tailwind + `shadcn/ui`, TanStack Query v5 provider, Axios client, `ROUTES`, `workspace.store.ts` with unit tests)
- [ ] **Task 4:** PostGIS Schema Migration & Da Lat PoC Seeder (8 tables, `GIST` & `GIN` indexes, ~50 attractions/cafes, ~70 restaurants, ~40 stays in Da Lat)
- [ ] **Checkpoint 1 (Foundation):** Verify Docker containers, DB migration + seed, and clean BE/FE builds

---

## Phase 2: Auth & Spatial Discovery (Proximity Radar)
- [ ] **Task 5:** Auth Vertical Slice (BE multi-device JWT + hashed `refresh_tokens` + `JwtAuthGuard`; FE `LoginForm`, `RegisterForm`, `auth.store.ts`, auto-refresh interceptor)
- [ ] **Task 6:** Spatial Discovery & Proximity Radar Backend (`GET /places`, `GET /places/radar` via `ST_DWithin` $1\text{km}-5\text{km}$, `GET /places/food-recommendations`)
- [ ] **Task 7:** Interactive Leaflet Map & Radar UI (`InteractiveMap.tsx` with `next/dynamic` `ssr: false`, `MapViewportController`, $1\text{km}-5\text{km}$ Radar `<Circle>`, multi-layer filter chips)
- [ ] **Checkpoint 2 (Auth & Discovery):** Verify $<10\text{ms}$ PostGIS radar query and interactive map filtering without SSR errors

---

## Phase 3: Interactive 4-Slot Timeline Planner & Detour Alerts
- [ ] **Task 8:** Trips CRUD & Slot Item Management Backend (`POST /trips`, `GET /trips/:id`, `POST /trips/:id/items`, `DELETE /trips/:id/items/:itemId`, `TripOwnerGuard`)
- [ ] **Task 9:** Batch Timeline Reorder Transaction & Route Detour Calculator (`PATCH /trips/:id/items/reorder`, `ST_DistanceSphere` $>8\text{km}$ `is_detour_warning`, `ST_Centroid` update, `trip.items.changed` event)
- [ ] **Task 10:** Split-Screen Planner Workspace & `@dnd-kit` Optimistic Timeline UI (`TimelineBoard`, 4 daily slots, `onMutate` optimistic reorder, `DailyRoutePolyline` dashed detour line)
- [ ] **Checkpoint 3 (Timeline Planner):** Verify drag-and-drop across slots/days, map route polylines, and detour warnings

---

## Phase 4: Weather Synchronization & AI 1-Click "Plan B" Fallback
- [ ] **Task 11:** Open-Meteo Client, Redis 30m Cache & Hourly Cron Poller (`@Cron(EVERY_30_MINUTES)`, 4-slot weather aggregation, `weather_snapshots` DB fallback)
- [ ] **Task 12:** Automatic Weather Conflict Detector & Slot Weather UI (`POST /trips/:id/weather-sync`, flags `weather_alert_flag = true` when `is_outdoor && rain >= 60%`, `SlotWeatherBadge`, `WeatherConflictBanner`)
- [ ] **Task 13:** AI Copilot Function Calling & Plan B Indoor Candidates API (`GET /trips/:id/items/:itemId/plan-b-candidates`, PostGIS indoor filter $<3\text{km}$, hybrid contextual ranking, grounded AI reason)
- [ ] **Task 14:** 1-Click Plan B Swap Transaction & `PlanBSwapDrawer` UI (`POST /trips/:id/items/:itemId/swap-plan-b`, `plan_b_swaps` audit log, $3\text{km}$ map preview layer, 1-click swap button)
- [ ] **Checkpoint 4 (Weather & Plan B):** Verify end-to-end rain conflict detection and 1-click indoor replacement swap

---

## Phase 5: Centroid Stay Finder, AI Generator & Production Polish
- [ ] **Task 15:** Trip Centroid Stay Finder Backend (`GET /trips/:tripId/centroid-stays`, `ST_Centroid(ST_Collect(location))`, PostGIS KNN `<->` nearest stays, `STAY_002` empty-trip guard)
- [ ] **Task 16:** Centroid Map Pin & Stay Comparison Drawer UI (`CentroidMapPin` star marker at $(\bar{x}, \bar{y})$, `CentroidStayDrawer`, automatic cache invalidation on timeline edits)
- [ ] **Task 17:** Grounded AI Natural Language Itinerary Generator (`POST /ai/generate-itinerary` via LLM Tool Calling + `AiPromptModal` UI)
- [ ] **Task 18:** E2E Verification, PostGIS `<10ms` Benchmark, Security Audit & Swagger `/api/docs`
- [ ] **Checkpoint 5 (Final MVP Release):** All acceptance criteria verified and ready for demo
