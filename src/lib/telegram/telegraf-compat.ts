import { Input, Telegraf, type Context } from 'telegraf';
import https from 'https';

export type TelegramDocument = {
  file_id: string;
  file_unique_id: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
};

export type TelegramMessage = {
  message_id: number;
  chat: { id: number; type?: string };
  date?: number;
  text?: string;
  document?: TelegramDocument;
  from?: {
    id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    is_premium?: boolean;
    is_bot?: boolean;
  };
};

export type TelegramCallbackQuery = {
  id: string;
  data?: string;
  message?: TelegramMessage;
};

type PollingError = {
  message?: string;
  response?: {
    body?: {
      description?: string;
      error_code?: number;
    };
  };
};

type BotOptions = {
  polling?: boolean;
};

type TextHandler = (msg: TelegramMessage, match: RegExpExecArray | null) => void | Promise<void>;
type CallbackHandler = (query: TelegramCallbackQuery) => void | Promise<void>;
type PollingErrorHandler = (error: PollingError) => void | Promise<void>;
type DocumentHandler = (msg: TelegramMessage) => void | Promise<void>;

/**
 * Direct HTTPS call to Telegram API — bypasses Next.js fetch polyfill
 * which breaks Telegraf's long-polling.
 */
function callTelegramApi(token: string, method: string, body?: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : undefined;
    const req = https.request({
      hostname: 'api.telegram.org',
      path: `/bot${token}/${method}`,
      method: body ? 'POST' : 'GET',
      headers: body ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data!) } : {},
      timeout: 10000,
    }, (res) => {
      let chunks = '';
      res.on('data', (chunk) => { chunks += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(chunks);
          if (json.ok) resolve(json.result);
          else reject(Object.assign(new Error(json.description || 'Telegram API error'), { response: { body: json } }));
        } catch (e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

export default class TelegramBotCompat {
  private bot: Telegraf<Context>;
  private started = false;
  private pollingTimer: ReturnType<typeof setTimeout> | null = null;
  private offset = 0;
  private textHandlers: Array<{ regex: RegExp; handler: TextHandler }> = [];
  private callbackHandlers: CallbackHandler[] = [];
  private pollingErrorHandlers: PollingErrorHandler[] = [];
  private documentHandlers: DocumentHandler[] = [];

  constructor(private token: string, options: BotOptions = {}) {
    this.bot = new Telegraf<Context>(token);

    if (options.polling) {
      this.startPolling().catch((err) => this.emitPollingError(err));
    }
  }

  private async startPolling() {
    if (this.started) return;
    this.started = true;

    // Delete any existing webhook before polling (direct API call)
    try {
      await callTelegramApi(this.token, 'deleteWebhook');
    } catch { /* ignore */ }

    console.log('[telegram] Polling started (direct HTTPS)');
    this.pollLoop();
  }

  private pollLoop() {
    if (!this.started) return;

    // Direct HTTPS getUpdates — bypasses Next.js fetch polyfill
    callTelegramApi(this.token, `getUpdates?offset=${this.offset}&limit=100&timeout=5`)
      .then(async (updates: any[]) => {
        if (updates.length > 0) {
          console.log(`[telegram] Received ${updates.length} update(s)`);
        }
        for (const update of updates) {
          this.offset = update.update_id + 1;
          try {
            await this.bot.handleUpdate(update);
            if (update.message?.text) {
              console.log(`[telegram] Processed: "${update.message.text}" from ${update.message.from?.username || update.message.from?.id}`);
            }
          } catch (err: any) {
            console.error('[telegram] handleUpdate error:', err?.message || err);
            this.emitPollingError(err);
          }
        }
        // Schedule next poll
        if (this.started) {
          this.pollingTimer = setTimeout(() => this.pollLoop(), 100);
        }
      })
      .catch((err: any) => {
        const errorCode = err?.response?.body?.error_code;
        const description = err?.response?.body?.description || err?.message || 'Polling error';

        if (errorCode === 409) {
          console.error('[telegram] Polling conflict (409) — another instance is running. Stopping.');
          this.started = false;
          this.emitPollingError({ message: description, response: err?.response });
          return;
        }

        console.error('[telegram] Poll error:', description);
        this.emitPollingError({ message: description, response: err?.response });

        // Back off on error
        if (this.started) {
          this.pollingTimer = setTimeout(() => this.pollLoop(), 5000);
        }
      });
  }

  private emitPollingError(error: any) {
    const normalized: PollingError = {
      message: error?.message || String(error),
      response: error?.response,
    };
    for (const handler of this.pollingErrorHandlers) {
      try { void handler(normalized); } catch { /* ignore */ }
    }
  }

  async launch() {
    await this.startPolling();
  }

  async stopPolling() {
    if (!this.started) return;
    this.started = false;
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    console.log('[telegram] Polling stopped');
  }

  onText(regex: RegExp, handler: TextHandler) {
    this.textHandlers.push({ regex, handler });

    // Also register with Telegraf so handleUpdate routes text messages
    this.bot.on('text', async (ctx) => {
      const msg = ctx.message as unknown as TelegramMessage;
      if (!msg) return;
      const text = msg.text || '';
      for (const { regex: rx, handler: h } of this.textHandlers) {
        try {
          const match = rx.exec(text);
          if (match) await h(msg, match);
          rx.lastIndex = 0;
        } catch (err) { this.emitPollingError(err); }
      }
    });

    return this;
  }

  on(event: 'callback_query' | 'polling_error' | 'document', handler: CallbackHandler | PollingErrorHandler | DocumentHandler) {
    if (event === 'callback_query') {
      this.callbackHandlers.push(handler as CallbackHandler);

      // Register with Telegraf
      this.bot.on('callback_query', async (ctx) => {
        const query = ctx.callbackQuery as unknown as TelegramCallbackQuery;
        if (!query) return;
        for (const h of this.callbackHandlers) {
          try { await h(query); } catch (err) { this.emitPollingError(err); }
        }
      });
    } else if (event === 'document') {
      this.documentHandlers.push(handler as DocumentHandler);

      // Register with Telegraf
      this.bot.on('document', async (ctx) => {
        const msg = ctx.message as unknown as TelegramMessage;
        if (!msg) return;
        for (const h of this.documentHandlers) {
          try { await h(msg); } catch (err) { this.emitPollingError(err); }
        }
      });
    } else if (event === 'polling_error') {
      this.pollingErrorHandlers.push(handler as PollingErrorHandler);
    }
    return this;
  }

  async sendMessage(chatId: number | string, text: string, options?: Record<string, any>) {
    return callTelegramApi(this.token, 'sendMessage', { chat_id: chatId, text, ...options });
  }

  async sendDocument(
    chatId: number | string,
    file: Buffer | string,
    options?: Record<string, any>,
    fileOptions?: { filename?: string; contentType?: string }
  ) {
    // For documents, use Telegraf's native method (multipart upload)
    const document =
      Buffer.isBuffer(file)
        ? Input.fromBuffer(file, fileOptions?.filename || 'file')
        : file;
    return this.bot.telegram.sendDocument(chatId, document as any, options as any);
  }

  async answerCallbackQuery(callbackQueryId: string, options?: Record<string, any>) {
    return callTelegramApi(this.token, 'answerCallbackQuery', {
      callback_query_id: callbackQueryId,
      text: options?.text,
      show_alert: options?.show_alert,
      url: options?.url,
      cache_time: options?.cache_time,
    });
  }

  async getMe() {
    return callTelegramApi(this.token, 'getMe');
  }

  async getWebhookInfo() {
    return callTelegramApi(this.token, 'getWebhookInfo');
  }

  async setWebHook(url: string, options?: { secret_token?: string }) {
    return callTelegramApi(this.token, 'setWebhook', { url, ...options });
  }

  async deleteWebHook() {
    return callTelegramApi(this.token, 'deleteWebhook');
  }

  async setMyCommands(commands: Array<{ command: string; description: string }>) {
    return callTelegramApi(this.token, 'setMyCommands', { commands });
  }

  async getFile(fileId: string): Promise<{ file_id: string; file_unique_id: string; file_size?: number; file_path?: string }> {
    return callTelegramApi(this.token, 'getFile', { file_id: fileId });
  }

  async downloadFile(fileId: string): Promise<Buffer> {
    const fileInfo = await this.getFile(fileId);
    if (!fileInfo.file_path) {
      throw new Error('File path not available — file may exceed 20 MB Telegram limit.');
    }
    const url = `https://api.telegram.org/file/bot${this.token}/${fileInfo.file_path}`;
    return new Promise((resolve, reject) => {
      https.get(url, { timeout: 60000 }, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          // Follow redirect
          https.get(res.headers.location, { timeout: 60000 }, (res2) => {
            const chunks: Buffer[] = [];
            res2.on('data', (chunk) => chunks.push(chunk));
            res2.on('end', () => resolve(Buffer.concat(chunks)));
            res2.on('error', reject);
          }).on('error', reject);
          return;
        }
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }

  processUpdate(update: any) {
    return this.bot.handleUpdate(update);
  }
}

export type { TelegramMessage as Message };
