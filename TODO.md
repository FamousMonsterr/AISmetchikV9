# TODO (ветки, auth, cleanup)

## 0. Зафиксированный контекст аудита
- `AGENT.md` требует:
  - работать на русском;
  - перед любым релизом в `main` прогонять `npm run typecheck`, `npm run lint`, `npm run build`;
  - в конце сессии просматривать `.localhost.log`;
  - считать `src/lib/navigation.ts` и `src/proxy.ts` источником правды для переходов между surface-ами.
- `MEMORY.md` и `AGENT.md` подтверждают, что в `main` уже влиты крупные пакеты:
  - `credits-sbp-templates`;
  - `plan-models-abtest`;
  - `deps-node24-telegraf-exceljs`;
  - большая часть `feat/bots-crm-subdomains-hardening`;
  - passkey/Telegram/VK auth контур уже существует, но требует стабилизации UX и runtime.
- MCP в текущей сессии пустой:
  - `list_mcp_resources` => `0`;
  - `list_mcp_resource_templates` => `0`.
- Локально доступный релевантный skill:
  - `aismetchik-prod-ops`.

## 1. Решения по веткам

### 1.1 Принять как уже влитые, затем удалить refs
- [x] `feature/credits-sbp-templates`
  - Статус: полностью ancestor в `main`.
  - Решение: принять как закрытую/влитую, удалить локальную и remote ref.
- [x] `plan-models-abtest`
  - Статус: полностью ancestor в `main`.
  - Решение: принять как закрытую/влитую, удалить локальную и remote ref.
- [x] `origin/chore/deps-node24-telegraf-exceljs`
  - Статус: полностью ancestor в `main`.
  - Решение: принять как закрытую/влитую, удалить remote ref.

### 1.2 Отклонить как устаревшие / регрессивные
- [x] `origin/feat/bots-crm-subdomains-hardening`
  - Статус: `1 ahead / 17 behind` относительно `main`.
  - В `main` уже есть более новые auth/release/smoke фиксы и часть коммитов из этой ветки уже переиграна.
  - Единственный уникальный хвостовой коммит по UI уже повторён в `main` как отдельный commit (`fix(ui): remove gradient styling from form actions`).
  - Решение: не merge-ить ветку целиком, закрыть и удалить remote ref.
- [x] `origin/codex/implement-logo-with-scaling-rules`
  - Статус: очень старая, основана на ранней истории, затрагивает древнюю структуру файлов (`Logo.tsx`, `components/Logo.tsx`, `app/...` вне `src/`).
  - Решение: не merge-ить, проверить только нужен ли сам SVG-asset; если текущий `src/components/Logo.tsx` устраивает, ветку удалить.

### 1.3 Разобрать вручную перед удалением
- [ ] `codex-release-backup`
  - Статус: сильно diverged от `main`, содержит 9 уникальных коммитов.
  - Ветка содержит шум:
    - `.next.pre-restart-*`;
    - `.localhost.log`;
    - `tsconfig.tsbuildinfo`;
    - следы промежуточных артефактов.
  - Полезный смысл ветки:
    - попытка упростить UI;
    - пакет passkey/auth оркестрации;
    - часть release/smoke правок.
  - Риск:
    - branch не может быть влит целиком;
    - часть идей уже в `main`, часть устарела, часть конфликтует с текущим auth/runtime.
  - Решение:
    - извлечь только точечные полезные идеи;
    - после extraction ветку закрыть и удалить локально.

## 2. Что удалить или нормализовать в git-дереве
- [ ] Убедиться, что в истории и рабочем дереве не живут build artifacts:
  - `.next*`;
  - `tsconfig.tsbuildinfo`;
  - локальные логи.
- [ ] Уточнить судьбу untracked файлов в корне:
  - `.firebaserc`;
  - `src/.firebaserc`;
  - `est-smetter-firebase-adminsdk-fbsvc-e5d604b115.json`.
- [x] Если это локальные секреты/миграционные артефакты:
  - не коммитить;
  - при необходимости добавить/уточнить `.gitignore`.
  - Решение: добавлены явные ignore-правила для `.firebaserc`, `src/.firebaserc`, `est-smetter-firebase-adminsdk-fbsvc-e5d604b115.json`.

## 3. Дубли и параллельные реализации
- [ ] Проверить необходимость обёртки [`src/components/SpecificationPageContent.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/SpecificationPageContent.tsx)
  - Сейчас это thin-wrapper над [`src/components/calculator/SpecificationPageContent.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/calculator/SpecificationPageContent.tsx).
  - Решение: либо оставить как адаптер и явно назвать роль, либо убрать и заменить импортами на канонический путь.
