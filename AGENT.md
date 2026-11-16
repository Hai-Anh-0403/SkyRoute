# SkyRoute — Root Agent Context (`AGENT.md`)

> **Read this file at the start of every new session.** It provides the complete project context, architecture boundaries, source-of-truth documents, and `agent-skills` workflow routing for **SkyRoute (Smart Travel Companion)**.

---

## 1. Project Identity & Core Problem

- **Project Name:** SkyRoute (*Smart Travel Companion: Context-Aware & Weather-Adaptive Travel Recommendation Platform*)
- **Core Goal:** Replace static travel itineraries and fragmented tools with a **Living & Adaptive Itinerary** that unifies:
  1. **Discovery & Proximity Radar:** Multi-layer POI & weather-aware food discovery within a $1\text{km}-5\text{km}$ spatial radius (PostGIS `ST_DWithin`).
  2. **Interactive 4-Slot Timeline:** Drag-and-drop itinerary across `morning` (`08:00–11:00`), `lunch` (`11:00–13:00`), `afternoon` (`13:00–17:00`), and `dinner` (`17:00–22:00`), with route detour warnings ($> 8\text{km}$).
  3. **Weather-Adaptive Plan B Fallback:** Hourly weather sync (Open-Meteo + Redis 30m cache); flags outdoor activities (`is_outdoor = true`) when rain probability $\ge 60\%$ and enables 1-click AI + PostGIS swap to the nearest indoor alternative ($< 3\text{km}$).
  4. **Trip Centroid Stay Finder:** Computes the geometric center $(\bar{x}, \bar{y})$ of all selected itinerary places (`ST_Centroid`) and recommends the closest hotels/homestays (`<->` KNN).

---

## 2. Tech Stack & Workspace Map

- **Architecture:** Feature-based Modular Monolith (strictly **Feature-based**, NOT layer-based).
- **Backend (`backend/`):** NestJS v11, TypeScript 5.x, TypeORM, PostgreSQL 16 + PostGIS 3.4, Redis 7 (`ioredis`), `@nestjs/schedule`, Open-Meteo API, Gemini/OpenAI Function Calling.
- **Frontend (`frontend/`):** Next.js 15 (App Router, React 19, TypeScript 5.x), Tailwind CSS, `shadcn/ui`, TanStack Query v5, Zustand, `react-leaflet` (`ssr: false`), `@dnd-kit`.

### Repository Source-of-Truth Documents
| Scope | File | Purpose |
|---|---|---|
| **Domain & Specs** | `share/Readme.md` | Original Vietnamese topic specification, MVP scope, and roadmap |
| **Database** | `share/DATABASE.md` | PostgreSQL + PostGIS schema, GIST/GIN indexes, Redis cache keys |
| **API Contract** | `share/API_SPEC.md` | REST `/api/v1` endpoints, error codes (`DISC_001`, `WTHR_002`, etc.), JSON examples |
| **Backend Context** | `backend/AGENT.md` | Backend rules, PostGIS & AI guardrails, and skill triggers |
| **Backend Docs** | `backend/BE-ARCHITECTURE.md`, `backend/BE-PROJECT-RULES.md` | NestJS module structure, DI/event rules, coding standards |
| **Frontend Context** | `frontend/AGENT.md` | Next.js App Router rules, Leaflet SSR & `@dnd-kit` guardrails, skill triggers |
| **Frontend Docs** | `frontend/FE-ARCHITECTURE.md`, `frontend/FE-PROJECT-RULES.md` | Split-screen Map-Timeline sync, 4-layer map architecture |
| **Task Plan & Todo** | `tasks/plan.md`, `tasks/todo.md` | Vertical task breakdown, dependencies, acceptance criteria, and progress checklist |
| **Workflows** | `agent-skills/` | 25 engineering skills (`skills/*/SKILL.md`) & checklists (`references/`) |

---

## 3. Non-Negotiable Architecture & Domain Rules

1. **Feature-Based Isolation:** All code belongs inside `features/` (`auth`, `discovery`, `stays`, `trips`, `weather`, `ai-copilot` on BE; `auth`, `discovery`, `itinerary-planner`, `weather-fallback`, `stay-finder`, `ai-copilot` on FE). Never import another feature's internal files directly.
2. **PostGIS Coordinate Order:** `ST_MakePoint(longitude, latitude)` ALWAYS takes **longitude ($X$) first, latitude ($Y$) second** (WGS84 `SRID 4326`). JSON APIs use `{ lat, lng }`.
3. **AI Anti-Hallucination:** LLM responses MUST be grounded 100% in PostgreSQL/PostGIS via Function Calling (`get_places_by_radius`, `get_weather_forecast`). Never invent place names or addresses.
4. **Weather Conflict Threshold:** `weather_alert_flag = true` iff `is_outdoor === true && rain_probability >= 60`.
5. **Next.js Thin Shell:** Keep `frontend/src/app/` strictly for routing/layouts/metadata; load `react-leaflet` only via `next/dynamic(..., { ssr: false })`.

---

## 4. Mandatory `agent-skills` Routing Table

Before starting any task, read and follow the matching `SKILL.md` in `agent-skills/skills/` (or your installed skill):

| Phase / Task Type | Required Skill (`agent-skills/skills/<name>/SKILL.md`) | When to Activate |
|---|---|---|
| **Session Start / Routing** | `using-agent-skills` | Unsure which workflow applies |
| **Clarify Requirements** | `interview-me`, `idea-refine` | Requirements are ambiguous or underspecified |
| **Spec & Constraints** | `spec-driven-development`, `constraint-driven-development` | Defining new features, PRDs, or quality thresholds |
| **Task Breakdown** | `planning-and-task-breakdown` | Splitting a feature or phase into atomic tasks |
| **API & DB Contracts** | `api-and-interface-design` | Designing/changing endpoints, DTOs, or module boundaries |
| **UI & Map Workspace** | `frontend-ui-engineering` | Building Next.js pages, Timeline DnD, Map layers, or drawers |
| **Framework Verification** | `source-driven-development` | Verifying NestJS v11, Next.js 15, TypeORM PostGIS, or `@dnd-kit` APIs |
| **Implementation** | `incremental-implementation`, `test-driven-development` | Writing production code in thin vertical slices with tests first |
| **High-Stakes Decisions** | `doubt-driven-development` | Spatial queries, transactions, auth, or AI tool-calling logic |
| **Runtime & Debugging** | `debugging-and-error-recovery`, `browser-testing-with-devtools` | Fixing bugs, inspecting DOM/network/Leaflet runtime behavior |
| **Review & Hardening** | `code-review-and-quality`, `security-and-hardening`, `performance-optimization`, `code-simplification` | Before merging PRs, auditing OWASP/JWT/PostGIS speed, or refactoring |
| **Git & Delivery** | `git-workflow-and-versioning`, `documentation-and-adrs`, `shipping-and-launch` | Commits, branches, ADRs, or production readiness |

### Sub-Directory Instructions
- Working on **Backend** (`backend/`): Read [backend/AGENT.md](backend/AGENT.md).
- Working on **Frontend** (`frontend/`): Read [frontend/AGENT.md](frontend/AGENT.md).
