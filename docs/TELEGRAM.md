# Telegram Bot — Архитектура и интеграция

> Документация для разработчиков и AI-моделей. Описывает всю систему Telegram-бота: команды, привязку, уведомления, polling/webhook.

---

## 1. Обзор архитектуры

```
┌─────────────────────────────────────────────────────────┐
│                    Telegram API                         │
└──────────┬──────────────────────────────────┬───────────┘
           │ polling / webhook                │ getUpdates
           ▼                                  ▼
┌──────────────────────┐          ┌───────────────────────┐
│  telegraf-compat.ts  │          │  webhook routes       │
│  (direct HTTPS poll) │          │  /api/telegram/       │
└──────────┬───────────┘          └──────────┬────────────┘
           │                                 │
           ▼                                 ▼
┌─────────────────────────────────────────────────────────┐
│              bot.ts — Command Router                    │
│  registerHandlers(bot, audience)                        │
│  ├─ /start, /help, /profile, /new, /upload, /history   │
│  ├─ /pay, /support, /link, /unlink, /ping              │
│  ├─ 6-digit verification code handler                  │
│  ├─ document handler → S3 → analysis job pipeline      │
│  └─ callback_query: help, unlink, unlink_confirm/cancel│
│       history, upload                                   │
└──────────┬──────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│                    MongoDB                              │
│  collections: users, telegram_chats, configs,           │
│  user_notifications, notification_dispatches,           │
│  telegram_rate_limits, projects                         │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Файлы и их роль

| Файл | Роль |
|------|------|
| `src/lib/telegram/telegraf-compat.ts` | Обёртка над Telegraf. Прямой HTTPS polling (не `bot.launch()`). Методы: `sendMessage`, `sendDocument`, `setMyCommands`, `processUpdate`, polling loop. |
| `src/lib/telegram/startup.ts` | Инициализация бота при старте сервера. Вызывается из `instrumentation.ts`. |
| `src/lib/telegram/runtime.ts` | Резолвинг конфига: токен, botUrl, botUsername из Firestore `configs/envSettings` или env vars. |
| `src/server-functions/telegram/bot.ts` | **Главный файл.** Все команды, callback'и, привязка по коду, отправка истории. |
| `src/server-functions/telegram/controller.ts` | Lifecycle: start/stop polling, distributed lock, webhook registration. |
| `src/server-functions/telegram/state.ts` | Типы аудиторий, whitelist команд, state machines. |
| `src/server-functions/webhooks/telegram.ts` | Webhook registration, audience config resolution, secret verification. |
| `src/server-functions/notifications/telegram.ts` | Отправка уведомлений пользователям (idempotency, rate-limit). |
| `src/server-functions/notifications/dispatch.ts` | Оркестратор: in_app + telegram + vk. |
| `src/server-functions/analysis/jobRunner.ts` | Xiaomi Vision pipeline: `pipelineVersion: 'xiaomi-vision'` — extract → mimo-v2.5 (vision) → mimo-v2.5-pro (analysis). |
| `src/actions/telegramActions.ts` | Server actions: `linkTelegramAccount`, `unlinkTelegramAccount`, `generateTelegramLinkCode`, `sendFileToTelegramUser`, `syncTelegramChatId`. |
| `src/app/api/telegram/webhook/route.ts` | Webhook endpoint (default audience). |
| `src/app/api/telegram/webhook/[audience]/route.ts` | Webhook endpoint (per-audience). |
| `src/lib/telegram-web.ts` | `deriveTelegramBotUsername()` — извлечение username из URL. |

---

## 3. Команды бота

### 3.1 Default/User аудитория

| Команда | Описание | Реализация |
|---------|----------|------------|
| `/start` | Запуск. Парсит payload (`uid_`/`ref_`), сохраняет chat, привязывает если есть payload. | ✅ Полная |
| `/help` | Список команд для текущей аудитории. | ✅ Полная |
| `/profile` | Данные пользователя: username, план, кредиты, состояние. Кнопки: «Отвязать». | ✅ Полная |
| `/new` | Подсказка открыть калькулятор. | ✅ Заглушка с кнопкой |
| `/upload` | Справка по загрузке файлов. | ✅ Полная |
| `/history` | Последние 5 проектов из MongoDB. | ✅ Полная |
| `/pay` | Подсказка открыть тарифы. | ✅ Заглушка с кнопкой |
| `/support` | Подсказка открыть раздел поддержки. | ✅ Заглушка |
| `/link` | Показывает Chat ID и инструкцию по привязке. | ✅ Полная |
| `/unlink` | Отвязка через callback с подтверждением. | ✅ Полная |
| `/ping` | Отвечает «pong» с меткой времени. | ✅ Полная |

### 3.2 Document handler (standard analysis pipeline)

Когда пользователь отправляет **файл** (документ) в чат, бот:
1. Проверяет что аккаунт привязан (`findUserByChatId`)
2. Валидирует MIME-type (PDF, DOCX, XLSX, JPEG, PNG, WebP, TIFF, CSV, TXT)
3. Валидирует размер (макс. 20 МБ — лимит Telegram getFile API)
4. Проверяет наличие кредитов у пользователя
5. Скачивает файл из Telegram (`getFile` + `downloadFile`)
6. Загружает в S3/MinIO (bucket `aismetchik-user-docs`) через env vars
7. Создаёт проект в `requests` коллекции
8. Создаёт задачу анализа через `createServerAnalysisJob()` с `pipelineVersion: 'xiaomi-vision'`
9. Worker обрабатывает задачу через стандартный pipeline:
   - **Stage 1:** Извлечение текста + изображений (OCR / парсинг)
   - **Stage 2:** Анализ изображений через `mimo-v2.5` (vision)
   - **Stage 3:** Формирование сметы через `mimo-v2.5-pro`
10. Уведомление пользователю через `dispatchNotification()`

**Pipeline:** Telegram → S3 → `createServerAnalysisJob()` → Worker (jobRunner) → `dispatchNotification()` → Telegram

**Конфигурация:** `ai-config.json` — `visionModel`, `visionProvider`, `analysisModel`, `analysisProvider`

### 3.3 Verification code (не команда)

Когда пользователь отправляет **6-значный код** (не команду), бот:
1. Ищет пользователя с `telegramLinkCode = код` и `telegramLinkCodeExpiresAt > now`
2. Проверяет что Telegram не привязан к другому пользователю
3. Привязывает `telegramChatId` на user doc
4. Сохраняет chat в `telegram_chats`
5. Отправляет подтверждение

### 3.3 Partner аудитория (заглушки)

| Команда | Статус |
|---------|--------|
| `/ref`, `/stats`, `/clients`, `/attestation`, `/payout` | Заглушка — «доступно в партнёрском кабинете» |

### 3.4 Manager аудитория (заглушки)

| Команда | Статус |
|---------|--------|
| `/queue`, `/take`, `/done`, `/reassign`, `/sla`, `/client`, `/note` | Заглушка — «доступно в CRM» |

### 3.5 Admin аудитория (заглушки)

| Команда | Статус |
|---------|--------|
| `/health`, `/alerts`, `/deploy`, `/workers`, `/payments`, `/tickets`, `/webhooks` | Заглушка — «доступно в админ-контуре» |

---

## 4. Callback'и (inline-кнопки)

| callback_data | Действие | Где используется |
|---------------|----------|-----------------|
| `help` | Отправляет список команд | Кнопка «Помощь» в /start |
| `unlink` | Показывает подтверждение отвязки | Кнопка «Отвязать Telegram» в /profile |
| `unlink_confirm` | Выполняет отвязку | Кнопка «Да, отвязать» |
| `unlink_cancel` | Отменяет отвязку | Кнопка «Отмена» |
| `history` | Показывает последние проекты | Кнопка «Мои проекты» после загрузки файла |
| `upload` | Показывает справку по загрузке | Кнопка «Загрузить файл» |

---

## 5. Привязка аккаунта — 3 способа

### 5.1 Через код (основной)

1. Пользователь на сайте: Профиль → «Привязать Telegram»
2. `generateTelegramLinkCode()` генерирует 6-значный код (10 мин TTL)
3. Код сохраняется в `users.{userId}.telegramLinkCode`
4. Пользователь отправляет код боту
5. Бот ищет пользователя по коду, привязывает `telegramChatId`

### 5.2 Через deep link

1. Ссылка: `https://t.me/BotName?start=uid_<userId>`
2. Бот получает `/start uid_<userId>`
3. `saveChat()` обновляет `telegram_chats` и `users.{userId}.telegramChatId`

