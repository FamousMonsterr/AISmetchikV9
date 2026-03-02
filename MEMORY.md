# MEMORY (обновлено: 1 марта 2026)

## Что сделано в этой сессии
- Оптимизирован `/partnership`:
  - First Load JS снижен примерно с `~391kB` до `~168kB` (lazy секции + облегчение above-the-fold).
  - Обновлен статус в `docs/performance-status-2026-02-28.md`.
- Усилен деплой:
  - обновлен `.github/workflows/deploy-vds.yml`;
  - добавлены fallback-сценарии, чтобы релиз не падал полностью при временном сбое certbot.
- Обновлены nginx-шаблоны для ACME:
  - `deploy/nginx/default.http.conf`
  - `deploy/nginx/default.https.conf`
- Прогнан полный цикл `main`:
  - CI success: `22520778527`
  - Deploy VDS success: `22520820135`

## Что подтверждено по логам/проверкам
- `http://aismetchik.ru/api/healthz` возвращает `200` (`Server: nginx/1.27.5`).
- HTTPS на основном домене пока недоступен извне (таймаут).
- Поддомены `admin/lk/crm/partner/m` отвечают не с текущего VDS (`Server: nginx-reuseport/1.21.1`) — критичный DNS mismatch.
- Certbot в deploy-логах продолжает падать на валидации поддоменов (`Invalid response ... 500`), что согласуется с DNS mismatch.

## Незакрытые блокеры
1. DNS всех поддоменов должен указывать на текущий VDS (тот, где `nginx/1.27.5`).
2. После правки DNS нужно снова запустить `Deploy VDS` для успешного выпуска/обновления TLS.
3. После TLS — повторить авторизованный Lighthouse по:
   - `/dashboard/billing`
   - `/dashboard/price-base`

## Быстрый чек после DNS фикса
- `curl -I http://admin.aismetchik.ru/api/healthz` должен показать тот же сервер, что и root.
- `curl -I https://aismetchik.ru/api/healthz` должен вернуть `200`.
- `curl -I https://admin.aismetchik.ru/api/healthz` должен вернуть `200`.

## Что сделано в сессии (1 марта 2026) — deps/runtime migration
- Создана отдельная ветка миграции: `chore/deps-node24-telegraf-exceljs`.
- Зафиксирован baseline зависимостей и проверок:
  - `docs/tech/deps-baseline-2026-03-01.md`
- Runtime/CI/Docker:
  - Node `24+` в `package.json` (`engines`), `.nvmrc`, CI и Dockerfile.
- Core stack:
  - Next `16.1.6`, React `19.2.x`, TypeScript `5.9.x`, ESLint `9`.
  - Добавлен `eslint.config.mjs` (flat config), lint снова проходит.
- Telegram миграция:
  - `node-telegram-bot-api` и `@telegram-apps/*` удалены.
  - Добавлены `telegraf` и `@tma.js/*`.
  - Добавлен совместимый слой `src/lib/telegram/telegraf-compat.ts`.
  - Все Telegram server/actions переведены на новый адаптер.
- XLSX миграция:
  - `xlsx` полностью удален.
  - Добавлен `exceljs` и переписаны:
    - `src/services/excelGenerator.ts`
    - `src/services/excel/browserExcel.ts`
    - `src/server-functions/analysis/nonPdfParser.ts`
    - `src/app/dashboard/price-base/page.tsx`
    - `tests/non-pdf-parser.test.ts`
- Совместимость с Next 16:
  - Исправлены сигнатуры динамических route handlers (`params: Promise<...>`).
  - Убрана устаревшая опция `experimental.instrumentationHook` из `next.config.js`.
- Итоговые проверки:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run test` ✅
  - `npm run build` ✅
- Security:
  - `npm audit --omit=dev` => `critical=0`, `high=0`.
- Отчет по миграции:
  - `docs/tech/deps-migration-report-2026-03-01.md`.

## Оставшиеся замечания
- `next build` показывает предупреждения Edge-runtime из `scripts/local-log.js` и предупреждение о `middleware` -> `proxy` (не блокирует build).
- Локальный `docker build` в этой сессии не запускался из-за недоступного Docker daemon в окружении агента.

## Обновление 2 марта 2026
- Реализован крупный пакет `bots + CRM + subdomains + QA` в ветке `feat/bots-crm-subdomains-hardening`.
- Telegram:
  - audience-конфиг в `EnvSettings` + персист в `.env`;
  - админ-операции по аудиториям (status/register/clear/ping/test);
  - state/command слой (`src/server-functions/telegram/state.ts`);
  - webhook runtime теперь audience-aware.
- CRM:
  - новый backend слой `src/actions/crmActions.ts` на коллекциях:
    - `crm_deals`, `crm_tasks`, `crm_sla_events`, `crm_activity_log`, `crm_automation_rules`;
  - страница `/crm` переведена на board/table/tasks/timeline/sla.
- Subdomains infra:
  - compose разделен на `web_landing/web_admin/web_lk/web_crm/web_partner/web_mobile`;
  - nginx проксирует по host-prefix в отдельные upstream;
  - middleware ограничивает маршруты по `APP_SURFACE`.
- QA lifecycle:
  - `npm run qa:seed-user`;
  - `DELETE /api/v1/auth/account` + защита `qaProtected`;
  - кнопка self-delete в профиле;
  - e2e-тест: `autoreg_*` регистрация + удаление.
- CI:
  - jobs: `unit`, `integration`, `build`, optional `e2e`, optional `smoke-subdomains`;
  - добавлены scripts `test:unit`, `test:integration`, `test:smoke-subdomains`.
