Write ARCHITECTURE.md for Frontend (Feature-based Next.js App Router) based on:
- Project context above
- API_SPEC.md: REST API (`/api/v1`) with 6 features (`auth`, `discovery`, `stays`, `trips`, `weather`, `ai-copilot`), JWT auth, spatial radar & Plan B swap conventions
- FE PROJECT-RULES.md: Next.js 15 (App Router, TypeScript), Zustand + TanStack Query v5, Tailwind + `shadcn/ui`, `react-leaflet` (`ssr: false`), `@dnd-kit`, feature-based structure

## Requirements

### 1. Overview
- Feature-based Split-Workspace Architecture: `src/app/` serves strictly as a thin Next.js routing shell while `src/features/` contains self-contained domain modules
- Tech stack justification:
  - Next.js 15 (App Router): SSR & `generateMetadata` for SEO-friendly city guides and shareable trip links (`/trips/[tripId]/share`), combined with Client Component islands (`'use client'`) for the interactive planner workspace
  - TypeScript (strict mode): end-to-end type safety for coordinates (`{ lat, lng }`), time slots, and API payloads
  - TanStack Query v5: server state caching, optimistic Drag & Drop updates (`onMutate`), and automatic cross-feature query invalidation (e.g., swapping a Plan B place automatically invalidates Centroid Stays)
  - Zustand: high-frequency 60fps synchronization between the Timeline Panel and the Interactive Map (`hoveredPlaceId`, `activeDayNumber`, `radarAnchorCoords`) without re-rendering the entire page
  - React Leaflet + OpenStreetMap: zero-cost multi-layer spatial visualization (POIs, Proximity Radar circle, daily route polylines, Trip Centroid pin), loaded client-side via `next/dynamic({ ssr: false })`
  - `@dnd-kit`: accessible multi-container drag-and-drop across the 4 daily time slots (`morning`, `lunch`, `afternoon`, `dinner`)
  - Tailwind CSS + `shadcn/ui`: consistent design system, drawers, dialogs, and skeletons

### 2. Folder Structure
```
src/
├── app/                            # Next.js 15 App Router (Thin routing shell ONLY)
│   ├── layout.tsx                  # Root HTML layout, fonts, Providers wrapper
│   ├── providers.tsx               # QueryClientProvider, Toaster, ThemeProvider
│   ├── (marketing)/                # Public SEO routes (Server Components)
│   │   ├── layout.tsx              # Public Header + Footer layout
│   │   ├── page.tsx                # Landing & Quick City Explorer
│   │   └── explore/[city]/page.tsx # City POI & food showcase
│   ├── (auth)/                     # Centered auth card layout
│   │   ├── layout.tsx
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── (workspace)/                # Protected planner routes
│       ├── layout.tsx              # AuthGuard + Workspace Topbar
│       └── trips/
│           ├── page.tsx            # User's saved trips dashboard
│           └── [tripId]/
│               ├── page.tsx        # Split-Screen Adaptive Workspace (Timeline + Map)
│               ├── loading.tsx     # Split-screen skeleton loader
│               └── error.tsx       # Route error boundary
├── config/
│   ├── constants.ts                # API_BASE_URL, RAIN_THRESHOLD (60%), SLOT_LABELS
│   └── env.ts                      # Typed NEXT_PUBLIC_* env variables
├── shared/
│   ├── components/
│   │   ├── ui/                     # Button, Badge, Drawer, Dialog, Slider (shadcn/ui)
│   │   ├── feedback/               # Toast, Skeleton, EmptyState, ErrorBoundary
│   │   └── layout/                 # SplitScreenLayout, Navbar
│   ├── hooks/
│   │   ├── useDebounce.ts
│   │   ├── useGeolocation.ts       # Browser GPS hook for Proximity Radar
│   │   └── useMediaQuery.ts
│   ├── lib/
│   │   ├── axios.ts                # Axios instance with JWT refresh interceptor
│   │   ├── queryClient.ts          # TanStack Query client config
│   │   └── routes.ts               # Type-safe route constants (ROUTES)
│   ├── stores/
│   │   └── workspace.store.ts      # Map <-> Timeline sync Zustand store
│   ├── types/
│   │   ├── api.types.ts            # ApiResponse, PaginatedResponse, SpatialMeta
│   │   └── geo.types.ts            # Coordinates ({ lat, lng }), TimeSlotType
│   └── utils/
│       ├── format.utils.ts         # formatCurrencyVnd, formatDistanceKm
│       └── weather.utils.ts        # Maps weather codes & rain % to icons/colors
├── features/
│   ├── auth/
│   ├── discovery/
│   ├── itinerary-planner/
│   ├── weather-fallback/
│   ├── stay-finder/
│   └── ai-copilot/
└── assets/
    ├── markers/                    # Custom SVG map pins (Attraction, Food, Stay, Centroid)
    └── images/
```

