// @ts-nocheck
// src/services/xiaomi.ts
'use server';

/**
 * Xiaomi MiMo — прямой AI-провайдер.
 * Файлы отправляются напрямую в Xiaomi API (без OpenRouter/mistral-ocr).
 * Поддерживает множественные API ключи с ротацией.
 */

import { getEnvSettings } from '@/actions/adminActions';
import { logAiApiCall } from '@/lib/logger';
import { Readable } from 'stream';

// --- Types ---

export interface XiaomiApiKey {
  id: string;
  label: string;
  key: string;
  endpoint: string;
  endpointId?: string;       // привязка к эндпоинту
  isPrimary?: boolean;       // основной ключ
  isActive: boolean;
  rateLimitRpm?: number;
  dailyQuota?: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  lastUsedAt?: string;
  errorCount: number;
  lastError?: string;
}

export interface XiaomiEndpoint {
  id: string;
  label: string;
  endpoint: string;
  rotationStrategy: 'round-robin' | 'least-used' | 'random' | 'fallback';
  isDefault: boolean;
  createdAt?: string;
}

interface XiaomiParams {
  prompt: string;
  modelInfo: any;
  temperature?: number;
  file?: { fileUri: string; mimeType: string; fileName?: string } | null;
  images?: Array<{ dataUri: string; mimeType?: string; source?: string }>;
  userId?: string;
  responseMimeType?: 'application/json' | 'text/plain';
  stream: boolean;
  endpoint?: string;       // override endpoint
  apiKeyId?: string;       // override specific key
}

// --- In-memory key pool (persisted to MongoDB in production) ---

let keyPool: XiaomiApiKey[] = [];
let roundRobinIndex = 0;

/**
 * Загрузить ключи из env или MongoDB.
 */
export async function loadXiaomiKeys(): Promise<XiaomiApiKey[]> {
  // Try env first (for local dev)
  const envKeys = process.env.XIAOMI_API_KEYS;
  if (envKeys) {
    try {
      const parsed = JSON.parse(envKeys);
      if (Array.isArray(parsed) && parsed.length > 0) {
        keyPool = parsed.map((k: any, i: number) => ({
          id: k.id || `env-key-${i}`,
          label: k.label || `Key ${i + 1}`,
          key: k.key,
          endpoint: k.endpoint || process.env.XIAOMI_DEFAULT_ENDPOINT || 'https://token-plan-sgp.xiaomimimo.com/v1',
          isActive: k.isActive !== false,
          totalRequests: k.totalRequests || 0,
          totalTokens: k.totalTokens || 0,
          totalCost: k.totalCost || 0,
          errorCount: k.errorCount || 0,
        }));
        return keyPool;
      }
    } catch (e) {
      console.error('[Xiaomi] Failed to parse XIAOMI_API_KEYS:', e);
    }
  }

  // Fallback: try MongoDB collection
  try {
    const { db } = await import('@/lib/db');
    const collection = db.collection('xiaomi_api_keys');
    const keys = await collection.find({ isActive: true }).toArray();
    if (keys.length > 0) {
      keyPool = keys.map((k: any) => ({
        id: k._id?.toString() || k.id,
        label: k.label,
        key: k.key,
        endpoint: k.endpoint,
        endpointId: k.endpointId,
        isPrimary: k.isPrimary || false,
        isActive: k.isActive,
        rateLimitRpm: k.rateLimitRpm,
        dailyQuota: k.dailyQuota,
        totalRequests: k.totalRequests || 0,
        totalTokens: k.totalTokens || 0,
        totalCost: k.totalCost || 0,
        lastUsedAt: k.lastUsedAt,
        errorCount: k.errorCount || 0,
        lastError: k.lastError,
      }));
      return keyPool;
    }
  } catch (e) {
    // MongoDB not available, that's ok for local dev
  }

  // Last resort: env single key
  const envSettings = await getEnvSettings({ allowInternal: true });
  const singleEndpoint = process.env.XIAOMI_DEFAULT_ENDPOINT || 'https://token-plan-sgp.xiaomimimo.com/v1';

  // Check for any xiaomi-related env vars
  const xiaomiKey = process.env.XIAOMI_API_KEY;
  if (xiaomiKey) {
    keyPool = [{
      id: 'env-single',
      label: 'Environment Key',
      key: xiaomiKey,
      endpoint: singleEndpoint,
      isActive: true,
      totalRequests: 0,
      totalTokens: 0,
      totalCost: 0,
      errorCount: 0,
    }];
    return keyPool;
  }

  throw new Error('Xiaomi: нет доступных API ключей. Добавьте XIAOMI_API_KEYS в .env.local или через админку.');
}

