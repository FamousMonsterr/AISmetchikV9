# AI Сметчик — Архитектура VDS деплоя (Beget)

## Обзор

Развёртывание на выделенных серверах Beget с разделением на публичную и приватную зоны.

```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERNET                                 │
│                          │                                      │
│                          ▼                                      │
│  ┌──────────────────────────────────────────┐                   │
│  │  srv-web (ПУБЛИЧНЫЙ)                     │                   │
│  │  IP: <публичный>                         │                   │
│  │  ┌────────────┐  ┌───────────────────┐   │                   │
│  │  │  nginx     │  │  Next.js surfaces │   │                   │
│  │  │  :80/:443  │──│  landing, lk,     │   │                   │
│  │  │  SSL/TLS   │  │  admin, crm,      │   │                   │
│  │  └────────────┘  │  partner, mobile  │   │                   │
│  │                   └───────────────────┘   │                   │
│  └──────────────────┬───────────────────────┘                   │
│                     │ приватная сеть                            │
│  ┌──────────────────▼───────────────────────┐                   │
│  │  srv-api (ПРИВАТНЫЙ)                     │                   │
│  │  IP: 10.0.0.11                           │                   │
│  │  ┌────────────────┐  ┌────────────────┐  │                   │
│  │  │  Next.js API   │  │  Worker        │  │                   │
│  │  │  (server ops)  │  │  (analysis)    │  │                   │
│  │  └────────────────┘  └────────────────┘  │                   │
│  └──────────┬─────────────────┬─────────────┘                   │
│             │                 │                                  │
│  ┌──────────▼─────┐  ┌───────▼──────────┐  ┌────────────────┐  │
│  │  srv-db         │  │  srv-db-logs     │  │  Beget S3      │  │
│  │  (ПРИВАТНЫЙ)    │  │  (ПРИВАТНЫЙ)     │  │  (облако)      │  │
│  │  IP: 10.0.0.12  │  │  IP: 10.0.0.13   │  │                │  │
│  │  ┌──────────┐   │  │  ┌──────────┐    │  │  buckets:      │  │
│  │  │ MongoDB  │   │  │  │ MongoDB  │    │  │  - main        │  │
│  │  │    7     │   │  │  │    7     │    │  │  - avatars     │  │
│  │  │ main db  │   │  │  │ logs db  │    │  │  - user-docs   │  │
│  │  └──────────┘   │  │  └──────────┘    │  │  - project-docs│  │
│  └─────────────────┘  └──────────────────┘  └────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Данные подключения (CONFIDENTIAL)

### Серверы

| Сервер | IP | Логин | Пароль | Доступ |
|---|---|---|---|---|
| **srv-web** | `5.35.88.53` | root | `<YOUR_PASSWORD>` | Публичный (SSH из интернета) |
| **srv-api** | `10.16.0.2` | root | `<YOUR_PASSWORD>` | Приватный (через srv-web) |
| **srv-db** | `10.16.0.3` | root | `<YOUR_PASSWORD>` | Приватный (через srv-web) |
| **srv-db-logs** | `10.16.0.4` | root | `<YOUR_PASSWORD>` | Приватный (через srv-web) |

### MongoDB

| Сервер | Username | Password | Database |
|---|---|---|---|
| srv-db (10.16.0.3) | `aismetchik` | `<MONGO_PASSWORD>` | `aismetchik` |
| srv-db-logs (10.16.0.4) | `aismetchik_logs` | `<MONGO_LOGS_PASSWORD>` | `aismetchik_logs` |

### Beget S3

| Параметр | Значение |
|---|---|
| Endpoint | `https://s3.ru1.storage.beget.cloud` |
| Bucket | `2812d8a1b1e1-aismetchiks3` |
| Access Key | `<S3_ACCESS_KEY>` |
| Secret Key | `<S3_SECRET_KEY>` |
| Path style URL | `https://s3.ru1.storage.beget.cloud/2812d8a1b1e1-aismetchiks3` |
| Virtual hosted URL | `https://2812d8a1b1e1-aismetchiks3.s3.ru1.storage.beget.cloud` |

