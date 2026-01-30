// src/server-functions/telegram/controller.ts
// Manages lifecycle of Telegram bot instance for admin controls.

import type TelegramBot from 'node-telegram-bot-api';
import { startTelegramBot } from './bot';
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';

const readEnvSettings = async () => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

type BotStatus = 'stopped' | 'running' | 'error';

type BotRuntime = {
  bot?: TelegramBot;
  status: BotStatus;
  lastError?: string | null;
  lastStartedAt?: Date | null;
  lastStoppedAt?: Date | null;
  heartbeatInterval?: NodeJS.Timeout;
  instanceId?: string;
  logs: Array<{ ts: string; level: 'info' | 'error'; msg: string }>;
};

type BotRuntimeSafe = {
  status: BotStatus;
  lastError?: string | null;
  lastStartedAt?: string | null;
  lastStoppedAt?: string | null;
  instanceId?: string;
  lock?: {
    instanceId?: string | null;
    startedAt?: string | null;
    lastHeartbeatAt?: string | null;
  } | null;
  lockFresh?: boolean;
  logs: Array<{ ts: string; level: 'info' | 'error'; msg: string }>;
};

const runtime: BotRuntime = {
  status: 'stopped',
  lastError: null,
  lastStartedAt: null,
  lastStoppedAt: null,
  logs: [],
};

const getLockRef = () => doc(db, 'configs', 'telegramBotLock');
const instanceId = `${process.env.HOSTNAME || 'local'}:${process.pid}`;

const lockPayload = () => ({
  instanceId,
  startedAt: serverTimestamp(),
  lastHeartbeatAt: serverTimestamp(),
});

const refreshLock = async () => {
  await setDoc(getLockRef(), { lastHeartbeatAt: serverTimestamp(), instanceId }, { merge: true });
};

const readLock = async () => {
  const snap = await getDoc(getLockRef());
  return snap.exists() ? (snap.data() as any) : null;
};

const isLockFresh = (lockData: any) => {
  const lastHeartbeat = lockData?.lastHeartbeatAt ? new Date(lockData.lastHeartbeatAt) : null;
  return !!(lastHeartbeat && Date.now() - lastHeartbeat.getTime() < 60_000);
};

const acquireLock = async () => {
  const lockData = await readLock();
  if (lockData && isLockFresh(lockData) && lockData.instanceId !== instanceId) {
    throw new Error('Polling уже запущен в другом экземпляре. Остановите его или подождите 60 секунд.');
  }
  await setDoc(getLockRef(), lockPayload(), { merge: true });
};

const releaseLock = async () => {
  try {
    const lockData = await readLock();
    if (!lockData || lockData.instanceId === instanceId) {
      await deleteDoc(getLockRef());
    }
  } catch {
    // ignore lock cleanup errors
  }
};

const log = (level: 'info' | 'error', msg: string) => {
  const entry = { ts: new Date().toISOString(), level, msg };
  runtime.logs = [entry, ...runtime.logs].slice(0, 100);
  if (level === 'error') console.error('[telegram-bot]', msg);
  else console.log('[telegram-bot]', msg);
};

const toSafeRuntime = (): BotRuntimeSafe => ({
  status: runtime.status,
  lastError: runtime.lastError,
  lastStartedAt: runtime.lastStartedAt ? runtime.lastStartedAt.toISOString() : null,
  lastStoppedAt: runtime.lastStoppedAt ? runtime.lastStoppedAt.toISOString() : null,
  instanceId,
  logs: [...runtime.logs],
});

