"use client";

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Play, Power, RefreshCw, Send, ShieldCheck, Unplug, Webhook } from 'lucide-react';
import {
  clearTelegramWebhookByAudienceService,
  forceUnlockTelegramBotService,
  getTelegramAudienceStatus,
  getTelegramBotStatus,
  pingTelegramBotByAudienceService,
  pingTelegramWebhookByAudienceService,
  registerTelegramWebhookByAudienceService,
  sendTelegramTestMessageByAudienceService,
  startTelegramBotService,
  stopTelegramBotService,
  testTelegramApiConnection,
  testTelegramMongoConnection,
  testTelegramWebhookInfo,
} from '@/actions/adminActions';

type TelegramAudience = 'default' | 'user' | 'partner' | 'manager' | 'admin';

const AUDIENCES: TelegramAudience[] = ['default', 'user', 'partner', 'manager', 'admin'];

export function TelegramBotPanel() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [runtimeStatus, setRuntimeStatus] = useState<any>(null);
  const [audienceStatus, setAudienceStatus] = useState<Record<string, any>>({});
  const [selectedAudience, setSelectedAudience] = useState<TelegramAudience>('default');
  const [testRecipientId, setTestRecipientId] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      return;
    }
    setIsLoading(true);
    try {
      const [runtime, audiences] = await Promise.all([
        getTelegramBotStatus(user.uid),
        Promise.all(
          AUDIENCES.map(async (audience) => {
            const result = await getTelegramAudienceStatus(user.uid, audience);
            return [audience, result.success ? result.status : null] as const;
          }),
        ),
      ]);
      if (runtime.success) {
        setRuntimeStatus(runtime.status);
      }
      setAudienceStatus(
        audiences.reduce((acc, [audience, status]) => {
          acc[audience] = status;
          return acc;
        }, {} as Record<string, any>),
      );
    } catch (error: any) {
      toast({ title: 'Telegram', description: error?.message || 'Не удалось получить Telegram статус.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const runAction = (action: () => Promise<{ success: boolean; message: string }>) => {
    startTransition(async () => {
      const result = await action();
      toast({
        title: 'Telegram',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      await refresh();
    });
  };

  if (!user) {
    return null;
  }

  const currentAudience = audienceStatus[selectedAudience];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Telegram runtime</CardTitle>
          <CardDescription>Polling/webhook lifecycle, lock и проверка аудитории.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={runtimeStatus?.status === 'running' ? 'default' : 'secondary'}>
              {runtimeStatus?.status || 'unknown'}
            </Badge>
            {runtimeStatus?.lockFresh ? <Badge variant="outline">lock active</Badge> : null}
            {runtimeStatus?.instanceId ? <Badge variant="outline">{runtimeStatus.instanceId}</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runAction(() => startTelegramBotService(user.uid))} disabled={isPending}>
              <Play className="mr-2 h-4 w-4" />
              Start polling
            </Button>
            <Button variant="outline" onClick={() => runAction(() => stopTelegramBotService(user.uid))} disabled={isPending}>
              <Power className="mr-2 h-4 w-4" />
              Stop
            </Button>
            <Button variant="outline" onClick={() => runAction(() => forceUnlockTelegramBotService(user.uid))} disabled={isPending}>
              <Unplug className="mr-2 h-4 w-4" />
              Unlock
            </Button>
            <Button variant="ghost" onClick={() => void refresh()} disabled={isPending || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          {runtimeStatus?.lastError ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              {runtimeStatus.lastError}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Telegram audiences</CardTitle>
          <CardDescription>Default/user/partner/manager/admin webhook и bot checks.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={selectedAudience} onValueChange={(value) => setSelectedAudience(value as TelegramAudience)}>
            <TabsList className="grid w-full grid-cols-5">
              {AUDIENCES.map((audience) => (
                <TabsTrigger key={audience} value={audience}>
                  {audience}
                </TabsTrigger>
              ))}
            </TabsList>
            {AUDIENCES.map((audience) => (
              <TabsContent key={audience} value={audience} className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Enabled</div>
                    <div className="mt-1 font-medium">{audienceStatus[audience]?.enabled ? 'yes' : 'no'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Token</div>
                    <div className="mt-1 font-medium">{audienceStatus[audience]?.tokenSet ? 'set' : 'missing'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Webhook</div>
                    <div className="mt-1 break-all text-sm">{audienceStatus[audience]?.webhookInfoUrl || audienceStatus[audience]?.webhookUrl || '—'}</div>
                  </div>
                  <div className="rounded-lg border p-3">
                    <div className="text-xs text-muted-foreground">Pending updates</div>
                    <div className="mt-1 font-medium">{audienceStatus[audience]?.webhookPendingUpdateCount ?? '—'}</div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => runAction(() => registerTelegramWebhookByAudienceService(user.uid, audience))} disabled={isPending}>
                    <Webhook className="mr-2 h-4 w-4" />
                    Register webhook
                  </Button>
                  <Button variant="outline" onClick={() => runAction(() => clearTelegramWebhookByAudienceService(user.uid, audience))} disabled={isPending}>
                    <Unplug className="mr-2 h-4 w-4" />
                    Clear webhook
                  </Button>
                  <Button variant="outline" onClick={() => runAction(() => pingTelegramBotByAudienceService(user.uid, audience))} disabled={isPending}>
                    <Send className="mr-2 h-4 w-4" />
                    Ping bot
                  </Button>
                  <Button variant="outline" onClick={() => runAction(() => pingTelegramWebhookByAudienceService(user.uid, audience))} disabled={isPending}>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Ping webhook
                  </Button>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button variant="ghost" onClick={() => runAction(() => testTelegramApiConnection(user.uid, audience))} disabled={isPending}>
                    Test API
                  </Button>
                  <Button variant="ghost" onClick={() => runAction(() => testTelegramWebhookInfo(user.uid, audience))} disabled={isPending}>
                    Test webhook info
                  </Button>
                  <Button variant="ghost" onClick={() => runAction(() => testTelegramMongoConnection(user.uid))} disabled={isPending}>
                    Test Mongo
                  </Button>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Тестовое сообщение</div>
            <Input
              value={testRecipientId}
              onChange={(event) => setTestRecipientId(event.target.value)}
              placeholder="UID получателя или пусто для текущего admin"
            />
            <Button onClick={() => runAction(() => sendTelegramTestMessageByAudienceService(user.uid, selectedAudience, testRecipientId || undefined))} disabled={isPending}>
              <Send className="mr-2 h-4 w-4" />
              Отправить test message
            </Button>
            {currentAudience?.webhookLastErrorMessage ? (
              <div className="text-sm text-destructive">{currentAudience.webhookLastErrorMessage}</div>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