/**
 * Выбрать ключ по стратегии ротации.
 */
export async function getActiveApiKey(options?: {
  groupId?: string;
  strategy?: 'round-robin' | 'least-used' | 'random' | 'fallback';
  keyId?: string;
}): Promise<XiaomiApiKey> {
  if (keyPool.length === 0) {
    await loadXiaomiKeys();
  }

  const activeKeys = keyPool.filter(k => k.isActive);
  if (activeKeys.length === 0) {
    throw new Error('Xiaomi: нет активных API ключей.');
  }

  // Если указан конкретный ключ
  if (options?.keyId) {
    const found = activeKeys.find(k => k.id === options.keyId);
    if (found) return found;
  }

  const strategy = options?.strategy || (process.env.XIAOMI_ROTATION_STRATEGY as any) || 'round-robin';

  switch (strategy) {
    case 'least-used': {
      return activeKeys.reduce((min, key) =>
        key.totalRequests < min.totalRequests ? key : min
      , activeKeys[0]);
    }
    case 'random': {
      return activeKeys[Math.floor(Math.random() * activeKeys.length)];
    }
    case 'fallback': {
      // Сортируем по количеству ошибок, берём с наименьшим
      const sorted = [...activeKeys].sort((a, b) => a.errorCount - b.errorCount);
      return sorted[0];
    }
    case 'round-robin':
    default: {
      const key = activeKeys[roundRobinIndex % activeKeys.length];
      roundRobinIndex = (roundRobinIndex + 1) % activeKeys.length;
      return key;
    }
  }
}

/**
 * Обновить метрики ключа после запроса.
 */
async function updateKeyMetrics(keyId: string, result: {
  tokens?: number;
  cost?: number;
  success: boolean;
  error?: string;
}) {
  const key = keyPool.find(k => k.id === keyId);
  if (!key) return;

  key.totalRequests++;
  key.totalTokens += result.tokens || 0;
  key.totalCost += result.cost || 0;
  key.lastUsedAt = new Date().toISOString();

  if (!result.success) {
    key.errorCount++;
    key.lastError = result.error;
  }

  // Persist to MongoDB if available
  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_api_keys').updateOne(
      { _id: keyId },
      {
        $set: {
          totalRequests: key.totalRequests,
          totalTokens: key.totalTokens,
          totalCost: key.totalCost,
          lastUsedAt: key.lastUsedAt,
          errorCount: key.errorCount,
          lastError: key.lastError,
        },
      },
      { upsert: false }
    ).catch(() => {});
  } catch {}
}

/**
 * Логировать запрос в MongoDB.
 */
async function logXiaomiRequest(log: {
  keyId: string;
  keyLabel: string;
  endpoint: string;
  model: string;
  userId: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cost?: number;
  latencyMs: number;
  status: 'success' | 'error';
  errorMessage?: string;
  httpStatus?: number;
}) {
  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_request_logs').insertOne({
      ...log,
      timestamp: new Date(),
    }).catch(() => {});
  } catch {}

  // Also log to the standard AI logger
  await logAiApiCall({
    userId: log.userId,
    model: log.model,
    provider: 'xiaomi',
    status: log.status,
    promptTokens: log.promptTokens,
    completionTokens: log.completionTokens,
    totalTokens: log.totalTokens,
    totalCost: log.cost,
    errorMessage: log.errorMessage,
  });
}

/**
 * Построить тело запроса для Xiaomi API.
 * Файлы идут напрямую (base64) — без OpenRouter плагинов.
 */
