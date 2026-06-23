// src/server-functions/telegram/bot.ts
// Polling/webhook bot handler for Telegram commands, callbacks, and chat binding.

import crypto from 'crypto';
import TelegramBot, { type Message, type TelegramCallbackQuery } from '@/lib/telegram/telegraf-compat';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, limit, getDocs } from '@/lib/db-server';
import { db } from '@/lib/db';
import {
  type TelegramAudience,
  TELEGRAM_AUDIENCE_COMMANDS,
  extractCommand,
  getUnknownCommandMessage,
  isCommandAllowed,
  resolveUserBotState,
} from '@/server-functions/telegram/state';

// Allowed MIME types for analysis
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/msword',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/tiff',
  'text/csv',
  'text/plain',
]);
const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

const readEnvSettings = async () => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

/** Build a setMyCommands payload for the given audience. */
const buildCommandList = (audience: TelegramAudience) => {
  const descriptions: Record<string, string> = {
    '/start': 'Запуск и привязка аккаунта',
    '/help': 'Список команд',
    '/profile': 'Мой профиль',
    '/new': 'Новый расчёт',
    '/upload': 'Загрузить файл на анализ',
    '/history': 'История проектов',
    '/pay': 'Оплата и тарифы',
    '/support': 'Поддержка',
    '/link': 'Привязать Telegram',
    '/unlink': 'Отвязать Telegram',
    '/ref': 'Реферальная ссылка',
    '/stats': 'Статистика партнёра',
    '/clients': 'Клиенты',
    '/attestation': 'Аттестация',
    '/payout': 'Выплаты',
    '/queue': 'Очередь заявок',
    '/take': 'Взять заявку',
    '/done': 'Завершить заявку',
    '/reassign': 'Переназначить',
    '/sla': 'SLA метрики',
    '/client': 'Данные клиента',
    '/note': 'Добавить заметку',
    '/health': 'Здоровье системы',
    '/alerts': 'Алерты',
    '/deploy': 'Деплой',
    '/workers': 'Воркеры',
    '/payments': 'Платежи',
    '/tickets': 'Тикеты',
    '/webhooks': 'Вебхуки',
    '/ping': 'Проверка связи',
  };
  return TELEGRAM_AUDIENCE_COMMANDS[audience].map((cmd) => ({
    command: cmd.replace('/', ''),
    description: descriptions[cmd] || cmd,
  }));
};

type StartPayload = {
  raw?: string | null;
  refUserId?: string | null;
};

const parseStartPayload = (msg: Message): StartPayload => {
  const text = msg.text || '';
  const parts = text.trim().split(/\s+/);
  const payload = parts.length > 1 ? parts.slice(1).join(' ') : null;
  if (!payload) return { raw: null, refUserId: null };
  const refMatch = payload.match(/^(ref_|uid_)(.+)$/i);
  return {
    raw: payload,
    refUserId: refMatch ? refMatch[2] : null,
  };
};

const resolveWebAppUrl = async () => {
  const envSettings = await readEnvSettings();
  const envUrl =
    envSettings.nextPublicTelegramWebappUrl ||
    process.env.NEXT_PUBLIC_TELEGRAM_WEBAPP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.NEXT_PUBLIC_VERCEL_URL ? `https://${process.env.NEXT_PUBLIC_VERCEL_URL}` : undefined) ||
    process.env.NEXT_PUBLIC_SITE_URL;
  return envUrl || 'https://example.com';
};

const findUserByChatId = async (chatId: number) => {
  const q = query(collection(db, 'users'), where('telegramChatId', '==', chatId), limit(1));
  const snap = await getDocs(q as any);
  if (snap.empty) return null;
  const docSnap = snap.docs[0];
  return { id: docSnap.id, ...(docSnap.data() as any) };
};

const unlinkUserByChatId = async (chatId: number) => {
  const user = await findUserByChatId(chatId);
  if (!user) {
    return false;
  }
  await updateDoc(doc(db, 'users', user.id), {
    telegramChatId: null,
    telegramUsername: '',
    telegramLinkedAt: null,
    updatedAt: serverTimestamp(),
  });
  return true;
};