### 5.3 Через Telegram Login Widget

1. Виджет на сайте (встроенная кнопка Telegram)
2. `linkTelegramAccount()` валидирует init_data через `@tma.js/init-data-node`
3. Обновляет `telegramChatId` на user doc

---

## 6. Pipeline уведомлений

```
Бизнес-логика (анализ завершён, платёж и т.д.)
  │
  ▼
dispatchNotification({ userId, title, content, channels })
  │
  ├─ in_app → запись в user_notifications
  ├─ telegram → sendTelegramMessage()
  └─ vk → sendVkNotification()

sendTelegramMessage():
  1. resolveChatId — users.{userId}.telegramChatId
  2. checkIdempotency — notification_dispatches collection
  3. checkCooldown — telegram_rate_limits (2 сек)
  4. getSendBot — Telegraf instance (token from env)
  5. bot.sendMessage(chatId, text)
  6. Save cooldown + dispatch log
```

### Отправка файлов

`sendFileToTelegramUser()` в `telegramActions.ts`:
- Принимает base64 файл
- Конвертирует в Buffer
- `bot.sendDocument(chatId, buffer, { caption }, { filename, contentType })`

### Получение файлов из Telegram

`TelegramBotCompat` в `telegraf-compat.ts`:
- `getFile(fileId)` — вызывает Telegram `getFile` API, возвращает `file_path`
- `downloadFile(fileId)` — скачивает файл по `file_path` через HTTPS (с поддержкой redirect)
- Макс. размер файла через Telegram Bot API: 20 МБ (getFile limit)
- Обработчик `bot.on('document', ...)` — регистрирует handler для входящих документов