function buildRequestBody(params: XiaomiParams & { engine?: string }): any {
  const body: any = {
    model: params.modelInfo?.value?.replace('xiaomi/', '') || params.modelInfo?.value || 'mimo-v2-pro',
    temperature: params.temperature ?? 0.2,
    stream: params.stream,
  };

  const userContent: any[] = [{ type: 'text', text: params.prompt }];

  // Файлы — напрямую в base64 (Xiaomi принимает без плагинов)
  if (params.file) {
    if (params.file.mimeType.startsWith('image/')) {
      userContent.push({
        type: 'image_url',
        image_url: {
          url: params.file.fileUri, // data URI или URL
        },
      });
    } else {
      // Для PDF и других документов — как текстовое описание URL
      // Xiaomi может принимать файлы через file_data
      userContent.push({
        type: 'file',
        file: {
          filename: params.file.fileName || 'document',
          file_data: params.file.fileUri,
        },
      });
    }
  }

  // Изображения из массива
  if (Array.isArray(params.images) && params.images.length > 0) {
    for (const image of params.images) {
      if (!image?.dataUri) continue;
      userContent.push({
        type: 'image_url',
        image_url: { url: image.dataUri },
      });
    }
  }

  body.messages = [{ role: 'user', content: userContent }];

  if (params.responseMimeType === 'application/json' && !params.stream) {
    body.response_format = { type: 'json_object' };
  }

  return body;
}

/**
 * Основная функция генерации через Xiaomi API.
 */