export async function startManagedBot(): Promise<BotRuntimeSafe> {
  if (runtime.status === 'running') {
    log('info', 'Bot already running');
    const lockData = await readLock();
    const payload = toSafeRuntime();
    return {
      ...payload,
      lock: lockData
        ? {
            instanceId: lockData.instanceId || null,
            startedAt: lockData.startedAt ? new Date(lockData.startedAt).toISOString() : null,
            lastHeartbeatAt: lockData.lastHeartbeatAt ? new Date(lockData.lastHeartbeatAt).toISOString() : null,
          }
        : null,
      lockFresh: lockData ? isLockFresh(lockData) : false,
    };
  }
  const settings = await readEnvSettings();
  if (settings.telegramBotEnabled === false) {
    log('info', 'Bot disabled in settings');
    runtime.status = 'stopped';
    return toSafeRuntime();
  }
  const mode = settings.telegramBotMode || 'polling';
  try {
    if (mode === 'webhook') {
      // Webhook mode requires external HTTPS endpoint. Not started automatically here.
      log('info', 'Webhook mode selected. Configure webhook endpoint separately.');
      runtime.status = 'stopped';
      return toSafeRuntime();
    }
    const lockData = await readLock();
    if (lockData && isLockFresh(lockData) && lockData.instanceId !== instanceId) {
      log('info', `Bot already running in another instance: ${lockData.instanceId}`);
      const payload = toSafeRuntime();
      return {
        ...payload,
        status: 'running',
        lock: {
          instanceId: lockData.instanceId || null,
          startedAt: lockData.startedAt ? new Date(lockData.startedAt).toISOString() : null,
          lastHeartbeatAt: lockData.lastHeartbeatAt ? new Date(lockData.lastHeartbeatAt).toISOString() : null,
        },
        lockFresh: true,
      };
    }
    await acquireLock();
    const bot = await startTelegramBot(true);
    runtime.bot = bot;
    runtime.status = 'running';
    runtime.lastStartedAt = new Date();
    log('info', 'Bot started in polling mode');
    runtime.heartbeatInterval = setInterval(() => {
      refreshLock().catch(() => {});
    }, 30_000);
    bot.on('polling_error', async (err: any) => {
      const errorCode = err?.response?.body?.error_code;
      const description = err?.response?.body?.description || err?.message || 'Polling error';
      runtime.status = 'error';
      runtime.lastError = description;
      log('error', `Polling error: ${description}`);
      if (errorCode === 409) {
        await stopManagedBot();
      }
    });
    const payload = toSafeRuntime();
    const newLock = await readLock();
    return {
      ...payload,
      lock: newLock
        ? {
            instanceId: newLock.instanceId || null,
            startedAt: newLock.startedAt ? new Date(newLock.startedAt).toISOString() : null,
            lastHeartbeatAt: newLock.lastHeartbeatAt ? new Date(newLock.lastHeartbeatAt).toISOString() : null,
          }
        : null,
      lockFresh: newLock ? isLockFresh(newLock) : false,
    };
  } catch (err: any) {
    runtime.status = 'error';
    runtime.lastError = err?.message || String(err);
    log('error', `Failed to start bot: ${runtime.lastError}`);
    throw err;
  }
}

export async function stopManagedBot(): Promise<BotRuntimeSafe> {
  if (runtime.bot) {
    try {
      runtime.bot.stopPolling();
    } catch (e) {
      log('error', 'Error stopping bot polling');
    }
  }
  if (runtime.heartbeatInterval) {
    clearInterval(runtime.heartbeatInterval);
    runtime.heartbeatInterval = undefined;
  }
  await releaseLock();
  runtime.bot = undefined;
  runtime.status = 'stopped';
  runtime.lastStoppedAt = new Date();
  log('info', 'Bot stopped');
  const payload = toSafeRuntime();
  const lockData = await readLock();
  return {
    ...payload,
    lock: lockData
      ? {
          instanceId: lockData.instanceId || null,
          startedAt: lockData.startedAt ? new Date(lockData.startedAt).toISOString() : null,
          lastHeartbeatAt: lockData.lastHeartbeatAt ? new Date(lockData.lastHeartbeatAt).toISOString() : null,
        }
      : null,
    lockFresh: lockData ? isLockFresh(lockData) : false,
  };
}

export async function forceUnlockBot(): Promise<BotRuntimeSafe> {
  if (runtime.bot) {
    await stopManagedBot();
  }
  try {
    await deleteDoc(getLockRef());
    log('info', 'Lock force-unlocked');
  } catch {
    log('error', 'Failed to force-unlock');
  }
  return await getBotRuntimeStatus();
}

export async function getBotRuntimeStatus(): Promise<BotRuntimeSafe> {
  const payload = toSafeRuntime();
  const lockData = await readLock();
  return {
    ...payload,
    lock: lockData
      ? {
          instanceId: lockData.instanceId || null,
          startedAt: lockData.startedAt ? new Date(lockData.startedAt).toISOString() : null,
          lastHeartbeatAt: lockData.lastHeartbeatAt ? new Date(lockData.lastHeartbeatAt).toISOString() : null,
        }
      : null,
    lockFresh: lockData ? isLockFresh(lockData) : false,
  };
}