- [ ] Проверить смысл разделения auth-компонентов:
  - [`src/components/auth/LoginForm.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/auth/LoginForm.tsx);
  - [`src/components/auth/PasskeyPanel.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/auth/PasskeyPanel.tsx);
  - [`src/components/auth/CompactPasskeyAuth.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/auth/CompactPasskeyAuth.tsx).
  - Вероятный итог: один канонический компактный passkey UX, без двух параллельных визуальных паттернов.
  - Решение: `CompactPasskeyAuth` удалён, активный контур оставлен только на `LoginForm + PasskeyPanel`.
- [ ] Проверить legacy-следы по auth-архитектуре из старых веток:
  - упоминания Google auth в docs/backup контуре;
  - старые ожидания по `middleware` vs `proxy`;
  - устаревшие описания в `MEMORY.md`/docs.

## 4. Telegram auth и webhooks

### 4.1 Где именно настраивать
- [ ] Канонические env-поля уже есть в `EnvSettings` и в `.env.example`:
  - `TELEGRAM_BOT_TOKEN`;
  - `TELEGRAM_BOT_SECRET_TOKEN`;
  - `TELEGRAM_BOT_WEBHOOK_URL`;
  - `TELEGRAM_BOT_TOKEN_USER`;
  - `TELEGRAM_BOT_SECRET_TOKEN_USER`;
  - `TELEGRAM_BOT_WEBHOOK_URL_USER`;
  - `TELEGRAM_BOT_TOKEN_PARTNER`;
  - `TELEGRAM_BOT_SECRET_TOKEN_PARTNER`;
  - `TELEGRAM_BOT_WEBHOOK_URL_PARTNER`;
  - `TELEGRAM_BOT_TOKEN_MANAGER`;
  - `TELEGRAM_BOT_SECRET_TOKEN_MANAGER`;
  - `TELEGRAM_BOT_WEBHOOK_URL_MANAGER`;
  - `TELEGRAM_BOT_TOKEN_ADMIN`;
  - `TELEGRAM_BOT_SECRET_TOKEN_ADMIN`;
  - `TELEGRAM_BOT_WEBHOOK_URL_ADMIN`;
  - `NEXT_PUBLIC_TELEGRAM_BOT_URL`;
  - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`;
  - `NEXT_PUBLIC_TELEGRAM_WEBAPP_URL`;
- [ ] Для production/VDS использовать шаблон из `deploy/.env.vds.example`.

### 4.2 Куда именно должны смотреть webhook URL
- [ ] `default`: `https://<root-domain>/api/telegram/webhook/default` или единый default URL, если нужен общий бот.
- [ ] `user`: `https://lk.<domain>/api/telegram/webhook/user`
- [ ] `partner`: `https://partner.<domain>/api/telegram/webhook/partner`
- [ ] `manager`: `https://crm.<domain>/api/telegram/webhook/manager`
- [ ] `admin`: `https://admin.<domain>/api/telegram/webhook/admin`
- [ ] Проверить, нужен ли `default` как реальный отдельный бот, или достаточно только audience-specific конфигурации.

### 4.3 Что проверить в коде и UI
- [ ] Прогнать аудит связки:
  - [`src/components/auth/TelegramAuthWidget.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/auth/TelegramAuthWidget.tsx)
  - [`src/lib/telegram-web.ts`](/Users/timofey/Downloads/download%20(1)/src/lib/telegram-web.ts)
  - [`src/lib/auth.ts`](/Users/timofey/Downloads/download%20(1)/src/lib/auth.ts)
  - [`src/server-functions/webhooks/telegram.ts`](/Users/timofey/Downloads/download%20(1)/src/server-functions/webhooks/telegram.ts)
  - [`src/app/api/telegram/webhook/[audience]/route.ts`](/Users/timofey/Downloads/download%20(1)/src/app/api/telegram/webhook/%5Baudience%5D/route.ts)
- [ ] Убедиться, что `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` и/или `NEXT_PUBLIC_TELEGRAM_BOT_URL` реально заполнены в runtime, иначе Telegram Web Login на форме логина не отрисуется.
- [x] Свести login/runtime Telegram к одному серверному resolver:
  - добавлен `src/lib/telegram/runtime.ts`;
  - `/auth/login`, NextAuth и Telegram server actions теперь читают один и тот же runtime-контур из `envSettings` + `process.env` fallback.
- [ ] В админке проверить рабочесть действий:
  - register webhook;
  - clear webhook;
  - ping bot;
  - ping webhook;
  - send test message.
- [ ] Если webhook-адреса не заданы, показывать не абстрактную ошибку, а конкретную подсказку: какой env-параметр отсутствует.
- [x] Реализовать реальную отвязку в самом Telegram-боте:
  - `/unlink` больше не заглушка;
  - в `/profile` бота добавлена inline-кнопка `Отвязать Telegram`.
- [x] Убрать скрытую автоматическую привязку Telegram из `AppContext`:
  - привязка больше не происходит молча на фоне только из-за наличия `initData`.
- [x] Сделать профильный Telegram flow самодостаточным:
  - `Открыть бота` теперь ведёт на deep-link `t.me/<bot>?start=uid_<userId>`;
  - `Проверить после /start` теперь согласован с `refUserId` логикой в боте.
- [x] Вынести `NEXT_PUBLIC_TELEGRAM_WEBAPP_URL` в управляемые admin env:
  - поле добавлено в `EnvSettings`, schema и `.env` persist map;
  - бот использует его для кнопки `Открыть приложение`.

## 5. Passkey / base64 / WebAuthn

### 5.1 Приоритетная гипотеза по багу
- [x] Текущий browser helper использует Node-style base64url через общий encoding слой.
- [x] Нужно убрать хрупкую зависимость клиентского кода от `Buffer`/node-style decoding там, где можно использовать browser-safe реализацию.
- [x] Нужно нормализовать `credential.id` / `rawId` в одном формате перед поиском в store.

### 5.2 Обязательные правки
- [x] Переписать client-side base64url encode/decode на browser-safe helper без скрытых Node assumptions.
- [x] При authenticate/verify использовать нормализованный credential id, чтобы исключить mismatch между `id` и `rawId`.
- [ ] Проверить регистрацию passkey на:
  - desktop browser;
  - повторную регистрацию;
  - вход существующим ключом;
  - удаление ключа.
- [ ] Убедиться, что `PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, `PASSKEY_RP_NAME` корректно попадают из env/admin runtime.
- [x] Добавить ранний runtime guard для неправильного origin:
  - `resolvePasskeyOrigin()` теперь явно роняет mismatch между `PASSKEY_ORIGIN` и origin реального запроса, вместо позднего сломанного WebAuthn verify.
- [x] Защитить verify-контур от просроченных challenge:
  - registration/authentication verify теперь проверяют `expiresAt`.
- [x] Сделать удаление passkey честным:
  - revoke подтверждает изменение записи;
  - API больше не возвращает false-positive success.

### 5.3 UX-правки
- [x] Упростить экран логина:
  - убрать лишние explanatory блоки;
  - не расписывать текстом сценарии passkey/QR/внешнего ключа;
  - оставить короткие CTA и системное окно браузера.
- [x] Упростить подключение passkey в профиле:
  - короткий заголовок;
  - один action на подключение;
  - список ключей без лишней документации на экране.
- [x] Проверить, можно ли сделать passkey action более прямым:
  - кнопка сразу вызывает `navigator.credentials.get/create`;
  - UI только показывает ошибку/успех, а не длинные пояснения.
  - Решение: email/nickname поля убраны из активного UI, passkey сведен к прямым действиям.

## 6. Login/auth cleanup
- [x] Пересобрать [`src/components/auth/LoginForm.tsx`](/Users/timofey/Downloads/download%20(1)/src/components/auth/LoginForm.tsx) в более строгий и короткий сценарий:
  - credentials form;
  - passkey button;
  - VK button;
  - Telegram widget только когда реально настроен;
  - без декоративного текста про `Root + subdomains`, `One credential`, и т.п.
- [x] Проверить, не мешает ли auto-start Telegram Mini App входа обычному login UX.
  - Решение: автозапуск убран, Telegram Mini App login теперь явный и повторяемый по кнопке.
- [ ] Проверить post-auth redirect через [`src/lib/navigation.ts`](/Users/timofey/Downloads/download%20(1)/src/lib/navigation.ts).
- [ ] Проверить shared cookie домен для subdomains:
  - `NEXTAUTH_COOKIE_DOMAIN`;
  - `NEXTAUTH_URL`;
  - TLS/host consistency.

## 7. Документация и память проекта
- [x] Обновить `MEMORY.md` по результатам этой сессии:
  - какие ветки признаны устаревшими;
  - какие удалены;
  - какие auth-фиксы внесены;
  - где теперь канонический Telegram/passkey runtime.
- [ ] При необходимости сократить устаревшие описания в auth docs:
  - [`docs/auth-passkey-implementation-plan-2026-03-22.md`](/Users/timofey/Downloads/download%20(1)/docs/auth-passkey-implementation-plan-2026-03-22.md)
  - старые упоминания Google как приоритетного входа.

## 8. Проверки после правок
- [x] `npm run lint`
- [x] `npm run typecheck`
- [x] `npm run test`
- [x] `npm run build`
- [ ] Smoke логина:
  - credentials;
  - passkey registration;
  - passkey login;
  - Telegram widget rendering при заполненных env;
  - Telegram Mini App login, если есть `initData`;
  - VK login, если env заданы.

## 11. Новые findings после read-only аудита 27 марта 2026
- [x] Свести Telegram login runtime и профиль к одному источнику правды:
  - добавлен `src/lib/telegram/runtime.ts`;
  - `/auth/login`, NextAuth и Telegram server actions больше не зависят только от `process.env`.
- [ ] Проверить `PASSKEY_ORIGIN`/`PASSKEY_RP_ID` на реальном `lk.`-логине:
  - root-origin легко ломает WebAuthn на `lk.aismetchik.ru`;
  - нужен smoke сценарий и, возможно, дополнительная runtime-валидация при сохранении env.
- [ ] Разбить `Admin -> S3`:
  - сейчас это слишком тяжёлый и рискованный монолитный экран;
  - минимум: развести destructive actions, preset management и bucket routing.
- [ ] Свести `Admin -> AI Agent` к одному source of truth:
  - UI пишет конфиг на диск;
  - runtime частично уже переведён на живое чтение `ai-config.json` через `src/lib/ai-config-runtime.ts` в `services/ai`, `services/openrouter`, `auth`, `register`;
  - клиентский слой и вспомогательные UI-импорты ещё используют статический JSON-import;
  - нужен единый путь чтения/применения конфига.
- [ ] Продолжить выпиливание Firebase-лексики:
  - `FirebaseError` в db-layer уже переименован на `DbClientError/DbServerError`;
  - осталось дочистить consumer-слой и тексты.

## 10. CI/CD cleanup по логам 27 марта 2026
- [x] Убрать нестабильный runtime `Node 25.2.1` из репозитория и CI:
  - `package.json -> engines.node` переведён на `>=24 <25`;
  - `.nvmrc` и `.node-version` возвращены на `24`;
  - `Dockerfile` переведён на `node:24-alpine`;
  - workflow теперь берут версию из `.nvmrc`, а не хардкодят `25.2.1`.
- [x] Убрать лишний шум `npm ci` в GitHub Actions:
  - отключены `npm audit` и `npm fund` в CI;
  - установка зависимостей переведена на `npm ci --no-audit --no-fund`.
- [x] Снизить предупреждения GitHub Actions про JavaScript actions runtime:
  - добавлен `FORCE_JAVASCRIPT_ACTIONS_TO_NODE24=true` в workflow env.
- [x] Снизить шум и ускорить `build`:
  - добавлен cache для `.next/cache` в job `build`.
- [x] Снизить шум и ускорить `external-checks`:
  - добавлен cache для `Playwright` browser binaries.
- [x] Разобрать warning `--localstorage-file was provided without a valid path`:
  - первичная проверка repo-кода не нашла ни CLI-флага, ни `NODE_OPTIONS`, ни прямых упоминаний `localstorage-file`;
  - через sourcemap локализован реальный источник: SSR bundle страницы `/dashboard/price-base` подтягивал `xlsx-populate/browser` из [`browserExcel.ts`](/Users/timofey/Downloads/download%20(1)/src/services/excel/browserExcel.ts) через top-level import;
  - исправление: `xlsx-populate/browser` переведён на lazy `import()` внутри `exportPriceBaseToExcel` / `parseExcelRowsFromArrayBuffer`;
  - результат: локальный `next build` под текущим локальным `Node 25` проходит без warning `--localstorage-file`;
  - дополнительный mitigation сохранён: CI/CD и release-контур остаются на `Node 24`.

## 9. Локальный лог
- [x] `.localhost.log` сейчас чистый, ошибок по коду в нём не видно.
- [x] После этой серии правок снова проверить лог, чтобы убедиться, что новые auth/runtime ошибки не появились.
