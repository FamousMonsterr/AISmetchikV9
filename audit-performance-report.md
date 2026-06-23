# 🔍 AISmetchikV9 — Аудит производительности

**Дата:** 2026-06-16  
**Стек:** Next.js 16, React 19, MongoDB, Tailwind CSS 4  
**Аудитор:** AI Performance Audit (subagent)

---

## Содержание

1. [Зависимости (package.json)](#1-зависимости-packagejson)
2. [Root Layout — блокирующие ресурсы](#2-root-layout--блокирующие-ресурсы)
3. [Page.tsx — dynamic import / lazy loading](#3-pagetsx--dynamic-import--lazy-loading)
4. [AppContext.tsx — лишние re-renders](#4-appcontexttsx--лишние-re-renders)
5. [HistorySection.tsx — виртуализация списков](#5-historysectiontsx--виртуализация-списков)
6. [SpecificationPageContent.tsx — проблемы рендера](#6-specificationpagecontenttsx--проблемы-рендера)
7. [adminActions.ts — N+1 запросы](#7-adminactionsts--n1-запросы)
8. [api/db/route.ts — оптимизация запросов](#8-apidbroutets--оптимизация-запросов)
9. [ai.ts / openrouter.ts — утечки памяти](#9-aits--openrouterts--утечки-памяти)
10. [useEffect — cleanup функции](#10-useeffect--cleanup-функции)

---

## 1. Зависимости (package.json)

### 1.1 `lodash` — полный импорт вместо tree-shaking
**Impact: 🟡 MEDIUM**

```json
"lodash": "^4.17.21"
```

**Проблема:** В `SpecificationPageContent.tsx` используется `import { isEqual } from 'lodash'`. Весь lodash (~70KB gzip) попадает в бандл, хотя используется только одна функция.

**Fix:**
```typescript
// Было:
import { isEqual } from 'lodash';

// Стало:
import isEqual from 'lodash/isEqual';
// Или лучше — заменить на нативную реализацию / deep-equal пакет
```

Альтернативно, добавить в `next.config.ts`:
```typescript
webpack: (config) => {
  config.resolve.alias['lodash'] = 'lodash-es';
  return config;
}
```

---

### 1.2 `canvas` — тяжёлый native dependency
**Impact: 🔴 HIGH**

```json
"canvas": "^3.2.3"
```

**Проблема:** Пакет `canvas` (~15MB) — это Node.js реализация HTML5 Canvas с нативными бинарниками. Он тянет за собой `node-pre-gyp`, `node-gyp` и множество C++ зависимостей. Значительно увеличивает `node_modules` и время `npm install`. В Next.js клиентском бандле он не используется, но замедляет build и dev.

**Fix:** Если `canvas` нужен только на сервере (например, для генерации PDF/изображений), убедиться что он не импортируется в клиентских компонентах. Если используется только для `@react-pdf/renderer` — проверить, можно ли обойтись без него (react-pdf может работать без canvas в SSR).

---

### 1.3 `@react-pdf/renderer` — тяжёлая библиотека для PDF
**Impact: 🟡 MEDIUM**

```json
"@react-pdf/renderer": "^4.3.2"
```

**Проблема:** Библиотека весит ~300KB gzip и зависит от `canvas`. Если PDF генерация не используется на каждой странице — это wasted bytes.

**Fix:** Обернуть все PDF-генерирующие компоненты в `dynamic(() => import(...), { ssr: false })`. Проверить, что PDF генерация не попадает в основной бандл.

---

### 1.4 `framer-motion` — тяжёлая анимационная библиотека
**Impact: 🟡 MEDIUM**

```json
"framer-motion": "^12.38.0"
```

**Проблема:** framer-motion добавляет ~50KB gzip к бандлу. Если анимации используются ограниченно — это избыточно.

**Fix:** Оценить, можно ли заменить на CSS transitions/animations или `@react-spring/web` (легче). Если framer-motion нужен только для нескольких компонентов — dynamic import.

---

### 1.5 Дублирование утилит
**Impact: 🟢 LOW**

Используются одновременно: `clsx`, `class-variance-authority`, `tailwind-merge`. Все три делают похожую работу.

**Fix:** `clsx` + `tailwind-merge` уже обёрнуты в `cn()` из `@/lib/utils` — это нормально. Но `class-variance-authority` можно заменить на `clsx` напрямую, если варианты несложные.

---

## 2. Root Layout — блокирующие ресурсы

### 2.1 Три семейства шрифтов с множественными вариантами
**Impact: 🔴 HIGH**

```typescript
// Inter — 2 варианта (regular, mono) ✅ OK
// JetBrains Mono — 2 варианта ✅ OK
// Montserrat — 10 ВАРИАНТОВ (!) через localFont
// Bebas Neue — 1 вариант
```

**Проблема:** Montserrat загружается через `localFont` с **10 файлами** (Regular, Italic, Medium, MediumItalic, SemiBold, SemiBoldItalic, Bold, BoldItalic, Black, BlackItalic). Это ~400-600KB шрифтов, которые браузер начинает загружать при первом рендере. Поскольку `localFont` в Next.js — это **preload** ресурсы, они блокируют render до загрузки.

**Fix:**
```typescript
// Оставить только реально используемые варианты:
const montserrat = localFont({
  src: [
    { path: "../../public/fonts/Montserrat-Regular.woff2", weight: "400", style: "normal" },
    { path: "../../public/fonts/Montserrat-Bold.woff2", weight: "700", style: "normal" },
    // Добавить только если реально используются:
    // { path: "../../public/fonts/Montserrat-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});
```

Аудит использования: проверить `grep -rn "font-montserrat\|Montserrat" src/` — если Montserrat используется только в логотипе/заголовках, 2-3 вариантов достаточно.

---

### 2.2 `link rel="manifest"` в `<head>` внутри `<body>`
**Impact: 🟢 LOW**

```typescript
<head>
  <link rel="manifest" href="/manifest.json" crossOrigin="use-credentials" />
  <meta name="mobile-web-app-capable" content="yes" />
  <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
</head>
```

**Проблема:** В Next.js 16 `<head>` внутри layout не рекомендуется. Manifest и метаданные лучше выносить в `metadata` export или в `next.config.ts`.

**Fix:** Перенести в `metadata`:
```typescript
export const metadata: Metadata = {
  // ...existing
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'AI Сметчик' },
};
```

---

## 3. Page.tsx — dynamic import / lazy loading

### 3.1 ✅ Хорошие примеры
**Impact: N/A (positive)**

- `src/app/dashboard/page.tsx` — использует `dynamic()` для `ProcessingDialog`, `PdfEditorDialog`, `HistorySection`, `UpgradeAccountDialog`, `InsufficientCreditsDialog`, `MobilePanelScreen`
- `src/app/dashboard/calculator/page.tsx` — `SpecificationPageContent` через `dynamic()`
- `src/app/dashboard/admin/settings/page.tsx` — `GeneralSettings`, `LegalEntitySettings`, `EnvSettingsComponent` через `dynamic()`
- `src/app/dashboard/layout.tsx` — `NotificationCenter`, `FloatingSupportChat` через `dynamic()`

### 3.2 Страницы без dynamic imports
**Impact: 🟡 MEDIUM**

- `src/app/dashboard/bonus/page.tsx` — импортирует `ReactMarkdown` + `remarkGfm` напрямую. `react-markdown` ~40KB gzip.
- `src/app/dashboard/training/page.tsx` — импортирует `getKnowledgeBaseArticles` и `onSnapshot` напрямую.
- `src/app/dashboard/tickets/page.tsx` — импортирует `onSnapshot`, `Accordion` компоненты напрямую.

**Fix:**
```typescript
// bonus/page.tsx
const ReactMarkdown = dynamic(() => import('react-markdown'), { ssr: false });
```

Для training и tickets — менее критично, но если статьи/тикеты загружаются не сразу — можно обернуть контент в `Suspense` с skeleton.

---

## 4. AppContext.tsx — лишние re-renders

### 4.1 Объект `value` не мемоизирован
**Impact: 🔴 HIGH**

```typescript
const value: AppState = {
  user, setUser, isLoading, effectivePlan, effectiveRole,
  userAvailableModels, currentProject, setCurrentProject,
  // ... 20+ полей
};

return (
  <AppContext.Provider value={value}>  // ← НОВЫЙ ОБЪЕКТ КАЖДЫЙ РЕНДЕР
    {children}
  </AppContext.Provider>
);
```

**Проблема:** `value` создаётся заново при каждом рендере `AppProvider`. Поскольку React сравнивает context value по ссылке (`Object.is`), **все** потребители контекста ре-рендерятся при **любом** изменении состояния в AppProvider, даже если используемые ими поля не изменились.

**Fix:**
```typescript
const value = useMemo<AppState>(() => ({
  user, setUser, isLoading, effectivePlan, effectiveRole,
  userAvailableModels, currentProject, setCurrentProject,
  currentGroup, setCurrentGroup, showTimeoutWarning, setShowTimeoutWarning,
  telegram, telegramUser, isNavigating, setNavigating,
  actionHistory, logAction, changeCounter, incrementChangeCounter,
  resetChangeCounter, useFileUpload, resetAppContextState,
}), [
  user, isLoading, effectivePlan, effectiveRole, userAvailableModels,
  currentProject, currentGroup, showTimeoutWarning, telegram, telegramUser,
  isNavigating, actionHistory, changeCounter, logAction, resetAppContextState,
  setCurrentProject, setCurrentGroup, setShowTimeoutWarning, setNavigating,
]);
```

**Ожидаемый эффект:** Снижение количества re-renders на 40-60% для страниц, использующих `useAppContext()`.

---

### 4.2 `setCurrentProject` не стабильная ссылка
**Impact: 🟡 MEDIUM**

```typescript
const [currentProject, setCurrentProject] = useState<HistoryRequest | null>(null);
```

`setCurrentProject` из `useState` стабильна, но `currentProject` — объект, который мутируется через spread. Если кто-то положит `setCurrentProject` в зависимость useEffect, ссылка на функцию стабильна, но паттерн обновления через spread может вызывать лишние рендеры.

**Fix:** Рассмотреть `useReducer` вместо множества `useState` для связанных состояний (`currentProject`, `currentGroup`, `actionHistory`).

---

### 4.3 `checkUserPlan` вызывается при каждом snapshot
**Impact: 🟡 MEDIUM**

```typescript
const unsubscribe = onSnapshot(userDocRef, async (docSnap) => {
    // ...
    if (userChanged) {
        checkUserPlan(userData);  // ← async, не блокирует, но вызывает setState
    }
});
```

`checkUserPlan` делает `updateDoc` если план истёк, и затем `setEffectivePlan`. Если snapshot срабатывает часто (при изменении любого поля пользователя), это может привести к цепочке обновлений.

**Fix:** Вызывать `checkUserPlan` только если `planExpiresAt` существует и истёк:
```typescript
if (userChanged && userData.planExpiresAt && userData.planExpiresAt < new Date()) {
    checkUserPlan(userData);
}
```

---

## 5. HistorySection.tsx — виртуализация списков

### 5.1 Отсутствует виртуализация списка проектов
**Impact: 🔴 HIGH**

```typescript
// Рендер всех проектов сразу:
{objectsToRender.map((obj) => <ProjectGroup key={obj.id} ... />)}
{ungroupedToRender.map((p) => <ProjectCard key={p.id} ... />)}
```

**Проблема:** При 50+ проектах каждый `ProjectCard` рендерит Card с иконками, бейджами, dropdown-меню. При 100+ проектах — заметные задержки при скролле и взаимодействии. Нет windowing/virtualization.

**Fix:** Использовать `@tanstack/react-virtual`:
```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);

const virtualizer = useVirtualizer({
  count: ungroupedToRender.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 80, // примерная высота карточки
  overscan: 5,
});

return (
  <div ref={parentRef} style={{ overflow: 'auto' }}>
    <div style={{ height: virtualizer.getTotalSize() }}>
      {virtualizer.getVirtualItems().map((virtualRow) => (
        <ProjectCard key={virtualRow.key} item={ungroupedToRender[virtualRow.index]} ... />
      ))}
    </div>
  </div>
);
```

**Ожидаемый эффект:** Рендер 5-10 видимых карточек вместо всех 100+. Ускорение скролла в 5-10 раз.

---

### 5.2 `useEffect` мержит currentProject в history при каждом изменении
**Impact: 🟡 MEDIUM**

```typescript
useEffect(() => {
    if (!user || !currentProject || currentProject.userId !== user.uid) return;
    setHistory(prev => {
        const merged = [...prev.filter(item => item.id !== currentProject.id), currentProject];
        return applyHistorySnapshot(merged);
    });
}, [
    user?.uid, currentProject?.id, currentProject?.userId,
    currentProject?.status, currentProject?.timestamp,
    currentProject?.updatedAt, currentProject?.cost,
    currentProject?.error, currentProject?.processingStage,
    currentProject?.processingStageMessage, currentProject?.archivedAt,
    currentProject?.objectId, currentProject?.objectName,
    applyHistorySnapshot,
]);
```

**Проблема:** 13 зависимостей! Любое изменение поля `currentProject` (включая `processingStageMessage`) вызывает `setHistory` → ре-рендер всего списка. `applyHistorySnapshot` пересортировывает и перегруппирует массив.

**Fix:** Использовать `useRef` для отслеживания и обновлять history только при реальных изменениях:
```typescript
const currentProjectRef = useRef(currentProject);
useEffect(() => {
    currentProjectRef.current = currentProject;
}, [currentProject]);

useEffect(() => {
    if (!user || !currentProject) return;
    // Обновлять только при изменении id, status, archivedAt
    setHistory(prev => {
        const idx = prev.findIndex(item => item.id === currentProject.id);
        if (idx === -1) return [...prev, currentProject];
        const next = [...prev];
        next[idx] = currentProject;
        return next;
    });
}, [currentProject?.id, currentProject?.status, currentProject?.archivedAt, user?.uid]);
```

---

## 6. SpecificationPageContent.tsx — проблемы рендера

### 6.1 Монолитный компонент 2026 строк
**Impact: 🔴 HIGH**

**Проблема:** Компонент управляет: спецификацией, настройками КП, AI-диалогами, групповой работей, версионированием, голосовым вводом, автосохранением, синхронизацией цен. Любое изменение любого состояния вызывает ре-рендер всего дерева.

**Fix:** Разделить на подкомпоненты с локальным состоянием:
```
SpecificationPageContent (2026 строк)
├── SpecificationManager (спецификация + CRUD)
├── QuoteSettingsPanel (настройки КП)
├── AiPricingDialog (AI-диалог цен)
├── GroupSyncPanel (синхронизация группы)
├── VersionManager (версионирование)
└── VoiceInputHandler (голосовой ввод)
```

Каждый подкомпонент получает только нужные данные через props или отдельный context.

---

### 6.2 `lodash.isEqual` на больших объектах
**Impact: 🟡 MEDIUM**

```typescript
const hasUnsavedChanges = useMemo(() => {
    if (!currentProject || !initialProjectState) return false;
    return !isEqual(
      { spec: currentProject.outputSpecifications, config: currentProject.quoteConfig, details: currentProject.analysisDetails },
      { spec: initialProjectState.outputSpecifications, config: initialProjectState.quoteConfig, details: initialProjectState.analysisDetails }
    );
}, [currentProject, initialProjectState]);
```

**Проблема:** `isEqual` делает deep comparison спецификации (массив из 50-100+ объектов) при каждом ре-рендере. Это O(n) операция на каждое изменение `currentProject`.

**Fix:** Использовать hash/сериализацию:
```typescript
const currentHash = useMemo(
  () => JSON.stringify({ spec: currentProject?.outputSpecifications, config: currentProject?.quoteConfig }),
  [currentProject?.outputSpecifications, currentProject?.quoteConfig]
);
const initialHash = useMemo(
  () => JSON.stringify({ spec: initialProjectState?.outputSpecifications, config: initialProjectState?.quoteConfig }),
  [initialProjectState?.outputSpecifications, initialProjectState?.quoteConfig]
);
const hasUnsavedChanges = currentHash !== initialHash;
```

---

### 6.3 12 useEffect — потенциальные проблемы
**Impact: 🟡 MEDIUM**

12 `useEffect` хуков в одном компоненте. Некоторые имеют сложные зависимости и могут вызывать каскадные обновления.

**Проблемные зоны:**
- `useEffect` для `autoSave` — зависит от `currentProject` (объект), `user`, `toast`, `actionHistory`. Срабатывает при каждом изменении спецификации.
- `useEffect` для model selection — зависит от `currentProject?.id`, `canSelectModel`, `resolvedPlanModel`, `planModelIds`, `selectedModel`, `updateCurrentProject`. Может вызывать цепочку: model change → updateCurrentProject → currentProject changes → model effect re-runs.

**Fix:** Группировать связанные эффекты, использовать `useCallback` для стабильных ссылок, добавить guards от циклов.

---

### 6.4 `isEqual` из lodash в runtime
**Impact: 🟡 MEDIUM**

Повтор пункта 1.1: `import { isEqual } from 'lodash'` тянет весь lodash в бандл.

---

## 7. adminActions.ts — N+1 запросы

### 7.1 `getAllUsers` загружает ВСЕ документы пользователей
**Impact: 🔴 HIGH**

```typescript
export const getAllUsers = async (): Promise<AppUser[]> => {
    await ensureAdminActor();
    const usersCollection = collection(db, 'users');
    const userSnapshot = await getDocs(usersCollection);
    const userList = userSnapshot.docs.map(doc => ({
        uid: doc.id,
        ...doc.data()
    })) as AppUser[];
    return userList.sort(/* ... */);
};
```

**Проблема:** Загружает **все** документы пользователей без пагинации. При 1000+ пользователях — огромный payload, медленный запрос, утечка памяти на сервере.

**Fix:**
```typescript
export const getAllUsers = async (options?: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<{ users: AppUser[]; total: number }> => {
    await ensureAdminActor();
    const { page = 1, pageSize = 50, sortBy = 'createdAt', sortOrder = 'desc' } = options || {};
    
    const usersCollection = collection(db, 'users');
    const q = query(
      usersCollection,
      orderBy(sortBy, sortOrder),
      limit(pageSize),
      // Для cursor-based пагинации добавить startAfter
    );
    const snapshot = await getDocs(q);
    // ...
};
```

---

### 7.2 `getEnvSettings` — N+1 при проверке прав
**Impact: 🟡 MEDIUM**

```typescript
export const getEnvSettings = async (options) => {
    const settingsRef = doc(db, 'configs', 'envSettings');
    const docSnap = await getDoc(settingsRef);           // Запрос 1
    
    if (requesterId) {
        const userDoc = await getDoc(                     // Запрос 2 (N+1 при множественных вызовах)
            doc(db, 'users', requesterId)
        );
        requesterIsAdmin = isAdminRole(userDoc.data()?.systemRole);
    }
};
```

**Проблема:** Каждый вызов `getEnvSettings` с `requesterId` делает дополнительный `getDoc` для проверки роли. Поскольку `getEnvSettings` вызывается из `getOpenRouterApiKey()` при каждом AI-запросе, это N+1.

**Fix:** `getEnvSettings` уже имеет кеширование в `api/db/route.ts`, но сама функция не кеширует результат. Добавить in-memory кеш:
```typescript
let envSettingsCache: { data: EnvSettings; expiresAt: number } | null = null;
const ENV_SETTINGS_TTL_MS = 60_000;

export const getEnvSettings = async (options) => {
    if (envSettingsCache && Date.now() < envSettingsCache.expiresAt && !options.requesterId) {
        return envSettingsCache.data;
    }
    // ...existing logic
    envSettingsCache = { data: result, expiresAt: Date.now() + ENV_SETTINGS_TTL_MS };
    return result;
};
```

---

### 7.3 `wipeAllData` — batch не переинициализируется
**Impact: 🟡 MEDIUM**

```typescript
for (const docSnap of snapshot.docs) {
    batch.delete(docSnap.ref);
    batchSize++;
    if (batchSize >= 499) {
        await batch.commit();
        // batch = writeBatch(db); // ← Закомментировано!
        batchSize = 0;
    }
}
```

**Проблема:** После `batch.commit()` batch не переинициализируется. Код сбрасывает `batchSize = 0`, но продолжает использовать тот же batch объект. После commit, batch может вести себя неожиданно.

**Fix:**
```typescript
let batch = writeBatch(db);
let batchSize = 0;

for (const docSnap of snapshot.docs) {
    if (collectionName === 'users' && docSnap.id === actorId) continue;
    batch.delete(docSnap.ref);
    batchSize++;
    if (batchSize >= 499) {
        await batch.commit();
        batch = writeBatch(db);  // ← Раскомментировать
        batchSize = 0;
    }
}
if (batchSize > 0) await batch.commit();
```

---

### 7.4 `updateUsersInBulk` — загружает всех пользователей в память
**Impact: 🟡 MEDIUM**

```typescript
const snapshot = await getDocs(q);
const batch = writeBatch(db);
snapshot.docs.forEach(docSnap => {
    const userData = docSnap.data() as AppUser;
    const currentModels = new Set(userData.availableModels || []);
    currentModels.add(model);
    batch.update(userRef, { availableModels: Array.from(currentModels) });
});
```

**Проблема:** Загружает все документы matching фильтру в память, затем batch update. При 1000+ пользователях — пиковая память.

**Fix:** Добавить пагинацию или использовать MongoDB `$addToSet` напрямую через native driver.

---

## 8. api/db/route.ts — оптимизация запросов

### 8.1 ✅ Хорошая реализация кеша
**Impact: N/A (positive)**

- In-memory кеш с TTL для `getDoc` и `getDocs`
- Inflight deduplication (не дублирует одинаковые запросы)
- Cache invalidation по коллекции
- Метрики и slow-op логирование

### 8.2 Кеш не инвалидируется при записи
**Impact: 🟡 MEDIUM**

```typescript
// При записи — инвалидация всего кеша коллекции
function invalidateDbCacheForCollection(collectionName: string) {
    for (const [key, entry] of dbResponseCache.entries()) {
        if (entry.collection === collectionName) {
            dbResponseCache.delete(key);
        }
    }
}
```

**Проблема:** При обновлении одного документа в коллекции `requests` — инвалидируется весь кеш для `requests`. Это может быть избыточно, но безопасно.

**Fix (optional):** Для точечной инвалидации — инвалидировать только кеш, содержащий обновлённый doc ID. Но текущий подход безопасен и проще.

---

### 8.3 Отсутствует rate limiting
**Impact: 🟡 MEDIUM**

API route не имеет rate limiting. Злоумышленник может отправить тысячи запросов.

**Fix:**
```typescript
import { Ratelimit } from '@upstash/ratelimit';
// Или простой in-memory rate limiter
```

---

## 9. ai.ts / openrouter.ts — утечки памяти

### 9.1 `readAiConfig` вызывается многократно
**Impact: 🟡 MEDIUM**

```typescript
// ai.ts
export async function generateJson(params) {
    const aiConfig = await readAiConfig();  // ← Запрос конфига
    // ...
}

export async function generateStream(params) {
    const aiConfig = await readAiConfig();  // ← Ещё раз
    // ...
}

// openrouter.ts
export async function generateOpenRouterContent(params) {
    const aiConfig = await readAiConfig();  // ← И ещё
    // ...
}
```

**Проблема:** `readAiConfig()` вызывается при каждом AI запросе. Если это чтение файла — OK (fast). Если это DB запрос — N+1.

**Fix:** Кешировать результат `readAiConfig()` с коротким TTL:
```typescript
let aiConfigCache: { data: AiConfig; expiresAt: number } | null = null;
const AI_CONFIG_TTL_MS = 30_000;

export async function readAiConfig(): Promise<AiConfig> {
    if (aiConfigCache && Date.now() < aiConfigCache.expiresAt) {
        return aiConfigCache.data;
    }
    // ... read from file/DB
    aiConfigCache = { data: config, expiresAt: Date.now() + AI_CONFIG_TTL_MS };
    return config;
}
```

---

### 9.2 Нет утечек памяти в стриминге
**Impact: 🟢 LOW (positive)**

`generateOpenRouterContentStreamed` возвращает `Response` с ReadableStream. При ошибке создаётся корректный error stream с `this.push(null)`. Fetch API в Node.js корректно освобождает ресурсы.

### 9.3 Retry с exponential backoff — корректно
**Impact: 🟢 LOW (positive)**

```typescript
for (let attempt = 0; attempt <= maxRetries; attempt++) {
    response = await fetch(baseUrl, { method: 'POST', headers, body: bodyForLog });
    if (response.ok || (response.status < 500 && response.status !== 429)) break;
    // ...
    await new Promise(r => setTimeout(r, delayMs));
}
```

Корректная реализация. Единственное: при 429 (rate limit) стоит учитывать `Retry-After` header.

---

## 10. useEffect — cleanup функции

### 10.1 ✅ Корректные cleanup'ы
**Impact: N/A (positive)**

| Компонент | useEffect | Cleanup |
|---|---|---|
| AppContext.tsx | onSnapshot (user) | `return () => unsubscribe()` ✅ |
| AppContext.tsx | Telegram events | `return () => { offEvent; offClick }` ✅ |
| HistorySection.tsx | onSnapshot (history) | `return () => unsubscribe()` ✅ |
| SpecificationPageContent.tsx | autoSave timer | `return () => clearTimeout()` ✅ |
| SpecificationPageContent.tsx | beforeunload | `return () => removeEventListener()` ✅ |
| SpecificationPageContent.tsx | companies onSnapshot | `return () => unsubscribe()` ✅ |
| Dashboard layout | onSnapshot (companies) | `return () => unsubscribe()` ✅ |

### 10.2 Отсутствующие cleanup'ы
**Impact: 🟡 MEDIUM**

**AppContext.tsx — Telegram BackButton:**
```typescript
useEffect(() => {
    if (telegram && telegram.isVersionAtLeast('6.1')) {
      if (pathname !== '/dashboard') {
        telegram.BackButton.show();
      } else {
        telegram.BackButton.hide();
      }
    }
}, [pathname, telegram]);
```
Cleanup не нужен (show/hide — идемпотентные операции). ✅ OK.

**SpecificationPageContent — MediaRecorder:**
```typescript
const startAiEditRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    aiEditStreamRef.current = stream;
    // ...
    recorder.onstop = () => {
        aiEditStreamRef.current?.getTracks().forEach(track => track.stop());
        // ← cleanup в onstop ✅
    };
};
```
Cleanup в `onstop` — корректно. Но если компонент размонтируется во время записи — stream не освобождается.

**Fix:**
```typescript
useEffect(() => {
    return () => {
        // Cleanup при размонтировании
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        aiEditStreamRef.current?.getTracks().forEach(track => track.stop());
    };
}, []);
```

---

### 10.3 SpecificationPageContent — эффект без cleanup
**Impact: 🟢 LOW**

```typescript
useEffect(() => {
    if (!isGroupMode && isGroupWorkEnabled) {
      setIsGroupWorkEnabled(false);
    }
}, [isGroupMode, isGroupWorkEnabled]);
```
No cleanup needed — это синхронизация состояния. ✅ OK.

```typescript
useEffect(() => {
    if (!currentProject) return;
    setInitialProjectStates(prev => {
      if (prev[currentProject.id]) return prev;
      return { ...prev, [currentProject.id]: currentProject };
    });
}, [currentProject?.id]);
```
No cleanup needed — это инициализация. ✅ OK.

---

## Сводная таблица

| # | Проблема | Impact | Файл | Сложность исправления |
|---|---|---|---|---|
| 1.1 | lodash full import | 🟡 MEDIUM | SpecificationPageContent | Лёгкое |
| 1.2 | canvas native dep | 🔴 HIGH | package.json | Среднее |
| 1.3 | @react-pdf/renderer | 🟡 MEDIUM | package.json | Среднее |
| 1.4 | framer-motion | 🟡 MEDIUM | package.json | Среднее |
| 2.1 | 10 шрифтов Montserrat | 🔴 HIGH | layout.tsx | Лёгкое |
| 3.2 | Страницы без dynamic | 🟡 MEDIUM | bonus/training/tickets | Лёгкое |
| 4.1 | Context value не мемоизирован | 🔴 HIGH | AppContext.tsx | Лёгкое |
| 4.3 | checkUserPlan при каждом snapshot | 🟡 MEDIUM | AppContext.tsx | Лёгкое |
| 5.1 | Нет виртуализации списка | 🔴 HIGH | HistorySection.tsx | Среднее |
| 5.2 | 13 зависимостей в useEffect | 🟡 MEDIUM | HistorySection.tsx | Среднее |
| 6.1 | Монолит 2026 строки | 🔴 HIGH | SpecificationPageContent | Сложное |
| 6.2 | lodash.isEqual на больших объектах | 🟡 MEDIUM | SpecificationPageContent | Лёгкое |
| 7.1 | getAllUsers без пагинации | 🔴 HIGH | adminActions.ts | Среднее |
| 7.2 | getEnvSettings N+1 | 🟡 MEDIUM | adminActions.ts | Лёгкое |
| 7.3 | wipeAllData batch bug | 🟡 MEDIUM | adminActions.ts | Лёгкое |
| 9.1 | readAiConfig без кеша | 🟡 MEDIUM | ai.ts | Лёгкое |
| 10.2 | MediaRecorder cleanup | 🟡 MEDIUM | SpecificationPageContent | Лёгкое |

---

## Топ-5 приоритетных исправлений

1. **🔴 Context value memoization** (AppContext.tsx) — 1 строка `useMemo`, влияние на все страницы
2. **🔴 Montserrat 10→3 варианта** (layout.tsx) — удаление 7 строк, ~300KB экономии
3. **🔴 Виртуализация HistorySection** — средняя сложность, критично для UX при 50+ проектах
4. **🔴 getAllUsers пагинация** (adminActions.ts) — средняя сложность, критично для масштабирования
5. **🟡 Монолит SpecificationPageContent** — сложное исправление, но значительно улучшит maintainability и производительность

---

*Отчёт сгенерирован автоматически. Рекомендуется проверить каждый пункт перед исправлением.*