### Быстрое подключение

```bash
# srv-web (публичный)
ssh root@5.35.88.53

# srv-api (через jump host)
ssh -J root@5.35.88.53 root@10.16.0.2

# srv-db (через jump host)
ssh -J root@5.35.88.53 root@10.16.0.3

# srv-db-logs (через jump host)
ssh -J root@5.35.88.53 root@10.16.0.4
```

---

## Серверы

### 1. srv-web — Веб-фронтенд (ПУБЛИЧНЫЙ)

**Назначение:** Принимает внешний трафик, отдаёт HTML/CSS/JS, рендерит Next.js поверхности.

| Параметр | Значение |
|---|---|
| Имя в Beget | `srv-web` |
| Beget VDS тариф | VDS-2 (2 vCPU, 2 GB RAM, 30 GB NVMe) |
| ОС | Ubuntu 22.04 LTS |
| Публичный IP | `5.35.88.53` |
| Приватный IP | `10.16.0.1` |
| Домены | `aismetchik.ru`, `lk.aismetchik.ru`, `admin.aismetchik.ru`, `crm.aismetchik.ru`, `partner.aismetchik.ru`, `m.aismetchik.ru` |
| Порты (публичные) | `80` (HTTP→redirect HTTPS), `443` (HTTPS) |
| Порты (приватные) | `22` (SSH, только из приватной сети) |