---

## 7. Polling vs Webhook

### Polling (локальная разработка)

```env
TELEGRAM_BOT_MODE=polling
```

- `telegraf-compat.ts` использует прямой HTTPS `getUpdates` (не Telegraf.launch())
- Timeout: 5 сек на запрос, 100 мс между запросами
- Обработка 409 Conflict (другой экземпляр polling)
- Lock в MongoDB `configs/telegramBotLock` с heartbeat 30 сек

### Webhook (продакшн)

```env
TELEGRAM_BOT_MODE=webhook
TELEGRAM_BOT_WEBHOOK_URL=https://domain.ru/api/telegram/webhook
TELEGRAM_BOT_SECRET_TOKEN=<random>
```

- Регистрация через `registerTelegramWebhook()`
- Endpoint: `/api/telegram/webhook` или `/api/telegram/webhook/{audience}`
- Secret token verification через `x-telegram-bot-api-secret-token` header
- Rate limiting: 100 req/min per IP

---

## 8. Audience system

| Аудитория | Поддомен | Команды | Назначение |
|-----------|----------|---------|------------|
| `default` | — | 8 команд | Основной бот |
| `user` | lk. | 11 команд | Пользователи |
| `partner` | partner. | 10 команд | Партнёры |
| `manager` | crm. | 10 команд | Менеджеры |
| `admin` | admin. | 10 команд | Администраторы |

Каждая аудитория может иметь отдельный токен (`TELEGRAM_BOT_TOKEN_USER`, etc.).

---

## 9. Переменные окружения

| Переменная | Описание | Обязательна |
|------------|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | Токен бота (от @BotFather) | ✅ |
| `TELEGRAM_BOT_MODE` | `polling` или `webhook` | Нет (default: polling) |
| `TELEGRAM_BOT_SECRET_TOKEN` | Секрет для webhook | Для webhook |
| `TELEGRAM_BOT_WEBHOOK_URL` | URL webhook | Для webhook |
| `NEXT_PUBLIC_TELEGRAM_BOT_URL` | Ссылка на бота (`https://t.me/BotName`) | ✅ |
| `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME` | Username бота (без @) | ✅ |
| `TELEGRAM_AUTH_EMAIL_DOMAIN` | Домен для synthetic emails | Нет (default: telegram.local) |
| `TELEGRAM_BOT_TOKEN_USER/PARTNER/MANAGER/ADMIN` | Токены per-audience | Нет |

---

## 10. MongoDB коллекции

| Коллекция | Назначение | Ключевые поля |
|-----------|------------|---------------|
| `users` | Пользователи | `telegramChatId`, `telegramUsername`, `telegramLinkedAt`, `telegramLinkCode`, `telegramLinkCodeExpiresAt` |
| `telegram_chats` | Chat'ы бота | `chatId`, `username`, `firstName`, `lastName`, `refUserId`, `startPayload` |
| `configs/envSettings` | Настройки | Telegram bot tokens, URLs, enabled flags |
| `configs/telegramBotLock` | Distributed lock | `instanceId`, `startedAt`, `lastHeartbeatAt` |
| `user_notifications` | In-app уведомления | `userId`, `title`, `content`, `status` |
| `notification_dispatches` | Idempotency log | `status`, `chatId`, `messageId` |
| `telegram_rate_limits` | Rate limiting | `lastSentAt` |
| `projects` | Проекты пользователей | `userId`, `name`, `fileName`, `status`, `createdAt` |
| `requests` | Запросы на обработку | `userId`, `fileName`, `fileUri`, `fileSha1`, `status`, `serverJobId`, `source` |
| `server_analysis_jobs` | Задачи анализа | `userId`, `projectId`, `fileUri`, `status`, `pipelineVersion`, `creditCost` |

---

## 11. Известные ограничения

1. **Partner/Manager/Admin команды — заглушки.** Возвращают статический текст.
2. **Deep link `?start=` не работает на десктопе Telegram Web.** Используйте код привязки.
3. **`/history` показывает только названия проектов.** Без деталей расчёта.
4. **Polling и webhook не могут работать одновременно** на одном токене.
5. **Командный меню показывает команды последней зарегистрированной аудитории.** Telegram не поддерживает per-user команды — меню глобальное.

---

## 12. Типичные проблемы и решения

| Проблема | Причина | Решение |
|----------|---------|---------|
| Бот не отвечает | Polling не запущен | Проверить `TELEGRAM_BOT_TOKEN` в .env, перезапустить сервер |
| «socket hang up» в логах | Telegraf.launch() конфликтует с Next.js | Используется прямой HTTPS polling (исправлено) |
| «409 Conflict» | Два экземпляра polling | Убить лишний процесс, очистить lock в MongoDB |
| `web_app` кнопка не работает | URL не HTTPS | Кнопка пропускается для localhost (исправлено) |
| Код привязки не работает | Истёк (10 мин) | Сгенерировать новый |
| Уведомления не приходят | Нет `telegramChatId` | Пользователь не привязал Telegram |
