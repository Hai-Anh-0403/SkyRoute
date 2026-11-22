# SkyRoute — Root Agent Context (`AGENT.md`)

> Read this file at the start of every session. It defines the project invariants and points to the authoritative contracts for SkyRoute.

## Product and architecture

SkyRoute is a context-aware, weather-adaptive travel planner. It replaces static itineraries with four connected capabilities:

1. **Discovery radar:** search places and weather-aware food within a 1–5 km radius.
2. **Four-slot timeline:** plan and reorder `morning`, `lunch`, `afternoon`, and `dinner`; warn when consecutive same-day stops exceed 8 km.
3. **Weather Plan B:** flag an outdoor item at rain probability ≥60% and swap it to a grounded indoor candidate within 3 km.
4. **Centroid stays:** calculate the center of selected places and recommend nearby accommodation.

The system is a feature-based modular monolith:

- **Backend:** NestJS v11, TypeScript, TypeORM, PostgreSQL 16/PostGIS 3.4, Redis 7, Open-Meteo, and Gemini/OpenAI function calling.
- **Frontend:** Next.js 15 App Router, React 19, Tailwind, shadcn/ui, TanStack Query v5, Zustand, React Leaflet, and `@dnd-kit`.
- **Organization:** business features first; shared stateless code in `shared/`, infrastructure/integrations in backend `core/`, and no direct imports of another feature's internals.

## Source-of-truth documents

| Scope | Document | Use it for |
|---|---|---|
| Product domain | [share/Readme.md](share/Readme.md) | original scope, MVP, and roadmap |
| Database | [share/DATABASE.md](share/DATABASE.md) | tables, constraints, indexes, Redis keys, spatial rules |
| API | [share/API_SPEC.md](share/API_SPEC.md) | `/api/v1` contract, payloads, error codes, retry policy |
| Backend | [backend/AGENT.md](backend/AGENT.md), [PROJECT-RULES.md](backend/docs/PROJECT-RULES.md), [ARCHITECTURE.md](backend/docs/ARCHITECTURE.md) | NestJS boundaries, modules, and runtime design |
| Frontend | [frontend/AGENT.md](frontend/AGENT.md), [PROJECT-RULES.md](frontend/docs/PROJECT-RULES.md), [ARCHITECTURE.md](frontend/docs/ARCHITECTURE.md) | Next.js boundaries, features, and UI/data flow |
| Delivery | [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md) | phased tasks and acceptance checks |

When documents conflict, the latest contract documents (`DATABASE.md` and `API_SPEC.md`) govern data/API behavior. Update affected documents together when changing a contract.

## Non-negotiable invariants

1. **Feature isolation:** Backend features are `auth`, `discovery`, `stays`, `trips`, `weather`, and `ai-copilot`; frontend features are `auth`, `discovery`, `itinerary-planner`, `weather-fallback`, `stay-finder`, and `ai-copilot`.
2. **Coordinates:** API JSON is `{ lat, lng }`; PostGIS is always `ST_MakePoint(lng, lat)` in WGS84/SRID 4326.
3. **Spatial persistence:** PostGIS SQL is parameterized and lives in repositories. Radar geography casts require the functional GIST geography index.
4. **AI grounding:** LLMs may explain/rank internal tool results only; they never invent a place, address, or `placeId`.
5. **Weather conflict:** only `isOutdoor === true && rainProbability >= 60` sets an alert.
6. **Atomic timeline mutations:** reorder and Plan B swap are transactions that keep route distance, detour state, audit record, and centroid consistent.
7. **Frontend shell:** `frontend/src/app/` remains thin; Leaflet is dynamically loaded with `ssr: false`; TanStack Query owns server data and Zustand owns transient shared UI state.
8. **API envelope:** success and error shapes must conform to `API_SPEC.md`; do not introduce endpoint-local formats.

## Skill routing

Before work, read the matching file in `agent-skills/skills/`:

| Work type | Required skill |
|---|---|
| Requirements or constraints | `interview-me`, `idea-refine`, `spec-driven-development`, `constraint-driven-development` |
| Planning | `planning-and-task-breakdown` |
| Database/API/interface contract | `api-and-interface-design` |
| Next.js/map/timeline UI | `frontend-ui-engineering` |
| Framework/API verification | `source-driven-development` |
| Production implementation | `incremental-implementation`, `test-driven-development` |
| Spatial/auth/transaction/AI decision | `doubt-driven-development` |
| Debugging/browser investigation | `debugging-and-error-recovery`, `browser-testing-with-devtools` |
| Security, performance, review | `security-and-hardening`, `performance-optimization`, `code-review-and-quality` |
| Documentation or release | `documentation-and-adrs`, `shipping-and-launch` |

## Working agreement

- Deliver vertical slices, not disconnected horizontal layers.
- Validate external data and configuration at system boundaries.
- Test business thresholds, ownership, spatial coordinate order, transaction rollbacks, and AI grounding.
- Before handoff, run the relevant lint, type-check, tests, and build; record any unverified integration explicitly.
