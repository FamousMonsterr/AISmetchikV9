# Server Functions: queue + worker pipeline

This document describes the server-side analysis pipeline and how it coexists
with the legacy client-side flow. The goal is to keep Free users on the client
path while paid plans run on the server queue.

## Modes and gating
- Controlled by AppSettings (Admin -> General settings):
  - `serverFunctionsEnabled`
  - `serverFunctionsMode`: `client` | `server`
  - `serverFunctionsPaidOnly`
  - `serverFunctionsAllowedPlans`
- The client decides which pipeline to use in `src/components/ProcessingDialog.tsx`.

## Client pipeline (legacy)
Used for Free users or when server functions are disabled.
- Hash file (SHA1) and check S3 cache.
- Create presigned URL and upload file to S3 if needed.
- Check analysis cache.
- Call AI directly from the client.
- Save result to `requests` and update status.

## Server pipeline (paid)
Used when server functions are enabled and the plan is allowed.
1. Client computes SHA1 and uploads file to S3 if needed.
2. Client creates a draft project via `createProcessingRequest`.
3. Client calls `POST /api/server-analysis` with file metadata (enqueue only).
4. Server validates settings, plan, and credits.
5. Job is created in `server_analysis_jobs` with status `queued` and idempotency key.
6. Project is linked to the job via `serverJobId` and stage `queued`.
7. Worker processes queued jobs:
   - Atomically claim job (`queued -> running`) via `findOneAndUpdate`
   - Check `s3_file_cache` and `file_analysis_cache`
   - If cached: persist result and mark `succeeded`
   - Else: call AI (`generateJson`), validate, `finalizeProcessingRequest`
8. Notifications and logs are emitted for success/failure/cancel.

Key files:
- `src/server-functions/analysis/jobService.ts`
- `src/server-functions/analysis/jobRunner.ts`
- `src/server-functions/analysis/worker.ts`
- `src/app/api/server-analysis/route.ts`

## Queue and priority policy
Queue source: `server_analysis_jobs` where `status == queued`.

Target priority rule:
- For each 3 jobs from a higher plan, process 1 job from the next lower plan.
- Tiers: Enterprise > Business > PRO > Free (Free is reserved for future).
- Weight example that satisfies the 3:1 ratio between adjacent tiers:
  - Enterprise: 27
  - Business: 9
  - PRO: 3
  - Free: 1

Current implementation note:
- Worker claims jobs with weighted round-robin by plan and atomic status transition.
- Claiming by status filter (`queued`) protects against duplicate execution in parallel workers.

## Statuses and fields
`server_analysis_jobs`:
- `status`: queued | running | succeeded | failed | cancelled
- `logs`: array of `{ timestamp, message, stage }`

`requests`:
- `serverJobId`
- `processingStage`
- `processingStageMessage`
- `processingStageUpdatedAt`

Stage labels are defined in `src/lib/server-analysis-stages.ts`.

## Admin and operations
- Admin page: `/dashboard/admin/server-functions`
  - Run worker once
  - Requeue failed/cancelled
  - View recent jobs and logs
- Health endpoint: `GET /api/health`
- CLI worker: `npm run worker:server-analysis` (cron/pm2)

## API endpoints
- `POST /api/server-analysis`: create job and start background run
- `POST /api/server-analysis/cancel`: cancel a job
- `POST /api/admin/server-functions/run-worker`: run worker once
- `POST /api/admin/server-functions/requeue`: requeue failed/cancelled jobs

## Notifications and logging
- User notifications: `dispatchNotification` (success/failed/cancelled).
- Project events: `logProjectEvent` in server runner.
- Error reporting: `reportUserBug` on server failures.
