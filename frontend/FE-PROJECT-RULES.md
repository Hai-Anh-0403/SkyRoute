Write PROJECT-RULES.md for Frontend (Feature-based Next.js App Router) based on the project context above.

# SkyRoute Frontend Project Rules

## Core structure

- Use Next.js 15 App Router, React 19, TypeScript strict mode, Tailwind CSS, shadcn/ui, TanStack Query v5, Zustand, React Leaflet, `@dnd-kit`, Axios, React Hook Form, and Zod.
- `src/app/` is routing, metadata, layouts, loading, and error boundaries only. Feature code lives in `src/features/`; reusable, domain-neutral code lives in `src/shared/`.
- Every feature exposes only its public surface through `index.ts`. Do not deep-import another feature.

```text
src/
├── app/                            # thin App Router shell
│   ├── (marketing)/                # public SEO routes
│   ├── (auth)/                     # login and register routes
│   └── (workspace)/trips/          # authenticated trip dashboard/workspace
├── config/                         # typed env and domain constants
├── features/
│   ├── auth/ discovery/ itinerary-planner/
│   ├── weather-fallback/ stay-finder/ ai-copilot/
├── shared/
│   ├── components/ hooks/ lib/ stores/ types/ utils/
└── assets/                         # static images and map marker assets
```

```text
features/<feature>/
├── components/                     # feature-specific UI
├── hooks/                          # Query/mutation and UI hooks
├── services/                       # typed calls through shared Axios
├── types/                          # feature API/view models
├── utils/                          # feature-only pure functions
├── index.ts                        # public exports only
└── CONTEXT.md                      # non-obvious local decisions, if needed
```

## Naming and component design

- Folders and feature names are `kebab-case`; components are `PascalCase`; hooks start with `use`; services use `*.service.ts`; stores use `*.store.ts`; types use `*.types.ts`.
- Use App Router reserved names: `page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, and `not-found.tsx`.
- Keep components focused (normally below 200 lines). Split reusable UI, custom hooks, or subcomponents rather than accumulating a large JSX file.
- Type all props. Avoid `any`, hard-coded route strings, and server field names in view components.
- Place `'use client'` at the lowest interactive leaf. Server components must not import browser APIs, Zustand hooks, TanStack Query hooks, DnD primitives, or Leaflet.

## Feature boundaries and state

| State type | Required location | Examples |
|---|---|---|
| API/server state | TanStack Query | `['trip', tripId]`, `['places', filters]`, `['plan-b', tripId, itemId]` |
| Cross-panel UI state | `workspace.store.ts` | hover, selected item, active day, radar anchor/radius, active Plan B item |
| Session state | `features/auth` store | current user and access token |
| Shareable workspace state | URL search params | `day`, `mode`, `radius`, `category` |
| Local component state | `useState` | open drawer, accordion, tooltip |

- Never copy `places`, `trips`, `stays`, or Plan B candidates into Zustand.
- Cross-feature freshness uses invalidation, not shared mutable objects. A reorder or Plan B swap invalidates at least `['trip', tripId]` and `['centroid-stays', tripId]`.
- Feature-to-feature imports use public barrels only. Shared UI cannot contain travel-domain behavior.

## API, auth, and forms

- Configure one shared Axios client with `/api/v1`, `withCredentials: true`, a Bearer-token request interceptor, and a single `AUTH_002` refresh/retry path.
- Services map typed API envelopes; components never call Axios or `fetch` directly.
- Use `useQuery` for reads and `useMutation` for writes. Provide loading, empty, success, and error UI for every user-visible query.
- Treat server errors as `{ code, message, details? }`; show safe user-facing toasts and retain structured error information for recovery.
- Use React Hook Form and Zod for all forms. Keep API property names camelCase and coordinates `{ lat, lng }`.
- Do not auto-retry non-idempotent create/action requests after an unknown network error; the v1 backend has no idempotency-key contract.

## Routing and rendering

- Import navigation APIs only from `next/navigation`, never `next/router`.
- Define paths in `shared/lib/routes.ts`; use `next/link` for normal navigation.
- Route pages may resolve async `params`, define metadata, and compose exported feature roots. Business logic belongs in feature hooks/services.
- Use `loading.tsx` or `Suspense` for streaming skeletons and client `error.tsx` boundaries for route errors. A map failure must not make the timeline unusable.

```tsx
// app/(workspace)/trips/[tripId]/page.tsx
export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  return <TripWorkspace tripId={Number(tripId)} />;
}
```

## Map and DnD guardrails

- Export the Leaflet entry only through `next/dynamic(() => import('./MapCanvas'), { ssr: false })`. `MapCanvas` is a client component.
- Use a child `MapViewportController` with `useMap()` and granular Zustand selectors. Memoize marker components; do not remount `MapContainer` when timeline hover changes.
- Keep map layers explicit: discovery/radar, daily route, Plan B preview, and centroid/stay layer.
- `DndContext` must use `id="skyroute-timeline-dnd"`. Reorder with `onMutate`, snapshot rollback in `onError`, then invalidate or reconcile server data.
- Weather alert UI is shown only for `isOutdoor && rainProbability >= 60`. Detour UI is shown only when `isDetourWarning` is true.

## Accessibility, performance, and tests

- Use shadcn/Radix semantics; provide labels, keyboard operation, focus management, contrast, and reduced-motion-friendly transitions.
- Use responsive layouts: desktop split workspace; narrow viewports prioritize timeline and make map/drawers accessible without horizontal traps.
- Debounce radar/filter input, keep query keys stable, and lazy-load heavy map-only UI. Do not optimize by removing error handling or accessibility.
- Test with Vitest and React Testing Library: form validation, API states, DnD payloads/rollback, weather conflict banner, Plan B mutation, and radar radius behavior.
- Browser-test Leaflet rendering, map/timeline hover sync, and drag interaction after relevant changes.

## Delivery rules

- Branches: `feature/fe-<feature>-<summary>` or `fix/fe-<feature>-<summary>`.
- Commits: `feat(<feature>): <description>` or `fix(<feature>): <description>`.
- Each PR covers one vertical slice/fix, includes map/timeline screenshots or recording when applicable, and passes lint, type-check, tests, and build.
- Update `API_SPEC.md`, `FE-ARCHITECTURE.md`, and feature `CONTEXT.md` when the change alters a documented contract or architecture decision.

## Do / do not

| Do | Do not |
|---|---|
| Call `useReorderTimeline` from `TimelineBoard` | Call Axios from a sortable card |
| Store `activeDayNumber` in Zustand | Store the complete trip response in Zustand |
| Dynamically load `MapCanvas` | Import Leaflet in a server route/page |
| Import `@/features/discovery` | Import another feature's `components/MapCanvas` directly |
| Roll back an optimistic reorder on error | Leave visually reordered cards after server rejection |
