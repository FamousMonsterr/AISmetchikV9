// src/server-functions/monitoring/health.ts
'use server';

import TelegramBot from '@/lib/telegram/telegraf-compat';
import { db } from '@/lib/db';
import { collection, getDocs, limit, orderBy, query, where, doc, getDoc } from '@/lib/db-server';
import { getBotRuntimeStatus } from '@/server-functions/telegram/controller';
import { SERVER_ANALYSIS_COLLECTION } from '@/server-functions/config';

type QueueStats = {
  queuedCount: number;
  oldestQueuedAt?: string | null;
  hasMore?: boolean;
  lastSuccessfulAt?: string | null;
  lastSuccessfulJobId?: string | null;
};

type TelegramHealth = {
  enabled: boolean;
  mode: 'polling' | 'webhook';
  runtimeStatus?: string;
  lastError?: string | null;
  lastStartedAt?: string | null;
  lastStoppedAt?: string | null;
  lockFresh?: boolean;
  instanceId?: string | null;
  latencyMs?: number | null;
  latencyError?: string | null;
};

const readEnvSettings = async () => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

const toIso = (value: any) => {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return isNaN(date.getTime()) ? null : date.toISOString();
};

export async function getQueueStats(sampleLimit = 50): Promise<QueueStats> {
  const jobsRef = collection(db, SERVER_ANALYSIS_COLLECTION);
  const queuedQuery = query(jobsRef, where('status', '==', 'queued'), orderBy('createdAt', 'asc'), limit(sampleLimit));
  const snapshot = await getDocs(queuedQuery);
  const oldest = snapshot.docs[0]?.data()?.createdAt;
  const successQuery = query(jobsRef, where('status', '==', 'succeeded'), orderBy('updatedAt', 'desc'), limit(1));
  const successSnap = await getDocs(successQuery);
  const lastSuccessDoc = successSnap.docs[0];
  return {
    queuedCount: snapshot.size,
    oldestQueuedAt: toIso(oldest),
    hasMore: snapshot.size === sampleLimit,
    lastSuccessfulAt: lastSuccessDoc ? toIso(lastSuccessDoc.data()?.updatedAt) : null,
    lastSuccessfulJobId: lastSuccessDoc?.id || null,
  };
}

export async function getTelegramHealth(): Promise<TelegramHealth> {
  const settings = await readEnvSettings();
  const enabled = settings.telegramBotEnabled !== false;
  const mode = (settings.telegramBotMode || 'polling') as 'polling' | 'webhook';
  const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  let latencyMs: number | null = null;
  let latencyError: string | null = null;
  if (token) {
    const start = Date.now();
    try {
      const bot = new TelegramBot(token, { polling: false });
      await bot.getMe();
      latencyMs = Date.now() - start;
    } catch (err: any) {
      latencyError = err?.response?.body?.description || err?.message || 'telegram_latency_failed';
    }
  }
  let runtime;
  try {
    runtime = await getBotRuntimeStatus();
  } catch {
    runtime = null;
  }
  return {
    enabled,
    mode,
    runtimeStatus: runtime?.status,
    lastError: runtime?.lastError || null,
    lastStartedAt: runtime?.lastStartedAt || null,
    lastStoppedAt: runtime?.lastStoppedAt || null,
    lockFresh: runtime?.lockFresh ?? false,
    instanceId: runtime?.instanceId || null,
    latencyMs,
    latencyError,
  };
}

export async function getServerHealth() {
  const [queue, telegram] = await Promise.all([getQueueStats(), getTelegramHealth()]);
  return {
    ok: true,
    timestamp: new Date().toISOString(),
    queueDepth: queue.queuedCount,
    queue,
    telegram,
  };
}
