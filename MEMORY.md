# MEMORY (обновлено: 1 марта 2026)

## Что сделано в этой сессии
- Оптимизирован `/partnership`:
  - First Load JS снижен примерно с `~391kB` до `~168kB` (lazy секции + облегчение above-the-fold).
  - Обновлен статус в `docs/performance-status-2026-02-28.md`.
- Усилен деплой:
  - обновлен `.github/workflows/deploy-vds.yml`;
  - добавлены fallback-сценарии, чтобы релиз не падал полностью при временном сбое certbot.
- Обновлены nginx-шаблоны для ACME:
  - `deploy/nginx/default.http.conf`
  - `deploy/nginx/default.https.conf`
- Прогнан полный цикл `main`:
  - CI success: `22520778527`
  - Deploy VDS success: `22520820135`

## Что подтверждено по логам/проверкам
- `http://aismetchik.ru/api/healthz` возвращает `200` (`Server: nginx/1.27.5`).
- HTTPS на основном домене пока недоступен извне (таймаут).
- Поддомены `admin/lk/crm/partner/m` отвечают не с текущего VDS (`Server: nginx-reuseport/1.21.1`) — критичный DNS mismatch.
- Certbot в deploy-логах продолжает падать на валидации поддоменов (`Invalid response ... 500`), что согласуется с DNS mismatch.

## Незакрытые блокеры
1. DNS всех поддоменов должен указывать на текущий VDS (тот, где `nginx/1.27.5`).
2. После правки DNS нужно снова запустить `Deploy VDS` для успешного выпуска/обновления TLS.
3. После TLS — повторить авторизованный Lighthouse по:
   - `/dashboard/billing`
   - `/dashboard/price-base`

## Быстрый чек после DNS фикса
- `curl -I http://admin.aismetchik.ru/api/healthz` должен показать тот же сервер, что и root.
- `curl -I https://aismetchik.ru/api/healthz` должен вернуть `200`.
- `curl -I https://admin.aismetchik.ru/api/healthz` должен вернуть `200`.