const webhookBots = new Map<string, TelegramBot>();

const ensureBotToken = async () => {
  const envSettings = await readEnvSettings();
  const token = envSettings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error('TELEGRAM_BOT_TOKEN не задан.');
  }
  return token;
};

const registerHandlers = (bot: TelegramBot, audience: TelegramAudience = 'default') => {
  const webAppUrlPromise = resolveWebAppUrl();

  const saveChat = async (msg: Message, payload: StartPayload) => {
    const chatId = msg.chat.id;
    const userId = payload.refUserId || null;
    const isPremium = Boolean((msg.from as any)?.is_premium);
    const chatRef = doc(db, 'telegram_chats', String(chatId));
    const existing = await getDoc(chatRef);
    const base = {
      chatId,
      username: msg.from?.username || null,
      firstName: msg.from?.first_name || null,
      lastName: msg.from?.last_name || null,
      languageCode: msg.from?.language_code || null,
      isPremium,
      startPayload: payload.raw || null,
      refUserId: userId,
      updatedAt: serverTimestamp(),
    };
    if (existing.exists()) {
      await setDoc(chatRef, base, { merge: true });
    } else {
      await setDoc(chatRef, { ...base, createdAt: serverTimestamp() });
    }

    if (userId) {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        telegramChatId: chatId,
        telegramUsername: msg.from?.username || '',
        telegramLinkedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }).catch((err) => {
        console.warn('Failed to update user with telegram chat', { userId, chatId, err: err?.message });
      });
    }
  };

  const isHttpsUrl = (url: string) => url.startsWith('https://');

  const buildWebAppKeyboard = (webAppUrl: string, extraButtons: Array<Array<any>> = []) => {
    // Telegram requires HTTPS for both web_app and url buttons.
    // For localhost/HTTP URLs, skip the app button entirely.
    if (!webAppUrl || !isHttpsUrl(webAppUrl)) {
      return extraButtons.length > 0 ? { inline_keyboard: extraButtons } : undefined;
    }
    return { inline_keyboard: [[{ text: 'Открыть приложение', web_app: { url: webAppUrl } }], ...extraButtons] };
  };

  const sendWelcome = async (chatId: number, linkedNow?: boolean) => {
    const webAppUrl = await webAppUrlPromise;
    const existingUser = await findUserByChatId(chatId);

    if (linkedNow) {
      await bot.sendMessage(chatId, '✅ Аккаунт успешно привязан! Теперь вы будете получать уведомления.\n\nКоманды: /profile /new /history /help');
      return;
    }

    if (existingUser) {
      // Already linked — welcome back
      const name = existingUser.telegramUsername || existingUser.displayName || 'пользователь';
      await bot.sendMessage(chatId, `С возвращением, ${name}! 👋\n\nКоманды: /profile /new /history /help`);
      return;
    }

    // Not linked — show linking instructions
    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || '';
    const profileUrl = webAppUrl ? `${webAppUrl}/dashboard/profile` : '';

    let text = `Привет! Я бот Montage HUB.\n\n`;
    text += `📌 Чтобы привязать аккаунт:\n`;
    text += `1. Откройте приложение\n`;
    text += `2. Профиль → Написать боту\n`;
    text += `3. Отправьте команду которую бот пришлёт\n\n`;
    text += `Или используйте /help для списка команд.`;

    const buttons: Array<Array<any>> = [];
    if (profileUrl && isHttpsUrl(profileUrl)) {
      buttons.push([{ text: '🔗 Привязать аккаунт', url: profileUrl }]);
    }
    buttons.push([{ text: '📋 Команды', callback_data: 'help' }]);

    await bot.sendMessage(chatId, text, { reply_markup: { inline_keyboard: buttons } });
  };

  const sendProfile = async (chatId: number) => {
    const webAppUrl = await webAppUrlPromise;
    const user = await findUserByChatId(chatId);
    if (!user) {
      const profileUrl = webAppUrl ? `${webAppUrl}/dashboard/profile` : '';
      const buttons: Array<Array<any>> = [];
      if (profileUrl && isHttpsUrl(profileUrl)) {
        buttons.push([{ text: '🔗 Привязать в приложении', url: profileUrl }]);
      }
      await bot.sendMessage(
        chatId,
        '⚠️ Аккаунт не привязан.\n\nОткройте приложение → Профиль → «Написать боту» — и отправьте команду которую бот пришлёт.',
        buttons.length > 0 ? { reply_markup: { inline_keyboard: buttons } } : undefined
      );
      return;
    }
    const credits = user.credits ?? 0;
    const plan = user.plan ?? 'Free';
    const username = user.telegramUsername || user.displayName || 'Пользователь';
    const state = resolveUserBotState(audience, user);
    const keyboard = buildWebAppKeyboard(webAppUrl, [
      [{ text: 'Отвязать Telegram', callback_data: 'unlink' }],
    ]);
    await bot.sendMessage(
      chatId,
      `Профиль: ${username}\nПлан: ${plan}\nКредиты: ${credits}\nСостояние: ${state}`,
      keyboard ? { reply_markup: keyboard } : undefined
    );
  };

  const sendHistory = async (chatId: number) => {
    const webAppUrl = await webAppUrlPromise;
    const user = await findUserByChatId(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ Аккаунт не привязан. Используйте /link для привязки.');
      return;
    }

    try {
      const { getDb } = await import('@/lib/mongodb');
      const mongo = await getDb();
      const projects = await mongo.collection('projects')
        .find({ userId: user._id || user.id })
        .sort({ createdAt: -1 })
        .limit(5)
        .toArray();

      if (projects.length === 0) {
        await bot.sendMessage(chatId, '📂 У вас пока нет проектов.\n\nОткройте приложение и загрузите файл для расчёта.');
        return;
      }

      let text = `📂 Последние проекты (${projects.length}):\n\n`;
      for (const p of projects) {
        const date = p.createdAt ? new Date(p.createdAt).toLocaleDateString('ru-RU') : '—';
        const name = p.name || p.fileName || 'Без названия';
        const status = p.status === 'completed' ? '✅' : p.status === 'processing' ? '⏳' : '📄';
        text += `${status} ${name} (${date})\n`;
      }
      text += `\nОткройте приложение для деталей.`;

      const keyboard = buildWebAppKeyboard(webAppUrl);
      await bot.sendMessage(chatId, text, keyboard ? { reply_markup: keyboard } : undefined);
    } catch (err: any) {
      console.error('[telegram] /history error:', err?.message);
      await bot.sendMessage(chatId, 'Ошибка загрузки истории. Попробуйте позже.');
    }
  };

  const sendNew = async (chatId: number) => {
    const webAppUrl = await webAppUrlPromise;
    const keyboard = buildWebAppKeyboard(webAppUrl);
    await bot.sendMessage(
      chatId,
      'Создание нового расчёта доступно в приложении. Откройте калькулятор и загрузите файл.',
      keyboard ? { reply_markup: keyboard } : undefined
    );
  };

  const sendUpload = async (chatId: number) => {
    const user = await findUserByChatId(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ Аккаунт не привязан. Используйте /link для привязки.');
      return;
    }
    await bot.sendMessage(
      chatId,
      '📎 Загрузка файла на анализ\n\n' +
      'Отправьте мне файл (PDF, Excel, Word, изображение) — и я поставлю его в очередь на анализ.\n\n' +
      '📋 Поддерживаемые форматы:\n' +
      '• PDF, DOCX, XLSX\n' +
      '• JPEG, PNG, WebP, TIFF\n' +
      '• CSV, TXT\n\n' +
      '📏 Макс. размер: 50 МБ\n\n' +
      'После обработки вы получите уведомление с результатом.'
    );
  };

  const sendHelp = async (chatId: number) => {
    const commands = TELEGRAM_AUDIENCE_COMMANDS[audience].join('\n');
    await bot.sendMessage(
      chatId,
      `Доступные команды (${audience}):\n${commands}`,
    );
  };

  const sendPay = async (chatId: number) => {
    const webAppUrl = await webAppUrlPromise;
    const keyboard = buildWebAppKeyboard(webAppUrl);
    await bot.sendMessage(
      chatId,
      'Оплата и тарифы доступны в приложении (Профиль → Тариф).',
      keyboard ? { reply_markup: keyboard } : undefined
    );
  };

  const sendPing = async (chatId: number) => {
    await bot.sendMessage(chatId, `pong (${audience}) ✅ ${new Date().toLocaleString()}`);
  };

  const unlinkAccount = async (chatId: number) => {
    const unlinked = await unlinkUserByChatId(chatId);
    await bot.sendMessage(
      chatId,
      unlinked ? 'Telegram отвязан. При необходимости привяжите его снова через /start.' : 'Связанный аккаунт не найден.',
    );
  };

  // Handle non-command text (e.g., verification codes)
  bot.onText(/^[^/].*$/i, async (msg) => {
    const text = msg.text?.trim();
    if (!text) return;

    // Check if it's a 6-digit verification code
    if (/^\d{6}$/.test(text)) {
      const { getDb } = await import('@/lib/mongodb');
      const mongo = await getDb();
      const user = await mongo.collection('users').findOne({
        telegramLinkCode: text,
        telegramLinkCodeExpiresAt: { $gt: new Date() },
      });

      if (!user) {
        await bot.sendMessage(msg.chat.id, '❌ Код неверный или истёк. Сгенерируйте новый в приложении (Профиль → Привязать Telegram).');
        return;
      }

      // Check if this Telegram is already linked to another user
      const duplicate = await mongo.collection('users').findOne({
        telegramChatId: msg.chat.id,
        _id: { $ne: user._id },
      });
      if (duplicate) {
        await bot.sendMessage(msg.chat.id, '⚠️ Этот Telegram уже привязан к другому аккаунту. Сначала отвяжите его.');
        return;
      }

      // Link the account (pure MongoDB)
      const now = new Date();
      await mongo.collection('users').updateOne(
        { _id: user._id },
        {
          $set: {
            telegramChatId: msg.chat.id,
            telegramUsername: msg.from?.username || '',
            telegramLinkedAt: now,
            updatedAt: now,
          },
          $unset: { telegramLinkCode: '', telegramLinkCodeExpiresAt: '' },
        }
      );

      // Also save the chat
      await mongo.collection('telegram_chats').updateOne(
        { chatId: msg.chat.id },
        {
          $set: {
            chatId: msg.chat.id,
            username: msg.from?.username || null,
            firstName: msg.from?.first_name || null,
            lastName: msg.from?.last_name || null,
            refUserId: String(user._id),
            updatedAt: now,
          },
          $setOnInsert: { createdAt: now },
        },
        { upsert: true }
      );

      const name = user.telegramUsername || user.displayName || 'Пользователь';
      await bot.sendMessage(msg.chat.id, `✅ Аккаунт привязан! Добро пожаловать, ${name}!\n\nТеперь вы будете получать уведомления и файлы через бота.\n\nКоманды: /profile /new /history /help`);
      return;
    }

    // Not a code and not a command — ignore or send help hint
    await bot.sendMessage(msg.chat.id, 'Отправьте команду (например /help) или 6-значный код для привязки.');
  });

  // ─── Document handler: receive files → S3 → analysis job (standard pipeline) ───
  bot.on('document', async (msg: Message) => {
    const chatId = msg.chat.id;
    const doc = (msg as any).document;
    if (!doc) return;

    // 1. Check user is linked
    const user = await findUserByChatId(chatId);
    if (!user) {
      await bot.sendMessage(chatId, '⚠️ Аккаунт не привязан. Используйте /link для привязки.');
      return;
    }

    // 2. Validate file type
    const mimeType = doc.mime_type || '';
    const fileName = doc.file_name || 'document';
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
      await bot.sendMessage(
        chatId,
        `❌ Формат "${mimeType || 'unknown'}" не поддерживается.\n\n` +
        'Поддерживаемые: PDF, DOCX, XLSX, JPEG, PNG, WebP, TIFF, CSV, TXT.\n' +
        'Отправьте другой файл или используйте /upload для справки.'
      );
      return;
    }

    // 3. Validate file size (Telegram API limit: 20 MB for getFile)
    const fileSize = doc.file_size || 0;
    if (fileSize > 20 * 1024 * 1024) {
      const sizeMb = (fileSize / 1024 / 1024).toFixed(1);
      await bot.sendMessage(chatId, `❌ Файл слишком большой (${sizeMb} МБ). Максимум через Telegram: 20 МБ.\nЗагрузите файл через приложение.`);
      return;
    }

    // 4. Check user has credits
    const credits = user.credits ?? 0;
    if (credits <= 0) {
      await bot.sendMessage(
        chatId,
        '❌ Недостаточно кредитов для анализа.\n\nОткройте приложение, чтобы пополнить баланс.',
        { reply_markup: { inline_keyboard: [[{ text: '💰 Пополнить', url: `${await webAppUrlPromise}/dashboard/profile` }]] } }
      );
      return;
    }

    // 5. Notify user — processing started
    await bot.sendMessage(chatId, `📥 Получен файл: ${fileName}\n⏳ Скачиваю и загружаю в хранилище...`);

    try {
      // 6. Download file from Telegram
      const fileBuffer = await bot.downloadFile(doc.file_id);
      const sizeMb = (fileBuffer.length / 1024 / 1024).toFixed(1);
      const userId = String(user._id || user.id);
      const fileSha1 = crypto.createHash('sha1').update(fileBuffer).digest('hex');

      // 7. Upload to S3 using env vars (same as web UI)
      const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3');
      const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
      const { nanoid } = await import('nanoid');

      const endpoint = process.env.S3_ENDPOINT || 'http://localhost:9000';
      const region = process.env.S3_REGION || 'us-east-1';
      const bucketName = process.env.S3_USER_DOCS_BUCKET_NAME || process.env.S3_BUCKET_NAME || 'montagehub-user-docs';
      const bucketIsPublic = (process.env.S3_USER_DOCS_BUCKET_IS_PUBLIC || 'false') === 'true';

      const s3Client = new S3Client({
        region,
        endpoint,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || 'minioadmin',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'minioadmin',
        },
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      });

      const objectKey = `tg-${nanoid()}-${fileName}`;
      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: objectKey,
        Body: fileBuffer,
        ContentType: mimeType,
      }));

      let fileUri: string;
      if (bucketIsPublic) {
        fileUri = `${endpoint}/${bucketName}/${objectKey}`;
      } else {
        const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
        fileUri = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
      }

      await bot.sendMessage(chatId, `✅ Файл загружен (${sizeMb} МБ). Создаю задачу анализа...`);

      // 8. Read config for model/pipeline
      const { readAiConfig } = await import('@/lib/ai-config-runtime');
      const aiConfig = await readAiConfig();
      const analysisModel = aiConfig.analysisModel || 'mimo-v2.5-pro';
      const visionModel = aiConfig.visionModel || 'mimo-v2.5';
      const pipelineAnalysisProvider = aiConfig.analysisProvider || 'xiaomi';
      const pipelineVersion = pipelineAnalysisProvider === 'xiaomi' ? 'xiaomi-vision' : 'v3';
      const executionProvider = pipelineVersion === 'xiaomi-vision' ? 'xiaomi' : 'openrouter';

      // 9. Create project in requests (same as web UI)
      const { getDb } = await import('@/lib/mongodb');
      const { ObjectId } = await import('mongodb');
      const mongo = await getDb();
      const projectOid = new ObjectId();
      const projectId = projectOid.toHexString();
      const now = new Date();

      await mongo.collection('requests').insertOne({
        _id: projectOid,
        userId,
        fileName,
        fileUri,
        mimeType,
        fileSha1,
        status: 'processing',
        cost: 0,
        modelUsed: analysisModel,
        outputSpecifications: [],
        aiComment: '',
        importantExtractionNotes: [],
        analysisDetails: null,
        quoteConfig: {},
        isMainVersion: true,
        parentProjectId: projectId,
        version: 1,
        aiCallCount: 0,
        objectId: null,
        objectName: null,
        actionHistory: [],
        serverJobId: null,
        s3ObjectKey: objectKey,
        pipelineVersion,
        processingStage: 'created',
        processingStageMessage: 'Файл получен из Telegram',
        processingStageUpdatedAt: now,
        analysisSource: {
          fileUri,
          fileSha1,
          fileName,
          mimeType,
          objectKey,
          model: analysisModel,
          pipelineVersion,
        },
        source: 'telegram',
        telegramChatId: chatId,
        timestamp: now,
        updatedAt: now,
      });

      // 10. Create analysis job (standard pipeline — same as web UI)
      const { createServerAnalysisJob } = await import('@/server-functions/analysis/jobService');
      const job = await createServerAnalysisJob({
        userId,
        projectId,
        fileUri,
        fileSha1,
        fileName,
        mimeType,
        objectKey,
        model: analysisModel,
        pipelineVersion,
        executionProvider,
        userPlan: user.plan || 'Free',
        creditCost: 1,
      });

      // 11. Update project with job ID
      await mongo.collection('requests').updateOne(
        { _id: projectOid },
        { $set: { serverJobId: job.id, updatedAt: now } }
      );

      // 12. Confirm to user
      await bot.sendMessage(
        chatId,
        `✅ Файл принят в обработку!\n\n` +
        `📄 Файл: ${fileName}\n` +
        `📊 Размер: ${sizeMb} МБ\n` +
        `🔧 Пайплайн: ${pipelineVersion === 'xiaomi-vision' ? `Xiaomi Vision (${visionModel} → ${analysisModel})` : `V3 (OCR → ${analysisModel})`}\n` +
        `🔢 Задача: ${job.id}\n\n` +
        `⏳ Анализ займёт несколько минут. Вы получите уведомление с результатом.\n\n` +
        `Проверить статус: /history`,
        { reply_markup: { inline_keyboard: [[{ text: '📂 Мои проекты', callback_data: 'history' }]] } }
      );

      console.log(`[telegram] File uploaded: ${fileName} → job ${job.id} (pipeline: ${pipelineVersion}, provider: ${executionProvider}, user: ${userId})`);
    } catch (err: any) {
      console.error('[telegram] File upload error:', err?.message || err);
      await bot.sendMessage(
        chatId,
        `❌ Ошибка при обработке файла: ${err?.message || 'Неизвестная ошибка'}\n\nПопробуйте ещё раз или загрузите файл через приложение.`
      );
    }
  });

  bot.onText(/\/.*/i, async (msg) => {
    const command = extractCommand(msg.text);
    if (!command) return;
    if (!isCommandAllowed(audience, command)) {
      await bot.sendMessage(msg.chat.id, getUnknownCommandMessage(audience));
      return;
    }

    if (command === '/start') {
      const payload = parseStartPayload(msg);
      let linkedNow = false;
      try {
        await saveChat(msg, payload);
        linkedNow = Boolean(payload.refUserId);
      } catch (err: any) {
        console.error('Failed to save chat_id', err?.message || err);
      }
      await sendWelcome(msg.chat.id, linkedNow);
      return;
    }
    if (command === '/help') {
      await sendHelp(msg.chat.id);
      return;
    }
    if (command === '/profile') {
      await sendProfile(msg.chat.id);
      return;
    }
    if (command === '/new') {
      await sendNew(msg.chat.id);
      return;
    }
    if (command === '/upload') {
      await sendUpload(msg.chat.id);
      return;
    }
    if (command === '/history') {
      await sendHistory(msg.chat.id);
      return;
    }
    if (command === '/pay') {
      await sendPay(msg.chat.id);
      return;
    }
    if (command === '/support') {
      await bot.sendMessage(msg.chat.id, 'Поддержка: откройте раздел "Поддержка" в приложении.');
      return;
    }
    if (command === '/link') {
      const existingUser = await findUserByChatId(msg.chat.id);
      if (existingUser) {
        await bot.sendMessage(msg.chat.id, '✅ Ваш Telegram уже привязан к аккаунту.');
        return;
      }
      const webAppUrl = await webAppUrlPromise;
      const profileUrl = webAppUrl ? `${webAppUrl}/dashboard/profile` : '';
      let text = '🔗 Привязка аккаунта\n\n';
      text += `Ваш Chat ID: \`${msg.chat.id}\`\n\n`;
      text += 'Для привязки:\n';
      text += '1. Откройте сайт Montage HUB\n';
      text += '2. Профиль → нажмите «Написать боту»\n';
      text += '3. Отправьте команду которую бот пришлёт\n\n';
      text += 'После этого вы будете получать уведомления и файлы через бота.';
      const buttons: Array<Array<any>> = [];
      if (profileUrl && isHttpsUrl(profileUrl)) {
        buttons.push([{ text: '🔗 Открыть профиль', url: profileUrl }]);
      }
      await bot.sendMessage(msg.chat.id, text, {
        parse_mode: 'Markdown',
        ...(buttons.length > 0 ? { reply_markup: { inline_keyboard: buttons } } : {}),
      });
      return;
    }
    if (command === '/unlink') {
      await unlinkAccount(msg.chat.id);
      return;
    }
    if (command === '/ref' || command === '/stats' || command === '/clients' || command === '/attestation' || command === '/payout') {
      await bot.sendMessage(msg.chat.id, `Команда ${command} доступна и обрабатывается в партнерском кабинете.`);
      return;
    }
    if (command === '/queue' || command === '/take' || command === '/done' || command === '/reassign' || command === '/sla' || command === '/client' || command === '/note') {
      await bot.sendMessage(msg.chat.id, `Команда ${command} доступна в CRM-контуре менеджеров.`);
      return;
    }
    if (command === '/health' || command === '/alerts' || command === '/deploy' || command === '/workers' || command === '/payments' || command === '/tickets' || command === '/webhooks') {
      await bot.sendMessage(msg.chat.id, `Команда ${command} доступна в админ-контуре.`);
      return;
    }
    if (command === '/ping') {
      await sendPing(msg.chat.id);
      return;
    }

    await bot.sendMessage(msg.chat.id, getUnknownCommandMessage(audience));
  });

  bot.on('callback_query', async (q: TelegramCallbackQuery) => {
    if (!q.data) return;
    const chatId = q.message?.chat?.id;
    if (!chatId) {
      await bot.answerCallbackQuery(q.id, { text: 'Ошибка: сообщение не найдено' }).catch(() => {});
      return;
    }

    try {
      if (q.data === 'help') {
        await bot.answerCallbackQuery(q.id, { text: 'Справка отправлена' });
        const commands = TELEGRAM_AUDIENCE_COMMANDS[audience].join('\n');
        await bot.sendMessage(chatId, `Доступные команды (${audience}):\n${commands}`);
        return;
      }

      if (q.data === 'unlink') {
        // Show confirmation
        await bot.answerCallbackQuery(q.id);
        await bot.sendMessage(chatId, '⚠️ Вы уверены, что хотите отвязать Telegram?', {
          reply_markup: {
            inline_keyboard: [
              [{ text: '✅ Да, отвязать', callback_data: 'unlink_confirm' }],
              [{ text: '❌ Отмена', callback_data: 'unlink_cancel' }],
            ],
          },
        });
        return;
      }

      if (q.data === 'unlink_confirm') {
        const unlinked = await unlinkUserByChatId(chatId);
        await bot.answerCallbackQuery(q.id, { text: unlinked ? 'Telegram отвязан' : 'Аккаунт не найден' });
        await bot.sendMessage(chatId, unlinked
          ? '✅ Telegram отвязан. Для новой привязки используйте /link'
          : '⚠️ Связанный аккаунт не найден.');
        return;
      }

      if (q.data === 'unlink_cancel') {
        await bot.answerCallbackQuery(q.id, { text: 'Отменено' });
        await bot.sendMessage(chatId, '👌 Отвязка отменена.');
        return;
      }

      if (q.data === 'history') {
        await bot.answerCallbackQuery(q.id, { text: 'Загрузка истории...' });
        await sendHistory(chatId);
        return;
      }

      if (q.data === 'upload') {
        await bot.answerCallbackQuery(q.id, { text: 'Справка по загрузке' });
        await sendUpload(chatId);
        return;
      }

      await bot.answerCallbackQuery(q.id, { text: 'Команда не распознана' });
    } catch (err: any) {
      console.error('[telegram] Callback error:', err?.message || err);
      await bot.answerCallbackQuery(q.id, { text: 'Произошла ошибка' }).catch(() => {});
    }
  });

  bot.on('polling_error', (err: any) => {
    const description = err?.response?.body?.description || err?.message || 'Polling error';
    console.error('Telegram polling error:', description);
  });
};

