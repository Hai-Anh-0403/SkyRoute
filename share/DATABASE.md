Write DATABASE.md based on the project context above.

## Core Features
- Auth & User Management (`auth`): `users`, `refresh_tokens`
- Spatial Discovery & Proximity Radar (`discovery`): `places`
- Centroid Stay Finder (`stays`): `stays`
- Interactive Timeline Planner (`trips`): `trips`, `itinerary_items`
- Weather Sync & Adaptive Plan B (`weather` & `ai-copilot`): `weather_snapshots`, `plan_b_swaps`

## Requirements

### 1. Overview
- Database: PostgreSQL 16 + PostGIS 3.4 Extension (`CREATE EXTENSION IF NOT EXISTS postgis;`)
- Cache Layer: Redis 7.x (Weather forecast cache with `TTL = 30 minutes`, session & rate limit)
- ORM: TypeORM (with NestJS v11, utilizing PostGIS `GEOMETRY(Point, 4326)` and parameterized spatial SQL)
- Naming conventions:
  - Tables: `snake_case`, plural (`users`, `places`, `stays`, `trips`, `itinerary_items`)
  - Columns: `snake_case` (`is_outdoor`, `suitable_weather`, `centroid_location`, `weather_alert_flag`)
  - Foreign keys: `[singular_table]_id` (`user_id`, `trip_id`, `place_id`, `stay_id`)
  - B-Tree Indexes: `idx_[table]_[column]`
  - Spatial Indexes: `idx_[table]_[geom_column]` using `GIST` (`idx_places_location`, `idx_stays_location`)

### 2. Entities by Feature

**Auth Feature (`auth`):**
- `users` (`id`, `email`, `password_hash`, `full_name`, `avatar_url`, `preferences` JSONB, `is_active`, `created_at`, `updated_at`)
- `refresh_tokens` (`id`, `user_id`, `token_hash`, `device_name`, `ip_address`, `user_agent`, `expires_at`, `is_revoked`, `created_at`) — supports multi-device login

**Discovery & Spatial Radar Feature (`discovery`):**
- `places` (`id`, `name`, `city`, `category`, `subcategory`, `is_outdoor`, `has_ac`, `suitable_weather` VARCHAR[], `price_level`, `rating`, `address`, `description`, `thumbnail_url`, `location` GEOMETRY(Point, 4326), `is_active`, `created_at`)
  - `category`: `'attraction' | 'restaurant' | 'cafe'`
  - `subcategory`: `'hotpot' | 'bbq' | 'noodles' | 'refreshment' | 'museum' | 'nature' | 'check_in' | 'workshop'`
  - `is_outdoor`: `BOOLEAN` — CRITICAL for detecting rain/extreme heat conflicts and filtering indoor "Plan B" replacements

**Centroid Stay Finder Feature (`stays`):**
- `stays` (`id`, `name`, `city`, `stay_type`, `price_per_night`, `rating`, `address`, `thumbnail_url`, `location` GEOMETRY(Point, 4326), `amenities` JSONB, `is_active`, `created_at`)
  - `stay_type`: `'hotel' | 'homestay' | 'resort'`
  - `location`: indexed with `GIST` to find accommodations closest to `trips.centroid_location`

**Interactive Timeline Planner Feature (`trips`):**
- `trips` (`id`, `user_id`, `title`, `destination_city`, `start_date`, `end_date`, `status`, `centroid_location` GEOMETRY(Point, 4326) NULLABLE, `created_at`, `updated_at`)
  - `centroid_location`: geometric center $(\bar{x}, \bar{y})$ of all `places` in the trip's itinerary
- `itinerary_items` (`id`, `trip_id`, `place_id` NULLABLE, `stay_id` NULLABLE, `day_number`, `time_slot`, `order_index`, `distance_from_prev_km`, `is_detour_warning`, `weather_condition`, `temperature_c`, `rain_probability`, `weather_alert_flag`, `note`, `created_at`, `updated_at`)
  - `time_slot`: `'morning'` (08:00–11:00), `'lunch'` (11:00–13:00), `'afternoon'` (13:00–17:00), `'dinner'` (17:00–22:00)
  - `weather_alert_flag`: set to `true` automatically when `place.is_outdoor = true` AND `rain_probability >= 60`

**Weather & AI Adaptive Plan B Feature (`weather` & `ai-copilot`):**
- `weather_snapshots` (`id`, `city`, `forecast_date`, `time_slot`, `temperature_c`, `rain_probability`, `weather_code`, `condition_tag`, `fetched_at`) — DB fallback when Redis cache misses or Open-Meteo is unreachable
- `plan_b_swaps` (`id`, `trip_id`, `itinerary_item_id`, `original_place_id`, `replacement_place_id`, `rain_probability_at_swap`, `distance_from_prev_km`, `created_at`) — audit trail for 1-click Plan B swaps

