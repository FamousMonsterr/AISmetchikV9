# Telegram Bot Setup

## CI/CD
- `CI` запускается на каждый `pull_request` и на push в `main`:
  - `lint`
  - `typecheck`
  - `test:unit`
  - `test:integration`
  - `build`
- `Deploy VDS` стартует:
  - автоматически после успешного `CI` для `main`
  - вручную через `workflow_dispatch`
- Обязательные GitHub Secrets для deploy:
  - `VDS_SSH_HOST`
  - `VDS_SSH_USER`
  - `VDS_SSH_KEY`
  - `VDS_DEPLOY_PATH`
- Для TLS и smoke нужны:
  - `VDS_DOMAIN=aismetchik.ru`
  - `VDS_SUBDOMAINS=admin,lk,crm,partner,m`
  - `LETSENCRYPT_EMAIL=<ops email>`

## Telegram env
- Минимум для login/user bot:
  - `TELEGRAM_BOT_TOKEN_USER`
  - `TELEGRAM_BOT_SECRET_TOKEN_USER`
  - `NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/<bot_username>`
  - `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=<bot_username>`
- Для WebApp:
  - `NEXT_PUBLIC_TELEGRAM_WEBAPP_URL=https://lk.aismetchik.ru`
- Production webhook URLs:
  - `TELEGRAM_BOT_WEBHOOK_URL=https://aismetchik.ru/api/telegram/webhook`
  - `TELEGRAM_BOT_WEBHOOK_URL_USER=https://lk.aismetchik.ru/api/telegram/webhook/user`
  - `TELEGRAM_BOT_WEBHOOK_URL_PARTNER=https://partner.aismetchik.ru/api/telegram/webhook/partner`
  - `TELEGRAM_BOT_WEBHOOK_URL_MANAGER=https://crm.aismetchik.ru/api/telegram/webhook/manager`
  - `TELEGRAM_BOT_WEBHOOK_URL_ADMIN=https://admin.aismetchik.ru/api/telegram/webhook/admin`

## Что уже умеет код
- Если `TELEGRAM_BOT_WEBHOOK_URL_*` не заполнены, `Register webhook` теперь может вывести URL из `NEXTAUTH_URL`/`NEXT_PUBLIC_SITE_URL`.
- Для `aismetchik.ru` это даст:
  - `default` -> `https://aismetchik.ru/api/telegram/webhook`
  - `user` -> `https://lk.aismetchik.ru/api/telegram/webhook/user`
  - `partner` -> `https://partner.aismetchik.ru/api/telegram/webhook/partner`
  - `manager` -> `https://crm.aismetchik.ru/api/telegram/webhook/manager`
  - `admin` -> `https://admin.aismetchik.ru/api/telegram/webhook/admin`

## Кнопки в админке
- Путь: `Dashboard -> Admin -> Bots -> Telegram`
- Runtime:
  - `Start polling`
  - `Stop`
  - `Unlock`
  - `Refresh`
- Для каждой аудитории:
  - `Register webhook`
  - `Clear webhook`
  - `Ping bot`
  - `Ping webhook`
  - `Test API`
  - `Test webhook info`
  - `Test Mongo`
  - `Отправить test message`

## Правильный порядок запуска
1. Сохранить env/token настройки.
2. Убедиться, что `NEXTAUTH_URL=https://aismetchik.ru`.
3. Для `user/default` заполнить `NEXT_PUBLIC_TELEGRAM_BOT_URL` и `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`.
4. В `Admin -> Bots -> Telegram` открыть вкладку нужной аудитории.
5. Нажать `Register webhook`.
6. Нажать `Test webhook info`.
7. Нажать `Ping webhook`.
8. Нажать `Ping bot`.
9. Нажать `Отправить test message`.

## Команды для BotFather
- `default`: `/start`, `/help`, `/profile`, `/new`, `/history`, `/pay`, `/ping`
- `user`: `/start`, `/help`, `/profile`, `/new`, `/history`, `/pay`, `/support`, `/link`, `/unlink`, `/ping`
- `partner`: `/start`, `/help`, `/profile`, `/ref`, `/stats`, `/clients`, `/attestation`, `/payout`, `/support`, `/ping`
- `manager`: `/start`, `/help`, `/queue`, `/take`, `/done`, `/reassign`, `/sla`, `/client`, `/note`, `/ping`
- `admin`: `/start`, `/help`, `/health`, `/alerts`, `/deploy`, `/workers`, `/payments`, `/tickets`, `/webhooks`, `/ping`

## Reply / menu buttons внутри бота
- Welcome inline button:
  - `Открыть приложение`
  - `Помощь`
- Это уже создаётся кодом автоматически в runtime, вручную в Telegram UI добавлять не нужно.

## Что надо создать вручную в Telegram
- Через `@BotFather`:
  - создать самого бота (`/newbot`)
  - получить token
  - при желании прописать commands из списка выше через `/setcommands`
  - для login/webapp бота задать домен приложения на `aismetchik.ru`
- В самом приложении:
  - связать Telegram аккаунт с пользователем, чтобы появился `telegramChatId`
  - без этого `Ping bot` и `test message` не дойдут
