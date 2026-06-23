# План: Интеграция Xiaomi MiMo как прямого AI-провайдера

## Контекст

Текущая архитектура поддерживает:
- **OpenRouter** — единственный облачный провайдер (один API key)
- **Local HF** — локальная HuggingFace модель

**Цель:** Добавить Xiaomi MiMo как прямой провайдер (минуя OpenRouter) с:
- Множественными API key для ротации
- Трекингом запросов, подсчётом стоимости и количества токенов
- Гибкой привязкой: каждый SPI может иметь свой endpoint, или несколько SPI могут группироваться на один endpoint
- Админкой для управления ключами и мониторинга

---

## Фаза 0: Исправление ошибок сборки (блокеры)

### 0.1 Tailwind `duration-normal`
**Файл:** `src/app/globals.css`

**Проблема:** CSS-переменная `--duration-normal: 250ms` используется как utility class `duration-normal`, но в Tailwind v4 это не работает автоматически.

**Решение:** Зарегистрировать в `@theme inline` блоке:
```css
@theme inline {
  --duration-normal: 250ms;
  --duration-fast: 150ms;
  --duration-slow: 350ms;
  --duration-slower: 500ms;
}
```

### 0.2 Отсутствующие шрифты Inter и JetBrainsMono
**Файл:** `src/app/layout.tsx`

**Проблема:** layout.tsx ссылается на `Inter-*.woff2` и `JetBrainsMono-Regular.woff2`, но в `public/fonts/` только Montserrat.

**Решение (варианты):**
- **A.** Скачать шрифты Inter и JetBrainsMono и положить в `public/fonts/`
- **B.** Заменить references на Montserrat (если это дефолтный шрифт проекта)
- **C.** Использовать `next/font/google` для Inter и JetBrainsMono (рекомендуется)

---

## Фаза 1: Модель данных и конфигурация

### 1.1 Расширить `ai-config.json`

Добавить секцию `xiaomi` в `providers` и модели в `apiModels`:

```json
{
  "providers": {
    "openrouter": { ... },
    "xiaomi": {
      "name": "Xiaomi MiMo",
      "baseUrl": "https://api.xiaomimimo.com/v1",
      "models": ["mimo-v2-pro", "mimo-v2-flash", "mimo-v2-omni"]
    }
  },
  "apiModels": [
    ...,
    {
      "value": "xiaomi/mimo-v2-pro",
      "label": "Xiaomi MiMo V2 Pro",
      "provider": "xiaomi",
      "temperature": 0.2,
      "supportsThoughts": true,
      "canGenerateImages": false,
      "canProcessAudio": false,
      "isServiceModel": false,
      "isVoiceModel": false,
      "pricing": {
        "input": 0,
        "output": 0
      }
    },
    {
      "value": "xiaomi/mimo-v2-flash",
      "label": "Xiaomi MiMo V2 Flash",
      "provider": "xiaomi",
      "temperature": 0.2,
      "isDefault": false,
      "pricing": { "input": 0, "output": 0 }
    },
    {
      "value": "xiaomi/mimo-v2-omni",
      "label": "Xiaomi MiMo V2 Omni",
      "provider": "xiaomi",
      "temperature": 0.2,
      "supportsThoughts": true,
      "input": ["text", "image"],
      "pricing": { "input": 0, "output": 0 }
    }
  ]
}
```

### 1.2 Типы ключей и эндпоинтов

**Концепция: "API Key Pool"**

```typescript
// src/types/xiaomi.ts

export interface XiaomiApiKey {
  id: string;               // nanoid
  label: string;            // человекочитаемое имя
  key: string;              // сам ключ (encrypted at rest)
  endpoint: string;         // baseUrl для этого ключа
  isActive: boolean;        // включён/выключен
  rateLimitRpm?: number;    // лимит запросов в минуту
  dailyQuota?: number;      // дневной лимит запросов
  totalRequests: number;    // счётчик запросов
  totalTokens: number;      // счётчик токенов
  totalCost: number;        // накопленная стоимость
  lastUsedAt?: Date;        // последнее использование
  errorCount: number;       // счётчик ошибок
  lastError?: string;       // последняя ошибка
  createdAt: Date;
  updatedAt: Date;
}

export interface XiaomiEndpointGroup {
  id: string;
  label: string;            // "Основной", "Резервный", "SPI-1"
  endpoint: string;         // общий baseUrl
  keyIds: string[];         // привязанные ключи
  rotationStrategy: 'round-robin' | 'least-used' | 'random' | 'fallback';
  isDefault: boolean;
}
```

