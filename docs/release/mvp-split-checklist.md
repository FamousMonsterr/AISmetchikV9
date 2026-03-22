# MVP Split Checklist (Frontend/Backend)

## 1. Backend repo bootstrap (`ai-smetchik-backend`)
- Move `src/app/api/**`, `src/server-functions/**`, `src/services/**`, `src/actions/**`, `src/lib/mongodb.ts`, `src/lib/db-server.ts`, auth/JWT helpers.
- Keep `scripts/server-analysis-worker.ts` and cron scripts.
- Keep OpenAPI spec: `docs/openapi/v1.yaml`.

## 2. Frontend repo bootstrap (`ai-smetchik-frontend`)
- Move UI app (`src/app/**`, `src/components/**`, `src/contexts/**`) except backend-only API handlers.
- Keep `src/lib/backend-api-client.ts` and switch client calls to `/api/v1/*`.

## 3. Deploy topology
- `frontend` service on `app.*`
- `backend-api` service on `api.*`
- `worker` long-lived service
- shared Mongo + shared object storage

## 4. Cutover sequence
1. Freeze DB schema changes.
2. Deploy backend with `/api/v1/*`.
3. Point frontend `backendBaseUrl` to backend domain.
4. Run smoke flow (login -> upload -> analysis -> finalize -> billing/history).
5. Enable traffic and monitor queue depth / failed jobs for 48h.
