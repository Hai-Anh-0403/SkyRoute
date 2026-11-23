# SkyRoute Deployment & Rollback Runbook (`docs/RUNBOOK.md`)

> **Target Architecture:** Self-hosted Docker Compose (`docker-compose.yml` + `docker-compose.prod.yml`) running PostgreSQL 16 / PostGIS 3.4, Redis 7, NestJS v11 Backend (`:3001`), and Next.js 15 Standalone Frontend (`:3000`).

---

## 1. Pre-Deploy Checklist

1. **CI Gate:** Confirm all 3 jobs in `.github/workflows/ci.yml` (`backend-quality`, `backend-live-postgis-e2e`, `frontend-quality`) pass on target commit.
2. **Environment Secrets (`.env`):**
   - `NODE_ENV=production`
   - `JWT_ACCESS_SECRET` & `JWT_REFRESH_SECRET` (distinct, random >= 32 characters, rotated only during planned cutover)
   - `DB_USERNAME`, `DB_PASSWORD`, `DB_NAME`
   - `FRONTEND_URL` and `NEXT_PUBLIC_API_BASE_URL` matching the public origin
3. **Database Backup (Mandatory before schema migrations):**
   ```bash
   docker exec skyroute-postgres pg_dump -U skyroute -d skyroute_db -F c -f /tmp/skyroute_pre_deploy.dump
   docker cp skyroute-postgres:/tmp/skyroute_pre_deploy.dump ./backup_pre_deploy.dump
   ```

---

## 2. Production Build & Deploy Procedure

```powershell
# 1. Start core data stores (PostgreSQL 16/PostGIS 3.4 + Redis 7)
docker compose up -d postgres redis

# 2. Apply pending forward TypeORM migrations (never use synchronize: true)
npm --prefix backend run migration:run

# 3. Seed PoC catalog only on a fresh/empty database (WARNING: dalat.seeder.ts clears places/stays/trips first)
# npm --prefix backend run seed

# 4. Build and start production application containers
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend
```

---

## 3. Post-Deploy Verification & Telemetry Checks

| Check | Expected Output |
|---|---|
| Container health (`docker compose -f docker-compose.yml -f docker-compose.prod.yml ps`) | All 4 services (`postgres`, `redis`, `backend`, `frontend`) report `Up (healthy)` |
| Deep Readiness (`curl -i http://localhost:3001/api/v1/health/ready`) | HTTP `200`, `x-request-id` header present, `checks.database.status === "up"`, `checks.redis.status === "up"` |
| Frontend SSR (`curl -I http://localhost:3000/explore/da-lat`) | HTTP `200`, security headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff` |
| Structured JSON logs (`docker logs --tail 50 skyroute-backend`) | Single-line JSON logs containing `requestId`, `feature`, `durationMs`, `outcome`, zero secrets/tokens |

---

## 4. Incident Thresholds & Kill-Switch Controls

| Condition / Threshold | Action |
|---|---|
| `/api/v1/health/ready` returns `503` for `> 60s` or error rate `>= 5%` of `5xx` responses over 3 minutes | Freeze traffic, inspect `docker logs skyroute-backend`, execute container rollback (Section 5) |
| PostGIS Radar or Centroid KNN latency p95 exceeds `50ms` | Run `npm --prefix backend run benchmark:spatial` and `ANALYZE places; ANALYZE stays;` |
| **AI Copilot / Gemini degradation** (`AI_002` `504` spike, upstream quota exhaustion, or unexpected output) | Activate **AI Provider Kill-Switch**: set `GEMINI_API_KEY=` (empty) in `.env` and recreate `backend` (`docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --force-recreate backend`). `AiCopilotService` immediately routes all Plan B reasons and itinerary generation through its deterministic grounded PostGIS fallback with zero downtime. |

---

## 5. Rollback Procedure

### A. Application Container Rollback (No Schema Change)
```powershell
git checkout <last-known-good-tag-or-sha>
docker compose -f docker-compose.yml -f docker-compose.prod.yml build backend frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend frontend
curl.exe -fsS http://localhost:3001/api/v1/health/ready
```

### B. Reversible Database Migration Rollback
> Only revert migrations after stopping `backend` writers to prevent ORM/schema mismatch, and always retain a `pg_dump` backup first.

```powershell
# 1. Stop API writers first
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend

# 2. Revert the latest migration (executes reversible down() method)
npm --prefix backend run migration:revert

# 3. Verify users/schema state
docker exec skyroute-postgres psql -U skyroute -d skyroute_db -c "SELECT * FROM migrations ORDER BY id DESC LIMIT 5;"

# 4. Redeploy previous backend revision and verify readiness
git checkout <last-known-good-tag-or-sha>
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend frontend
curl.exe -fsS http://localhost:3001/api/v1/health/ready
```

### C. Full Snapshot Restore (Worst-Case Data Corruption)
```powershell
docker compose -f docker-compose.yml -f docker-compose.prod.yml stop backend
docker cp ./backup_pre_deploy.dump skyroute-postgres:/tmp/restore.dump
docker exec skyroute-postgres pg_restore -U skyroute -d skyroute_db --clean --if-exists /tmp/restore.dump
docker compose -f docker-compose.yml -f docker-compose.prod.yml start backend
```
