"use client";

import { useMemo, useState, useTransition } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Link2, MessageCircle, RefreshCw, ShieldCheck, Unlink2, Send, Copy, Check } from 'lucide-react';
import type { AppUser } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { TelegramAuthWidget } from '@/components/auth/TelegramAuthWidget';
import { deriveTelegramBotUsername } from '@/lib/telegram-web';
import { linkTelegramAccount, syncTelegramChatId, unlinkTelegramAccount, generateTelegramLinkCode } from '@/actions/telegramActions';
import { unlinkVkAccount } from '@/actions/vkActions';

type LinkedAuthAccountsProps = {
  user: AppUser;
  telegramUser?: {
    username?: string;
  } | null;
  botUrl?: string;
  botUsername?: string;
  onUserPatch: (patch: Partial<AppUser>) => void;
};

export function LinkedAuthAccounts({
  user,
  telegramUser,
  botUrl,
  botUsername,
  onUserPatch,
}: LinkedAuthAccountsProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const resolvedBotUsername = useMemo(
    () => deriveTelegramBotUsername(botUsername || botUrl || ''),
    [botUrl, botUsername],
  );
  const resolvedBotUrl = useMemo(() => {
    if (botUrl?.trim()) {
      return botUrl.trim();
    }
    return resolvedBotUsername ? `https://t.me/${resolvedBotUsername}` : '';
  }, [botUrl, resolvedBotUsername]);
  const resolvedBotStartUrl = useMemo(() => {
    if (!resolvedBotUsername) {
      return resolvedBotUrl;
    }
    const payload = encodeURIComponent(`uid_${user.uid}`);
    return `https://t.me/${resolvedBotUsername}?start=${payload}`;
  }, [resolvedBotUrl, resolvedBotUsername, user.uid]);
  const telegramInitData = typeof window !== 'undefined' ? (window as any)?.Telegram?.WebApp?.initData || '' : '';

  const handleGenerateLinkCode = () => {
    startTransition(async () => {
      const result = await generateTelegramLinkCode();
      if (result.success && result.code) {
        setLinkCode(result.code);
        setCodeCopied(false);
        toast({ title: 'Код сгенерирован', description: 'Введите этот код в боте @MontageHubBot' });
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const copyCode = () => {
    if (linkCode) {
      navigator.clipboard.writeText(linkCode);
      setCodeCopied(true);
      toast({ title: 'Скопировано', description: 'Код скопирован в буфер обмена' });
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const openTelegramBot = () => {
    if (!resolvedBotUrl) {
      toast({ title: 'Telegram', description: 'Публичная ссылка на бота не настроена.', variant: 'destructive' });
      return;
    }
    window.open(resolvedBotUrl, '_blank', 'noopener,noreferrer');
  };

  const handleTelegramWidgetAuth = async (payload: Record<string, unknown>) => {
    setStatusMessage(null);
    startTransition(async () => {
      const result = await linkTelegramAccount(payload as any);
      if (result.success) {
        const rawTelegramId = (result.telegramUser as any)?.id;
        const parsedTelegramId =
          rawTelegramId == null || rawTelegramId === ''
            ? NaN
            : Number(rawTelegramId);
        onUserPatch({
          telegramChatId: Number.isFinite(parsedTelegramId) ? parsedTelegramId : (user.telegramChatId ?? null),
          telegramUsername: (result.telegramUser as any)?.username || user.telegramUsername || '',
          telegramLinkedAt: new Date(),
        });
        setStatusMessage(result.message);
        toast({ title: 'Telegram', description: result.message });
      } else {
        toast({ title: 'Telegram', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleMiniAppLink = () => {
    if (!telegramInitData) {
      return;
    }
    void handleTelegramWidgetAuth({ initData: telegramInitData });
  };

  const handleTelegramSync = () => {
    startTransition(async () => {
      const result = await syncTelegramChatId();
      if (result.success) {
        onUserPatch({
          telegramChatId: result.chatId ?? user.telegramChatId ?? null,
          telegramLinkedAt: new Date(),
        });
        setStatusMessage(result.message);
        toast({ title: 'Telegram', description: result.message });
      } else {
        toast({ title: 'Telegram', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleTelegramUnlink = () => {
    startTransition(async () => {
      const result = await unlinkTelegramAccount();
      if (result.success) {
        onUserPatch({
          telegramChatId: null,
          telegramUsername: '',
          telegramLinkedAt: null,
        });
        setStatusMessage(result.message);
        toast({ title: 'Telegram', description: result.message });
      } else {
        toast({ title: 'Telegram', description: result.message, variant: 'destructive' });
      }
    });
  };

  const openVkPopup = () => {
    const popup = window.open('/api/auth/vk/link/start', 'vk-link', 'width=720,height=760');
    if (!popup) {
      toast({ title: 'VK', description: 'Браузер заблокировал popup для VK OAuth.', variant: 'destructive' });
      return;
    }

    const listener = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return;
      }
      if (event.data?.type !== 'vk-link') {
        return;
      }

      window.removeEventListener('message', listener);
      popup.close();

      if (event.data?.success) {
        onUserPatch({
          vkId: event.data?.vkId || user.vkId || null,
          vkUsername: event.data?.vkUsername || user.vkUsername || '',
          vkPhotoUrl: event.data?.vkPhotoUrl || user.vkPhotoUrl || null,
          vkLinkedAt: new Date(),
        });
        setStatusMessage(event.data.message);
        toast({ title: 'VK', description: event.data.message });
      } else {
        toast({ title: 'VK', description: event.data?.message || 'Не удалось привязать VK.', variant: 'destructive' });
      }
    };

    window.addEventListener('message', listener);
  };

  const handleVkUnlink = () => {
    startTransition(async () => {
      const result = await unlinkVkAccount();
      if (result.success) {
        onUserPatch({
          vkId: null,
          vkUsername: '',
          vkPhotoUrl: null,
          vkPeerId: null,
          vkLinkedAt: null,
        });
        setStatusMessage(result.message);
        toast({ title: 'VK', description: result.message });
      } else {
        toast({ title: 'VK', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Связанные аккаунты
        </CardTitle>
        <CardDescription>
          Telegram и VK используются для входа, уведомлений и доставки файлов.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusMessage && (
          <Alert>
            <ShieldCheck className="h-4 w-4" />
            <AlertTitle>Готово</AlertTitle>
            <AlertDescription>{statusMessage}</AlertDescription>
          </Alert>
        )}

        <div className="grid gap-4 xl:grid-cols-2">
          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Telegram</p>
                <p className="text-xs text-muted-foreground">
                  {user.telegramChatId
                    ? `chat_id: ${user.telegramChatId}`
                    : 'Аккаунт ещё не связан.'}
                </p>
              </div>
              <Badge variant={user.telegramChatId ? 'default' : 'secondary'}>
                {user.telegramChatId ? 'Подключен' : 'Не подключен'}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <div>Username: @{user.telegramUsername || telegramUser?.username || '—'}</div>
              <div>Связан: {user.telegramLinkedAt ? new Date(user.telegramLinkedAt).toLocaleString() : '—'}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              {user.telegramChatId && (
                <Button type="button" variant="outline" onClick={handleTelegramUnlink} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Unlink2 className="mr-2 h-4 w-4" />}
                  Отвязать Telegram
                </Button>
              )}
              {!user.telegramChatId && (
                <div className="space-y-3 w-full">
                  {!linkCode ? (
                    <>
                      <Button type="button" className="w-full" onClick={handleGenerateLinkCode} disabled={isPending}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Привязать Telegram
                      </Button>
                      {resolvedBotUrl && (
                        <Button type="button" variant="outline" className="w-full" onClick={openTelegramBot} disabled={isPending}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Открыть бота @MontageHubBot
                        </Button>
                      )}
                    </>
                  ) : (
                    <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                      <p className="text-sm font-medium">Ваш код для привязки:</p>
                      <div className="flex items-center gap-2">
                        <code className="text-2xl font-bold tracking-[0.3em] bg-background px-4 py-2 rounded border">{linkCode}</code>
                        <Button type="button" variant="ghost" size="icon" onClick={copyCode}>
                          {codeCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                        </Button>
                      </div>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Откройте бота <a href={resolvedBotUrl || '#'} target="_blank" rel="noopener" className="underline font-medium">@MontageHubBot</a></li>
                        <li>Отправьте ему этот код: <strong>{linkCode}</strong></li>
                        <li>Бот подтвердит привязку</li>
                      </ol>
                      {resolvedBotUrl && (
                        <Button type="button" className="w-full" onClick={openTelegramBot}>
                          <MessageCircle className="mr-2 h-4 w-4" />
                          Открыть бота и ввести код
                        </Button>
                      )}
                      <Button type="button" variant="ghost" size="sm" className="w-full" onClick={() => setLinkCode(null)}>
                        Сгенерировать новый код
                      </Button>
                    </div>
                  )}
                </div>
              )}
              {!user.telegramChatId && telegramInitData && (
                <Button type="button" onClick={handleMiniAppLink} disabled={isPending}>
                  {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageCircle className="mr-2 h-4 w-4" />}
                  Подключить Telegram
                </Button>
              )}
              {!user.telegramChatId && (
                <Button type="button" variant="ghost" size="sm" onClick={handleTelegramSync} disabled={isPending}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Проверить привязку
                </Button>
              )}
            </div>

            {!telegramInitData && !user.telegramChatId && resolvedBotUsername && (
              <div className="rounded-lg border border-dashed p-3">
                <p className="mb-2 text-xs uppercase tracking-[0.24em] text-muted-foreground">Или через виджет Telegram</p>
                <TelegramAuthWidget
                  botUsername={resolvedBotUsername}
                  onAuth={handleTelegramWidgetAuth}
                  size="large"
                  requestWriteAccess
                />
              </div>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium">VK</p>
                <p className="text-xs text-muted-foreground">
                  {user.vkId ? `VK ID: ${user.vkId}` : 'Аккаунт ещё не связан.'}
                </p>
              </div>
              <Badge variant={user.vkId ? 'default' : 'secondary'}>
                {user.vkId ? 'Подключен' : 'Не подключен'}
              </Badge>
            </div>

            <div className="text-sm text-muted-foreground space-y-1">
              <div>Username: {user.vkUsername ? `@${user.vkUsername}` : '—'}</div>
              <div>Связан: {user.vkLinkedAt ? new Date(user.vkLinkedAt).toLocaleString() : '—'}</div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={openVkPopup} disabled={isPending}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Link2 className="mr-2 h-4 w-4" />}
                {user.vkId ? 'Перепривязать VK' : 'Подключить VK'}
              </Button>
              {user.vkId && (
                <Button type="button" variant="ghost" onClick={handleVkUnlink} disabled={isPending}>
                  <Unlink2 className="mr-2 h-4 w-4" />
                  Отвязать
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
