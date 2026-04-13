# Dependency Migration Report (2026-03-01)

## Цель
Полная миграция в отдельной ветке `chore/deps-node24-telegraf-exceljs`:
- Node.js 24+ во всех контурах;
- обновление core stack (Next/React/TypeScript/ESLint);
- миграция Telegram SDK на `telegraf` + `@tma.js/*`;
- полная замена `xlsx` на `exceljs`.

## Что изменено

### Runtime / CI / Docker
- `package.json`: `engines.node = ">=24"`
- добавлен `.nvmrc` со значением `24`
- `Dockerfile`: все стадии переведены на `node:24-alpine`
- `.github/workflows/ci.yml`: `node-version: 24`

### Core stack
- `next` -> `16.1.6`
- `react` / `react-dom` -> `19.2.x`
- `eslint` -> `9.x` + flat config (`eslint.config.mjs`)
- `typescript` -> `5.9.x`
- обновлены `@types/node`, `@types/react`, `@types/react-dom`

### Telegram migration
- удалены:
  - `node-telegram-bot-api`
  - `@types/node-telegram-bot-api`
  - `@telegram-apps/init-data-node`
- добавлены:
  - `telegraf`
  - `@tma.js/init-data-node`
  - `@tma.js/types`
  - `@tma.js/transformers`
- введен совместимый адаптер:
  - `src/lib/telegram/telegraf-compat.ts`
- все серверные/action Telegram пути переведены на адаптер.

### Excel migration
- удален пакет `xlsx`
- добавлен пакет `exceljs`
- заменены импорты и логика:
  - `src/services/excelGenerator.ts` (генерация XLSX)
  - `src/server-functions/analysis/nonPdfParser.ts` (парсинг XLSX)
  - `src/services/excel/browserExcel.ts` (client import/export)
  - `src/app/dashboard/price-base/page.tsx` (импорт/экспорт)
  - `tests/non-pdf-parser.test.ts` (тестовые XLSX буферы)

## Security итог
`npm audit --omit=dev`:
- Critical: `0`
- High: `0`
- Moderate: `0`
- Low: `20`

Критичные/high проблемы baseline (Next/request/xlsx цепочки) устранены.

## Валидация
Пройдено локально:
- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`

## Известные предупреждения
1. `next build` выводит предупреждения о Node API в `scripts/local-log.js` при Edge-контексте (`instrumentation`/`api/db`).
2. Локально не удалось выполнить `docker build`, т.к. в среде выполнения недоступен Docker daemon.

## Рекомендации перед merge в main
1. Прогнать GitHub Actions CI на ветке.
2. Прогнать `Deploy VDS` (manual) и smoke:
   - `/api/healthz`
   - auth redirect
   - telegram webhook endpoint
   - import/export XLSX
   - `/dashboard/billing`, `/dashboard/price-base`
3. После успешного smoke — открыть PR в `main`.
