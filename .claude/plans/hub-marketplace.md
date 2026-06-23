# Hub — Маркетплейс заказов для монтажников

## Название
**MontageHub** — нарицательное имя, используется в UI, домене, логотипе.

## Что делаем

Добавляем в дашборд раздел **«Хаб»** — маркетплейс, где:
- **Заказчик** загружает файлы проекта/спецификации → AI генерирует смету с рекомендованной ценой → публикует заказ в общий доступ
- **Исполнитель** ищет заказы через фильтры → откликается → берёт в работу
- Рейтинги и отзывы на обе стороны
- Комиссия: **500 ₽ за отклик**, на тарифе **PRO — 3 отклика в месяц бесплатно**
- Публикация заказа и поиск исполнителей — **бесплатно**

---

## Архитектура

### 1. Навигация

**Файл:** `src/app/dashboard/layout.tsx` (строки 129-148)

Добавить в `menuItems`:
```typescript
{ href: "/dashboard/hub", label: "Хаб", icon: <Network className="h-5 w-5 shrink-0" /> },
```

Иконка `Network` из `lucide-react` (уже в зависимостях).

### 2. MongoDB колекции

| Коллекция | Назначение |
|-----------|------------|
| `hub_orders` | Заказы (публичные сметы) |
| `hub_responses` | Отклики исполнителей |
| `hub_reviews` | Отзывы и рейтинги |

