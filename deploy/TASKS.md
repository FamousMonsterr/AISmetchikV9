# AI Сметчик — Задачник: Деплой на VDS (Beget)

> Документация: `deploy/ARCHITECTURE.md`

---

## Фаза 0: Подготовка (локально)

- [ ] **0.1** Сгенерировать SSH-ключ для Beget
  ```bash
  ssh-keygen -t ed25519 -C "aismetchik-deploy" -f ~/.ssh/aismetchik_beget
  ```
- [ ] **0.2** Добавить SSH-конфиг в `~/.ssh/config` (см. ARCHITECTURE.md → SSH доступ)
- [ ] **0.3** Сгенерировать `NEXTAUTH_SECRET`
  ```bash
  openssl rand -base64 32
  ```
- [ ] **0.4** Сгенерировать пароли для MongoDB (основная + логи)
  ```bash
  openssl rand -base64 24  # для MONGO_PASSWORD
  openssl rand -base64 24  # для MONGO_LOGS_PASSWORD
  ```
- [ ] **0.5** Записать все секреты в безопасное место (1Password / Bitwarden / зашифрованный файл)

---

## Фаза 1: Создание серверов в Beget

- [ ] **1.1** Зайти в панель Beget → VDS
- [ ] **1.2** Создать сервер `srv-web`
  - Тариф: VDS-2 (2 vCPU, 2 GB RAM, 30 GB NVMe)
  - ОС: Ubuntu 22.04 LTS
  - Имя: `srv-web`
  - Добавить SSH-ключ `~/.ssh/aismetchik_beget.pub`
- [ ] **1.3** Создать сервер `srv-api`
  - Тариф: VDS-4 (4 vCPU, 4 GB RAM, 50 GB NVMe)
  - ОС: Ubuntu 22.04 LTS
  - Имя: `srv-api`
  - Добавить SSH-ключ
  - **Отметить: приватная сеть**
- [ ] **1.4** Создать сервер `srv-db`
  - Тариф: VDS-2 (2 vCPU, 4 GB RAM, 60 GB NVMe)
  - ОС: Ubuntu 22.04 LTS
  - Имя: `srv-db`
  - Добавить SSH-ключ
  - **Отметить: приватная сеть**
- [ ] **1.5** Создать сервер `srv-db-logs`
  - Тариф: VDS-1 (1 vCPU, 1 GB RAM, 20 GB NVMe)
  - ОС: Ubuntu 22.04 LTS
  - Имя: `srv-db-logs`
  - Добавить SSH-ключ
  - **Отметить: приватная сеть**
- [x] **1.6** Записать выданные IP-адреса:
  - srv-web публичный IP: `5.35.88.53`
  - srv-api приватный IP: `10.16.0.2`
  - srv-db приватный IP: `10.16.0.3`
  - srv-db-logs приватный IP: `10.16.0.4`
- [ ] **1.7** Проверить SSH-подключение к srv-web
  ```bash
  ssh srv-web "hostname && ip addr show"
  ```
- [ ] **1.8** Проверить подключение к приватным серверам через jump host
  ```bash
  ssh srv-api "hostname"
  ssh srv-db "hostname"
  ssh srv-db-logs "hostname"
  ```
- [x] **1.9** Настроить Beget S3 Object Storage
  - Endpoint: `https://s3.ru1.storage.beget.cloud`
  - Bucket: `2812d8a1b1e1-aismetchiks3`
  - Access Key: `S3_ACCESS_KEY`
  - Secret Key: `S3_SECRET_KEY`
  - Path style: `https://s3.ru1.storage.beget.cloud/2812d8a1b1e1-aismetchiks3`
  - Virtual hosted: `https://2812d8a1b1e1-aismetchiks3.s3.ru1.storage.beget.cloud`

---

## Фаза 2: Настройка базовых серверов

### На каждом сервере (srv-web, srv-api, srv-db, srv-db-logs):

- [ ] **2.1** Обновить систему
  ```bash
  apt update && apt upgrade -y
  ```
- [ ] **2.2** Установить Docker
  ```bash
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker
  systemctl start docker
  ```
- [ ] **2.3** Установить Docker Compose plugin
  ```bash
  apt install -y docker-compose-plugin
  ```
- [ ] **2.4** Настроить firewall (ufw)
  ```bash
  ufw default deny incoming
  ufw default allow outgoing
  ufw allow from 10.0.0.0/24 to any port 22
  ufw enable
  ```
- [ ] **2.5** Отключить парольную аутентификацию SSH
  ```bash
  sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
  systemctl restart sshd
  ```