### 1.3 MongoDB коллекции

```
xiaomi_api_keys          — ключи с метриками
xiaomi_endpoint_groups   — группы эндпоинтов
xiaomi_request_logs      — логи каждого запроса (детальные)
```

---

## Фаза 2: Backend — сервис Xiaomi

### 2.1 `src/services/xiaomi.ts`

Аналог `src/services/openrouter.ts`, но для прямого API Xiaomi:

```typescript
// Основные функции:
- generateXiaomiContent(params)        // основной вызов
- generateXiaomiContentStreamed(params) // streaming
- getActiveApiKey(groupId?)            // ротация ключей
- rotateApiKey(groupId)                // сменить ключ
- logXiaomiRequest(log)                // логирование
```

**Стратегия ротации ключей:**
1. **Round-Robin** — по очереди
2. **Least-Used** — с наименьшим числом запросов
3. **Random** — случайный
4. **Fallback** — основной → при ошибке → следующий

### 2.2 Интеграция в `src/services/ai.ts`

Добавить ветку `xiaomi` в `resolveExecutionProvider`:

```typescript
const resolveExecutionProvider = async (params): Promise<ExecutionProvider> => {
  if (params.providerOverride) return params.providerOverride;
  
  const aiConfig = await readAiConfig();
  const modelInfo = aiConfig.apiModels.find(m => m.value === params.model);
  
  if (modelInfo?.provider === 'xiaomi') return 'xiaomi';
  
  // существующая логика...
  return 'openrouter';
};
```

В `generateJson` добавить ветку:
```typescript
if (executionProvider === 'xiaomi') {
  return await generateXiaomiJson({ ...params, processedPrompt });
}
```

### 2.3 Расширить `EnvSettings`

Добавить поля в `EnvSettings` interface и schema:

```typescript
// Xiaomi provider settings
xiaomiEnabled?: boolean;
xiaomiDefaultEndpoint?: string;     // дефолтный baseUrl
xiaomiRotationStrategy?: 'round-robin' | 'least-used' | 'random' | 'fallback';
```

API ключи — отдельная коллекция `xiaomi_api_keys` (не в env, т.к. их много).

---

## Фаза 3: Админка — UI управления

### 3.1 Страница "AI Providers" в админке

Расширить существующую админку (`src/components/admin/`) новой секцией:

**Вкладка "Xiaomi MiMo":**
- Список API ключей с метриками (таблица)
- Кнопка "Добавить ключ" (форма: label, key, endpoint, rate limit)
- Кнопка "Тестировать ключ" (ping endpoint)
- Группы эндпоинтов (создание/редактирование)
- Стратегия ротации (select)
- Общая статистика: всего запросов, токенов, стоимость

### 3.2 Дашборд использования

**Вкладка "AI Usage":**
- Графики запросов по дням (Recharts)
- Разбивка по провайдерам (OpenRouter vs Xiaomi)
- Разбивка по моделям
- Стоимость по периодам
- Топ ключей по использованию
- Ошибки и retry

### 3.3 Компоненты

```
src/components/admin/XiaomiKeysTable.tsx
src/components/admin/XiaomiKeyForm.tsx
src/components/admin/XiaomiEndpointGroups.tsx
src/components/admin/AiUsageDashboard.tsx
src/components/admin/AiProviderSettings.tsx
```

---

## Фаза 4: Логирование и метрики

### 4.1 Расширить `logAiApiCall`

Добавить `'xiaomi'` в тип `provider`:

```typescript
provider: 'openrouter' | 'local_hf' | 'xiaomi'
```

### 4.2 Детальное логирование Xiaomi запросов