### 3. Feature Anatomy
```
features/discovery/
├── components/
│   ├── InteractiveMap.tsx          # next/dynamic({ ssr: false }) wrapper
│   ├── MapCanvas.tsx               # 'use client' Leaflet MapContainer + 4 vector layers
│   ├── MapViewportController.tsx   # Subscribes to workspace.store to flyTo() coords
│   ├── ProximityRadarControl.tsx   # 1km - 5km radius slider & anchor toggle
│   ├── MultiLayerFilterBar.tsx     # Outdoor/Indoor, Category, Weather-aware food chips
│   └── PlaceMarkerCard.tsx
├── hooks/
│   ├── usePlaces.ts                # useQuery for filtered places
│   ├── useRadarPlaces.ts           # useQuery for GET /places/radar
│   └── useWeatherFood.ts           # useQuery for GET /places/food-recommendations
├── services/
│   └── discovery.service.ts
├── types/
│   └── discovery.types.ts
├── index.ts                        # Export public components & hooks
└── CONTEXT.md

features/itinerary-planner/
├── components/
│   ├── TripHeader.tsx
│   ├── DayTabs.tsx                 # Day 1, Day 2, Day 3 selector
│   ├── TimelineBoard.tsx           # @dnd-kit DndContext with 4 droppable time slots
│   ├── TimeSlotColumn.tsx          # Morning (8-11h), Lunch (11-13h), Afternoon (13-17h), Dinner (17-22h)
│   ├── TimelineItemCard.tsx        # Sortable card with detour warning & weather badge
│   └── DailyRoutePolyline.tsx      # Connects day's stops on map (dashed red if >8km detour)
├── hooks/
│   ├── useTripDetail.ts            # useQuery for GET /trips/:id
│   ├── useAddTimelineItem.ts       # useMutation for POST /trips/:id/items
│   └── useReorderTimeline.ts       # useMutation with optimistic update for PATCH /trips/:id/items/reorder
├── services/
│   └── trip.service.ts
├── types/
│   └── trip.types.ts
├── index.ts
└── CONTEXT.md

features/weather-fallback/
├── components/
│   ├── SlotWeatherBadge.tsx        # Displays Temp °C, Weather Icon, Rain %
│   ├── WeatherConflictBanner.tsx   # Red alert when isOutdoor && rainProbability >= 60%
│   ├── PlanBSwapDrawer.tsx         # Displays 2-3 nearest Indoor alternatives (<3km)
│   └── PlanBCandidateCard.tsx      # 1-click "Swap to Indoor" action card
├── hooks/
│   ├── useSyncTripWeather.ts       # useMutation for POST /trips/:id/weather-sync
│   ├── usePlanBCandidates.ts       # useQuery for GET /trips/:id/items/:itemId/plan-b-candidates
│   └── useSwapPlanB.ts             # useMutation for POST /trips/:id/items/:itemId/swap-plan-b
├── services/
│   └── weather-fallback.service.ts
├── types/
│   └── weather-fallback.types.ts
├── index.ts
└── CONTEXT.md

features/stay-finder/
├── components/
│   ├── CentroidMapPin.tsx          # Renders geometric center (x̄, ȳ) star pin on Leaflet map
│   ├── CentroidStayDrawer.tsx      # Slide-over panel comparing nearest hotels/homestays
│   └── StayComparisonCard.tsx      # Shows distanceToCentroidKm, pricePerNight, amenities
├── hooks/
│   └── useCentroidStays.ts         # useQuery for GET /trips/:tripId/centroid-stays
├── services/
│   └── stay.service.ts
├── types/
│   └── stay.types.ts
├── index.ts
└── CONTEXT.md
```