#### Схема `hub_orders`:
```typescript
{
  id: string;              // nanoid
  userId: string;          // автор (заказчик)
  title: string;           // название объекта
  description: string;     // описание работ
  city: string;            // город
  category: string;        // категория (слаботочка, электрика, и т.д.)
  files: Array<{ name: string; url: string; size: number }>;
  aiEstimate: {            // результат AI-сметы
    totalCost: number;     // рекомендованная цена
    items: Array<{ name: string; qty: number; unit: string; price: number; total: number }>;
    currency: string;      // "RUB"
  };
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  budget: { min: number; max: number };
  deadline: string;        // ISO date
  responseCount: number;
  viewCount: number;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Схема `hub_responses`:
```typescript
{
  id: string;
  orderId: string;
  userId: string;          // исполнитель
  message: string;         // сопроводительное сообщение
  proposedPrice: number;
  proposedDeadline: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  creditsSpent: number;    // 500 (или 0 если PRO и есть бесплатные отклики)
  createdAt: Date;
}
```

#### Схема `hub_reviews`:
```typescript
{
  id: string;
  orderId: string;
  fromUserId: string;      // кто оставил отзыв
  toUserId: string;        // кому отзыв
  rating: number;          // 1-5
  comment: string;
  role: 'contractor' | 'client';  // роль оцениваемого
  createdAt: Date;
}
```

### 3. Серверные экшены

**Файл:** `src/actions/hubActions.ts`

| Функция | Описание |
|---------|----------|
| `createHubOrder(data)` | Создать заказ (загрузка файлов → AI смета → сохранение) |
| `publishHubOrder(orderId)` | Опублиликовать заказ в общий доступ |
| `closeHubOrder(orderId)` | Закрыть заказ |
| `submitHubResponse(orderId, data)` | Откликнуться (списание кредитов если не PRO) |
| `acceptHubResponse(responseId)` | Принять отклик |
| `rejectHubResponse(responseId)` | Отклонить отклик |
| `submitHubReview(orderId, toUserId, rating, comment)` | Оставить отзыв |
| `getHubOrders(filters)` | Получить список заказов с фильтрами |
| `getHubOrderDetails(orderId)` | Детали заказа + отклики |
| `getMyHubOrders()` | Мои заказы |
| `getMyHubResponses()` | Мои отклики |

### 4. API Routes

**Файл:** `src/app/api/hub/orders/route.ts` — GET (список с фильтрами), POST (создать)
**Файл:** `src/app/api/hub/orders/[id]/route.ts` — GET (детали), PATCH (обновить)
**Файл:** `src/app/api/hub/responses/route.ts` — POST (отклик)
**Файл:** `src/app/api/hub/reviews/route.ts` — POST (отзыв), GET (отзывы пользователя)

### 5. Страницы

#### `/dashboard/hub` — главная страница Хаба
Два режима (табы):
- **«Найти подрядчика»** — мои заказы + кнопка «Разместить заказ»
- **«Найти работу»** — лента доступных заказов с фильтрами

#### `/dashboard/hub/new` — создание заказа
1. Загрузка файлов (react-dropzone, как на dashboard)
2. Заполнение полей (город, категория, описание, бюджет, сроки)
3. Кнопка «Рассчитать смету» → AI анализ → показ рекомендованной цены
4. Кнопка «Опубликовать»

#### `/dashboard/hub/orders/[id]` — детали заказа
- Информация о заказе + AI-смета
- Список откликов (для заказчика)
- Кнопка «Откликнуться» (для исполнителя)
- Рейтинг заказчика

#### `/dashboard/hub/my-responses` — мои отклики
- Список откликов с статусами

### 6. UI компоненты

| Компонент | Путь |
|-----------|------|
| `HubOrderCard` | `src/components/hub/HubOrderCard.tsx` |
| `HubFilters` | `src/components/hub/HubFilters.tsx` |
| `HubResponseDialog` | `src/components/hub/HubResponseDialog.tsx` |
| `HubReviewDialog` | `src/components/hub/HubReviewDialog.tsx` |
| `HubEstimateView` | `src/components/hub/HubEstimateView.tsx` |
| `HubPublishDialog` | `src/components/hub/HubPublishDialog.tsx` |

### 7. Кредитная система интеграция

При отклике:
1. Проверяем тариф пользователя
2. Если PRO — проверяем бесплатные отклики (`hubFreeResponsesUsed` на user doc, ресет ежемесячно)
3. Если PRO и < 3 бесплатных — списание 0, инкремент счётчика
4. Если не PRO или бесплатные кончились — списание 500 кредитов через `deductCredits`
5. Если кредитов недостаточно — показать диалог покупки

Добавить в user document:
```typescript
hubFreeResponsesUsed: number;  // счётчик бесплатных откликов PRO (ресет ежемесячно)
hubFreeResponsesResetAt: Date; // дата следующего сброса
```

### 8. Лендинг — кнопки

Добавить на лендинг (если есть) две CTA кнопки:
- «Разместить заказ в Хабе» → `/dashboard/hub/new`
- «Найти работу» → `/dashboard/hub?tab=work`

---

## Порядок реализации

1. **MongoDB схемы и типы** — `src/types/hub.ts`
2. **Серверные экшены** — `src/actions/hubActions.ts`
3. **API routes** — `src/app/api/hub/`
4. **UI компоненты** — `src/components/hub/`
5. **Страницы** — `src/app/dashboard/hub/`
6. **Навигация** — обновить `layout.tsx`
7. **Кредитная интеграция** — обновить `credits.ts` и user schema
8. **Лендинг** — добавить кнопки

## Файлы которые нужно создать

```
src/types/hub.ts
src/actions/hubActions.ts
src/app/api/hub/orders/route.ts
src/app/api/hub/orders/[id]/route.ts
src/app/api/hub/responses/route.ts
src/app/api/hub/reviews/route.ts
src/components/hub/HubOrderCard.tsx
src/components/hub/HubFilters.tsx
src/components/hub/HubResponseDialog.tsx
src/components/hub/HubReviewDialog.tsx
src/components/hub/HubEstimateView.tsx
src/components/hub/HubPublishDialog.tsx
src/app/dashboard/hub/page.tsx
src/app/dashboard/hub/new/page.tsx
src/app/dashboard/hub/orders/[id]/page.tsx
src/app/dashboard/hub/my-responses/page.tsx
```

## Файлы которые нужно изменить

```
src/app/dashboard/layout.tsx          — добавить пункт меню "Хаб"
src/contexts/AppContext.tsx            — добавить hubFreeResponsesUsed в user тип
src/services/credits.ts               — добавить функцию списания за отклик
```
