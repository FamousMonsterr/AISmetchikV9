import { beforeEach, describe, expect, it, vi } from 'vitest';

const getDocMock = vi.fn();
const docMock = vi.fn((_db, collectionName: string, id: string) => ({ collectionName, id }));

vi.mock('@/lib/db', () => ({
  db: {},
}));

vi.mock('@/lib/db-server', () => ({
  doc: docMock,
  getDoc: getDocMock,
}));

describe('telegram runtime config', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.TELEGRAM_BOT_TOKEN_USER;
    delete process.env.TELEGRAM_BOT_TOKEN;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL;
    delete process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;
  });

  it('prefers admin settings over process env for bot auth and username', async () => {
    process.env.TELEGRAM_BOT_TOKEN_USER = 'env-token';
    process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME = 'EnvBot';
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        telegramBotTokenUser: 'panel-token',
        nextPublicTelegramBotUsername: 'PanelBot',
      }),
    });

    const { getTelegramRuntimeConfig } = await import('@/lib/telegram/runtime');
    const result = await getTelegramRuntimeConfig();

    expect(result.authToken).toBe('panel-token');
    expect(result.botUsername).toBe('PanelBot');
    expect(result.miniAppAuthEnabled).toBe(true);
    expect(result.webAuthEnabled).toBe(true);
  });

  it('derives bot username from public bot url when username is absent', async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        telegramBotTokenUser: 'panel-token',
        nextPublicTelegramBotUrl: 'https://t.me/AISmetchikBot',
      }),
    });

    const { getTelegramRuntimeConfig } = await import('@/lib/telegram/runtime');
    const result = await getTelegramRuntimeConfig();

    expect(result.botUrl).toBe('https://t.me/AISmetchikBot');
    expect(result.botUsername).toBe('AISmetchikBot');
    expect(result.webAuthEnabled).toBe(true);
  });
});
