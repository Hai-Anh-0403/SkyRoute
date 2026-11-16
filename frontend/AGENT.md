# SkyRoute Frontend — Agent Context (`frontend/AGENT.md`)

> **Scope:** Applies to all work inside `frontend/`. Always read root [AGENT.md](../AGENT.md) first for full project context.

---

## 1. Frontend Identity & Stack

- **Framework:** Next.js 15 (App Router, React 19, TypeScript 5.x strict mode)
- **Styling & UI:** Tailwind CSS + `shadcn/ui` (Radix Primitives) + Lucide Icons
- **State Management:**
  - **TanStack Query v5:** Server state, cache invalidation, and optimistic Drag & Drop updates (`onMutate`)
  - **Zustand (`shared/stores/workspace.store.ts`):** High-frequency Map $\leftrightarrow$ Timeline UI synchronization (`hoveredPlaceId`, `activeDayNumber`, `radarAnchorCoords`, `radarRadiusKm`, `activePlanBItemId`)
- **Spatial Map:** `react-leaflet` (Leaflet.js + OpenStreetMap) — **MUST be client-only via `next/dynamic(..., { ssr: false })`**
- **Drag & Drop:** `@dnd-kit/core` + `@dnd-kit/sortable`
- **HTTP & Forms:** Axios (`withCredentials: true`, JWT auto-refresh interceptor) + React Hook Form + Zod

### Reference Specs
- API Contract: [../share/API_SPEC.md](../share/API_SPEC.md)
- Architecture & Rules: [FE-ARCHITECTURE.md](FE-ARCHITECTURE.md), [FE-PROJECT-RULES.md](FE-PROJECT-RULES.md)

---

## 2. Feature Modules & App Router Separation

- **`src/app/` (Thin Routing Shell ONLY):** Holds route groups `(marketing)`, `(auth)`, `(workspace)/trips/[tripId]`, `loading.tsx`, `error.tsx`, and `generateMetadata`. Each `page.tsx` MUST remain `< 50` lines and contain zero business logic.
- **`src/features/` (Self-contained Domain Slices):**
  - `auth`: Login, register, session state.
  - `discovery`: Interactive Map wrapper (`next/dynamic`), 4-layer map canvas, Proximity Radar ($1\text{km}-5\text{km}$) controls, category/indoor/weather-aware food filters.
  - `itinerary-planner`: Day tabs, 4-slot Drag & Drop Timeline (`morning`, `lunch`, `afternoon`, `dinner`), route polylines & detour warning badges ($> 8\text{km}$).
  - `weather-fallback`: Slot weather pills, red conflict alert (`isOutdoor && rainProbability >= 60%`), 1-click Plan B indoor swap drawer.
  - `stay-finder`: Geometric Trip Centroid pin $(\bar{x}, \bar{y})$ and nearest accommodation comparison drawer.
  - `ai-copilot`: Context-aware travel prompt builder & grounded AI itinerary preview.

---

## 3. Critical Frontend Guardrails

1. **Leaflet SSR Crash Prevention:** NEVER import `leaflet` or `react-leaflet` in a Server Component or without `next/dynamic(() => import('./MapCanvas'), { ssr: false })`.
2. **4-Layer Map Performance:** Wrap custom markers (`Attraction`, `Restaurant`, `Stay`, `CentroidPin`) in `React.memo` and use a child `<MapViewportController />` with `useMap()` subscribing to granular Zustand selectors so hovering timeline cards never re-mounts `MapContainer`.
3. **`@dnd-kit` Hydration & Optimistic UI:** Always pass a deterministic `id="skyroute-timeline-dnd"` to `<DndContext>`. Use TanStack Query `onMutate` for instant card snapping and `onError` rollback; on success, invalidate `['trip', tripId]` and `['centroid-stays', tripId]`.
4. **Barrel Exports Only:** Import across features strictly via `@/features/<feature>` (`index.ts`), never from internal `components/` or `hooks/` folders.
5. **No Server State in Zustand:** Keep API responses (`places`, `trips`, `stays`, `planBCandidates`) exclusively in TanStack Query; never duplicate them in Zustand.

---

## 4. Frontend Skill Activation Guide

Read the corresponding `SKILL.md` in `../agent-skills/skills/` before executing:

| Frontend Task | Skill to Load | Focus for SkyRoute |
|---|---|---|
| **Build UI / Map / Timeline** | `frontend-ui-engineering` | Split-screen layout, `shadcn/ui` drawers, WCAG accessibility, responsive states |
| **Next.js 15 / Leaflet / DnD APIs** | `source-driven-development` | Verify Next.js 15 async `params`, `next/dynamic`, `@dnd-kit` & TanStack Query v5 patterns |
| **Implement Feature Slice** | `incremental-implementation`, `test-driven-development` | Test DnD slot transitions, red weather alert badges, and 1-click Plan B swap mutations (Vitest + RTL) |
| **Live Browser & Map Debugging** | `browser-testing-with-devtools` | Inspect live DOM, Leaflet canvas rendering, network `/api/v1` payloads, console errors |
| **Performance & Rendering** | `performance-optimization` | Prevent `MapContainer` re-renders, lazy-load heavy map overlays, Core Web Vitals |
| **Bug Triage** | `debugging-and-error-recovery` | Fix SSR `window is not defined`, hydration mismatches, or optimistic rollback bugs |
| **Pre-Merge Check** | `code-review-and-quality`, `code-simplification` | Enforce `< 200` lines/component, barrel imports, and clean custom hooks |
