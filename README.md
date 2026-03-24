
# AI Smetchik

**AI Сметчик** — это интеллектуальный SaaS-помощник для инженеров-сметчиков и монтажников слаботочных систем. Платформа автоматизирует рутинную работу по созданию смет, превращая часы ручного труда в минуты, и предоставляет инструменты для точного ценообразования и профессионального управления проектами.

Наш сервис не просто распознает текст. Он понимает контекст проекта, помогает исправлять ошибки, управляет ценами и создает профессиональные документы, освобождая время инженеров для решения более сложных задач и увеличивая их доход.

## Стек технологий

- **Фреймворк:** [Next.js](https://nextjs.org/) (с App Router)
- **Язык:** [TypeScript](https://www.typescriptlang.org/)
- **UI:** [React](https://react.dev/), [ShadCN/UI](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/)
- **Анимации:** [Framer Motion](https://www.framer.com/motion/)
- **База данных:** MongoDB (self-hosted)
- **Аутентификация:** NextAuth (JWT)
- **AI Модели:** [OpenRouter](https://openrouter.ai/)

## Ключевые возможности

- **AI-Анализ документов:** Автоматическое извлечение спецификаций из PDF, сканов и фотографий.
- **"Цикл Уточнения":** Уникальный итеративный процесс для исправления ошибок AI и достижения 100% точности.
- **Приватная База Цен (PRO):** Создание собственной базы цен на работы и материалы с автоматическим подбором.
- **Умная категоризация позиций:** Разделение на `device`, `cable`, `cable_support`, `consumable`, `other` для точного расчета.
- **Расширенный коэффициент сложности:** Ползунок x0.5..x10 с быстрыми пресетами по высоте и условиям монтажа.
- **Генерация документов:** Создание профессиональных коммерческих предложений в форматах PDF, DOCX, XLSX.
- **Управление проектами:** История расчетов, управление версиями, группировка по объектам.
- **Интеграция с Telegram:** Получение уведомлений и документов прямо в мессенджер.
- **Партнерская программа:** Возможность зарабатывать, привлекая новых пользователей.

---

## 🚀 Быстрый старт

Чтобы запустить проект локально, выполните следующие шаги:

### 1. Предварительные требования

- [Node.js](https://nodejs.org/) `25.2.1`
- `npm` `11.x`
- Доступ к MongoDB серверу

### 2. Клонирование репозитория

```bash
git clone https://github.com/ваш-репозиторий/ai-smetchik.git
cd ai-smetchik
```

### 3. Установка зависимостей

```bash
npm install
```

### 4. Настройка переменных окружения

Вам необходимо создать два конфигурационных файла на основе примеров.

#### a) Конфигурация MongoDB, NextAuth и API ключей

Скопируйте файл `.env.example` и переименуйте его в `.env`:

```bash
cp .env.example .env
```

Откройте `.env` и вставьте ваши реальные значения:

- `MONGODB_URI` и `MONGODB_DB`: основная MongoDB для бизнес-данных.
- `MONGODB_LOGS_URI` и `MONGODB_LOGS_DB`: отдельная MongoDB для `user_logs`, `ai_api_logs`, `project_event_logs`, `engagement_events`. Если не заданы, логовые коллекции используют основную базу.
- `NEXTAUTH_SECRET` и `NEXTAUTH_URL`: Настройки NextAuth (JWT).
- `OPENROUTER_API_KEY`: Ваш API ключ для OpenRouter.
- `SUPER_ADMIN_EMAIL`: Email пользователя, который будет иметь полные права администратора в системе.
- `VK_ID_CLIENT_ID`, `VK_ID_CLIENT_SECRET`, `VK_ID_REDIRECT_URI`: для VK OAuth.
- `VK_BOT_ENABLED`, `VK_GROUP_ID`, `VK_ACCESS_TOKEN`, `VK_CALLBACK_SECRET`, `VK_CONFIRMATION_TOKEN`, `VK_WEBHOOK_URL`: для VK Callback API и bot runtime.
- `VK_AUTH_EMAIL_DOMAIN`: домен для synthetic email при входе через VK, если провайдер не вернул email.
- `PASSKEY_*`: параметры WebAuthn/passkey (`PASSKEY_ORIGIN`, `PASSKEY_RP_ID`, `PASSKEY_RP_NAME`, `PASSKEY_TIMEOUT_MS`, `PASSKEY_CHALLENGE_TTL_MS`, `PASSKEY_USER_VERIFICATION`, `PASSKEY_ATTESTATION`).
- `TELEGRAM_AUTH_EMAIL_DOMAIN`: домен для synthetic email при входе через Telegram.

#### b) Конфигурация AI-промптов

Скопируйте файл `src/lib/ai-constructor-config.example.json` и переименуйте его в `src/lib/ai-constructor-config.json`:

```bash
cp src/lib/ai-constructor-config.example.json src/lib/ai-constructor-config.json
```

Этот файл содержит структуру для AI-промптов. **Важно:** в `*.example.json` текст ключевых промптов заменен на заглушку. Для полноценной работы системы вам необходимо будет вставить в `ai-constructor-config.json` полный текст промптов, который является коммерческой тайной.

### 5. Запуск проекта

После завершения настройки запустите сервер для разработки:

```bash
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000) в вашем браузере, чтобы увидеть результат.

---

## 🚢 Релиз на VDS (Docker Compose)

### 1. Подготовка сервера

- Ubuntu 22.04+ (или совместимый Linux)
- Установлены Docker и Docker Compose Plugin
- Открыты порты `80/443` (и `22` для SSH)

### 2. Клонирование проекта на VDS

```bash
git clone https://github.com/FamousMonsterr/AISmetchikV9.git /opt/ai-smetchik
cd /opt/ai-smetchik
```

### 3. Настройка переменных

1. Создайте production `.env` в корне проекта (по образцу `.env.example`).
2. Создайте `deploy/.env.vds`:

```bash
cp deploy/.env.vds.example deploy/.env.vds
```

3. Проверьте в `deploy/.env.vds`:
   - `NEXTAUTH_URL=https://ваш-домен`
   - `NEXT_PUBLIC_SITE_URL=https://ваш-домен`
   - `AUTH_TRUST_HOST=true`
   - `NEXTAUTH_COOKIE_DOMAIN=.ваш-домен` (для SSO между поддоменами)

### 4. Запуск контейнеров

```bash
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml up -d --build
```

Проверка:

```bash
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml ps
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml exec -T web_landing wget -q -O /dev/null http://127.0.0.1:3000/api/healthz
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml exec -T web_admin wget -q -O /dev/null http://127.0.0.1:3000/api/healthz
```

Если Mongo локально на сервере нужна в том же compose:

```bash
COMPOSE_PROFILES=with-mongo docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml up -d --build
```

---

## 🔁 GitHub CI/CD (main -> VDS)

В проекте используются workflow:

- `.github/workflows/ci.yml` — обязательный быстрый CI: `lint` + `typecheck` + `unit` + `integration` + `build`.
- `.github/workflows/external-checks.yml` — внешние проверки после успешного deploy/manual/schedule: `e2e` + `smoke-subdomains` + browser smoke с артефактами.
- `.github/workflows/deploy-vds.yml` — деплой на VDS по SSH после пуша в `main` или вручную.

### GitHub Secrets для деплоя

Добавьте в `Settings -> Secrets and variables -> Actions`:

- `VDS_SSH_HOST` — IP/домен VDS
- `VDS_SSH_PORT` — обычно `22`
- `VDS_SSH_USER` — пользователь SSH
- `VDS_SSH_KEY` — приватный ключ (PEM/OpenSSH)
- `VDS_DEPLOY_PATH` — путь к репозиторию на сервере, например `/opt/ai-smetchik`
- `VDS_DOMAIN` — домен для TLS (например, `example.com`) — опционально, но рекомендуется
- `VDS_SUBDOMAINS` — список поддоменов через запятую (например, `admin,lk,crm,partner,m`)
- `LETSENCRYPT_EMAIL` — email для Let's Encrypt — опционально, но рекомендуется

Если заданы `VDS_DOMAIN` и `LETSENCRYPT_EMAIL`, workflow автоматически:
- поднимет HTTP-конфиг для ACME challenge;
- выпустит/обновит SAN-сертификат через `certbot` для домена и поддоменов;
- переключит Nginx на HTTPS-конфиг.

### GitHub Secrets и Variables для external checks

`external-checks.yml` не должен быть required-check для merge, если внешние параметры ещё не настроены. Для него нужны:

- `E2E_BASE_URL` — base URL внешнего стенда/прода для Playwright E2E.
- `E2E_USER_EMAIL`
- `E2E_USER_PASSWORD`
- GitHub Variable `SMOKE_BASE_URL` — корневой URL для browser smoke.
- GitHub Variable `SMOKE_DOMAINS` — список доменов через запятую для `/api/healthz`, например `aismetchik.ru,admin.aismetchik.ru,lk.aismetchik.ru,crm.aismetchik.ru,partner.aismetchik.ru,m.aismetchik.ru`.
- GitHub Variable `SMOKE_BROWSER_UPLOAD_FLOW=1` — включать только если на стенде готов стабильный upload/analyze сценарий; по умолчанию browser smoke проверяет public/auth/dashboard/surfaces без загрузки файла.

Playwright trace/html report и `.artifacts/smoke` автоматически выгружаются в GitHub Artifacts.

### Поток релиза

1. Пуш в `main`
2. Автоматически проходит `CI`
3. Запускается `Deploy VDS`, на сервере выполняется:
   - `git fetch && git checkout main && git pull --ff-only origin main`
   - `docker compose ... up -d --build`
4. Проверка `/api/healthz` внутри `web_landing/web_admin/web_lk/web_crm/web_partner/web_mobile` (и HTTPS endpoint при включенном TLS)

### Поддомены (host-based routing)

- `admin.ваш-домен` -> `/dashboard/admin`
- `lk.ваш-домен` -> `/dashboard`
- `crm.ваш-домен` -> `/crm`
- `partner.ваш-домен` -> `/partner`
- `m.ваш-домен` -> `/dashboard/mobile-panel`

---

## 📌 Индексы MongoDB

Создание индексов для текущих запросов:

- `npm run mongo:indexes`

Скрипт создаёт индексы отдельно для основной базы и log DB. Перед запуском проверьте `MONGODB_LOGS_*`, если хотите физически разделить логовую нагрузку и основной рабочий контур.

## 🤖 Telegram audience matrix

Используются отдельные переменные по аудиториям:

- `TELEGRAM_BOT_TOKEN_USER`, `TELEGRAM_BOT_SECRET_TOKEN_USER`, `TELEGRAM_BOT_WEBHOOK_URL_USER`
- `TELEGRAM_BOT_TOKEN_PARTNER`, `TELEGRAM_BOT_SECRET_TOKEN_PARTNER`, `TELEGRAM_BOT_WEBHOOK_URL_PARTNER`
- `TELEGRAM_BOT_TOKEN_MANAGER`, `TELEGRAM_BOT_SECRET_TOKEN_MANAGER`, `TELEGRAM_BOT_WEBHOOK_URL_MANAGER`
- `TELEGRAM_BOT_TOKEN_ADMIN`, `TELEGRAM_BOT_SECRET_TOKEN_ADMIN`, `TELEGRAM_BOT_WEBHOOK_URL_ADMIN`

Webhook endpoints:

- `https://lk.<домен>/api/telegram/webhook/user`
- `https://partner.<домен>/api/telegram/webhook/partner`
- `https://crm.<домен>/api/telegram/webhook/manager`
- `https://admin.<домен>/api/telegram/webhook/admin`

Telegram Mini App auth:

- вход внутри Telegram WebApp использует `TELEGRAM_BOT_TOKEN_USER` с fallback на `TELEGRAM_BOT_TOKEN`;
- если у пользователя ещё нет email, создаётся synthetic email на домене `TELEGRAM_AUTH_EMAIL_DOMAIN`;
- если VK не вернул email, создаётся synthetic email на домене `VK_AUTH_EMAIL_DOMAIN`;
- параметры VK auth, passkey и Telegram auth можно сохранять из админ-панели: `Dashboard -> Admin -> Settings -> Переменные API`.

## 🧪 QA аккаунт

Для постоянного QA-пользователя:

- `QA_TEST_USER_EMAIL`
- `QA_TEST_USER_PASSWORD`
- `QA_TEST_USER_PHONE`
- `QA_PROTECT_USER=true`

Инициализация/обновление QA-пользователя:

```bash
npm run qa:seed-user
```

## 🤝 Участие в разработке

Мы приветствуем ваш вклад! Если вы хотите предложить улучшение, пожалуйста, создайте Fork репозитория и отправьте Pull Request.

## 📄 Лицензия

Этот проект является коммерческим продуктом. Исходный код предоставляется для ознакомления в рамках грантовой заявки. Любое несанкционированное копирование, распространение или использование в коммерческих целях без письменного разрешения запрещено.
 
