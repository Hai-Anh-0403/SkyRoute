You are a senior software architect helping me create documentation for an enterprise project.

## Project Info
- Project name: SkyRoute (Smart Travel Companion)
- Description: A context-aware and weather-adaptive travel recommendation & itinerary planning platform. This project unifies spatial POI & food discovery (Proximity Radar), interactive drag-and-drop timeline planning, real-time hourly weather synchronization, AI-driven one-click "Plan B" indoor fallbacks, and geometric "Trip Centroid" accommodation recommendations.
- Tech stack:
  - Frontend: Next.js 15 (App Router, TypeScript), Tailwind CSS, `shadcn/ui`, TanStack Query v5, Zustand, React Leaflet (`ssr: false`), `@dnd-kit`
  - Backend: NestJS v11, TypeScript, TypeORM (with PostGIS Spatial SQL), `@nestjs/schedule` (Cron Jobs)
  - Database & Cache: PostgreSQL 16 + PostGIS Extension (`GEOMETRY(Point, 4326)`, `GIST` index), Redis 7 (Weather forecast cache TTL = 30m, session & rate limit)
  - External APIs & AI: Open-Meteo API (Hourly weather & rain probability), Gemini / OpenAI API (Function Calling / Tool Use grounded in PostGIS data)
- Team size: 4
- Architecture: Modular Monolith (Clean Architecture)
- Code organization: Feature-based (NOT layer-based)

## Documentation Requirements
- Language: English
- Goal: Maintainable & scalable for team collaboration
- Style: Concise, bullet points, with concrete examples (Places, Stays, Trips, Weather Slots, Plan B Swaps, Centroid Stays)
- Audience: Developers (new team members + AI coding assistants)

## Architecture Principle
- Organize code by FEATURES (`discovery`, `trips`, `stays`, `weather`, `ai-copilot`, `auth`), not by layers
- Each feature is self-contained
- Shared code goes to separate `shared/` and `core/` folders (and in Next.js, `src/app/` is kept as a thin routing shell)
- Minimize cross-feature dependencies (communicate only via exported feature services or domain events)

Keep this context for all following documentation requests.
