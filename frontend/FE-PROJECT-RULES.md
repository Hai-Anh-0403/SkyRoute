Write PROJECT-RULES.md for Frontend (Feature-based Next.js App Router) based on the project context above.

## Tech Stack
- Framework: Next.js 15 (App Router, React 19)
- Language: TypeScript 5.x (strict mode)
- State management: Zustand (Global UI & Map-Timeline sync) + TanStack Query v5 (Server state & Optimistic UI)
- Styling: Tailwind CSS + `shadcn/ui` (Radix Primitives) + Lucide Icons
- Interactive Map: `react-leaflet` (Leaflet.js + OpenStreetMap, loaded via `next/dynamic` with `ssr: false`)
- Drag & Drop Timeline: `@dnd-kit/core` + `@dnd-kit/sortable`
- HTTP client: Axios (with centralized auth & error interceptors)
- Form handling: React Hook Form + Zod

## Requirements

### 1. Feature Structure
Keep `src/app/` strictly as a thin routing & layout shell. All domain and UI logic lives inside `src/features/`:
```
src/
├── app/                        # Next.js App Router (Thin routing & layout shell ONLY)
│   ├── layout.tsx              # Root layout, fonts, global Providers
│   ├── providers.tsx           # Client Providers (QueryClientProvider, Toaster)
│   ├── (marketing)/            # Public SEO routes (Server Components)
│   │   ├── page.tsx            # Home & Quick City Explorer
│   │   └── explore/[city]/page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (workspace)/            # Protected interactive planner routes
│       └── trips/
│           ├── page.tsx        # Saved trips dashboard
│           └── [tripId]/
│               ├── page.tsx    # Split-Screen Adaptive Planner Workspace
│               ├── loading.tsx # Workspace skeleton
│               └── error.tsx   # Route error boundary
├── features/
│   ├── auth/                   # login, register, JWT session handling
│   ├── discovery/              # Map layers, multi-layer POI/food filters, Proximity Radar
│   ├── itinerary-planner/      # 4-slot Drag & Drop timeline, route polylines, detour alerts
│   ├── weather-fallback/       # Hourly weather pills, rain conflict banner, 1-click Plan B drawer
│   ├── stay-finder/            # Trip Centroid marker, nearest accommodations comparison
│   └── ai-copilot/             # Grounded AI itinerary generator & smart filter presets
├── shared/
│   ├── components/             # Button, Drawer, Badge, Skeleton, SplitScreenLayout
│   ├── hooks/                  # useDebounce, useGeolocation, useMediaQuery
│   ├── lib/                    # axios instance, queryClient, routes constants
│   ├── stores/                 # workspace.store.ts (Map <-> Timeline sync state)
│   ├── types/                  # common types (Coordinates, TimeSlot, ApiResponse)
│   └── utils/                  # distance/currency formatters, weather icon mappers
└── config/
    └── constants.ts
```

Each feature folder:
```
features/[feature-name]/
├── components/
│   ├── TimelineSlotCard.tsx
│   └── DailyRoutePolyline.tsx
├── hooks/
│   └── useReorderTimeline.ts   # TanStack Query hooks (with optimistic updates)
├── services/
│   └── trip.service.ts         # Typed API calls
├── stores/
│   └── filter.store.ts         # Feature-scoped Zustand store (if needed)
├── types/
│   └── trip.types.ts
├── utils/
│   └── route.utils.ts
├── index.ts                    # Barrel exports (public API ONLY)
└── CONTEXT.md
```

