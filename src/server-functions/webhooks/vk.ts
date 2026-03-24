import { doc, getDoc, setDoc, collection, query, where, limit, getDocs, updateDoc, serverTimestamp } from '@/lib/mongoFirestoreServer';
import { db } from '@/lib/firebase';
import { getVkApiVersion } from '@/lib/vk-auth';

type VkEnvSettings = {
  vkBotEnabled?: boolean;
  vkGroupId?: string;
  vkAccessToken?: string;
  vkCallbackSecret?: string;
  vkConfirmationToken?: string;
  vkWebhookUrl?: string;
  nextPublicTelegramBotUrl?: string;
  [key: string]: any;
};

type VkMessageEvent = {
  object?: {
    message?: {
      id?: number;
      peer_id?: number;
      from_id?: number;
      text?: string;
      payload?: string | Record<string, any>;
    };
  };
  type?: string;
  group_id?: number;
  event_id?: string;
  secret?: string;
};

async function readEnvSettings(): Promise<VkEnvSettings> {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
}

async function resolveVkConfig() {
  const settings = await readEnvSettings();
  return {
    enabled: settings.vkBotEnabled ?? (process.env.VK_BOT_ENABLED === 'true'),
    groupId: settings.vkGroupId || process.env.VK_GROUP_ID || '',
    accessToken: settings.vkAccessToken || process.env.VK_ACCESS_TOKEN || '',
    callbackSecret: settings.vkCallbackSecret || process.env.VK_CALLBACK_SECRET || '',
    confirmationToken: settings.vkConfirmationToken || process.env.VK_CONFIRMATION_TOKEN || '',
    webhookUrl: settings.vkWebhookUrl || process.env.VK_WEBHOOK_URL || '',
  };
}