export async function startTelegramBot(polling = true) {
  const token = await ensureBotToken();
  const bot = new TelegramBot(token, { polling });
  registerHandlers(bot, 'default');
  return bot;
}

const getWebhookBot = async (token?: string, audience: TelegramAudience = 'default') => {
  const resolvedToken = token || (await ensureBotToken());
  const key = `${resolvedToken}:${audience}`;
  const cached = webhookBots.get(key);
  if (cached) {
    return cached;
  }
  const bot = new TelegramBot(resolvedToken, { polling: false });
  registerHandlers(bot, audience);
  webhookBots.set(key, bot);
  return bot;
};

export async function processTelegramWebhookUpdate(
  update: any,
  options?: { token?: string; audience?: TelegramAudience }
) {
  const bot = await getWebhookBot(options?.token, options?.audience || 'default');
  bot.processUpdate(update);
}

/**
 * Register bot commands with Telegram for the given audience.
 * This makes the command menu visible in the Telegram UI.
 */
export async function registerBotCommands(
  token: string,
  audience: TelegramAudience = 'default'
): Promise<void> {
  const bot = new TelegramBot(token, { polling: false });
  const commands = buildCommandList(audience);
  try {
    await bot.setMyCommands(commands);
    console.log(`[telegram] Commands registered for audience="${audience}" (${commands.length} commands)`);
  } catch (err: any) {
    console.error(`[telegram] Failed to register commands for audience="${audience}":`, err?.message || err);
  }
}

/**
 * Register commands for all enabled audiences.
 * Reads config, iterates over audiences, calls setMyCommands for each.
 */
export async function registerAllBotCommands(): Promise<void> {
  const envSettings = await readEnvSettings();
  const audiences: TelegramAudience[] = ['default', 'user', 'partner', 'manager', 'admin'];

  for (const audience of audiences) {
    const suffix = audience === 'default' ? '' : audience[0].toUpperCase() + audience.slice(1);
    const token =
      envSettings[`telegramBotToken${suffix}`] ||
      process.env[`TELEGRAM_BOT_TOKEN_${audience.toUpperCase()}`] ||
      envSettings.telegramBotToken ||
      process.env.TELEGRAM_BOT_TOKEN;
    const enabledKey = `telegramBotEnabled${suffix}`;
    const enabled = envSettings[enabledKey] == null ? envSettings.telegramBotEnabled !== false : envSettings[enabledKey] !== false;

    if (token && enabled) {
      await registerBotCommands(token, audience);
    }
  }
}
