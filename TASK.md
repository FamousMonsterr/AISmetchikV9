# Задачи для Claude Code

## Задача 1: Исправить S3 загрузку (ОШИБКА 400)

### Проблема
При анализе файла ошибка: "Request failed with status code 400" на этапе загрузки в S3.

### Причина
AWS SDK генерирует presigned URL с заголовками `x-amz-checksum-crc32` и `x-amz-sdk-checksum-algorithm=CRC32`, которые MinIO не поддерживает корректно.

### Решение
В файле `src/app/api/s3-upload/route.ts` нужно убрать CRC32 checksum из PutObjectCommand:

```typescript
const putCommand = new PutObjectCommand({
  Bucket: config.bucketName,
  Key: objectKey,
  ContentType: fileType,
  // НЕ добавляйте ChecksumAlgorithm или подобные поля
});
```

Также проверьте что в `src/components/ProcessingDialog.tsx` при загрузке через axios не передаются лишние заголовки.

### Проверка
1. Залогинься как qa@example.com / changeme123
2. Загрузи файл `/Users/timofejbruhin/Downloads/Договор_субподряд_монтаж_СПЕЦЭНЕРГО_локальное_тушение_11032026.docx`
3. Нажми "Анализ Файла"
4. Должен начаться процесс: S3 upload → AI analysis → Results

---

## Задача 2: Исправить фильтрацию моделей по вкладкам провайдеров

### Проблема
В админке `/dashboard/admin/ai` на вкладке OpenRouter должны показываться только модели OpenRouter, а на вкладке Xiaomi — только модели Xiaomi.

### Решение
Проверь `src/app/dashboard/admin/ai/page.tsx` (или аналогичный файл).
Убедись что:
- Модели фильтруются по `provider` полю из `ai-config.json`
- На вкладке OpenRouter: `provider === 'openrouter'`
- На вкладке Xiaomi: `provider === 'xiaomi'`
- Endpoint для Xiaomi: `https://token-plan-sgp.xiaomimimo.com/v1`
- Endpoint для OpenRouter: `https://openrouter.ai/api/v1`

---

## Задача 3: Добавить retry logic для AI запросов (таймаут фикс)

### Проблема
Xiaomi MiMo API иногда таймаутится: "LLM request timed out."

### Решение
В `src/services/xiaomi.ts`:
1. Добавь retry с exponential backoff (3 попытки)
2. Увеличь timeout до 120 секунд
3. При ошибке таймаута — retry через 2 сек, потом 4 сек, потом 8 сек
4. Если все 3 попытки неудачны — верни понятную ошибку пользователю

В `src/services/ai.ts`:
1. Оберни вызов Xiaomi в try/catch с retry
2. Если Xiaomi не отвечает — fallback на OpenRouter (если настроен)

В `src/components/ProcessingDialog.tsx`:
1. При ошибке AI — покажи кнопку "Повторить анализ"
2. Не сбрасывай прогресс при таймауте

---

## Задача 4: Dev Mode Toggle

### Описание
Добавить переключатель режима разработки в админку.

### Где
`/dashboard/admin/settings` — новая секция "Режим разработки"

### Что делает
Когда включен:
- MongoDB: `mongodb://localhost:27017/aismetchik`
- S3: `http://localhost:9000`, bucket `aismetchik`
- AI: Xiaomi MiMo + OpenRouter (прямые ключи)

Когда выключен:
- MongoDB: production URI (из env)
- S3: production endpoint (из env)
- AI: production keys

### Реализация
1. Добавь поле `devMode: boolean` в `configs/envSettings`
2. Добавь UI toggle в админке
3. При переключении — обновляй MongoDB документ
4. Все сервисы (getS3Client, getDb, getAIClient) должны читать devMode и выбирать правильный endpoint

---

## Задача 5: Тестирование всех кнопок

После исправлений запусти:
```bash
npx playwright test tests/e2e/full-audit.spec.ts --reporter=line
```

Убедись что:
1. Все 10 тестов проходят
2. Анализ файла работает (загрузка в S3 + AI ответ)
3. Нет ошибок в консоли браузера
4. Все страницы загружаются без ошибок

---

## Инфраструктура (уже запущена)
- MongoDB: localhost:27017 (Docker контейнер aismetchik-mongo)
- MinIO: localhost:9000 (Docker контейнер aismetchik-minio)
- Dev сервер: localhost:3000 (npm run dev)

## QA Данные
- Email: qa@example.com
- Пароль: changeme123
- Тестовый файл: /Users/timofejbruhin/Downloads/Договор_субподряд_монтаж_СПЕЦЭНЕРГО_локальное_тушение_11032026.docx