### 2. Naming Conventions
- App Router files: Next.js reserved conventions (`page.tsx`, `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`)
- Feature folders: `kebab-case` (`itinerary-planner`, `weather-fallback`, `stay-finder`, `ai-copilot`)
- Components: `PascalCase` (`TimelineSlotCard.tsx`, `PlanBSwapDrawer.tsx`, `ProximityRadarLayer.tsx`)
- Hooks: `camelCase` with `use` prefix (`useRadarPlaces.ts`, `usePlanBCandidates.ts`, `useCentroidStays.ts`)
- Services: `camelCase` with `.service` suffix (`discovery.service.ts`, `trip.service.ts`)
- Stores: `camelCase` with `.store` suffix (`workspace.store.ts`, `auth.store.ts`)
- Types: `camelCase` with `.types` suffix (`discovery.types.ts`, `trip.types.ts`)
- Utils: `camelCase` with `.utils` suffix (`geo.utils.ts`, `weather.utils.ts`)
- Constants: `UPPER_SNAKE_CASE` (`API_BASE_URL`, `RAIN_ALERT_THRESHOLD = 60`, `RADAR_RADIUS_RANGE = [1, 5]`)
- Route paths: `UPPER_SNAKE_CASE` in `shared/lib/routes.ts` (`ROUTES.TRIP_WORKSPACE`)

### 3. Feature Rules
- Feature must be self-contained inside `src/features/[feature-name]/`
- `src/app/**/page.tsx` files must be thin (< 50 lines): only read route `params`/`searchParams`, define `generateMetadata`, and render exported Feature components
- Export only via `index.ts` (barrel file)
- No direct imports between features' internal files
- Cross-feature communication via:
  - Global Zustand workspace store (`workspace.store.ts`: `hoveredPlaceId`, `activeDayNumber`, `activeSlot`, `radarAnchorCoords`, `radarRadiusKm`, `activePlanBItemId`)
  - URL search params (`useSearchParams` from `next/navigation`)
  - TanStack Query cache invalidation
- Shared components location: `src/shared/components/`

Feature boundaries for this project:
- `auth`: login, register, logout, current user state
- `discovery`: Leaflet map container, category/indoor/weather-aware food filters, Proximity Radar ($1\text{km}-5\text{km}$)
- `itinerary-planner`: trip creation, multi-day 4-slot Drag & Drop timeline (`morning`, `lunch`, `afternoon`, `dinner`), route distance & detour warning badges
- `weather-fallback`: slot weather forecast badges, red conflict warning (`isOutdoor && rainProb >= 60%`), 1-click Plan B indoor candidate drawer & swap action
- `stay-finder`: displays geometric Trip Centroid $(\bar{x}, \bar{y})$ on map and lists nearest `stays` (`hotel`, `homestay`, `resort`)
- `ai-copilot`: natural language prompt form & grounded AI itinerary preview

### 4. Component Rules (Server vs Client Components)
- One component per file
- Co-locate styles (Tailwind), tests (`.test.tsx`)
- Props typing required (`interface Props {}`)
- Max 200 lines per component (split sub-components like `WeatherAlertBadge` or custom hooks if larger)
- Push `'use client'` as far down the component tree as possible (interactive leaves, `@dnd-kit` sortable items, Leaflet layers, Zustand/TanStack Query hooks)
- **CRITICAL SSR Rule for Leaflet:** Never import `leaflet` or `react-leaflet` in a Server Component. Always wrap the Map entry component with `next/dynamic(() => import('./MapCanvas'), { ssr: false })`

Component structure:
```tsx
// 1. 'use client' directive (only if interactive / uses hooks / browser APIs)
// 2. Imports
// 3. Types/Interfaces
// 4. Component
// 5. Export
```

### 5. Code Patterns (MUST follow)

**API calls:**
- Via `services/*.service.ts` files only (never call `axios` or `fetch` directly inside components)
- Use TanStack Query hooks (`useQuery`) for data fetching
- Use `useMutation` for `POST` / `PATCH` / `DELETE` with automatic query invalidation

**State management:**
- Local UI state first (`useState`)
- Server state: TanStack Query (`places`, `trip`, `weather`, `centroid-stays`, `plan-b-candidates`)
- Cross-panel Map $\leftrightarrow$ Timeline UI state: Zustand (`workspace.store.ts`)
- Shareable filter & active day state: Next.js `useSearchParams()` (`?day=2&mode=radar&radius=3`)

**Routing (Next.js 15 App Router):**
- Import navigation hooks from `'next/navigation'` (`useRouter`, `usePathname`, `useSearchParams`, `useParams`) — NEVER from `'next/router'`
- Define route path builders in `shared/lib/routes.ts` as constants
- Use `<Link href={...}>` from `'next/link'` for declarative navigation
- Use `loading.tsx` and `<Suspense>` for route/panel streaming skeletons
- Use `error.tsx` (`'use client'`) for route-level error boundaries