export async function generateXiaomiContent(params: XiaomiParams): Promise<{
  text: string | null;
  thoughts: string | null;
  rawResponse: any;
}> {
  const { userId = 'anonymous' } = params;
  const apiKey = await getActiveApiKey({ keyId: params.apiKeyId });
  const endpoint = params.endpoint || apiKey.endpoint;
  const startedAt = Date.now();

  const headers: HeadersInit = {
    'Authorization': `Bearer ${apiKey.key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://montagehub.ru',
    'X-Title': 'Montage HUB',
  };

  const body = buildRequestBody(params);

  try {
    const response = await fetch(endpoint + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    const latencyMs = Date.now() - startedAt;

    if (!response.ok) {
      const errorBody = await response.text();
      const errorMsg = `Xiaomi API Error: ${response.status} — ${errorBody}`;

      await updateKeyMetrics(apiKey.id, { success: false, error: errorMsg });
      await logXiaomiRequest({
        keyId: apiKey.id,
        keyLabel: apiKey.label,
        endpoint,
        model: body.model,
        userId,
        latencyMs,
        status: 'error',
        errorMessage: errorMsg,
        httpStatus: response.status,
      });

      throw new Error(errorMsg);
    }

    const rawResponse = await response.json();
    const text = rawResponse.choices?.[0]?.message?.content ?? null;
    const promptTokens = rawResponse.usage?.prompt_tokens;
    const completionTokens = rawResponse.usage?.completion_tokens;
    const totalTokens = rawResponse.usage?.total_tokens;

    // Стоимость (пока бесплатно для Xiaomi)
    const cost = 0;

    await updateKeyMetrics(apiKey.id, { tokens: totalTokens, cost, success: true });
    await logXiaomiRequest({
      keyId: apiKey.id,
      keyLabel: apiKey.label,
      endpoint,
      model: body.model,
      userId,
      promptTokens,
      completionTokens,
      totalTokens,
      cost,
      latencyMs,
      status: 'success',
    });

    return { text, thoughts: null, rawResponse };
  } catch (error: any) {
    const latencyMs = Date.now() - startedAt;

    await logXiaomiRequest({
      keyId: apiKey.id,
      keyLabel: apiKey.label,
      endpoint,
      model: body.model,
      userId,
      latencyMs,
      status: 'error',
      errorMessage: error.message,
    });

    throw error;
  }
}

/**
 * Streaming версия для Xiaomi API.
 */
export async function generateXiaomiContentStreamed(params: XiaomiParams): Promise<Response> {
  const apiKey = await getActiveApiKey({ keyId: params.apiKeyId });
  const endpoint = params.endpoint || apiKey.endpoint;

  const headers: HeadersInit = {
    'Authorization': `Bearer ${apiKey.key}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'https://montagehub.ru',
    'X-Title': 'Montage HUB',
  };

  const body = buildRequestBody({ ...params, stream: true });

  try {
    const response = await fetch(endpoint + '/chat/completions', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      const errorStream = new Readable({
        read() {
          this.push(`data: ${JSON.stringify({ error: `Xiaomi API Error: ${response.status} — ${errorBody}` })}\n\n`);
          this.push(null);
        }
      });
      return new Response(errorStream as any, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }

    return response;
  } catch (error: any) {
    const errorStream = new Readable({
      read() {
        this.push(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        this.push(null);
      }
    });
    return new Response(errorStream as any, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream' },
    });
  }
}

// --- Model catalog types (compatible with OpenRouterModel for dialog reuse) ---

export type XiaomiModel = {
  id: string;
  name: string;
  description: string;
  pricing: {
    prompt: string;
    completion: string;
    request: string;
    image: string;
  };
  context_length: number;
  architecture?: {
    modality: string;
  };
  [key: string]: any;
};

/**
 * Загрузить список моделей из Xiaomi API.
 * GET /v1/models — стандартный OpenAI-совместимый эндпоинт.
 * Если эндпоинт не поддерживает /models — возвращаем пустой массив (ручное добавление).
 */
export async function getXiaomiModels(): Promise<XiaomiModel[]> {
  try {
    const apiKey = await getActiveApiKey();
    // baseUrl в конфиге может быть полным (с /chat/completions) или базовым (/v1)
    const base = apiKey.endpoint.replace(/\/chat\/completions\/?$/, '').replace(/\/+$/, '');
    const modelsUrl = `${base}/models`;

    const response = await fetch(modelsUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey.key}`,
      },
    });

    if (!response.ok) {
      // Эндпоинт не поддерживается — не ошибка, просто нет каталога
      console.warn(`[Xiaomi] /models returned ${response.status}. Falling back to manual model addition.`);
      return [];
    }

    const data = await response.json();
    const raw = data.data || data.models || [];

    return raw.map((m: any) => ({
      id: m.id || m.name,
      name: m.name || m.id,
      description: m.description || '',
      pricing: {
        prompt: String(m.pricing?.prompt ?? '0'),
        completion: String(m.pricing?.completion ?? '0'),
        request: String(m.pricing?.request ?? '0'),
        image: String(m.pricing?.image ?? '0'),
      },
      context_length: Number(m.context_length ?? m.max_context ?? 0),
      architecture: m.architecture,
    }));
  } catch (error: any) {
    console.warn('[Xiaomi] Failed to fetch models catalog:', error.message);
    return [];
  }
}

/**
 * Получить статистику по ключам.
 */
export async function getXiaomiKeyStats(): Promise<XiaomiApiKey[]> {
  if (keyPool.length === 0) {
    await loadXiaomiKeys();
  }
  return keyPool.map(k => ({
    ...k,
    key: k.key.substring(0, 8) + '...' + k.key.substring(k.key.length - 4), // mask
  }));
}

/**
 * Добавить новый ключ.
 */
export async function addXiaomiKey(key: Omit<XiaomiApiKey, 'totalRequests' | 'totalTokens' | 'totalCost' | 'errorCount'>): Promise<XiaomiApiKey> {
  const newKey: XiaomiApiKey = {
    ...key,
    totalRequests: 0,
    totalTokens: 0,
    totalCost: 0,
    errorCount: 0,
  };

  keyPool.push(newKey);

  // Persist to MongoDB
  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_api_keys').insertOne({
      ...newKey,
      createdAt: new Date(),
    });
  } catch {}

  return newKey;
}

/**
 * Деактивировать ключ.
 */
export async function deactivateXiaomiKey(keyId: string): Promise<boolean> {
  const key = keyPool.find(k => k.id === keyId);
  if (!key) return false;
  key.isActive = false;

  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_api_keys').updateOne(
      { _id: keyId },
      { $set: { isActive: false } }
    );
  } catch {}

  return true;
}

/**
 * Обновить ключ API.
 */
export async function updateXiaomiKey(keyId: string, updates: Partial<XiaomiApiKey>): Promise<boolean> {
  const key = keyPool.find(k => k.id === keyId);
  if (key) {
    Object.assign(key, updates);
  }

  try {
    const { db } = await import('@/lib/db');
    const { _id, ...rest } = updates as any;
    await db.collection('xiaomi_api_keys').updateOne(
      { _id: keyId },
      { $set: { ...rest, updatedAt: new Date() } }
    );
  } catch {}

  return true;
}

/**
 * Установить основной ключ.
 */
export async function setPrimaryXiaomiKey(keyId: string): Promise<boolean> {
  // Сбрасываем все
  keyPool.forEach(k => { k.isPrimary = false; });

  const key = keyPool.find(k => k.id === keyId);
  if (key) key.isPrimary = true;

  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_api_keys').updateMany({}, { $set: { isPrimary: false } });
    await db.collection('xiaomi_api_keys').updateOne(
      { _id: keyId },
      { $set: { isPrimary: true } }
    );
  } catch {}

  return true;
}

// --- Endpoint CRUD ---

/**
 * Получить все эндпоинты.
 */
export async function getXiaomiEndpoints(): Promise<XiaomiEndpoint[]> {
  try {
    const { db } = await import('@/lib/db');
    const docs = await db.collection('xiaomi_endpoints').find().sort({ isDefault: -1, createdAt: -1 }).toArray();
    return docs.map((d: any) => ({
      id: d._id?.toString() || d.id,
      label: d.label,
      endpoint: d.endpoint,
      rotationStrategy: d.rotationStrategy || 'round-robin',
      isDefault: d.isDefault || false,
      createdAt: d.createdAt,
    }));
  } catch {
    return [];
  }
}

/**
 * Сохранить (создать/обновить) эндпоинт.
 */
export async function saveXiaomiEndpoint(ep: Omit<XiaomiEndpoint, 'createdAt'>): Promise<XiaomiEndpoint> {
  const doc = {
    label: ep.label,
    endpoint: ep.endpoint,
    rotationStrategy: ep.rotationStrategy,
    isDefault: ep.isDefault,
    updatedAt: new Date(),
  };

  try {
    const { db } = await import('@/lib/db');
    if (ep.id && !ep.id.startsWith('new-')) {
      await db.collection('xiaomi_endpoints').updateOne(
        { _id: ep.id },
        { $set: doc }
      );
    } else {
      const result = await db.collection('xiaomi_endpoints').insertOne({
        ...doc,
        createdAt: new Date(),
      });
      ep.id = result.insertedId.toString();
    }
  } catch {}

  return { ...ep, createdAt: new Date().toISOString() };
}

/**
 * Удалить эндпоинт.
 */
export async function deleteXiaomiEndpoint(endpointId: string): Promise<boolean> {
  try {
    const { db } = await import('@/lib/db');
    await db.collection('xiaomi_endpoints').deleteOne({ _id: endpointId });
    // Отвязываем ключи от удалённого эндпоинта
    await db.collection('xiaomi_api_keys').updateMany(
      { endpointId },
      { $unset: { endpointId: '' } }
    );
  } catch {}

  return true;
}

/**
 * Получить статистику по ключам и эндпоинтам.
 */
export async function getXiaomiStats(): Promise<{
  byKey: Array<{ keyId: string; label: string; requests: number; tokens: number; errors: number; avgLatencyMs: number }>;
  byEndpoint: Array<{ endpoint: string; requests: number; tokens: number; errors: number; avgLatencyMs: number }>;
}> {
  try {
    const { db } = await import('@/lib/db');

    // Агрегация по ключам
    const keyStats = await db.collection('xiaomi_request_logs').aggregate([
      {
        $group: {
          _id: '$keyId',
          requests: { $sum: 1 },
          tokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          avgLatencyMs: { $avg: { $ifNull: ['$latencyMs', 0] } },
        },
      },
    ]).toArray();

    // Агрегация по эндпоинтам
    const endpointStats = await db.collection('xiaomi_request_logs').aggregate([
      {
        $group: {
          _id: '$endpoint',
          requests: { $sum: 1 },
          tokens: { $sum: { $ifNull: ['$totalTokens', 0] } },
          errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
          avgLatencyMs: { $avg: { $ifNull: ['$latencyMs', 0] } },
        },
      },
    ]).toArray();

    // Подписи ключей
    const keys = await getXiaomiApiKeys();

    return {
      byKey: keyStats.map((s: any) => {
        const k = keys.find(k => k.id === s._id);
        return {
          keyId: s._id || 'unknown',
          label: k?.label || s._id || 'unknown',
          requests: s.requests,
          tokens: s.tokens,
          errors: s.errors,
          avgLatencyMs: Math.round(s.avgLatencyMs || 0),
        };
      }),
      byEndpoint: endpointStats.map((s: any) => ({
        endpoint: s._id || 'unknown',
        requests: s.requests,
        tokens: s.tokens,
        errors: s.errors,
        avgLatencyMs: Math.round(s.avgLatencyMs || 0),
      })),
    };
  } catch {
    return { byKey: [], byEndpoint: [] };
  }
}
