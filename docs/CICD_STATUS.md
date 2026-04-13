# 🚀 CI/CD Status — Готов к запуску

## ✅ Все секреты настроены

| Secret | Last Updated | Status |
|--------|--------------|--------|
| VDS_SSH_HOST | 2 months ago | ✅ Ready |
| VDS_SSH_USER | 2 months ago | ✅ Ready |
| VDS_SSH_KEY | 2 months ago | ✅ Ready |
| VDS_SSH_PORT | 2 months ago | ✅ Ready |
| VDS_DEPLOY_PATH | 2 months ago | ✅ Ready |
| VDS_DOMAIN | 2 months ago | ✅ Ready |
| VDS_SUBDOMAINS | 2 months ago | ✅ Ready |
| LETSENCRYPT_EMAIL | 2 months ago | ✅ Ready |

## 📦 Workflows готовы

| Workflow | Файл | Статус |
|----------|------|--------|
| CI | `.github/workflows/ci.yml` | ✅ Active |
| Deploy VDS | `.github/workflows/deploy-vds.yml` | ✅ Active |
| Rollback | `.github/workflows/rollback.yml` | ✅ Active |
| Release | `.github/workflows/release.yml` | ✅ Active |
| External Checks | `.github/workflows/external-checks.yml` | ✅ Active |

## 🎯 Следующие шаги для первого деплоя

### 1. Проверка на сервере (SSH)
```bash
ssh user@your-vds-host
docker --version
docker compose version
git --version
```

### 2. Первый ручной деплой (опционально)
```bash
cd /opt/ai-smetchik
git clone <repository-url> .
cp deploy/.env.vds.example deploy/.env.vds
# Заполните .env.vds вашими значениями
docker compose -f deploy/docker-compose.vds.yml up -d --build
```

### 3. Автоматический деплой через CI/CD
Просто сделайте push в ветку `main`:
```bash
git add .
git commit -m "feat: ready for production"
git push origin main
```

GitHub Actions автоматически:
1. Запустит CI (lint, test, build)
2. При успехе — задеплоит на VDS
3. Проверит health checks всех сервисов
4. Выполнит smoke tests

## 🔄 Откат (если понадобится)

GitHub → Actions → Rollback Deploy → Run workflow

- Оставьте `target_commit` пустым для отката к предыдущей версии
- Или укажите конкретный SHA/тег
- Обязательно укажите причину отката

## 📊 Мониторинг

После деплоя проверьте:
- https://your-domain.com/api/healthz
- https://admin.your-domain.com/api/healthz
- https://lk.your-domain.com/api/healthz
- https://crm.your-domain.com/api/healthz
- https://partner.your-domain.com/api/healthz
- https://m.your-domain.com/api/healthz

## ⚠️ Важные заметки

1. **Секреты не отображаются в логах** — это нормальное поведение GitHub (маскировка)
2. **Первый деплой может занять 5-10 минут** (build образов, получение SSL сертификатов)
3. **SSL сертификаты Let's Encrypt** требуют DNS записи A/AAAA на ваш VDS
4. **Port 22, 80, 443** должны быть открыты на фаерволе VDS

---

**Статус:** 🟢 ГОТОВ К ПРОДАКШЕНУ