### 3. Relationships
Key relationships:
- `users` 1:N `refresh_tokens`, `trips`
- `trips` 1:N `itinerary_items` (`ON DELETE CASCADE`), `plan_b_swaps`
- `places` 1:N `itinerary_items`
- `stays` 1:N `itinerary_items`
- `places` 1:N `plan_b_swaps` (as `original_place_id` and `replacement_place_id`)

Special cases:
- **Exclusive Activity Reference in `itinerary_items`:** Each item links to either `place_id` (attraction/food/cafe) OR `stay_id` (check-in/rest at accommodation), enforced via a PostgreSQL `CHECK` constraint `(place_id IS NOT NULL OR stay_id IS NOT NULL)`.
- **Dynamic Trip Centroid (`trips.centroid_location`):** Recalculated automatically via PostGIS `ST_Centroid(ST_Collect(p.location))` whenever `itinerary_items` are added, removed, or swapped.
- **Weather Snapshot on `itinerary_items`:** Stores the latest synced `temperature_c`, `rain_probability`, and `weather_alert_flag` directly on each slot item for instant timeline rendering without N+1 queries.
- **`refresh_tokens` Multi-device Support:**
  - On logout: revoke specific token (`is_revoked = true`)
  - On "logout all devices": revoke all tokens for `user_id`

### 4. Conventions
- Primary key: Auto-increment `SERIAL` / `BIGINT` (`id`)
- Spatial Coordinate Standard: WGS84 (`SRID 4326`), stored as `GEOMETRY(Point, 4326)`.
  - **CRITICAL RULE:** PostGIS `ST_MakePoint(longitude, latitude)` ALWAYS takes **longitude ($X$) first, latitude ($Y$) second**.
- Soft delete: `is_active` flag (`users`, `places`, `stays`), `is_revoked` flag (`refresh_tokens`)
- Timestamps: `created_at`, `updated_at` (`TIMESTAMPTZ`, TypeORM `@CreateDateColumn` / `@UpdateDateColumn`)
- Enums & Arrays:
  - `suitable_weather`: PostgreSQL text array `VARCHAR(50)[]` (e.g., `ARRAY['sunny', 'cloudy', 'rainy', 'cold', 'hot']`)
  - `time_slot`: `'morning' | 'lunch' | 'afternoon' | 'dinner'`
  - `trip.status`: `'draft' | 'active' | 'completed' | 'archived'`
- Token storage: store SHA-256 hashed token (`token_hash`), never plain text

### 5. Migration Rules
- Format: `[timestamp]_[description].ts` (e.g., `1710000000000_enable_postgis_and_init_schema.ts`)
- First migration MUST execute `CREATE EXTENSION IF NOT EXISTS postgis;`
- Always reversible (`up` / `down` methods)
- Never use `synchronize: true` outside local unit test environments

## Format
- Use tables for field definitions
- Group by feature
- Include mermaid ERD diagram
- Max 150-200 lines

## TypeORM & PostGIS-Specific
- Use `@Column({ type: 'geometry', spatialFeatureType: 'Point', srid: 4326 })` and `@Index({ spatial: true })` for `location` and `centroid_location`
- **Proximity Radar Query (< 10ms target):** Use `ST_DWithin(place.location::geography, ST_SetSRID(ST_MakePoint(:lng, :lat), 4326)::geography, :radiusMeters)` backed by `GIST` index
- **Centroid Stay Finder Query:** Compute centroid with `ST_Centroid(ST_Collect(p.location))` and query nearest `stays` using the PostGIS KNN distance operator `ORDER BY stay.location <-> :centroidPoint LIMIT 10`
- **Route Detour Calculation:** Compute consecutive slot distances via `ST_DistanceSphere(prev.location, curr.location) / 1000.0` (flag `is_detour_warning = true` if distance $> 8\text{km}$ intra-city)
- **Plan B Indoor Fallback Query:** Filter `places` where `is_outdoor = false`, `'rainy' = ANY(suitable_weather)`, and `ST_DWithin` $\le 3000\text{m}$ from the preceding slot's coordinates

## Core Tables & Spatial Schema Details

### 1. `places` Table Details
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| name | VARCHAR(255) | NOT NULL | Place name |
| city | VARCHAR(100) | NOT NULL | e.g., `'Da Lat'`, `'Da Nang'` |
| category | VARCHAR(50) | NOT NULL | `'attraction'`, `'restaurant'`, `'cafe'` |
| subcategory | VARCHAR(50) | NULLABLE | `'hotpot'`, `'bbq'`, `'museum'`, `'nature'`, `'refreshment'` |
| is_outdoor | BOOLEAN | NOT NULL, DEFAULT TRUE | `true` = Outdoor, `false` = Indoor (Plan B eligible) |
| has_ac | BOOLEAN | DEFAULT FALSE | Air-conditioned space (for $>35^\circ\text{C}$ heatwaves) |
| suitable_weather | VARCHAR(50)[] | NOT NULL | `ARRAY['sunny', 'cloudy', 'rainy']` |
| price_level | SMALLINT | DEFAULT 2 | `1`: Budget, `2`: Moderate, `3`: Premium |
| rating | DECIMAL(2,1) | DEFAULT 4.0 | Average rating (`1.0` – `5.0`) |
| address | TEXT | NULLABLE | Full street address |
| location | GEOMETRY(Point, 4326) | NOT NULL | WGS84 Point (`ST_MakePoint(lng, lat)`) |
| is_active | BOOLEAN | DEFAULT TRUE | Soft delete flag |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

