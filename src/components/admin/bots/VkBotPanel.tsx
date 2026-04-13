"use client";

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Loader2, RefreshCw, Send, ShieldCheck, Unplug, Webhook } from 'lucide-react';
import {
  deleteVkWebhookService,
  getVkBotStatus,
  registerVkWebhookService,
  sendVkTestMessageService,
  testVkApiConnection,
} from '@/actions/adminActions';

export function VkBotPanel() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [testRecipientId, setTestRecipientId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getVkBotStatus(user.uid);
      if (!result.success) {
        throw new Error(result.message);
      }
      setStatus(result.status);
    } catch (error: any) {
      toast({ title: 'VK', description: error?.message || 'Не удалось получить VK статус.', variant: 'destructive' });
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
        title: 'VK',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      await refresh();
    });
  };

  if (!user) {
    return null;
  }

  const config = status?.config || {};
  const runtime = status?.runtime || {};
  const callbackServers = status?.servers?.items || [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>VK bot runtime</CardTitle>
          <CardDescription>Callback API, secret/confirmation и runtime-следы webhook.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={config.enabled ? 'default' : 'secondary'}>
              {config.enabled ? 'enabled' : 'disabled'}
            </Badge>
            {config.groupId ? <Badge variant="outline">group {config.groupId}</Badge> : null}
            {config.webhookUrl ? <Badge variant="outline">webhook set</Badge> : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Access token</div>
              <div className="mt-1 font-medium">{config.accessToken ? 'set' : 'missing'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Callback secret</div>
              <div className="mt-1 font-medium">{config.callbackSecret ? 'set' : 'missing'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Confirmation</div>
              <div className="mt-1 font-medium">{config.confirmationToken ? 'set' : 'missing'}</div>
            </div>
            <div className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">Last webhook</div>
              <div className="mt-1 text-sm">{runtime?.lastWebhookType || '—'}</div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => runAction(() => testVkApiConnection(user.uid))} disabled={isPending}>
              <ShieldCheck className="mr-2 h-4 w-4" />
              Ping API
            </Button>
            <Button variant="outline" onClick={() => runAction(() => registerVkWebhookService(user.uid))} disabled={isPending}>
              <Webhook className="mr-2 h-4 w-4" />
              Register callback
            </Button>
            <Button variant="outline" onClick={() => runAction(() => deleteVkWebhookService(user.uid, callbackServers[0]?.id))} disabled={isPending}>
              <Unplug className="mr-2 h-4 w-4" />
              Delete callback
            </Button>
            <Button variant="ghost" onClick={() => void refresh()} disabled={isPending || isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Callback servers</div>
            {callbackServers.length ? (
              <div className="space-y-2 text-sm">
                {callbackServers.map((server: any) => (
                  <div key={server.id} className="rounded-lg border px-3 py-2">
                    <div>ID: {server.id}</div>
                    <div className="break-all text-muted-foreground">{server.url}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">Серверы callback пока не зарегистрированы.</div>
            )}
          </div>

          <div className="rounded-xl border p-4 space-y-3">
            <div className="text-sm font-medium">Тестовое сообщение</div>
            <Input
              value={testRecipientId}
              onChange={(event) => setTestRecipientId(event.target.value)}
              placeholder="UID получателя или пусто для текущего admin"
            />
            <Button onClick={() => runAction(() => sendVkTestMessageService(user.uid, testRecipientId || undefined))} disabled={isPending}>
              <Send className="mr-2 h-4 w-4" />
              Отправить test message
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