**Что запускается:**
- `nginx` — reverse proxy + SSL (Let's Encrypt через certbot)
- `web_landing` — Next.js, `APP_SURFACE=landing`
- `web_lk` — Next.js, `APP_SURFACE=lk`
- `web_admin` — Next.js, `APP_SURFACE=admin`
- `web_crm` — Next.js, `APP_SURFACE=crm`
- `web_partner` — Next.js, `APP_SURFACE=partner`
- `web_mobile` — Next.js, `APP_SURFACE=mobile`

**Ресурсы:**
- CPU: 2 vCPU (достаточно для SSR + nginx)
- RAM: 2 GB (6 контейнеров × ~200 MB + nginx + OS)
- Диск: 30 GB (образы Docker + логи)

---

### 2. srv-api — Бэкенд API (ПРИВАТНЫЙ)

**Назначение:** Обрабатывает API-запросы, фоновые задачи, AI-запросы. Не доступен из интернета.

| Параметр | Значение |
|---|---|
| Имя в Beget | `srv-api` |
| Beget VDS тариф | VDS-4 (4 vCPU, 4 GB RAM, 50 GB NVMe) |
| ОС | Ubuntu 22.04 LTS |
| Публичный IP | нет (приватный сервер) |
| Приватный IP | `10.16.0.2` |

**Что запускается:**
- `api` — Next.js (полный серверный код: API routes, auth, SSR)
- `worker` — фоновый анализ документов (`worker:server-analysis`)

**Ресурсы:**
- CPU: 4 vCPU (AI-запросы к OpenRouter/MiMo, PDF-генерация, аналитика)
- RAM: 4 GB (worker может потреблять до 1.5 GB при анализе больших файлов)
- Диск: 50 GB (временные файлы генерации, кэш)

**Подключение:**
- Только из приватной сети `10.0.0.0/24`
- `srv-web` → `srv-api:3000` (nginx upstream)

---

### 3. srv-db — Основная БД (ПРИВАТНЫЙ)

**Назначение:** Хранит основные данные приложения (пользователи, проекты, сметы, конфигурации).

| Параметр | Значение |
|---|---|
| Имя в Beget | `srv-db` |
| Beget VDS тариф | VDS-2 (2 vCPU, 4 GB RAM, 60 GB NVMe) |
| ОС | Ubuntu 22.04 LTS |
| Публичный IP | нет |
| Приватный IP | `10.16.0.3` |
| Порт | `27017` (только приватная сеть) |

**Что запускается:**
- `mongo:7` — основная база `aismetchik`

**Ресурсы:**
- CPU: 2 vCPU
- RAM: 4 GB (MongoDB кэширует индексы и данные в RAM, WiredTiger использует ~50% RAM)
- Диск: 60 GB NVMe (данные + journal + оп-лог)

**Безопасность:**
- Аутентификация MongoDB включена (用户名 + пароль)
- `bindIp: 10.16.0.2,10.16.0.1` (только srv-api и srv-web для healthcheck)
- Шифрование в транзите (TLS) между srv-api ↔ srv-db

---

### 4. srv-db-logs — БД логов (ПРИВАТНЫЙ)

**Назначение:** Отдельный MongoDB для логов, аудита, телеметрии. Изолирован от основной БД.

| Параметр | Значение |
|---|---|
| Имя в Beget | `srv-db-logs` |
| Beget VDS тариф | VDS-1 (1 vCPU, 1 GB RAM, 20 GB NVMe) |
| ОС | Ubuntu 22.04 LTS |
| Публичный IP | нет |
| Приватный IP | `10.16.0.4` |
| Порт | `27017` (только приватная сеть) |

**Что запускается:**
- `mongo:7` — база логов `aismetchik_logs`

**Ресурсы:**
- CPU: 1 vCPU (запись логов — не CPU-intensive)
- RAM: 1 GB (достаточно для write-heavy workload с TTL-индексами)
- Диск: 20 GB (логи ротируются, старые удаляются через TTL)

**Безопасность:**
- Аутентификация включена
- `bindIp: 10.16.0.2` (только srv-api пишет логи)
- TTL-индекс на коллекциях логов (автоудаление через 30 дней)

---

### 5. Beget S3 — Файловое хранилище (ОБЛАКО)

**Назначение:** Хранение файлов пользователей, аватаров, документов проектов. Всё в одной экосистеме Beget.

| Параметр | Значение |
|---|---|
| Провайдер | Beget S3 Object Storage |
| Endpoint | `https://s3.ru1.storage.beget.cloud` |
| Bucket | `2812d8a1b1e1-aismetchiks3` |
| Access Key | `<S3_ACCESS_KEY>` |
| Secret Key | `<S3_SECRET_KEY>` |

**Подключение:**
| Стиль | URL |
|---|---|
| Path style | `https://s3.ru1.storage.beget.cloud/2812d8a1b1e1-aismetchiks3` |
| Virtual hosted | `https://2812d8a1b1e1-aismetchiks3.s3.ru1.storage.beget.cloud` |

**Проверка через AWS CLI:**
```bash
aws configure --profile beget
# Access Key: <S3_ACCESS_KEY>
# Secret Key: <S3_SECRET_KEY>
# Region: ru-1
# Output: json

aws s3 ls --endpoint-url https://s3.ru1.storage.beget.cloud --profile beget
```

---

## Приватная сеть и прокси

**Диапазон:** `10.16.0.0/16`

### Internet access для приватных серверов

Приватные серверы (srv-api, srv-db, srv-db-logs) **не имеют прямого доступа в интернет** — только через прокси на srv-web.

**Tinyproxy на srv-web:**
- Порт: `8888`
- Доступ: `10.16.0.0/16`
- Конфиг: `/etc/tinyproxy/tinyproxy.conf`

**Настройка на приватных серверах:**
```bash
# /etc/apt/apt.conf.d/99proxy
Acquire::http::Proxy "http://10.16.0.1:8888";
Acquire::https::Proxy "http://10.16.0.1:8888";

# /etc/environment
http_proxy=http://10.16.0.1:8888
https_proxy=http://10.16.0.1:8888
no_proxy=localhost,127.0.0.1,10.16.0.0/16
```

| Сервер | Приватный IP | Роль |
|---|---|---|
| srv-web | `10.16.0.1` | Веб-фронтенд |
| srv-api | `10.16.0.2` | Бэкенд API |
| srv-db | `10.16.0.3` | Основная MongoDB |
| srv-db-logs | `10.16.0.4` | MongoDB логов |

**Межсетевые правила:**

| Источник | Назначение | Порт | Протокол |
|---|---|---|---|
| Internet | srv-web | 80, 443 | TCP |
| srv-web (5.35.88.53) | srv-api (10.16.0.2) | 3000 | TCP |
| srv-api (10.16.0.2) | srv-db (10.16.0.3) | 27017 | TCP |
| srv-api (10.16.0.2) | srv-db-logs (10.16.0.4) | 27017 | TCP |
| srv-web (5.35.88.53) | srv-db (10.16.0.3) | 27017 | TCP (healthcheck) |
| srv-api (10.16.0.2) | s3.ru1.storage.beget.cloud | 443 | TCP (HTTPS) |
| srv-web (5.35.88.53) | s3.ru1.storage.beget.cloud | 443 | TCP (HTTPS, presigned URLs) |
| **Всё остальное** | **BLOCKED** | — | — |

---

## Домены и DNS

| Домен | Тип | Значение | Назначение |
|---|---|---|---|
| `aismetchik.ru` | A | `<публичный IP srv-web>` | Лендинг |
| `lk.aismetchik.ru` | A | `<публичный IP srv-web>` | Личный кабинет |
| `admin.aismetchik.ru` | A | `<публичный IP srv-web>` | Админка |
| `crm.aismetchik.ru` | A | `<публичный IP srv-web>` | CRM |
| `partner.aismetchik.ru` | A | `<публичный IP srv-web>` | Партнёрка |
| `m.aismetchik.ru` | A | `<публичный IP srv-web>` | Мобильная версия |

---

## SSH доступ

### Генерация SSH-ключей

```bash
# На локальной машине (macOS)
ssh-keygen -t ed25519 -C "aismetchik-deploy" -f ~/.ssh/aismetchik_beget

# Получить публичный ключ
cat ~/.ssh/aismetchik_beget.pub
```

### Добавление ключей в Beget

1. Зайти в панель Beget → VDS → каждый сервер → SSH-ключи
2. Добавить публичный ключ `~/.ssh/aismetchik_beget.pub`
3. Повторить для всех 4 серверов

### SSH Config (`~/.ssh/config`)

```
Host srv-web
  HostName 5.35.88.53
  User root
  IdentityFile ~/.ssh/aismetchik_beget
  IdentitiesOnly yes

Host srv-api
  HostName 10.16.0.2
  User root
  IdentityFile ~/.ssh/aismetchik_beget
  ProxyJump srv-web
  IdentitiesOnly yes

Host srv-db
  HostName 10.16.0.3
  User root
  IdentityFile ~/.ssh/aismetchik_beget
  ProxyJump srv-web
  IdentitiesOnly yes

Host srv-db-logs
  HostName 10.16.0.4
  User root
  IdentityFile ~/.ssh/aismetchik_beget
  ProxyJump srv-web
  IdentitiesOnly yes
```

### Подключение

```bash
# Публичный сервер
ssh srv-web

# Приватные серверы (через jump host)
ssh srv-api
ssh srv-db
ssh srv-db-logs
```

---

## Docker Compose конфигурации

### srv-web: `docker-compose.web.yml`

```yaml
x-app: &app_base
  restart: unless-stopped
  env_file:
    - .env
  environment:
    NODE_ENV: production
    PORT: 3000
    HOSTNAME: 0.0.0.0
  logging:
    options:
      max-size: "10m"
      max-file: "3"

x-web: &web_base
  <<: *app_base
  image: ghcr.io/famousmonsterr/ais-smetchik-web:latest
  healthcheck:
    test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:3000/api/healthz || exit 1"]
    interval: 30s
    timeout: 10s
    retries: 5
    start_period: 30s

services:
  web_landing:
    <<: *web_base
    environment:
      APP_SURFACE: landing

  web_lk:
    <<: *web_base
    environment:
      APP_SURFACE: lk

  web_admin:
    <<: *web_base
    environment:
      APP_SURFACE: admin

  web_crm:
    <<: *web_base
    environment:
      APP_SURFACE: crm

  web_partner:
    <<: *web_base
    environment:
      APP_SURFACE: partner

  web_mobile:
    <<: *web_base
    environment:
      APP_SURFACE: mobile

  nginx:
    image: nginx:1.27-alpine
    restart: unless-stopped
    depends_on:
      web_landing: { condition: service_healthy }
      web_lk: { condition: service_healthy }
      web_admin: { condition: service_healthy }
      web_crm: { condition: service_healthy }
      web_partner: { condition: service_healthy }
      web_mobile: { condition: service_healthy }
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/default.conf:/etc/nginx/conf.d/default.conf:ro
      - ./nginx/certbot/www:/var/www/certbot
      - ./nginx/certbot/conf:/etc/letsencrypt
    logging:
      options:
        max-size: "10m"
        max-file: "3"
```

### srv-api: `docker-compose.api.yml`

```yaml
services:
  api:
    image: ghcr.io/famousmonsterr/ais-smetchik-api:latest
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
      PORT: 3000
      HOSTNAME: 0.0.0.0
      APP_SURFACE: api
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O /dev/null http://127.0.0.1:3000/api/healthz || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 30s
    logging:
      options:
        max-size: "10m"
        max-file: "3"

  worker:
    image: ghcr.io/famousmonsterr/ais-smetchik-worker:latest
    restart: unless-stopped
    env_file:
      - .env
    environment:
      NODE_ENV: production
    logging:
      options:
        max-size: "10m"
        max-file: "3"
```

### srv-db: `docker-compose.db.yml`

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    command: ["--bind_ip_all", "--auth"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: aismetchik
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
      MONGO_INITDB_DATABASE: aismetchik
    ports:
      - "10.16.0.3:27017:27017"
    volumes:
      - mongo_data:/data/db
      - ./mongo-init.js:/docker-entrypoint-initdb.d/init.js:ro
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet --eval \"db.adminCommand('ping').ok\" | grep 1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 20s
    logging:
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mongo_data:
```

### srv-db-logs: `docker-compose.db-logs.yml`

```yaml
services:
  mongo-logs:
    image: mongo:7
    restart: unless-stopped
    command: ["--bind_ip_all", "--auth"]
    environment:
      MONGO_INITDB_ROOT_USERNAME: aismetchik_logs
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_LOGS_PASSWORD}
      MONGO_INITDB_DATABASE: aismetchik_logs
    ports:
      - "10.16.0.4:27017:27017"
    volumes:
      - mongo_logs_data:/data/db
    healthcheck:
      test: ["CMD-SHELL", "mongosh --quiet --eval \"db.adminCommand('ping').ok\" | grep 1 || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 5
      start_period: 20s
    logging:
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  mongo_logs_data:
```

---

## Переменные окружения

### srv-web `.env`

```env
# Surface
APP_SURFACE=landing

# URLs
NEXTAUTH_URL=https://aismetchik.ru
NEXT_PUBLIC_SITE_URL=https://aismetchik.ru
AUTH_TRUST_HOST=true
NEXTAUTH_COOKIE_DOMAIN=.aismetchik.ru
NEXTAUTH_SECRET=<сгенерировать>

# API endpoint (приватная сеть)
API_INTERNAL_URL=http://10.16.0.2:3000

# MongoDB (основная — для healthcheck/SSR)
MONGODB_URI=mongodb://aismetchik:<password>@10.16.0.3:27017/aismetchik?authSource=admin

# MongoDB Logs
MONGODB_LOGS_URI=mongodb://aismetchik_logs:<password>@10.16.0.4:27017/aismetchik_logs?authSource=admin
MONGODB_LOGS_DB=aismetchik_logs

# S3 (Beget)
S3_STORAGE_ENABLED=true
S3_ACCESS_KEY_ID=<S3_ACCESS_KEY>
S3_SECRET_ACCESS_KEY=<S3_SECRET_KEY>
S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
S3_REGION=ru-1
S3_BUCKET_NAME=2812d8a1b1e1-aismetchiks3
S3_BUCKET_IS_PUBLIC=true
S3_PRESIGNED_URL_EXPIRATION=3600

# Telegram
TELEGRAM_BOT_TOKEN=<из .env>
TELEGRAM_BOT_MODE=webhook
TELEGRAM_BOT_WEBHOOK_URL=https://aismetchik.ru/api/telegram/webhook
# ... остальные TELEGRAM_* переменные

# AI
OPENROUTER_API_KEY=<из .env>

# SMTP
SMTP_HOST=<smtp сервер>
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<user>
SMTP_PASS=<pass>
SMTP_FROM=AI Smetchik <noreply@aismetchik.ru>
SMTP_ENABLED=true
```

### srv-api `.env`

```env
# URLs
NEXTAUTH_URL=https://aismetchik.ru
AUTH_TRUST_HOST=true
NEXTAUTH_COOKIE_DOMAIN=.aismetchik.ru
NEXTAUTH_SECRET=<тот же что на srv-web>

# MongoDB
MONGODB_URI=mongodb://aismetchik:<password>@10.16.0.3:27017/aismetchik?authSource=admin
MONGODB_DB=aismetchik

# MongoDB Logs
MONGODB_LOGS_URI=mongodb://aismetchik_logs:<password>@10.16.0.4:27017/aismetchik_logs?authSource=admin
MONGODB_LOGS_DB=aismetchik_logs

# S3 (Beget)
S3_STORAGE_ENABLED=true
S3_ACCESS_KEY_ID=<S3_ACCESS_KEY>
S3_SECRET_ACCESS_KEY=<S3_SECRET_KEY>
S3_ENDPOINT=https://s3.ru1.storage.beget.cloud
S3_REGION=ru-1
S3_BUCKET_NAME=2812d8a1b1e1-aismetchiks3

# AI
OPENROUTER_API_KEY=<из .env>

# Telegram
TELEGRAM_BOT_TOKEN=<из .env>
TELEGRAM_BOT_MODE=webhook
# ... остальные TELEGRAM_* переменные
```

---

## CI/CD (GitHub Actions)

### Workflow: `deploy-multi-vds.yml`

Автоматический деплой при push в `main`:
1. **Build** — сборка 3 Docker образов (web, api, worker) → ghcr.io
2. **Deploy srv-web** — pull образов, перезапуск контейнеров
3. **Deploy srv-api** — pull образов через jump host, перезапуск
4. **Smoke test** — проверка healthcheck

### Настройка GitHub Secrets

Запустить скрипт:
```bash
./deploy/setup-github-secrets.sh
```

Или вручную в GitHub → Settings → Secrets → Actions:

| Secret | Значение |
|---|---|
| `SRV_WEB_HOST` | `5.35.88.53` |
| `SRV_WEB_SSH_KEY` | содержимое `~/.ssh/aismetchik_beget` |
| `VDS_DOMAIN` | `aismetchik.ru` |
| `VDS_SUBDOMAINS` | `lk,admin,crm,partner,m` |
| `LETSENCRYPT_EMAIL` | `famousmonster@ya.ru` |

### Docker Images (ghcr.io)

| Образ | Описание |
|---|---|
| `ghcr.io/famousmonsterr/ais-smetchikv9-web:latest` | Next.js web (runner stage) |
| `ghcr.io/famousmonsterr/ais-smetchikv9-api:latest` | Next.js API (runner stage) |
| `ghcr.io/famousmonsterr/ais-smetchikv9-worker:latest` | Worker (worker stage) |

```yaml
# .github/workflows/deploy.yml
name: Build & Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Build & Push Web
        uses: docker/build-push-action@v5
        with:
          context: .
          target: runner
          push: true
          tags: ghcr.io/famousmonsterr/ais-smetchik-web:latest

      - name: Build & Push Worker
        uses: docker/build-push-action@v5
        with:
          context: .
          target: worker
          push: true
          tags: ghcr.io/famousmonsterr/ais-smetchik-worker:latest

      - name: Build & Push API
        uses: docker/build-push-action@v5
        with:
          context: .
          target: runner
          push: true
          tags: ghcr.io/famousmonsterr/ais-smetchik-api:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to srv-web
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.SRV_WEB_IP }}
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/ais-smetchik
            docker compose pull
            docker compose up -d

      - name: Deploy to srv-api
        uses: appleboy/ssh-action@v1
        with:
          host: 10.0.0.11
          username: root
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          jump_host: ${{ secrets.SRV_WEB_IP }}
          jump_username: root
          jump_key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            cd /opt/ais-smetchik
            docker compose pull
            docker compose up -d
