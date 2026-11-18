# SkyRoute Frontend — Agent Context (`frontend/AGENT.md`)

> Applies to work inside `frontend/`. Read [../AGENT.md](../AGENT.md) first, then this file and the linked API/frontend specifications.

## Identity and source of truth

- Stack: Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, shadcn/ui, TanStack Query v5, Zustand, React Leaflet, `@dnd-kit`, Axios, React Hook Form, and Zod.
- This is a feature-based frontend. `src/app/` is a thin route/layout shell; domain code belongs in `src/features/`.
- API contract: [../share/API_SPEC.md](../share/API_SPEC.md). Data model: [../share/DATABASE.md](../share/DATABASE.md). Frontend guidance: [FE-PROJECT-RULES.md](FE-PROJECT-RULES.md) and [FE-ARCHITECTURE.md](FE-ARCHITECTURE.md).

## Feature map

| Feature | Owns |
|---|---|
| `auth` | login, registration, session UI, access-token lifecycle |
| `discovery` | client-only map, place layers, 1–5 km radar, discovery filters |
| `itinerary-planner` | trip UI, day selector, four-slot DnD timeline, route warnings |
| `weather-fallback` | slot forecast, rain conflict state, Plan B candidates and swap drawer |
| `stay-finder` | trip centroid pin and nearest-stay comparison |
| `ai-copilot` | grounded itinerary prompt and preview/apply flow |

Cross-feature imports use only `@/features/<feature>` public barrels. Coordinate cross-panel UI through `workspace.store`, cache freshness through TanStack Query invalidation, and shareable view state through URL search parameters.

## Non-negotiable rules

1. Never import `leaflet` or `react-leaflet` in a Server Component. Export the map through `next/dynamic(..., { ssr: false })` and keep `MapCanvas` client-only.
2. Keep server data exclusively in TanStack Query. Zustand holds only transient shared UI state: hover/selection, active day, radar anchor/radius, and active Plan B item.
3. API calls live in feature services; components call hooks, never Axios directly.
4. Drag/reorder mutations use optimistic `onMutate`, rollback in `onError`, then invalidate `['trip', tripId]` and `['centroid-stays', tripId]` after settlement.
5. `DndContext` uses deterministic `id="skyroute-timeline-dnd"`. Leaflet markers are memoized and granular store selectors must not remount `MapContainer` on hover.
6. API coordinates are `{ lat, lng }`; never exchange their positions. A weather conflict is only `isOutdoor && rainProbability >= 60`.
7. Page files are under 50 lines where practical: resolve route data/metadata and render exported feature components only.

## State placement

| State | Owner | Examples |
|---|---|---|
| Server state | TanStack Query | places, trip detail, forecast, Plan B candidates, centroid stays |
| Map/timeline UI sync | `shared/stores/workspace.store.ts` | `hoveredPlaceId`, `activeDayNumber`, `radarAnchorCoords` |
| Session | `features/auth` store | user, access token, authentication state |
| URL state | App Router search params | `day`, `mode`, `radius`, `category` |
| Form/local UI | component | form values, drawer/tooltip open state |

## Before implementation

| Task | Read first |
|---|---|
| UI, map, timeline, responsive/accessibility work | `agent-skills/skills/frontend-ui-engineering/SKILL.md` |
| Next.js, Leaflet, DnD, or Query API uncertainty | `agent-skills/skills/source-driven-development/SKILL.md` |
| New feature implementation | `incremental-implementation` and `test-driven-development` skills |
| Browser/map/runtime diagnosis | `browser-testing-with-devtools` and `debugging-and-error-recovery` skills |
| Performance/review | `performance-optimization`, `code-review-and-quality`, `code-simplification` skills |

## Completion bar

- Validate API types and error states, including `401`, ownership errors, weather conflict, and empty candidates.
- Test the changed hook/component with Vitest and React Testing Library; test UI interactions in browser when the map or DnD behavior changes.
- Preserve keyboard accessibility, visible focus, loading/skeleton, empty, and error states.
- Run lint, type-check, and build before handoff; update the matching specification if the contract changes.
