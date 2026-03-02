# VDS релиз (Docker Compose) — чек‑лист

## 1) Архитектура (Compose)
- `web_landing`: Next.js surface `landing`
- `web_admin`: Next.js surface `admin`
- `web_lk`: Next.js surface `lk`
- `web_crm`: Next.js surface `crm`
- `web_partner`: Next.js surface `partner`
- `web_mobile`: Next.js surface `mobile`
- `worker`: server‑analysis worker (`npm run worker:server-analysis`)
- `mongo`: MongoDB
- `nginx`: TLS + reverse proxy

## 0) Версии runtime
- Node.js: `24.x+` (локально, CI, Docker)
- Docker image: `node:24-alpine`

## 2) Переменные окружения (обязательные)
- `MONGODB_URI`
- `MONGODB_DB`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_BOT_SECRET_TOKEN`
- `TELEGRAM_BOT_WEBHOOK_URL`
- `TELEGRAM_BOT_TOKEN_USER`, `TELEGRAM_BOT_SECRET_TOKEN_USER`, `TELEGRAM_BOT_WEBHOOK_URL_USER`
- `TELEGRAM_BOT_TOKEN_PARTNER`, `TELEGRAM_BOT_SECRET_TOKEN_PARTNER`, `TELEGRAM_BOT_WEBHOOK_URL_PARTNER`
- `TELEGRAM_BOT_TOKEN_MANAGER`, `TELEGRAM_BOT_SECRET_TOKEN_MANAGER`, `TELEGRAM_BOT_WEBHOOK_URL_MANAGER`
- `TELEGRAM_BOT_TOKEN_ADMIN`, `TELEGRAM_BOT_SECRET_TOKEN_ADMIN`, `TELEGRAM_BOT_WEBHOOK_URL_ADMIN`
- `QA_TEST_USER_EMAIL`, `QA_TEST_USER_PASSWORD` (для постоянного QA-аккаунта)
- `SMTP_*` (если нужны письма)
- `S3_*` (если подключаете хранилище), включая:
  - базовый бакет анализа: `S3_BUCKET_NAME`
  - бакеты по назначению: `S3_AVATAR_BUCKET_NAME`, `S3_USER_DOCS_BUCKET_NAME`, `S3_PROJECT_DOCS_BUCKET_NAME`
  - опциональные пресеты по назначению: `S3_AVATAR_PRESET_ID`, `S3_USER_DOCS_PRESET_ID`, `S3_PROJECT_DOCS_PRESET_ID`

## 3) Операции перед запуском
0. Проверить в локальной ветке:
   - `npm run lint`
   - `npm run typecheck`
   - `npm run test`
   - `npm run build`
1. Создать MongoDB индексы:
   - `npm run mongo:indexes`
3. Проверить настройки `enterpriseEmail` в админке.
4. Проверить S3 (endpoint/region/бакеты/CORS), включая назначение бакетов:
   - `analysis` — основной бакет
   - `avatars` — аватары
   - `user_docs` — счета/чеки/подписи/печати
   - `project_docs` — КП/договоры/акты
5. Включить `serverFunctionsEnabled` и режим `server` в админке при необходимости.

## 4) Запуск воркера
- Локально/на VDS: `npm run worker:server-analysis`
- Для прод: systemd/pm2/cron с рестартом и логированием.
- Ежедневно (cron): `npm run credits:expire`
- Ежедневно (cron): `npm run credits:auto-approve`
- Ежедневно (cron): `npm run pro:auto-approve`
- Ежемесячно (cron): `npm run marketing:monthly-credits`

## 5) Мониторинг
- Health: `GET /api/health`
- Логи: stdout + logrotate
- Контроль диска: особенно `mongo` и `uploads`

## 6) Резервные копии
- MongoDB daily dump + retention 7/30 дней
- S3 lifecycle rules (если объектное хранилище)

## 7) Чек‑лист контента
- Домен + DNS
- SSL (Let’s Encrypt)
- Видео для лендинга и партнерского раздела
- Заполнить `knowledge_base_articles` (YouTube/видео‑URLs)

## 8) Пример структуры Compose (описательно)
- `web_landing/web_admin/web_lk/web_crm/web_partner/web_mobile`:
  - каждый сервис на порту 3000 внутри docker-сети
  - `APP_SURFACE` ограничивает допустимые маршруты
- `worker`:
  - тот же образ/код, команда `npm run worker:server-analysis`
- `mongo`:
  - volume для данных
- `nginx`:
  - 80/443, proxy на `web:3000`

## 9) Файлы деплоя в репозитории
- `deploy/docker-compose.vds.yml`
- `deploy/nginx/default.http.conf`
- `deploy/nginx/default.https.conf`
- `.github/workflows/deploy-vds.yml`
- `Dockerfile` в корне

## 10) После релиза
- Прогонить smoke‑тесты
- Проверить выдачу счетов, Telegram, S3
- Прогнать `npm run qa:seed-user` (если включен QA-контур)

## 11) Troubleshooting (TLS и поддомены)
- Если `Deploy VDS` зелёный, но `https://aismetchik.ru` не открывается: проверить, что certbot выпустил сертификат, а не сработал HTTP fallback.
- Если certbot пишет `Invalid response ... 500` для `admin/lk/crm/partner/m`:
  - проверить DNS `A`/`CNAME` для каждого поддомена;
  - убедиться, что поддомены указывают на тот же VDS, где работает `nginx` из `docker-compose.vds.yml`;
  - убедиться, что запрос `http://<subdomain>/.well-known/acme-challenge/test` приходит в ваш nginx, а не в сторонний хостинг.
- Быстрая проверка с локальной машины:
  - `curl -I http://aismetchik.ru/api/healthz` (должен быть `200`, сервер `nginx/1.27.x`)
  - `curl -I http://admin.aismetchik.ru/api/healthz` (если отвечает другой `Server`, DNS указывает не туда)
- После исправления DNS перезапустить `Deploy VDS` вручную и проверить:
  - `https://aismetchik.ru/api/healthz`
  - `https://admin.aismetchik.ru/api/healthz`
  - `https://lk.aismetchik.ru/api/healthz`
