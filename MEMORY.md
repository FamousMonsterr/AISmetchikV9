# MEMORY (обновлено: 27 марта 2026)

## Обновление 27 марта 2026
- Проведен аудит веток и очищены refs:
  - удалены merged/устаревшие ветки `feature/credits-sbp-templates`, `plan-models-abtest`, `chore/deps-node24-telegraf-exceljs`, `feat/bots-crm-subdomains-hardening`, `codex/implement-logo-with-scaling-rules`;
  - локально оставлен только `codex-release-backup` как резерв до финального ручного разбора.
- Собран рабочий реестр изменений:
  - `TODO.md`;
  - `docs/telegram-bot-setup.md`.
- Passkey:
  - client-side WebAuthn/base64url сериализация переведена на browser-safe путь без хрупкой зависимости от node-style encode/decode;
  - `credential.id/rawId` нормализуется единообразно при регистрации и логине;
  - login/profile UI для passkey упрощен до коротких действий без лишних пояснений.
- Telegram:
  - webhook URL теперь может автоматически выводиться из `NEXTAUTH_URL` / `NEXT_PUBLIC_SITE_URL`;
  - для `aismetchik.ru` поддерживаются канонические surface URL:
    - root: `/api/telegram/webhook`
    - `lk/admin/crm/partner`: `/api/telegram/webhook/<audience>`;
  - шаблоны `.env.example` и `deploy/.env.vds.example` обновлены готовыми production-примерами.
- Локально подтверждено после этих правок:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run test` ✅
  - `npm run build` ✅

## Обновление 24 марта 2026
- Пакет `feat: unify storage admin and auth bot controls` rebased поверх актуального `origin/main`.
- После ребейза подтверждено локально:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run test` ✅
  - `npm run build` ✅
- GitHub Secrets для `external-checks` теперь заведены:
  - `E2E_BASE_URL`
  - `E2E_USER_EMAIL`
  - `E2E_USER_PASSWORD`
- S3-админка сведена к одной канонической странице `/dashboard/admin/s3` с bucket-first моделью:
  - отдельные вкладки по назначениям `analysis`, `avatars`, `user_docs`, `project_docs`;
  - per-bucket primary/backup preset и bucket routing;
  - дублирующие `S3Info`/`S3Testing` выведены из рабочего контура.
- Логовая нагрузка вынесена в отдельную MongoDB:
  - `MONGODB_LOGS_URI`, `MONGODB_LOGS_DB`;
  - логовые коллекции маршрутизируются отдельно от основной БД;
  - индексы на log DB и main DB разделены в `scripts/create-mongo-indexes.ts`.
- Auth/Bots:
  - Google login убран из runtime-контура;
  - основной вход: `email/phone + password`;
  - passkey сохранён;
  - добавлены Telegram Mini App + Telegram Web login;
  - добавлен VK auth/linking + VK webhook bot surface;
  - профиль получил блок `Связанные аккаунты` для Telegram/VK;
  - admin runtime для ботов сведён в `/dashboard/admin/bots` с вкладками `Telegram` и `VK`.
- Доведены критичные связки auth/bots:
  - `telegramChatId`/`vkId` проверяются на конфликт с другим пользователем;
  - popup-link VK возвращает данные аккаунта без принудительного reload;
  - ручное редактирование `telegramUsername` из профиля убрано, связь теперь provider-backed.
- Актуальные локальные проверки после правок:
  - `npm run lint` ✅
  - `npm run typecheck` ✅
  - `npm run test` ✅
  - `npm run build` ✅
- Build остаётся с прежним неблокирующим warning от `next.config.js -> /api/db` про NFT trace.

## Что сделано в сессии 22 марта 2026
- Исправлен production-контур повтора серверного анализа:
  - `restartProcessingRequestWithQueue` теперь атомарно создает новую `server_analysis_job` и сразу обновляет проект;
  - `HistorySection` больше не делает второй клиентский вызов в `/api/server-analysis` после server action;
  - исходные параметры повтора сохраняются в `analysisSource`.
- Исправлена обработка terminal state:
  - `failProcessingRequest` теперь пишет `processingStage`, `processingStageMessage`, `processingStageUpdatedAt`;
  - worker при падении/отмене выставляет проекту terminal stage `failed/cancelled`.
- Исправлен сценарий OCR privacy restriction:
  - ошибка OpenRouter `No endpoints available matching your guardrail restrictions and data policy` распознается отдельно;
  - пользователю показывается понятное сообщение про `OpenRouter Settings -> Privacy`;
  - OCR loop не пытается бессмысленно прогонять остальные OpenRouter-backed engines.
- Усилено удаление проектов:
  - каскадно удаляются `requests`, `server_analysis_jobs`, `project_event_logs`, `notifications`.
- Усилена межсервисная навигация:
  - `src/lib/navigation.ts` теперь содержит `resolveSurfaceUrl`, `canAccessAdminSurface`, `canAccessCrmSurface`, `canAccessPartnerSurface`;
  - ссылки на `LK / Профиль / Админ / CRM / Партнёры` добавлены в `dashboard`, `admin`, `crm`, `partner`;
  - исправлен расчет cross-surface redirect URL.
- Проверки:
  - `npm run typecheck` через WSL: success
  - `npm run lint` через WSL: success
  - `npm run build` через WSL: success
- Наблюдение по окружению:
  - в текущей PowerShell-сессии `npm` не в PATH; рабочий обходной путь: запускать проверки через `wsl.exe`.
  - repo-local skills не найдены; дополнительных установок в этой сессии не потребовалось.

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