Indexes:
- `idx_places_location` USING `GIST (location)` — spatial radius & KNN lookup
- `idx_places_city_category_outdoor` (`city`, `category`, `is_outdoor`) — composite filter for Plan B & Radar
- `idx_places_suitable_weather` USING `GIN (suitable_weather)` — array containment queries

### 2. `stays` Table Details
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| name | VARCHAR(255) | NOT NULL | Accommodation name |
| city | VARCHAR(100) | NOT NULL | Destination city |
| stay_type | VARCHAR(50) | NOT NULL | `'hotel'`, `'homestay'`, `'resort'` |
| price_per_night | DECIMAL(12,2) | NOT NULL | Nightly rate in VND |
| rating | DECIMAL(2,1) | DEFAULT 4.0 | Guest rating |
| address | TEXT | NULLABLE | Street address |
| location | GEOMETRY(Point, 4326) | NOT NULL | WGS84 Point (`ST_MakePoint(lng, lat)`) |
| amenities | JSONB | DEFAULT `'[]'` | e.g., `["wifi", "parking", "mountain_view", "heater"]` |
| is_active | BOOLEAN | DEFAULT TRUE | |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

Indexes:
- `idx_stays_location` USING `GIST (location)` — fast KNN distance to `trips.centroid_location`
- `idx_stays_city_price` (`city`, `price_per_night`)

### 3. `trips` & `itinerary_items` Table Details
Table: `trips`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| user_id | INT | FK → `users(id)`, NOT NULL | Trip owner |
| title | VARCHAR(255) | NOT NULL | e.g., `"Đà Lạt 3N2Đ Chữa Lành"` |
| destination_city | VARCHAR(100) | NOT NULL | Target city |
| start_date | DATE | NOT NULL | Trip start date |
| end_date | DATE | NOT NULL | Trip end date |
| status | VARCHAR(20) | DEFAULT `'active'` | `'draft'`, `'active'`, `'completed'` |
| centroid_location | GEOMETRY(Point, 4326) | NULLABLE | Geometric center $(\bar{x}, \bar{y})$ of selected places |
| created_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |
| updated_at | TIMESTAMPTZ | DEFAULT CURRENT_TIMESTAMP | |

Table: `itinerary_items`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | SERIAL | PK | |
| trip_id | INT | FK → `trips(id)` ON DELETE CASCADE | Parent trip |
| place_id | INT | FK → `places(id)`, NULLABLE | Selected POI / eatery |
| stay_id | INT | FK → `stays(id)`, NULLABLE | Selected accommodation |
| day_number | SMALLINT | NOT NULL | `1`, `2`, `3`... |
| time_slot | VARCHAR(20) | NOT NULL | `'morning'`, `'lunch'`, `'afternoon'`, `'dinner'` |
| order_index | SMALLINT | NOT NULL | Sort order within the slot (Drag & Drop) |
| distance_from_prev_km | DECIMAL(5,2) | DEFAULT 0.0 | Distance from previous stop in the same day |
| is_detour_warning | BOOLEAN | DEFAULT FALSE | `true` if `distance_from_prev_km > 8.0` |
| temperature_c | DECIMAL(4,1) | NULLABLE | Forecasted slot temperature ($^\circ\text{C}$) |
| rain_probability | SMALLINT | NULLABLE | Forecasted rain probability (`0` – `100`%) |
| weather_alert_flag | BOOLEAN | DEFAULT FALSE | `true` when `is_outdoor = true` & `rain_probability >= 60` |
| note | TEXT | NULLABLE | User note |

Indexes:
- `idx_itinerary_items_trip_day_slot` (`trip_id`, `day_number`, `time_slot`, `order_index`) — timeline rendering & Drag-and-Drop reorder
- `idx_itinerary_items_weather_alert` (`trip_id`, `weather_alert_flag`) WHERE `weather_alert_flag = true` — partial index for conflicted slots

### 4. Redis Caching Keys (Complementing PostgreSQL)
| Key Pattern | Value Type | TTL | Purpose |
|-------------|------------|-----|---------|
| `weather:hourly:{city}:{yyyy-mm-dd}` | JSON (Open-Meteo hourly array) | `1800s` (30m) | Avoid redundant external API calls |
| `trip:centroid:{trip_id}` | JSON `{ lat, lng, updatedAt }` | `3600s` (1h) | Fast centroid stay lookup |
