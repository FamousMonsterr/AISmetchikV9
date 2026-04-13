import { Input, Telegraf, type Context } from 'telegraf';

export type TelegramMessage = {
  message_id: number;
  chat: { id: number; type?: string };
  date?: number;
  text?: string;
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

export default class TelegramBotCompat {
  private bot: Telegraf<Context>;
  private started = false;
  private textHandlers: Array<{ regex: RegExp; handler: TextHandler }> = [];
  private callbackHandlers: CallbackHandler[] = [];
  private pollingErrorHandlers: PollingErrorHandler[] = [];

  constructor(private token: string, options: BotOptions = {}) {
    this.bot = new Telegraf<Context>(token);
    this.attachCoreHandlers();

    if (options.polling) {
      this.launch().catch((err) => this.emitPollingError(err));
    }
  }

  private attachCoreHandlers() {
    this.bot.on('message', async (ctx) => {
      const msg = ctx.message as unknown as TelegramMessage;
      if (!msg) return;
      const text = msg.text || '';

      for (const { regex, handler } of this.textHandlers) {
        try {
          const match = regex.exec(text);
          if (match) {
            await handler(msg, match);
          }
          regex.lastIndex = 0;
        } catch (err) {
          this.emitPollingError(err);
        }
      }
    });

    this.bot.on('callback_query', async (ctx) => {
      const query = ctx.callbackQuery as unknown as TelegramCallbackQuery;
      if (!query) return;
      for (const handler of this.callbackHandlers) {
        try {
          await handler(query);
        } catch (err) {
          this.emitPollingError(err);
        }
      }
    });

    this.bot.catch((err) => this.emitPollingError(err));
  }

  private emitPollingError(error: any) {
    const normalized: PollingError = {
      message: error?.message || String(error),
      response: error?.response,
    };
    for (const handler of this.pollingErrorHandlers) {
      try {
        void handler(normalized);
      } catch {
        // ignore handler errors
      }
    }
  }

  async launch() {
    if (this.started) return;
    await this.bot.launch();
    this.started = true;
  }

  async stopPolling() {
    if (!this.started) return;
    await this.bot.stop('stopPolling');
    this.started = false;
  }

  onText(regex: RegExp, handler: TextHandler) {
    this.textHandlers.push({ regex, handler });
    return this;
  }

  on(event: 'callback_query' | 'polling_error', handler: CallbackHandler | PollingErrorHandler) {
    if (event === 'callback_query') {
      this.callbackHandlers.push(handler as CallbackHandler);
    } else if (event === 'polling_error') {
      this.pollingErrorHandlers.push(handler as PollingErrorHandler);
    }
    return this;
  }

  async sendMessage(chatId: number | string, text: string, options?: Record<string, any>) {
    return this.bot.telegram.sendMessage(chatId, text, options as any);
  }

  async sendDocument(
    chatId: number | string,
    file: Buffer | string,
    options?: Record<string, any>,
    fileOptions?: { filename?: string; contentType?: string }
  ) {
    const document =
      Buffer.isBuffer(file)
        ? Input.fromBuffer(file, fileOptions?.filename || 'file')
        : file;

    return this.bot.telegram.sendDocument(chatId, document as any, options as any);
  }

  async answerCallbackQuery(callbackQueryId: string, options?: Record<string, any>) {
    return this.bot.telegram.answerCbQuery(callbackQueryId, options?.text, {
      show_alert: options?.show_alert,
      url: options?.url,
      cache_time: options?.cache_time,
    });
  }

  async getMe() {
    return this.bot.telegram.getMe();
  }

  async getWebhookInfo() {
    return this.bot.telegram.getWebhookInfo();
  }

  async setWebHook(url: string, options?: { secret_token?: string }) {
    return this.bot.telegram.setWebhook(url, options);
  }

  async deleteWebHook() {
    return this.bot.telegram.deleteWebhook();
  }

  processUpdate(update: any) {
    return this.bot.handleUpdate(update);
  }
}

export type { TelegramMessage as Message };