- [ ] **2.6** Создать директорию проекта
  ```bash
  mkdir -p /opt/ais-smetchik/nginx/certbot/{www,conf}
  ```

### Только на srv-web:
- [ ] **2.7** Открыть порты 80 и 443
  ```bash
  ufw allow 80/tcp
  ufw allow 443/tcp
  ```

---

## Фаза 3: Настройка MongoDB

### srv-db:
- [ ] **3.1** Создать `docker-compose.yml` (см. ARCHITECTURE.md → srv-db)
- [ ] **3.2** Создать `.env` с паролем MongoDB
  ```env
  MONGO_PASSWORD=<сгенерированный_пароль>
  ```
- [ ] **3.3** Создать `mongo-init.js` для инициализации БД и пользователя
  ```javascript
  db = db.getSiblingDB('aismetchik');
  db.createUser({
    user: 'aismetchik_app',
    pwd: '<app_password>',
    roles: [{ role: 'readWrite', db: 'aismetchik' }]
  });
  ```
- [ ] **3.4** Запустить MongoDB
  ```bash
  cd /opt/ais-smetchik
  docker compose up -d
  ```
- [ ] **3.5** Проверить подключение
  ```bash
  docker compose exec mongo mongosh -u aismetchik -p <password> --authenticationDatabase admin
  ```

### srv-db-logs:
- [ ] **3.6** Создать `docker-compose.yml` (см. ARCHITECTURE.md → srv-db-logs)
- [ ] **3.7** Создать `.env` с паролем
- [ ] **3.8** Запустить MongoDB Logs
- [ ] **3.9** Проверить подключение

---

## Фаза 4: Настройка CI/CD (Docker Registry)

- [ ] **4.1** Убедиться что GitHub репозиторий приватный (или ghcr.io настроен)
- [ ] **4.2** Создать GitHub Actions workflow `.github/workflows/build-and-push.yml`
  - Сборка 3 образов: `web`, `api`, `worker`
  - Пуш в `ghcr.io`
  - Триггер: push в `main`
- [ ] **4.3** Добавить секреты в GitHub:
  - `SRV_WEB_IP` — публичный IP srv-web
  - `SSH_PRIVATE_KEY` — приватный ключ `~/.ssh/aismetchik_beget`
- [ ] **4.4** Проверить что образы собираются и пушатся
  ```bash
  # Локально для теста:
  docker build --target runner -t ghcr.io/famousmonsterr/ais-smetchik-web:latest .
  docker build --target worker -t ghcr.io/famousmonsterr/ais-smetchik-worker:latest .
  ```

---

## Фаза 5: Деплой API-сервера (srv-api)

- [ ] **5.1** Скопировать docker-compose на srv-api
  ```bash
  scp deploy/docker-compose.api.yml srv-api:/opt/ais-smetchik/docker-compose.yml
  ```
- [ ] **5.2** Создать `.env` на srv-api (см. ARCHITECTURE.md → переменные srv-api)
  - `MONGODB_URI` →指向 srv-db (10.16.0.3)
  - `MONGODB_LOGS_URI` →指向 srv-db-logs (10.16.0.4)
  - `OPENROUTER_API_KEY`
  - `S3_ENDPOINT=https://s3.ru1.storage.beget.cloud`
  - `S3_BUCKET_NAME=2812d8a1b1e1-aismetchiks3`
  - `S3_ACCESS_KEY_ID=S3_ACCESS_KEY`
  - `S3_SECRET_ACCESS_KEY=S3_SECRET_KEY`
  - `TELEGRAM_*` переменные
  - `NEXTAUTH_SECRET`
- [ ] **5.3** Настроить Docker Registry credentials
  ```bash
  docker login ghcr.io -u FamousMonsterr -p <github_pat>
  ```
- [ ] **5.4** Запустить API и Worker
  ```bash
  cd /opt/ais-smetchik
  docker compose pull
  docker compose up -d
  ```
- [ ] **5.5** Проверить healthcheck
  ```bash
  docker compose ps
  curl http://localhost:3000/api/healthz
  ```

---

## Фаза 6: Деплой веб-сервера (srv-web)

- [ ] **6.1** Скопировать файлы на srv-web
  ```bash
  scp deploy/docker-compose.web.yml srv-web:/opt/ais-smetchik/docker-compose.yml
  scp deploy/nginx/default.conf srv-web:/opt/ais-smetchik/nginx/
  ```
- [ ] **6.2** Создать `.env` на srv-web (см. ARCHITECTURE.md → переменные srv-web)
  - `API_INTERNAL_URL=http://10.0.0.11:3000`
  - `MONGODB_URI` →指向 srv-db
  - `NEXTAUTH_SECRET` (тот же что на srv-api!)
  - `NEXTAUTH_COOKIE_DOMAIN=.aismetchik.ru`