### 4. Data Flow
```
User Action → Client Component → Hook (TanStack Query) → Feature Service → Axios → NestJS API
                                         ↓
                        Optimistic Cache / Invalidation + Zustand Sync
                                         ↓
                        Timeline UI + Leaflet Map Re-render in Sync
```
Example 1 — Drag & Drop Timeline Reorder (`@dnd-kit`):
1. User drags an activity card from `Day 1 - Morning` to `Day 1 - Afternoon`
2. `TimelineBoard` `onDragEnd` calls `useReorderTimeline().mutate(newOrderPayload)`
3. `onMutate` optimistically updates `['trip', tripId]` cache so the card snaps immediately
4. `trip.service.reorderItems()` sends `PATCH /api/v1/trips/:id/items/reorder`
5. Backend recalculates `distanceFromPrevKm`, `isDetourWarning`, slot weather alerts, and `centroidLocation`
6. On success: `['trip', tripId]` and `['centroid-stays', tripId]` caches update; `DailyRoutePolyline` and `CentroidMapPin` on the map re-draw automatically

Example 2 — One-Click Plan B Weather Swap:
1. Slot `Day 1 - Afternoon` (`Đồi Chè Cầu Đất - Outdoor`) shows a red `WeatherConflictBanner` (`Rain 75%`)
2. User clicks **"Kích hoạt Kế hoạch B (Find Indoor Plan B)"**
3. `workspace.store` sets `activePlanBItemId = 103` and pans the Map to the preceding lunch slot's coordinates with a $3\text{km}$ search ring
4. `PlanBSwapDrawer` opens and calls `usePlanBCandidates(tripId, 103)` → fetches top 2–3 indoor places (`Bảo tàng Lâm Đồng - 1.2km`)
5. User clicks **"Hoán đổi ngay (1-Click Swap)"** → `useSwapPlanB().mutate({ replacementPlaceId: 88 })`
6. On success: red weather alert clears, timeline card updates to `Bảo tàng Lâm Đồng (Indoor)`, and `['centroid-stays', tripId]` refreshes

### 5. Cross-feature Communication

| Method | Use case | Example |
|--------|----------|---------|
| `workspace.store.ts` (Zustand) | Hover/Select sync between Timeline & Map | Hovering `TimelineItemCard` sets `hoveredPlaceId` → pulses marker on Map |
| `workspace.store.ts` (Zustand) | Proximity Radar anchor & radius | `radarAnchorCoords` + `radarRadiusKm` ($1\text{km}-5\text{km}$) shared between Map & Filter Panel |
| TanStack Query Cache Invalidation | Cross-feature data freshness | Adding/swapping an item in `itinerary-planner` or `weather-fallback` invalidates `['centroid-stays', tripId]` in `stay-finder` |
| Next.js URL Search Params | Shareable workspace view state | `/trips/12?day=2&mode=radar&radius=3&category=restaurant` |

Feature dependencies:
- `auth`: standalone (provides user session)
- `discovery`: reads `workspace.store` (radar anchor, active filters)
- `itinerary-planner`: reads `workspace.store` (active day), invalidates `stay-finder` & `weather-fallback` queries
- `weather-fallback`: reads/updates `itinerary-planner` cache (`['trip', tripId]`)
- `stay-finder`: reads `['trip', tripId]` `centroidLocation` and fetches `['centroid-stays', tripId]`
- `ai-copilot`: populates `['trip', tripId]` and triggers map bounds fit

### 6. Routing Structure (Next.js 15 App Router)

Public routes (Server-rendered for fast initial load & SEO):
- `/` → Landing page & Quick City Explorer
- `/explore/[city]` → Public city POI, weather-aware food & stay guide (e.g., `/explore/da-lat`)
- `/login` → Login page
- `/register` → Register page

Protected routes (Authenticated user workspace):
- `/trips` → User's saved trips dashboard (`CreateTripModal`, trip cards)
- `/trips/[tripId]` → Main Split-Screen Adaptive Planner Workspace (Left: `TimelineBoard` + `PlanBSwapDrawer` + `CentroidStayDrawer`; Right: `InteractiveMap` + `ProximityRadarControl`)

Route constants (`shared/lib/routes.ts`):
```ts
export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  EXPLORE_CITY: (city: string) => `/explore/${encodeURIComponent(city)}`,
  TRIPS: '/trips',
  TRIP_WORKSPACE: (tripId: number | string) => `/trips/${tripId}`,
} as const;
```

