# Dependency Baseline (2026-03-01)

## Branch / Commit baseline
- Branch: `chore/deps-node24-telegraf-exceljs`
- Date: 2026-03-01

## Command results
- `npm ci`: success
- `npm run lint`: success
- `npm run typecheck`: success
- `npm run test`: success
- `npm run build`: success
- `npm audit --omit=dev --json`: exit code `1` (vulnerabilities found)
- `npm outdated --long`: exit code `1` (outdated packages found)

## Build snapshot
- Next.js: `14.2.35`
- Shared First Load JS: `89.3 kB`
- Key pages:
  - `/dashboard/billing`: `164 kB`
  - `/dashboard/price-base`: `184 kB`

## Security baseline (`npm audit --omit=dev`)
- Total vulnerabilities: `31`
- Critical: `2`
- High: `3`
- Moderate: `5`
- Low: `21`

Key vulnerable packages:
- `next` (high, major update needed)
- `request` transitive via `node-telegram-bot-api` (critical)
- `node-telegram-bot-api` chain (moderate + critical transitive)
- `xlsx` (high, no automatic fix)
- `fast-xml-parser` (low, fix available)

## Deprecation baseline (from install/build logs)
- `@telegram-apps/*` packages are deprecated
- `request`, `har-validator`, `rimraf@3`, `glob@7`, `inflight` deprecated
- `eslint@8` out of support

## Artifacts
Raw outputs are stored in `.artifacts/baseline/`:
- `lint.log`, `typecheck.log`, `test.log`, `build.log`
- `audit-prod.json`
- `outdated.log`
