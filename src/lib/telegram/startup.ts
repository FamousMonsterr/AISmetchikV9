// src/lib/telegram/startup.ts
// One-shot initialization for the Telegram bot on server startup.
// Called from instrumentation.ts (Next.js register() hook).

import { doc, getDoc } from '@/lib/db-server';
import { db } from '@/lib/db';

const readEnvSettings = async () => {
  const snap = await getDoc(doc(db, 'configs', 'envSettings'));
  return snap.exists() ? (snap.data() as any) : {};
};

/**
 * Initialize the Telegram bot on server startup.
 *
 * - If mode is 'polling': starts the managed bot (long-polling).
 * - If mode is 'webhook': registers the webhook endpoint with Telegram.
 * - In both modes: registers bot commands with Telegram for all enabled audiences.
 *
 * Safe to call multiple times — idempotent via controller's distributed lock.
 */
export async function initTelegramBotOnStartup(): Promise<void> {
  try {
    const settings = await readEnvSettings();

    // Check if bot is globally disabled
    if (settings.telegramBotEnabled === false) {
      console.log('[telegram-startup] Bot disabled in settings, skipping.');
      return;
    }

    const token = settings.telegramBotToken || process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.log('[telegram-startup] No TELEGRAM_BOT_TOKEN configured, skipping.');
      return;
    }

    const mode = settings.telegramBotMode || process.env.TELEGRAM_BOT_MODE || 'polling';

    // Register commands for all enabled audiences (non-blocking, best-effort)
    try {
      const { registerAllBotCommands } = await import('@/server-functions/telegram/bot');
      await registerAllBotCommands();
    } catch (err: any) {
      console.error('[telegram-startup] Failed to register commands:', err?.message || err);
    }

    if (mode === 'webhook') {
      // Webhook mode — register the webhook endpoint with Telegram
      try {
        const { registerTelegramWebhook } = await import('@/server-functions/webhooks/telegram');
        const result = await registerTelegramWebhook({ audience: 'default' });
        console.log(`[telegram-startup] Webhook registered: ${result.webhookUrl}`);
      } catch (err: any) {
        console.error('[telegram-startup] Webhook registration failed:', err?.message || err);
      }
    } else {
      // Polling mode — start the managed bot with distributed lock
      try {
        const { startManagedBot } = await import('@/server-functions/telegram/controller');
        await startManagedBot();
        console.log('[telegram-startup] Polling bot started.');
      } catch (err: any) {
        // 409 Conflict = another instance already polling — not an error
        if (err?.message?.includes('already running')) {
          console.log('[telegram-startup] Bot already running in another instance, skipping.');
        } else {
          console.error('[telegram-startup] Failed to start polling bot:', err?.message || err);
        }
      }
    }
  } catch (err: any) {
    console.error('[telegram-startup] Initialization error:', err?.message || err);
  }
}
