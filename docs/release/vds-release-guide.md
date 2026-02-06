# VDS релиз (Docker Compose) — чек‑лист

## 1) Архитектура (Compose)
- `web`: Next.js (App Router)
- `worker`: server‑analysis worker (`npm run worker:server-analysis`)
- `mongo`: MongoDB
- `nginx`: TLS + reverse proxy

## 2) Переменные окружения (обязательные)
- `MONGODB_URI`
- `MONGODB_DB`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `NEXT_PUBLIC_SITE_URL`
- `OPENROUTER_API_KEY`
- `TELEGRAM_BOT_TOKEN`
- `SMTP_*` (если нужны письма)
- `S3_*` (если подключаете хранилище)

## 3) Операции перед запуском
1. Создать MongoDB индексы:
   - `npm run mongo:indexes`
2. Если это первый релиз после внедрения леджера кредитов:
   - `npm run credits:migrate`
3. Проверить настройки `enterpriseEmail` в админке.
4. Проверить S3 (endpoint/region/bucket/CORS).
5. Включить `serverFunctionsEnabled` и режим `server` в админке при необходимости.

## 4) Запуск воркера
- Локально/на VDS: `npm run worker:server-analysis`
- Для прод: systemd/pm2/cron с рестартом и логированием.
- Ежедневно (cron): `npm run credits:expire`
- Ежедневно (cron): `npm run pro:auto-approve`
- Ежемесячно (cron): `npm run pro:monthly-credits`

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
- `web`:
  - порт 3000, env из `.env`
  - volume для статики (если нужно)
- `worker`:
  - тот же образ/код, команда `npm run worker:server-analysis`
- `mongo`:
  - volume для данных
- `nginx`:
  - 80/443, proxy на `web:3000`

## 9) Файлы деплоя в репозитории
- `deploy/docker-compose.yml`
- `deploy/nginx/default.conf`
- `Dockerfile` в корне

## 10) После релиза
- Прогонить smoke‑тесты
- Проверить выдачу счетов, Telegram, S3
