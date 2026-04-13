# CI/CD Pipeline Documentation

## Обзор

Проект использует GitHub Actions для автоматизации CI/CD процессов с поддержкой отката на предыдущие версии.

## Workflows

### 1. CI (`ci.yml`)
**Триггеры:** Push в `main`, Pull Requests

**Этапы:**
1. **Lint** — Проверка кода через ESLint
2. **Typecheck** — Проверка типов TypeScript
3. **Unit Tests** — Юнит-тесты (Vitest)
4. **Integration Tests** — Интеграционные тесты
5. **Build** — Сборка Next.js приложения

### 2. Deploy VDS (`deploy-vds.yml`)
**Триггеры:** Успешное завершение CI workflow, ручной запуск

**Функции:**
- Автоматический деплой на VDS после успешного CI
- Поддержка HTTPS с Let's Encrypt
- Health checks для всех сервисов
- Smoke tests после деплоя
- Очистка Docker ресурсов

**Требуемые секреты:**
- `VDS_SSH_HOST` — хост сервера
- `VDS_SSH_USER` — пользователь SSH
- `VDS_SSH_KEY` — приватный SSH ключ
- `VDS_DEPLOY_PATH` — путь деплоя (по умолчанию `/opt/ai-smetchik`)
- `VDS_DOMAIN` — основной домен (опционально)
- `VDS_SUBDOMAINS` — поддомены через запятую (опционально)
- `LETSENCRYPT_EMAIL` — email для SSL сертификатов (опционально)

### 3. Rollback (`rollback.yml`) ⭐ НОВЫЙ
**Триггеры:** Ручной запуск (workflow_dispatch)

**Возможности:**
- Откат к предыдущей версии (по умолчанию)
- Откат к конкретному коммиту или тегу
- Автоматическое создание тегов:
  - `pre-rollback-*` — бэкап текущей версии перед откатом
  - `rollback-*` — тег отката с указанием причины
- Валидация целевого коммита
- Полные health checks и smoke tests после отката

**Параметры:**
- `target_commit` — SHA коммита или тег (пусто = предыдущая версия)
- `reason` — причина отката (обязательно)

**Использование:**
```
GitHub → Actions → Rollback Deploy → Run workflow
→ Target commit: (оставить пустым для prev version)
→ Reason: Critical bug in payment module
```

### 4. Release & Versioning (`release.yml`) ⭐ НОВЫЙ
**Триггеры:** Push тега `v*`, ручной запуск

**Функции:**
- Автоматическое версионирование (SemVer)
- Генерация changelog
- Создание GitHub Release
- Обновление package.json
- Сборка и сохранение артефактов

**Параметры (для workflow_dispatch):**
- `version_type` — patch, minor, major

**Использование:**
```
GitHub → Actions → Release & Versioning → Run workflow
→ Version type: patch
```

## Сценарии использования

### 🚀 Стандартный деплой
1. Пуш в `main` → CI запускается автоматически
2. После успеха → Deploy VDS запускается автоматически
3. Health checks → Smoke tests → Готово!

### 🔄 Откат на предыдущую версию
1. Actions → Rollback Deploy → Run workflow
2. Оставить `target_commit` пустым
3. Указать причину отката
4. Запустить
5. Система автоматически:
   - Создаст бэкап-тег текущей версии
   - Откатится к предыдущему коммиту
   - Задеплоит старую версию
   - Создаст тег отката

### 🎯 Откат к конкретному коммиту
1. Actions → Rollback Deploy → Run workflow
2. Ввести SHA коммита или тег в `target_commit`
3. Указать причину
4. Запустить

### 📦 Создание релиза
1. Actions → Release & Versioning → Run workflow
2. Выбрать тип версии (patch/minor/major)
3. Запустить
4. Система создаст:
   - Тег версии
   - GitHub Release с changelog
   - Обновит package.json
   - Сохранит build artifacts

## Восстановление после отката

Если нужно вернуться к версии после отката:

1. Найти тег бэкапа: `pre-rollback-YYYYMMDD-HHMMSS`
2. Использовать Rollback workflow с этим тегом в `target_commit`

Или создать новый релиз через Release workflow.

## Мониторинг

Все workflows отправляют уведомления в:
- GitHub Actions tab
- GitHub Releases (для release workflow)
- Step Summary с деталями выполнения

## Best Practices

1. **Перед деплоем:** Убедитесь, что CI прошёл успешно
2. **При критических багах:** Используйте Rollback немедленно
3. **После отката:** Создайте issue с анализом проблемы
4. **Регулярно:** Создавайте релизы через Release workflow для трекинга версий