- [ ] **6.3** Настроить nginx конфигурацию
  - Upstream на `srv-api:3000` для API-роутов
  - SSL-termination
  - Проксирование каждого subdomain на нужный surface-контейнер
- [ ] **6.4** Запустить контейнеры
  ```bash
  cd /opt/ais-smetchik
  docker compose pull
  docker compose up -d
  ```
- [ ] **6.5** Проверить что nginx стартовал
  ```bash
  docker compose ps
  curl -I http://localhost
  ```

---

## Фаза 7: DNS и SSL

- [ ] **7.1** Настроить DNS-записи у регистратора домена:

  | Домен | Тип | Значение |
  |---|---|---|
  | `aismetchik.ru` | A | `<публичный IP srv-web>` |
  | `*.aismetchik.ru` | A | `<публичный IP srv-web>` |

  Или отдельные A-записи для каждого subdomain.

- [ ] **7.2** Дождаться распространения DNS (до 24ч, обычно 5-15 мин)
  ```bash
  dig aismetchik.ru +short
  dig lk.aismetchik.ru +short
  ```

- [ ] **7.3** Выпустить SSL-сертификат Let's Encrypt
  ```bash
  ssh srv-web
  cd /opt/ais-smetchik
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
  ```

- [ ] **7.4** Перезапустить nginx для применения сертификата
  ```bash
  docker compose exec nginx nginx -s reload
  ```

- [ ] **7.5** Настроить автообновление сертификата (cron на srv-web)
  ```bash
  crontab -e
  # Добавить:
  0 3 * * * cd /opt/ais-smetchik && docker compose run --rm certbot renew && docker compose exec nginx nginx -s reload
  ```

- [ ] **7.6** Проверить HTTPS
  ```bash
  curl -I https://aismetchik.ru
  curl -I https://lk.aismetchik.ru
  ```

---

## Фаза 8: Проверка и тестирование

- [ ] **8.1** Проверить все endpoints:
  - [ ] `https://aismetchik.ru` — лендинг
  - [ ] `https://lk.aismetchik.ru` — личный кабинет
  - [ ] `https://admin.aismetchik.ru` — админка
  - [ ] `https://crm.aismetchik.ru` — CRM
  - [ ] `https://partner.aismetchik.ru` — партнёрка
  - [ ] `https://m.aismetchik.ru` — мобилка

- [ ] **8.2** Проверить API через веб:
  - [ ] Регистрация / вход
  - [ ] Загрузка файла
  - [ ] AI-анализ документа
  - [ ] Генерация PDF/DOCX

- [ ] **8.3** Проверить Telegram-бота:
  - [ ] Webhook URL доступен
  - [ ] Бот отвечает

- [ ] **8.4** Проверить Beget S3:
  - [ ] Загрузка аватара → `ais-avatars`
  - [ ] Загрузка документа проекта → `ais-project-docs`
  - [ ] Скачивание файла через presigned URL
  - [ ] Проверить что приватные buckets не отдают файлы без подписи

- [ ] **8.5** Проверить логи:
  ```bash
  # На каждом сервере:
  docker compose logs -f --tail=50
  ```

- [ ] **8.6** Проверить мониторинг:
  - [ ] Настроить UptimeRobot / Uptime Kuma на все endpoints
  - [ ] Проверить что алерты приходят

---

## Фаза 9: Финализация

- [ ] **9.1** Задокументировать все пароли и IP-адреса
- [ ] **9.2** Настроить автоматический деплой через GitHub Actions (push в main → deploy)
- [ ] **9.3** Настроить бэкапы MongoDB
  ```bash
  # Cron на srv-db:
  0 2 * * * docker compose exec -T mongo mongodump --archive --gzip | gzip > /backup/mongo-$(date +\%F).gz
  ```
- [ ] **9.4** Настроить ротацию логов Docker
- [ ] **9.5** Проверить отказоустойчивость (перезапустить контейнеры, проверить recovery)

---

## Статус

| Фаза | Статус | Дата |
|---|---|---|
| 0. Подготовка | ⏳ | — |
| 1. Создание серверов | ⏳ | — |
| 2. Настройка базовых | ⏳ | — |
| 3. MongoDB | ⏳ | — |
| 4. CI/CD | ⏳ | — |
| 5. API сервер | ⏳ | — |
| 6. Веб сервер | ⏳ | — |
| 7. DNS и SSL | ⏳ | — |
| 8. Тестирование | ⏳ | — |
| 9. Финализация | ⏳ | — |
