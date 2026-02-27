
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

- [Node.js](https://nodejs.org/) (версия 18.x или выше)
- [pnpm](https://pnpm.io/) (рекомендуется) или `npm`/`yarn`
- Доступ к MongoDB серверу

### 2. Клонирование репозитория

```bash
git clone https://github.com/ваш-репозиторий/ai-smetchik.git
cd ai-smetchik
```

### 3. Установка зависимостей

```bash
pnpm install
```

### 4. Настройка переменных окружения

Вам необходимо создать два конфигурационных файла на основе примеров.

#### a) Конфигурация MongoDB, NextAuth и API ключей

Скопируйте файл `.env.example` и переименуйте его в `.env`:

```bash
cp .env.example .env
```

Откройте `.env` и вставьте ваши реальные значения:

- `MONGODB_URI` и `MONGODB_DB`: Параметры подключения к MongoDB.
- `NEXTAUTH_SECRET` и `NEXTAUTH_URL`: Настройки NextAuth (JWT).
- `OPENROUTER_API_KEY`: Ваш API ключ для OpenRouter.
- `SUPER_ADMIN_EMAIL`: Email пользователя, который будет иметь полные права администратора в системе.

#### b) Конфигурация AI-промптов

Скопируйте файл `src/lib/ai-constructor-config.example.json` и переименуйте его в `src/lib/ai-constructor-config.json`:

```bash
cp src/lib/ai-constructor-config.example.json src/lib/ai-constructor-config.json
```

Этот файл содержит структуру для AI-промптов. **Важно:** в `*.example.json` текст ключевых промптов заменен на заглушку. Для полноценной работы системы вам необходимо будет вставить в `ai-constructor-config.json` полный текст промптов, который является коммерческой тайной.

### 5. Запуск проекта

После завершения настройки запустите сервер для разработки:

```bash
pnpm dev
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

### 4. Запуск контейнеров

```bash
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml up -d --build
```

Проверка:

```bash
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml ps
docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml exec -T web wget -q -O /dev/null http://127.0.0.1:3000/api/health
```

Если Mongo локально на сервере нужна в том же compose:

```bash
COMPOSE_PROFILES=with-mongo docker compose --env-file deploy/.env.vds -f deploy/docker-compose.vds.yml up -d --build
```

---

## 🔁 GitHub CI/CD (main -> VDS)

В проекте используются workflow:

- `.github/workflows/ci.yml` — lint/typecheck/test/build.
- `.github/workflows/deploy-vds.yml` — деплой на VDS по SSH после пуша в `main` или вручную.

### GitHub Secrets для деплоя

Добавьте в `Settings -> Secrets and variables -> Actions`:

- `VDS_SSH_HOST` — IP/домен VDS
- `VDS_SSH_PORT` — обычно `22`
- `VDS_SSH_USER` — пользователь SSH
- `VDS_SSH_KEY` — приватный ключ (PEM/OpenSSH)
- `VDS_DEPLOY_PATH` — путь к репозиторию на сервере, например `/opt/ai-smetchik`
- `VDS_DOMAIN` — домен для TLS (например, `example.com`) — опционально, но рекомендуется
- `LETSENCRYPT_EMAIL` — email для Let's Encrypt — опционально, но рекомендуется

Если заданы `VDS_DOMAIN` и `LETSENCRYPT_EMAIL`, workflow автоматически:
- поднимет HTTP-конфиг для ACME challenge;
- выпустит/обновит сертификат через `certbot`;
- переключит Nginx на HTTPS-конфиг.

### Поток релиза

1. Пуш в `main`
2. Автоматически проходит `CI`
3. Запускается `Deploy VDS`, на сервере выполняется:
   - `git fetch && git checkout main && git pull --ff-only origin main`
   - `docker compose ... up -d --build`
4. Проверка `/api/health` внутри `web` контейнера (и HTTPS endpoint при включенном TLS)

---

## 🔁 Миграция Firestore → MongoDB

Для переноса данных используйте скрипт `scripts/migrate-firestore-to-mongo.ts`.

- Установите `FIREBASE_SERVICE_ACCOUNT_PATH`, `MONGODB_URI`, `MONGODB_DB`
- Запустите: `node scripts/migrate-firestore-to-mongo.ts`

## 📌 Индексы MongoDB

Создание индексов для текущих запросов:

- `npm run mongo:indexes`

## 🔐 Сброс пароля для перенесенных аккаунтов

После миграции пароли из Firebase не переносятся. При первой попытке входа пользователю автоматически отправляется ссылка на сброс пароля.

---

## 🤝 Участие в разработке

Мы приветствуем ваш вклад! Если вы хотите предложить улучшение, пожалуйста, создайте Fork репозитория и отправьте Pull Request.

## 📄 Лицензия

Этот проект является коммерческим продуктом. Исходный код предоставляется для ознакомления в рамках грантовой заявки. Любое несанкционированное копирование, распространение или использование в коммерческих целях без письменного разрешения запрещено.
 
