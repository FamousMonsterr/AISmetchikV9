'use server';

import { db } from '@/lib/db';
import { doc, getDoc, serverTimestamp, setDoc } from '@/lib/db-server';
import { sendVkMessage } from '@/server-functions/webhooks/vk';

export type VkDispatchInput = {
  userId?: string;
  peerId?: number | string | null;
  message: string;
  idempotencyKey?: string;
  cooldownSeconds?: number;
  metadata?: Record<string, any>;
};

export type VkDispatchResult = {
  success: boolean;
  skipped?: boolean;
  reason?: string;
  peerId?: number | string | null;
};

const resolvePeerId = async (input: VkDispatchInput): Promise<number | string | null> => {
  if (input.peerId) return input.peerId;
  if (!input.userId) return null;
  const userRef = doc(db, 'users', input.userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;
  const userData = userSnap.data() as any;
  return userData?.vkPeerId || userData?.vkId || null;
};

const checkCooldown = async (key: string, cooldownSeconds: number) => {
  const limitRef = doc(db, 'vk_rate_limits', key);
  const limitSnap = await getDoc(limitRef);
  if (!limitSnap.exists()) return false;
  const lastSentAt = limitSnap.data()?.lastSentAt;
  const lastDate = lastSentAt?.toDate ? lastSentAt.toDate() : lastSentAt ? new Date(lastSentAt) : null;
  if (!lastDate) return false;
  return Date.now() - lastDate.getTime() < cooldownSeconds * 1000;
};

const saveCooldown = async (key: string) => {
  const limitRef = doc(db, 'vk_rate_limits', key);
  await setDoc(limitRef, { lastSentAt: serverTimestamp() }, { merge: true });
};

const checkIdempotency = async (idempotencyKey: string) => {
  const dispatchRef = doc(db, 'notification_dispatches', idempotencyKey);
  const dispatchSnap = await getDoc(dispatchRef);
  if (!dispatchSnap.exists()) return null;
  return dispatchSnap.data();
};

const writeDispatchLog = async (idempotencyKey: string, payload: Record<string, any>) => {
  const dispatchRef = doc(db, 'notification_dispatches', idempotencyKey);
  await setDoc(dispatchRef, { ...payload, updatedAt: serverTimestamp() }, { merge: true });
};

export async function sendVkNotification(input: VkDispatchInput): Promise<VkDispatchResult> {
  if (!input.message?.trim()) {
    return { success: false, skipped: true, reason: 'empty_message' };
  }

  const peerId = await resolvePeerId(input);
  if (!peerId) {
    return { success: false, skipped: true, reason: 'missing_peer_id' };
  }

  if (input.idempotencyKey) {
    const existing = await checkIdempotency(input.idempotencyKey);
    if (existing?.status === 'sent') {
      return { success: true, skipped: true, reason: 'idempotent', peerId };
    }
  }

  const cooldownSeconds = input.cooldownSeconds ?? 2;
  const rateKey = input.userId ? `user:${input.userId}` : `peer:${String(peerId)}`;
  if (cooldownSeconds > 0 && rateKey) {
    const limited = await checkCooldown(rateKey, cooldownSeconds);
    if (limited) {
      if (input.idempotencyKey) {
        await writeDispatchLog(input.idempotencyKey, {
          channel: 'vk',
          status: 'skipped',
          reason: 'rate_limited',
          userId: input.userId || null,
          peerId: String(peerId),
        });
      }
      return { success: false, skipped: true, reason: 'rate_limited', peerId };
    }
  }

  try {
    await sendVkMessage({
      peerId,
      message: input.message,
    });
    if (rateKey) {
      await saveCooldown(rateKey);
    }
    if (input.idempotencyKey) {
      await writeDispatchLog(input.idempotencyKey, {
        channel: 'vk',
        status: 'sent',
        userId: input.userId || null,
        peerId: String(peerId),
        metadata: input.metadata || null,
        createdAt: serverTimestamp(),
      });
    }
    return { success: true, peerId };
  } catch (error: any) {
    if (input.idempotencyKey) {
      await writeDispatchLog(input.idempotencyKey, {
        channel: 'vk',
        status: 'failed',
        userId: input.userId || null,
        peerId: String(peerId),
        error: error?.message || String(error),
        metadata: input.metadata || null,
        createdAt: serverTimestamp(),
      });
    }
    return { success: false, reason: error?.message || 'send_failed', peerId };
  }
}
