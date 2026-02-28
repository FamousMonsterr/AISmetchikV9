# Performance Status (2026-02-28)

## Honest Lighthouse (Authenticated Session)

Run method:
- Playwright login/registration + auth cookies
- Lighthouse mobile + desktop for:
  - `/dashboard/billing`
  - `/dashboard/price-base`

Results:
- `/dashboard/billing`:
  - mobile: score `71`, FCP `1.0s`, LCP `4.0s`, SI `2.3s`, TBT `620ms`
  - desktop: score `99`, FCP `0.3s`, LCP `0.9s`, SI `0.8s`, TBT `10ms`
- `/dashboard/price-base`:
  - mobile: score `60`, FCP `1.1s`, LCP `4.7s`, SI `2.7s`, TBT `1010ms`
  - desktop: score `99`, FCP `0.3s`, LCP `0.8s`, SI `0.9s`, TBT `0ms`

Artifacts:
- `.artifacts/lighthouse-auth/*`

## Plan Coverage Against Requested 1-6

### 1. Speed Index / FCP / LCP / TTI
- Done:
  - dynamic splitting of heavy dashboard modules
  - root layout server-first split
  - lazy script loading for Telegram web SDK
- In progress:
  - mobile SI/LCP on billing/price-base still above target
- Not done:
  - explicit TTI regression gate in CI

### 2. JavaScript Optimization
- Done:
  - reduced JS for `/dashboard/billing` and `/dashboard/price-base`
  - lazy-loaded `xlsx` and heavy dialogs/history modules
  - reduced static admin settings imports via dynamic tabs
  - reduced `/partnership` first-load JS from `~391kB` to `~168kB` via section-level lazy loading
- In progress:
  - high mobile TBT remains for `/dashboard/price-base`
- Not done:
  - full INP optimization cycle on real-user traces
  - full forced reflow audit across all routes

### 3. CSS Optimization
- Done:
  - no regressions in build CSS pipeline and route splitting
- In progress:
  - partial cleanup through component lazy loading
- Not done:
  - dedicated unused CSS audit and removal pass
  - critical CSS extraction/inline strategy

### 4. Network Request Optimization
- Done:
  - non-critical third-party scripts delayed
  - health endpoint and render path cleanup
- In progress:
  - render-blocking requests reduced on key routes
- Not done:
  - full dependency tree optimization for every route
  - lazy media audit for all route components

### 5. Cache & Storage
- Done:
  - cache headers for static assets and health endpoints
  - standalone Next runtime and slimmer deploy image
- In progress:
  - deploy-level static file lifecycle tuning
- Not done:
  - CDN rollout (pending infra decision)

### 6. General Technical Optimization
- Done:
  - deprecated stub package cleanup (partial)
  - post-deploy metric collection scripts prepared
- In progress:
  - route-level hot spots are being optimized iteratively
- Not done:
  - full API overfetch audit across all pages
  - production web-vitals collection dashboard and alert thresholds

## Current Top First-Load JS Hotspots (Build)

- `/dashboard/admin` `273kB`
- `/dashboard/companies` `269kB`
- `/dashboard/bonus` `262kB`
- `/dashboard/admin/s3` `209kB`
- `/dashboard/admin/users` `202kB`
- `/dashboard/admin/notifications` `200kB`

## Next Performance Iteration (Priority)

1. `/dashboard/price-base` mobile TBT (largest bottleneck)
2. `/dashboard/admin` + `/dashboard/companies` chunk isolation
3. `/dashboard/bonus` heavy module split
4. add CI lighthouse budget checks for target routes
