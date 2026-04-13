# AI Smetchik MVP Performance Plan

## Baseline From Deploy/Build Logs

- `next build` baseline before optimization:
  - `/dashboard` first load JS: `1.07 MB`
  - `/dashboard/mobile-panel` first load JS: `859 kB`
  - Shared first load JS: `88.6 kB`
- Deploy/build pain points:
  - Docker image extraction failed before due disk pressure (`no space left on device`).
  - Extra container size due full `node_modules` copy into runtime image.
  - Font fetch retries from Google during build.
  - Many deprecated package warnings in `npm ci`.

## Sequential Plan (With Git Checkpoints)

1. Speed Index / FCP / LCP / TTI
- Split heavy dashboard chunks with dynamic imports.
- Keep root layout server-first and move client logic to client shell.
- Load non-critical Telegram SDK lazily.
- Git checkpoint: `perf(layout+dashboard): reduce initial client payload`

2. JavaScript Optimization
- Defer heavy dialogs/history panels until needed.
- Remove markdown parser from dashboard welcome modal.
- Enable package import optimization in Next config.
- Git checkpoint: `perf(js): lazy load heavy ui modules`

3. CSS Optimization
- Keep critical styles in app shell, move non-critical ui to lazily loaded chunks with components.
- Audit large utility/style hotspots after new Lighthouse run.
- Git checkpoint: `perf(css): remove dead styles after audit`

4. Network Request Optimization
- Reduce render-blocking scripts (`beforeInteractive` -> `afterInteractive` / `lazyOnload`).
- Keep async loading strategy for optional third-party scripts.
- Git checkpoint: `perf(network): unblock render path`

5. Cache & Storage
- Add explicit caching headers for static assets and health endpoint policy.
- Use standalone Next output to reduce image size and deployment disk usage.
- Git checkpoint: `perf(cache+docker): optimize runtime image and headers`

6. Technical Optimization / Legacy
- Remove obvious deprecated stub package (`@types/react-pdf`).
- Keep dependency modernization in small safe batches after CI green.
- Git checkpoint: `chore(deps): remove deprecated stubs`

## Implemented In Current Iteration

- Dynamic imports for heavy dashboard modules.
- Root layout refactor: server layout + client shell.
- Telegram script switched to lazy load.
- Next config:
  - `output: "standalone"`
  - `reactStrictMode: true`
  - `optimizePackageImports` for icon/date/lodash stacks
  - cache headers for static assets and `/api/health`
- Docker:
  - separate `runner` target (standalone web image)
  - separate `worker` target (full worker runtime)
  - compose updated to build per-target images (`ai-smetchik-web`, `ai-smetchik-worker`)
- Removed `@types/react-pdf` dev dependency.

## Post-Change Build Snapshot

- `/dashboard` first load JS: `194 kB` (from `1.07 MB`)
- `/dashboard/mobile-panel` first load JS: `180 kB` (from `859 kB`)
- Shared first load JS: `88.9 kB`

## Next Targeted Iteration

- Focus on `/dashboard/billing` and `/dashboard/price-base` chunks (still heavy).
- Add Web Vitals telemetry capture (LCP/INP/TBT proxies) from production sessions.
- Run Lighthouse (mobile + desktop) after deploy and set threshold gates in CI.