```

---

## SSL/TLS (Let's Encrypt)

На `srv-web` через certbot в Docker:

```bash
# Первичный выпуск сертификата
docker compose run --rm certbot certonly \
  --webroot --webroot-path=/var/www/certbot \
  -d aismetchik.ru \
  -d lk.aismetchik.ru \
  -d admin.aismetchik.ru \
  -d crm.aismetchik.ru \
  -d partner.aismetchik.ru \
  -d m.aismetchik.ru \
  --email ops@aismetchik.ru \
  --agree-tos --no-eff-email

# Автообновление (cron на srv-web)
0 3 * * * docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
```

---

## Мониторинг (опционально)

Для начала достаточно:
- `docker compose logs -f` на каждом сервере
- Healthcheck-эндпоинт `/api/healthz`
- UptimeRobot / Uptime Kuma (внешний мониторинг доступности)

В будущем можно добавить:
- Prometheus + Grafana на отдельном сервере
- Loki для сбора логов
- Alertmanager для нотификаций

---

## Безопасность

### На каждом сервере:

```bash
# Firewall (ufw)
ufw default deny incoming
ufw default allow outgoing
ufw allow from 10.16.0.0/24 to any port 22  # SSH только из приватной сети
ufw enable

# На srv-web дополнительно:
ufw allow 80/tcp   # HTTP (redirect to HTTPS)
ufw allow 443/tcp  # HTTPS
```

### SSH:
- Только ED25519 ключи (без паролей)
- `PasswordAuthentication no` в `/etc/ssh/sshd_config`
- Порт SSH можно изменить на нестандартный

### MongoDB:
- Аутентификация обязательна
- TLS между клиентом и сервером
- `bindIp` ограничен приватными IP

---

## Стоимость (оценка Beget)

| Сервер | Тариф | ~Цена/мес |
|---|---|---|
| srv-web | VDS-2 (2 vCPU, 2 GB) | ~350-500 ₽ |
| srv-api | VDS-4 (4 vCPU, 4 GB) | ~700-1000 ₽ |
| srv-db | VDS-2 (2 vCPU, 4 GB) | ~500-700 ₽ |
| srv-db-logs | VDS-1 (1 vCPU, 1 GB) | ~200-300 ₽ |
| Beget S3 | ~10 GB хранилище | ~100-200 ₽ |
| **Итого** | | **~1850-2700 ₽/мес** |

Всё в одной экосистеме Beget — единый личный кабинет, единый биллинг.

---

## Структура директорий на серверах

```
/opt/ais-smetchik/
├── docker-compose.yml
├── .env
├── nginx/
│   ├── default.conf
│   └── certbot/
│       ├── www/
│       └── conf/
└── mongo-init.js          # только на srv-db
```