async function vkApi<T = any>(method: string, params: Record<string, string | number | boolean | undefined>): Promise<T> {
  const config = await resolveVkConfig();
  if (!config.accessToken) {
    throw new Error('VK_ACCESS_TOKEN не задан.');
  }

  const url = new URL(`https://api.vk.com/method/${method}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  url.searchParams.set('access_token', config.accessToken);
  url.searchParams.set('v', getVkApiVersion());

  const response = await fetch(url.toString(), { method: 'GET' });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.error) {
    throw new Error(payload?.error?.error_msg || `VK API ${method} failed.`);
  }
  return payload.response as T;
}

async function getVkRuntimeDoc() {
  const runtimeRef = doc(db, 'configs', 'vkBotRuntime');
  const runtimeSnap = await getDoc(runtimeRef);
  return {
    ref: runtimeRef,
    data: runtimeSnap.exists() ? runtimeSnap.data() : null,
  };
}

async function saveVkRuntimePatch(patch: Record<string, any>) {
  const { ref } = await getVkRuntimeDoc();
  await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}

async function findUserByVkId(vkId: number) {
  const usersQuery = query(collection(db, 'users'), where('vkId', '==', String(vkId)), limit(1));
  const snap = await getDocs(usersQuery as any);
  if (snap.empty) {
    return null;
  }
  const userSnap = snap.docs[0];
  return { id: userSnap.id, ...(userSnap.data() as any) };
}

async function handleMessageNew(event: VkMessageEvent) {
  const message = event.object?.message;
  if (!message?.peer_id) {
    return;
  }

  const text = (message.text || '').trim();
  const payloadRaw = message.payload;
  let payload: Record<string, any> | null = null;
  if (typeof payloadRaw === 'string') {
    try {
      payload = JSON.parse(payloadRaw);
    } catch {
      payload = null;
    }
  } else if (payloadRaw && typeof payloadRaw === 'object') {
    payload = payloadRaw;
  }

  const startRef = payload?.refUserId || text.match(/(?:uid_|ref_)([A-Za-z0-9_-]+)/)?.[1] || null;
  if (startRef && message.from_id) {
    await updateDoc(doc(db, 'users', startRef), {
      vkId: String(message.from_id),
      vkPeerId: message.peer_id,
      vkLinkedAt: new Date(),
      updatedAt: new Date(),
    }).catch(() => null);
  }

  await setDoc(
    doc(db, 'vk_chats', String(message.peer_id)),
    {
      peerId: message.peer_id,
      fromId: message.from_id || null,
      text,
      payload: payload || null,
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    },
    { merge: true },
  );

  const linkedUser = message.from_id ? await findUserByVkId(message.from_id) : null;
  if (linkedUser && message.peer_id && (!linkedUser.vkPeerId || linkedUser.vkPeerId !== message.peer_id)) {
    await updateDoc(doc(db, 'users', linkedUser.id), {
      vkPeerId: message.peer_id,
      updatedAt: new Date(),
    }).catch(() => null);
  }

  const webAppUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://aismetchik.ru';
  const lower = text.toLowerCase();
  if (lower === '/ping') {
    await sendVkMessage({ peerId: message.peer_id, message: `pong ✅ ${new Date().toLocaleString()}` });
    return;
  }
  if (lower.startsWith('/help')) {
    await sendVkMessage({
      peerId: message.peer_id,
      message: 'Команды: /start, /help, /profile, /ping',
    });
    return;
  }
  if (lower.startsWith('/profile')) {
    const profileText = linkedUser
      ? `Профиль: ${linkedUser.displayName}\nПлан: ${linkedUser.plan || 'Free'}\nКредиты: ${linkedUser.credits ?? 0}`
      : 'Аккаунт пока не связан. Откройте приложение и привяжите VK в профиле.';
    await sendVkMessage({ peerId: message.peer_id, message: profileText });
    return;
  }
  if (lower.startsWith('/start') || lower.includes('начать')) {
    await sendVkMessage({
      peerId: message.peer_id,
      message: `VK бот AI Сметчик готов. Откройте приложение: ${webAppUrl}`,
    });
  }
}

export async function verifyVkWebhookSecret(payload: Record<string, any>): Promise<boolean> {
  const config = await resolveVkConfig();
  if (!config.callbackSecret) {
    return true;
  }
  return payload?.secret === config.callbackSecret;
}

export async function handleVkWebhookEvent(payload: VkMessageEvent): Promise<{ body: string }> {
  const config = await resolveVkConfig();
  await saveVkRuntimePatch({
    lastWebhookAt: new Date(),
    lastWebhookType: payload?.type || 'unknown',
    lastWebhookGroupId: payload?.group_id || null,
    lastEventId: payload?.event_id || null,
  });

  if (payload?.type === 'confirmation') {
    return { body: config.confirmationToken || '' };
  }

  if (payload?.type === 'message_new') {
    await handleMessageNew(payload);
  }

  return { body: 'ok' };
}

export async function getVkCallbackStatus() {
  const config = await resolveVkConfig();
  const runtime = await getVkRuntimeDoc();
  let servers: { count?: number; items?: any[] } = { items: [] };
  if (config.groupId && config.accessToken) {
    try {
      servers = await vkApi<{ count?: number; items?: any[] }>('groups.getCallbackServers', {
        group_id: config.groupId,
      });
    } catch {
      servers = { items: [] };
    }
  }
  return {
    config,
    runtime: runtime.data,
    servers,
  };
}

export async function registerVkCallbackServer() {
  const config = await resolveVkConfig();
  if (!config.groupId || !config.webhookUrl) {
    throw new Error('VK_GROUP_ID или VK_WEBHOOK_URL не заданы.');
  }

  const existing = await vkApi<{ count?: number; items?: any[] }>('groups.getCallbackServers', { group_id: config.groupId });
  const currentServer = Array.isArray(existing?.items)
    ? existing.items.find((item: any) => item.url === config.webhookUrl) || existing.items[0]
    : null;

  let serverId = currentServer?.id;
  if (serverId) {
    await vkApi('groups.editCallbackServer', {
      group_id: config.groupId,
      server_id: serverId,
      url: config.webhookUrl,
      title: 'AI Smetchik',
      secret_key: config.callbackSecret || undefined,
    });
  } else {
    const created = await vkApi('groups.addCallbackServer', {
      group_id: config.groupId,
      url: config.webhookUrl,
      title: 'AI Smetchik',
      secret_key: config.callbackSecret || undefined,
    });
    serverId = created?.server_id || created?.id;
  }

  if (serverId) {
    await vkApi('groups.setCallbackSettings', {
      group_id: config.groupId,
      server_id: serverId,
      message_new: 1,
      message_reply: 1,
    });
  }

  await saveVkRuntimePatch({
    lastCallbackRegisterAt: new Date(),
    lastCallbackServerId: serverId || null,
  });

  return { ok: true, serverId };
}

export async function deleteVkCallbackServer(serverId?: number | string) {
  const config = await resolveVkConfig();
  if (!config.groupId) {
    throw new Error('VK_GROUP_ID не задан.');
  }

  const resolvedServerId = serverId
    ? Number(serverId)
    : ((await getVkCallbackStatus()).servers?.items?.[0]?.id || null);
  if (!resolvedServerId) {
    return { ok: true };
  }

  await vkApi('groups.deleteCallbackServer', {
    group_id: config.groupId,
    server_id: resolvedServerId,
  });
  await saveVkRuntimePatch({
    lastCallbackDeleteAt: new Date(),
    lastCallbackServerId: null,
  });
  return { ok: true, serverId: resolvedServerId };
}

export async function pingVkApi() {
  const config = await resolveVkConfig();
  if (!config.groupId) {
    throw new Error('VK_GROUP_ID не задан.');
  }
  const result = await vkApi('groups.getById', {
    group_id: config.groupId,
  });
  return { ok: true, result };
}

export async function sendVkMessage(params: { peerId: number | string; message: string }) {
  const response = await vkApi('messages.send', {
    peer_id: params.peerId,
    random_id: Date.now(),
    message: params.message,
  });
  await saveVkRuntimePatch({
    lastOutboundAt: new Date(),
    lastOutboundPeerId: String(params.peerId),
    lastOutboundStatus: 'success',
  });
  return response;
}