**Optimistic UI for Drag & Drop (`@dnd-kit`):**
- Reordering items across the 4 daily slots (`morning`, `lunch`, `afternoon`, `dinner`) MUST use TanStack Query `onMutate` optimistic cache updates so cards snap immediately without UI lag, rolling back in `onError` if the API call fails

**Error handling:**
- Next.js `error.tsx` + panel-level Error Boundaries (so a Map error does not crash the Timeline panel)
- TanStack Query `onError` with Toast notifications (`sonner`)
- Centralized `401` token refresh in Axios response interceptor

**Form handling:**
- React Hook Form + Zod schema validation for all forms (Create Trip, AI Prompt Builder, Auth)

### 6. Anti-patterns (MUST NOT do)
- Put business logic or 500-line JSX directly inside `src/app/**/page.tsx`
- Import `react-leaflet` without `next/dynamic(..., { ssr: false })` (crashes Next.js SSR with `window is not defined`)
- Import from another feature's internal files (must import from `@/features/[feature]` barrel `index.ts`)
- API calls directly in components
- Store server API responses (`places`, `trips`, `stays`) inside Zustand (must stay in TanStack Query cache)
- Re-mount the entire Leaflet `MapContainer` on every timeline hover (use memoized markers and granular Zustand selectors)
- Untyped code (`any`) or hardcoded route strings

### 7. Git Workflow
- Branch naming: `[type]/fe-[feature]-[short-description]`
  - `feature/fe-discovery-proximity-radar`
  - `feature/fe-weather-plan-b-drawer`
  - `fix/fe-itinerary-dnd-optimistic-rollback`
- Commit message: `[type]([feature]): [description]`
  - `feat(itinerary-planner): add 4-slot dnd-kit drag and drop reorder`
  - `feat(weather-fallback): add 1-click Plan B indoor swap modal`
  - `fix(discovery): wrap Leaflet MapCanvas in next/dynamic with ssr false`
- PR scope:
  - One feature vertical slice or fix per PR
  - Include UI screenshots/recordings for Map & Timeline interactions
  - Update `CONTEXT.md` if feature state/API contract changes

### 8. Testing
- Test file location: same folder as component (`[Component].test.tsx`) or `features/[feature]/tests/`
- What to test:
  - Drag & Drop slot reordering and detour warning badge rendering (`distanceFromPrevKm > 8.0`)
  - Red Weather Alert banner rendering when `isOutdoor && rainProbability >= 60`
  - One-click Plan B indoor candidate selection and swap mutation
  - Proximity Radar radius slider ($1\text{km}-5\text{km}$) updating query params
- Tools: Vitest + React Testing Library

## Format
- Concrete examples for each rule
- DO vs DON'T comparisons
- Max 100-150 lines

## Next.js 15 App Router & Leaflet Patterns
- Navigation imports: `import { useRouter, useParams, useSearchParams, usePathname } from 'next/navigation'`
- Client-only Map Dynamic Import:
  ```tsx
  import dynamic from 'next/dynamic';
  export const InteractiveMap = dynamic(
    () => import('./MapCanvas').then((mod) => mod.MapCanvas),
    { ssr: false, loading: () => <MapSkeleton /> }
  );
  ```
- Route path constants:
  ```ts
  // shared/lib/routes.ts
  export const ROUTES = {
    HOME: '/',
    LOGIN: '/login',
    REGISTER: '/register',
    EXPLORE_CITY: (city: string) => `/explore/${encodeURIComponent(city)}`,
    TRIPS: '/trips',
    TRIP_WORKSPACE: (tripId: number | string) => `/trips/${tripId}`,
  } as const;
  ```
- `@dnd-kit` SSR Hydration safety: always pass a deterministic `id="skyroute-timeline-dnd"` to `<DndContext>`
- Memoize custom Leaflet markers (`React.memo`) and use a child `<MapViewportController />` component with `useMap()` to smoothly `flyTo()` coordinates when `workspace.store` changes