```typescript
// src/lib/xiaomi-metrics.ts

export interface XiaomiRequestLog {
  timestamp: Date;
  keyId: string;           // какой ключ использован
  keyLabel: string;
  endpoint: string;
  model: string;
  userId: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;            // рассчитанная стоимость
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  httpStatus?: number;
}
```

Записывать в MongoDB коллекцию `xiaomi_request_logs`.

### 4.3 Агрегаты для дашборда

```typescript
// Ежедневная агрегация
{
  date: "2026-06-15",
  provider: "xiaomi",
  keyId: "...",
  model: "mimo-v2-pro",
  requestCount: 150,
  totalPromptTokens: 450000,
  totalCompletionTokens: 120000,
  totalCost: 0.0,
  errorCount: 3,
  avgLatencyMs: 1200
}
```

---

## Фаза 5: Роутинг моделей по планам

### 5.1 Обновить `planModels` в `ai-config.json`

```json
{
  "planModels": {
    "free": {
      "defaultModel": "xiaomi/mimo-v2-flash",
      "abTestModels": ["xiaomi/mimo-v2-flash", "qwen/qwen3-next-80b-a3b-instruct:free"]
    },
    "pro": {
      "defaultModel": "xiaomi/mimo-v2-pro",
      "abTestModels": ["xiaomi/mimo-v2-pro", "xiaomi/mimo-v2-flash"]
    },
    "business": {
      "availableModels": [
        "xiaomi/mimo-v2-pro",
        "xiaomi/mimo-v2-omni",
        "openai/gpt-4o-mini",
        "google/gemini-2.5-pro"
      ]
    }
  }
}
```

### 5.2 Обновить `src/lib/plan-models.ts`

Логика уже универсальная — достаточно добавить модели в `apiModels` и `planModels`.

---

## Фаза 6: Тестирование

### 6.1 Unit тесты
- Ротация ключей (round-robin, least-used, fallback)
- Расчёт стоимости
- Обработка ошибок (key exhausted, rate limit, auth error)

### 6.2 Integration тесты
- Полный цикл: запрос → ротация → ответ → лог
- Fallback между ключами при ошибке
- Fallback между провайдерами (Xiaomi → OpenRouter)

### 6.3 E2E
- Админка: CRUD ключей, тестирование, дашборд
- Пользователь: анализ документа через Xiaomi модель

---

## Порядок реализации

| Приоритет | Задача | Оценка |
|-----------|--------|--------|
| 🔴 P0 | Исправить ошибки сборки (Phase 0) | 1-2 часа |
| 🟡 P1 | Backend: xiaomi.ts + ротация ключей | 4-6 часов |
| 🟡 P1 | Интеграция в ai.ts + логирование | 2-3 часа |
| 🟢 P2 | Админка: управление ключами | 4-6 часов |
| 🟢 P2 | Дашборд использования | 3-4 часа |
| 🔵 P3 | Расширенная ротация (стратегии) | 2-3 часа |
| 🔵 P3 | Тесты | 3-4 часов |

**Общая оценка: 20-28 часов**

---

## Архитектурная схема

```
┌─────────────────────────────────────────────────┐
│                   ai-config.json                 │
│  providers: { openrouter, xiaomi, local_hf }     │
│  apiModels: [ ... с provider: "xiaomi" ]         │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│                src/services/ai.ts                │
│  resolveExecutionProvider() → 'xiaomi'           │
│  generateJson() → generateXiaomiJson()           │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────┐
│             src/services/xiaomi.ts               │
│  getActiveApiKey(groupId?) → key + endpoint      │
│  generateXiaomiContent() → fetch + retry         │
│  logXiaomiRequest() → MongoDB                    │
└──────────────────────┬──────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    ┌─────────┐  ┌─────────┐  ┌─────────┐
    │ Key #1  │  │ Key #2  │  │ Key #3  │
    │endpoint1│  │endpoint1│  │endpoint2│
    └─────────┘  └─────────┘  └─────────┘
    
    Group A (endpoint1)    Group B (endpoint2)
    [Key#1, Key#2]         [Key#3]
    strategy: round-robin  strategy: fallback
```