Next.js App Router Workspace Page pattern (`src/app/(workspace)/trips/[tripId]/page.tsx`):
```tsx
import { SplitScreenLayout } from '@/shared/components/layout/SplitScreenLayout';
import { TimelineWorkspacePanel } from '@/features/itinerary-planner';
import { InteractiveMap } from '@/features/discovery';

interface PageProps {
  params: Promise<{ tripId: string }>;
}

export default async function TripWorkspacePage({ params }: PageProps) {
  const { tripId } = await params;
  return (
    <SplitScreenLayout
      leftPanel={<TimelineWorkspacePanel tripId={Number(tripId)} />}
      rightPanel={<InteractiveMap tripId={Number(tripId)} />}
    />
  );
}
```

### 7. State Management Strategy

| State Type | Location | Tool | Example |
|------------|----------|------|---------|
| Server state | Feature hooks | TanStack Query v5 | `['places', filters]`, `['trip', tripId]`, `['centroid-stays', tripId]`, `['plan-b', itemId]` |
| Map $\leftrightarrow$ Timeline Sync | `shared/stores/workspace.store.ts` | Zustand | `hoveredPlaceId`, `selectedItemId`, `activeDayNumber`, `radarAnchorCoords`, `radarRadiusKm`, `activePlanBItemId` |
| Auth state | `features/auth/stores/auth.store.ts` | Zustand | `user`, `accessToken`, `isAuthenticated` |
| URL state | App Router URL | `useSearchParams()` | `day=1`, `mode=radar\|stays\|ai`, `category=restaurant` |
| Form state | Form component | React Hook Form + Zod | Create Trip form, AI Copilot prompt form |
| Local UI state | Component | `useState` | Tooltip open, accordion expand |

### 8. API Layer
```
shared/lib/axios.ts (Base HTTP client)
├── Base URL (/api/v1) & withCredentials: true (for refresh_token cookie)
├── Request interceptor: attach Bearer accessToken
├── Response interceptor: auto-refresh on 401 AUTH_002
├── Error interceptor: unwrap standardized { code, message, details }
    ↓
features/[feature]/services/[feature].service.ts (Feature service)
├── Typed endpoint methods (getRadarPlaces, reorderItems, swapPlanB, getCentroidStays)
    ↓
features/[feature]/hooks/use[Action].ts (TanStack Query hook)
├── useQuery / useMutation with queryKey conventions & cache invalidation
    ↓
features/[feature]/components/[Component].tsx ('use client' UI)
```

### 9. Shared vs Features

| Shared (`src/shared/`) | Features (`src/features/`) |
|------------------------|----------------------------|
| `Button`, `Drawer`, `Dialog`, `Badge`, `Slider` | `TimelineBoard`, `PlanBSwapDrawer`, `CentroidStayDrawer`, `ProximityRadarControl` |
| `useDebounce`, `useGeolocation` | `useRadarPlaces`, `useReorderTimeline`, `useSwapPlanB`, `useCentroidStays` |
| `axios` instance, `queryClient`, `workspace.store` | `discovery.service`, `trip.service`, `weather-fallback.service`, `stay.service` |
| `Coordinates`, `TimeSlotType`, `ApiResponse` | `PlaceMarker`, `ItineraryItem`, `PlanBCandidate`, `CentroidStay` |
| `formatCurrencyVnd`, `formatDistanceKm` | `isDetourRoute()`, `getSlotWeatherSeverity()` |

## Format
- Mermaid diagrams for data flow, Map-Timeline sync, and Plan B swap sequence
- Folder structure with inline comments
- Max 150-200 lines

## Next.js & Spatial UI Additions

**4-Layer Interactive Map Architecture (`features/discovery/components/MapCanvas.tsx`):**
1. **Discovery & Proximity Radar Layer:** Renders `<Circle>` ($1\text{km}-5\text{km}$) around `radarAnchorCoords` and custom markers for Attractions, Restaurants, and Cafes.
2. **Daily Route Polyline Layer:** Connects consecutive stops of `activeDayNumber` in order (`morning` → `lunch` → `afternoon` → `dinner`); renders a dashed orange/red line when `isDetourWarning === true`.
3. **Plan B Indoor Preview Layer:** When `activePlanBItemId` is active, highlights the $3\text{km}$ search zone and the 2–3 candidate indoor markers for instant visual comparison before swapping.
4. **Centroid & Stay Layer:** Renders the geometric Trip Centroid star marker $(\bar{x}, \bar{y})$ and nearby `stays` pins with distance lines to the centroid.
