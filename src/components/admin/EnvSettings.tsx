// src/components/admin/EnvSettings.tsx
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, Bot, Database, Power, Link, Eye, EyeOff, SlidersHorizontal, Mail, RefreshCw, Send, Webhook, CheckCircle2, CircleAlert } from "lucide-react";
import {
  getEnvSettings,
  updateEnvSettings,
  type EnvSettings,
  testConnectivity,
  type ConnectivityStatus,
  syncOzonBank,
  getOzonBankSyncStatus,
  getTelegramBotStatus,
  startTelegramBotService,
  stopTelegramBotService,
  forceUnlockTelegramBotService,
  getTelegramAudienceStatus,
  registerTelegramWebhookByAudienceService,
  clearTelegramWebhookByAudienceService,
  pingTelegramBotByAudienceService,
  pingTelegramWebhookByAudienceService,
  sendTelegramTestMessageByAudienceService,
  testTelegramApiConnection,
  testTelegramWebhookInfo,
  testTelegramMongoConnection,
} from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { isEqual } from 'lodash';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Switch } from '@/components/ui/switch';
import aiConfig from '@/lib/ai-config.json';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';


const PasswordInput = ({ value, onChange, placeholder, disabled, id }: { value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, placeholder: string, disabled: boolean, id: string }) => {
    const [isVisible, setIsVisible] = useState(false);
    return (
        <div className="relative">
            <Input
                id={id}
                type={isVisible ? 'text' : 'password'}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                disabled={disabled}
            />
            <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
                onClick={() => setIsVisible(!isVisible)}
            >
                {isVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
        </div>
    );
};

type TelegramAudience = 'default' | 'user' | 'partner' | 'manager' | 'admin';

const TELEGRAM_AUDIENCE_TABS: Array<{
  key: TelegramAudience;
  label: string;
  token: keyof EnvSettings;
  secret: keyof EnvSettings;
  webhook: keyof EnvSettings;
  enabled: keyof EnvSettings;
}> = [
  { key: 'default', label: 'Default', token: 'telegramBotToken', secret: 'telegramBotSecretToken', webhook: 'telegramBotWebhookUrl', enabled: 'telegramBotEnabled' },
  { key: 'user', label: 'User', token: 'telegramBotTokenUser', secret: 'telegramBotSecretTokenUser', webhook: 'telegramBotWebhookUrlUser', enabled: 'telegramBotEnabledUser' },
  { key: 'partner', label: 'Partner', token: 'telegramBotTokenPartner', secret: 'telegramBotSecretTokenPartner', webhook: 'telegramBotWebhookUrlPartner', enabled: 'telegramBotEnabledPartner' },
  { key: 'manager', label: 'Manager', token: 'telegramBotTokenManager', secret: 'telegramBotSecretTokenManager', webhook: 'telegramBotWebhookUrlManager', enabled: 'telegramBotEnabledManager' },
  { key: 'admin', label: 'Admin', token: 'telegramBotTokenAdmin', secret: 'telegramBotSecretTokenAdmin', webhook: 'telegramBotWebhookUrlAdmin', enabled: 'telegramBotEnabledAdmin' },
] as const;


export function EnvSettings() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [initialSettings, setInitialSettings] = useState<EnvSettings>({});
  const [settings, setSettings] = useState<EnvSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isTesting, startTesting] = useTransition();
  const [status, setStatus] = useState<ConnectivityStatus | null>(null);
  const [ozonStatus, setOzonStatus] = useState<any | null>(null);
  const [isOzonSyncing, startOzonSync] = useTransition();
  const [telegramBotStatus, setTelegramBotStatus] = useState<any | null>(null);
  const [telegramAudienceStatus, setTelegramAudienceStatus] = useState<Partial<Record<TelegramAudience, any>>>({});
  const [telegramSelectedAudience, setTelegramSelectedAudience] = useState<TelegramAudience>('default');
  const [telegramTestRecipientId, setTelegramTestRecipientId] = useState('');
  const [isTelegramLoading, setIsTelegramLoading] = useState(false);
  const [isTelegramActionPending, startTelegramAction] = useTransition();
  
  const hasUnsavedChanges = !isEqual(initialSettings, settings);


  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const currentSettings = await getEnvSettings({ requesterId: user.uid, requireAdmin: true });
        setSettings(currentSettings);
        setInitialSettings(currentSettings);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить переменные окружения.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [user, toast]);

  useEffect(() => {
    if (!user) return;
    getOzonBankSyncStatus(user.uid)
      .then((result) => {
        if (result.success) setOzonStatus(result.data);
      })
      .catch(() => null);
  }, [user]);

  const refreshTelegramStatus = useCallback(async () => {
    if (!user) return;
    setIsTelegramLoading(true);
    try {
      const [botResp, audienceResponses] = await Promise.all([
        getTelegramBotStatus(user.uid),
        Promise.all(
          TELEGRAM_AUDIENCE_TABS.map(async (aud) => {
            const result = await getTelegramAudienceStatus(user.uid, aud.key);
            return [aud.key, result] as const;
          })
        ),
      ]);

      if (botResp.success) {
        setTelegramBotStatus(botResp.status);
      }

      const audienceMap = audienceResponses.reduce((acc, [audience, result]) => {
        acc[audience] = result.success ? result.status : null;
        return acc;
      }, {} as Partial<Record<TelegramAudience, any>>);
      setTelegramAudienceStatus(audienceMap);
    } catch (error: any) {
      toast({
        title: "Telegram",
        description: error?.message || "Не удалось обновить статус Telegram.",
        variant: "destructive",
      });
    } finally {
      setIsTelegramLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    void refreshTelegramStatus();
  }, [refreshTelegramStatus]);

  const handleSave = () => {
    if (!user || !settings) return;
    startTransition(async () => {
      const result = await updateEnvSettings(user.uid, settings);
      if (result.success) {
        toast({ title: "Успешно", description: result.message });
        setInitialSettings(settings);
        void refreshTelegramStatus();
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleTest = () => {
    if (!user) return;
    startTesting(async () => {
        try {
            const result = await testConnectivity({ requesterId: user.uid, requireAdmin: true });
            setStatus(result.status);
            toast({ title: "Диагностика выполнена", description: "Проверьте статусы ниже." });
        } catch (err: any) {
            toast({ title: "Ошибка диагностики", description: err?.message || "Не удалось выполнить проверку.", variant: "destructive" });
        }
    });
  };

  const handleOzonSync = () => {
    if (!user) return;
    startOzonSync(async () => {
      const result = await syncOzonBank(user.uid);
      if (result.success) {
        toast({ title: 'Синхронизация завершена', description: result.message });
      } else {
        toast({ title: 'Ошибка синхронизации', description: result.message, variant: 'destructive' });
      }
      const statusResult = await getOzonBankSyncStatus(user.uid);
      if (statusResult.success) setOzonStatus(statusResult.data);
    });
  };

  const handleTelegramAction = (
    action: 'refresh' | 'start' | 'stop' | 'unlock' | 'register' | 'clear' | 'ping-bot' | 'ping-webhook' | 'test-message' | 'test-api' | 'test-webhook' | 'test-mongo',
    audience: TelegramAudience = telegramSelectedAudience
  ) => {
    if (!user) return;
    startTelegramAction(async () => {
      try {
        let result:
          | { success: boolean; message?: string; status?: any }
          | undefined;

        switch (action) {
          case 'refresh':
            await refreshTelegramStatus();
            return;
          case 'start':
            result = await startTelegramBotService(user.uid);
            break;
          case 'stop':
            result = await stopTelegramBotService(user.uid);
            break;
          case 'unlock':
            result = await forceUnlockTelegramBotService(user.uid);
            break;
          case 'register':
            result = audience === 'default'
              ? await registerTelegramWebhookByAudienceService(user.uid, 'default')
              : await registerTelegramWebhookByAudienceService(user.uid, audience);
            break;
          case 'clear':
            result = audience === 'default'
              ? await clearTelegramWebhookByAudienceService(user.uid, 'default')
              : await clearTelegramWebhookByAudienceService(user.uid, audience);
            break;
          case 'ping-bot':
            result = await pingTelegramBotByAudienceService(user.uid, audience);
            break;
          case 'ping-webhook':
            result = await pingTelegramWebhookByAudienceService(user.uid, audience);
            break;
          case 'test-message':
            result = await sendTelegramTestMessageByAudienceService(user.uid, audience, telegramTestRecipientId || user.uid);
            break;
          case 'test-api':
            result = await testTelegramApiConnection(user.uid, audience);
            break;
          case 'test-webhook':
            result = await testTelegramWebhookInfo(user.uid, audience);
            break;
          case 'test-mongo':
            result = await testTelegramMongoConnection(user.uid);
            break;
        }

        if (result) {
          toast({
            title: result.success ? "Telegram" : "Ошибка Telegram",
            description: result.message || (result.success ? "Готово." : "Не удалось выполнить действие."),
            variant: result.success ? "default" : "destructive",
          });
        }
        await refreshTelegramStatus();
      } catch (error: any) {
        toast({
          title: "Telegram",
          description: error?.message || "Не удалось выполнить действие.",
          variant: "destructive",
        });
      }
    });
  };
  
  if (isLoading || !settings) {
    return ( <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ключи API и Переменные</CardTitle>
        <CardDescription>Управление переменными, хранящимися в базе данных. Они имеют приоритет над переменными из .env файла.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><KeyRound /> Администрирование</CardTitle></CardHeader><CardContent><div className="space-y-2"><Label htmlFor="superAdminEmail">Email Супер-администратора</Label><Input id="superAdminEmail" type="email" value={settings.superAdminEmail || ''} onChange={(e) => setSettings({ ...settings, superAdminEmail: e.target.value })} placeholder="super@admin.com" disabled={isPending} /></div></CardContent></Card>
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot /> Telegram</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="telegramBotUrl">Публичный URL бота (для ссылок)</Label>
                    <Input id="telegramBotUrl" type="url" value={settings.nextPublicTelegramBotUrl || ''} onChange={(e) => setSettings({ ...settings, nextPublicTelegramBotUrl: e.target.value })} placeholder="https://t.me/YourBot" disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label>Режим бота</Label>
                    <Select value={settings.telegramBotMode || 'polling'} onValueChange={(v) => setSettings({ ...settings, telegramBotMode: v as any })} disabled={isPending}>
                        <SelectTrigger><SelectValue placeholder="Выберите режим" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="polling">Polling (локально/без вебхука)</SelectItem>
                            <SelectItem value="webhook">Webhook (нужен публичный HTTPS)</SelectItem>
                        </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">Для webhook укажите URL и secret для каждой аудитории.</p>
                </div>

                <Tabs defaultValue="default" className="w-full">
                    <TabsList className="grid w-full grid-cols-5">
                        {TELEGRAM_AUDIENCE_TABS.map((aud) => (
                            <TabsTrigger key={aud.key} value={aud.key}>{aud.label}</TabsTrigger>
                        ))}
                    </TabsList>
                    {TELEGRAM_AUDIENCE_TABS.map((aud) => (
                        <TabsContent key={aud.key} value={aud.key} className="space-y-3">
                            <div className="flex items-center justify-between rounded-md border p-3">
                                <div>
                                    <Label htmlFor={`${aud.key}-enabled`}>Включить {aud.label.toLowerCase()} бота</Label>
                                    <p className="text-xs text-muted-foreground">Используется в webhook/polling и fallback логике.</p>
                                </div>
                                <Switch
                                    id={`${aud.key}-enabled`}
                                    checked={!!(settings as any)[aud.enabled]}
                                    onCheckedChange={(checked) => setSettings({ ...settings, [aud.enabled]: checked } as any)}
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${aud.key}-token`}>Токен Telegram бота ({aud.label})</Label>
                                <PasswordInput
                                    id={`${aud.key}-token`}
                                    value={((settings as any)[aud.token] as string) || ''}
                                    onChange={(e) => setSettings({ ...settings, [aud.token]: e.target.value } as any)}
                                    placeholder="••••••••••"
                                    disabled={isPending}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${aud.key}-webhook`}>Webhook URL ({aud.label})</Label>
                                <Input
                                    id={`${aud.key}-webhook`}
                                    type="url"
                                    value={((settings as any)[aud.webhook] as string) || ''}
                                    onChange={(e) => setSettings({ ...settings, [aud.webhook]: e.target.value } as any)}
                                    placeholder={`https://example.com/api/telegram/webhook${aud.key === 'default' ? '' : `/${aud.key}`}`}
                                    disabled={isPending || (settings.telegramBotMode || 'polling') !== 'webhook'}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor={`${aud.key}-secret`}>Webhook secret ({aud.label})</Label>
                                <PasswordInput
                                    id={`${aud.key}-secret`}
                                    value={((settings as any)[aud.secret] as string) || ''}
                                    onChange={(e) => setSettings({ ...settings, [aud.secret]: e.target.value } as any)}
                                    placeholder="••••••••••"
                                    disabled={isPending || (settings.telegramBotMode || 'polling') !== 'webhook'}
                                />
                            </div>
                        </TabsContent>
                    ))}
                </Tabs>
            </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Webhook /> Telegram orchestration</CardTitle>
            <CardDescription>Статусы по аудиториям, регистрация webhook, ping и тестовые сообщения из панели настроек.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => handleTelegramAction('refresh')} disabled={isTelegramLoading || isTelegramActionPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Обновить статусы
              </Button>
              <Button size="sm" onClick={() => handleTelegramAction('start')} disabled={isTelegramActionPending}>
                Старт polling
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleTelegramAction('stop')} disabled={isTelegramActionPending}>
                Остановить
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleTelegramAction('unlock')} disabled={isTelegramActionPending}>
                Сброс lock
              </Button>
            </div>

            <div className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Bot className="h-4 w-4" />
                  Runtime
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Статус: {telegramBotStatus?.status || 'stopped'}</div>
                  <div>Последний старт: {telegramBotStatus?.lastStartedAt ? new Date(telegramBotStatus.lastStartedAt).toLocaleString('ru-RU') : '—'}</div>
                  <div>Последняя остановка: {telegramBotStatus?.lastStoppedAt ? new Date(telegramBotStatus.lastStoppedAt).toLocaleString('ru-RU') : '—'}</div>
                  <div>Lock: {telegramBotStatus?.lock?.instanceId || '—'}</div>
                  <div>Heartbeat: {telegramBotStatus?.lock?.lastHeartbeatAt ? new Date(telegramBotStatus.lock.lastHeartbeatAt).toLocaleString('ru-RU') : '—'}</div>
                  {telegramBotStatus?.lastError ? <div className="text-destructive">Ошибка: {telegramBotStatus.lastError}</div> : null}
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <Link className="h-4 w-4" />
                  Selected audience
                </div>
                <Tabs value={telegramSelectedAudience} onValueChange={(v) => setTelegramSelectedAudience(v as TelegramAudience)}>
                  <TabsList className="grid w-full grid-cols-5">
                    {TELEGRAM_AUDIENCE_TABS.map((aud) => (
                      <TabsTrigger key={aud.key} value={aud.key}>{aud.label}</TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Аудитория: {telegramSelectedAudience}</div>
                  <div>Enabled: {telegramAudienceStatus[telegramSelectedAudience]?.enabled ? 'yes' : 'no'}</div>
                  <div>Token: {telegramAudienceStatus[telegramSelectedAudience]?.tokenSet ? 'задан' : 'не задан'}</div>
                  <div>Secret: {telegramAudienceStatus[telegramSelectedAudience]?.secretSet ? 'задан' : 'не задан'}</div>
                  <div>Webhook config: {telegramAudienceStatus[telegramSelectedAudience]?.webhookUrl || '—'}</div>
                  <div>Webhook api: {telegramAudienceStatus[telegramSelectedAudience]?.webhookInfoUrl || '—'}</div>
                  {telegramAudienceStatus[telegramSelectedAudience]?.webhookLastErrorMessage ? (
                    <div className="text-destructive">
                      Ошибка webhook: {telegramAudienceStatus[telegramSelectedAudience].webhookLastErrorMessage}
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telegram-test-recipient">UID получателя для тестового сообщения</Label>
                  <Input
                    id="telegram-test-recipient"
                    value={telegramTestRecipientId}
                    onChange={(e) => setTelegramTestRecipientId(e.target.value)}
                    placeholder={user?.uid || 'uid получателя'}
                    disabled={isTelegramActionPending}
                  />
                  <p className="text-xs text-muted-foreground">
                    Если поле пустое, тест уйдёт в ваш Telegram chat_id.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleTelegramAction('test-message')} disabled={isTelegramActionPending}>
                    <Send className="mr-2 h-4 w-4" />
                    Test message
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTelegramAction('test-api')} disabled={isTelegramActionPending}>
                    API
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTelegramAction('test-webhook')} disabled={isTelegramActionPending}>
                    Webhook info
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleTelegramAction('test-mongo')} disabled={isTelegramActionPending}>
                    Mongo
                  </Button>
                </div>
              </div>

              <div className="rounded-md border p-4 space-y-2">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  Status summary
                </div>
                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Polling / webhook mode: {settings.telegramBotMode || 'polling'}</div>
                  <div>Global bot enabled: {settings.telegramBotEnabled ? 'yes' : 'no'}</div>
                  <div>Public bot URL: {settings.nextPublicTelegramBotUrl || '—'}</div>
                  <div>Selected webhook URL: {telegramAudienceStatus[telegramSelectedAudience]?.webhookUrl || settings.telegramBotWebhookUrl || '—'}</div>
                  <div>Selected token: {telegramAudienceStatus[telegramSelectedAudience]?.tokenSet ? 'задан' : 'не задан'}</div>
                </div>
              </div>
            </div>

            <div className="grid gap-3 xl:grid-cols-5">
              {TELEGRAM_AUDIENCE_TABS.map((aud) => {
                const currentStatus = telegramAudienceStatus[aud.key];
                return (
                  <div key={aud.key} className="rounded-md border p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold">{aud.label}</div>
                      {currentStatus?.enabled ? (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          enabled
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <CircleAlert className="h-3.5 w-3.5" />
                          disabled
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      <div>Token: {currentStatus?.tokenSet ? 'задан' : 'не задан'}</div>
                      <div>Secret: {currentStatus?.secretSet ? 'задан' : 'не задан'}</div>
                      <div>Webhook config: {currentStatus?.webhookUrl || '—'}</div>
                      <div>Webhook api: {currentStatus?.webhookInfoUrl || '—'}</div>
                      <div>Pending updates: {currentStatus?.webhookPendingUpdateCount ?? '—'}</div>
                    </div>
                    {currentStatus?.webhookLastErrorMessage ? (
                      <div className="rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                        {currentStatus.webhookLastErrorMessage}
                      </div>
                    ) : null}
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleTelegramAction('register', aud.key)} disabled={isTelegramActionPending}>
                        Register
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTelegramAction('clear', aud.key)} disabled={isTelegramActionPending}>
                        Clear
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTelegramAction('ping-bot', aud.key)} disabled={isTelegramActionPending}>
                        Ping bot
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTelegramAction('ping-webhook', aud.key)} disabled={isTelegramActionPending}>
                        Ping webhook
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
              <div>Статус обновлён: {isTelegramLoading ? 'обновление...' : 'актуален'}</div>
              <div>Админ-доступ и аудит действий проверяются на сервере через текущую сессию.</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound /> QA аккаунт и тесты</CardTitle>
            <CardDescription>Единый тестовый аккаунт для e2e и smoke-контуров.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="qaTestUserEmail">QA_TEST_USER_EMAIL</Label>
              <Input
                id="qaTestUserEmail"
                type="email"
                value={settings.qaTestUserEmail || ''}
                onChange={(e) => setSettings({ ...settings, qaTestUserEmail: e.target.value })}
                placeholder="qa@example.com"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qaTestUserPassword">QA_TEST_USER_PASSWORD</Label>
              <PasswordInput
                id="qaTestUserPassword"
                value={settings.qaTestUserPassword || ''}
                onChange={(e) => setSettings({ ...settings, qaTestUserPassword: e.target.value })}
                placeholder="••••••••••"
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="qaTestUserPhone">QA_TEST_USER_PHONE</Label>
              <Input
                id="qaTestUserPhone"
                value={settings.qaTestUserPhone || ''}
                onChange={(e) => setSettings({ ...settings, qaTestUserPhone: e.target.value })}
                placeholder="+79990000000"
                disabled={isPending}
              />
            </div>
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="qaProtectUser">QA_PROTECT_USER</Label>
                <p className="text-xs text-muted-foreground">Запрещает удаление постоянного QA-аккаунта.</p>
              </div>
              <Switch
                id="qaProtectUser"
                checked={!!settings.qaProtectUser}
                onCheckedChange={(checked) => setSettings({ ...settings, qaProtectUser: checked })}
                disabled={isPending}
              />
            </div>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database /> DaData API</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="dadataApiKey">Ключ API DaData</Label><PasswordInput id="dadataApiKey" value={settings.dadataApiKey || ''} onChange={(e) => setSettings({ ...settings, dadataApiKey: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div><div className="space-y-2"><Label htmlFor="dadataApiSecret">Секретный ключ DaData</Label><PasswordInput id="dadataApiSecret" value={settings.dadataApiSecret || ''} onChange={(e) => setSettings({ ...settings, dadataApiSecret: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div></CardContent></Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database /> Ozon Bank</CardTitle>
            <CardDescription>Настройки доступа и ручная синхронизация.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ozon-base-url">Base URL API</Label>
              <Input id="ozon-base-url" value={settings.ozonBankApiBaseUrl || ''} onChange={(e) => setSettings({ ...settings, ozonBankApiBaseUrl: e.target.value })} placeholder="https://api.ozonbank.ru" disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ozon-sync-path">Путь синхронизации</Label>
              <Input id="ozon-sync-path" value={settings.ozonBankSyncPath || ''} onChange={(e) => setSettings({ ...settings, ozonBankSyncPath: e.target.value })} placeholder="/transactions" disabled={isPending} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ozon-token">Токен доступа</Label>
              <PasswordInput id="ozon-token" value={settings.ozonBankApiToken || ''} onChange={(e) => setSettings({ ...settings, ozonBankApiToken: e.target.value })} placeholder="••••••••••" disabled={isPending} />
            </div>
            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
              <div>Последняя синхронизация: {ozonStatus?.lastSyncAt?.toDate ? ozonStatus.lastSyncAt.toDate().toLocaleString('ru-RU') : '—'}</div>
              <div>Статус: {ozonStatus?.lastSyncStatus || '—'}</div>
              <div>Сообщение: {ozonStatus?.lastSyncMessage || '—'}</div>
            </div>
            <Button variant="outline" onClick={handleOzonSync} disabled={isPending || isOzonSyncing}>
              {isOzonSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Синхронизировать Ozon Bank
            </Button>
          </CardContent>
        </Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database /> MongoDB</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="mongoUri">MongoDB URI</Label><PasswordInput id="mongoUri" value={settings.mongoUri || ''} onChange={(e) => setSettings({ ...settings, mongoUri: e.target.value })} placeholder="mongodb+srv://user:pass@host" disabled={isPending} /></div><div className="space-y-2"><Label htmlFor="mongoDbName">Имя базы данных</Label><Input id="mongoDbName" value={settings.mongoDbName || ''} onChange={(e) => setSettings({ ...settings, mongoDbName: e.target.value })} placeholder="admin" disabled={isPending} /></div><p className="text-xs text-muted-foreground">Параметры из панели имеют приоритет над .env. После изменения перезапустите сервер.</p></CardContent></Card>
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Power /> Ключи AI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="openRouterApiKey">Ключ API OpenRouter</Label><PasswordInput id="openRouterApiKey" value={settings.openRouterApiKey || ''} onChange={(e) => setSettings({ ...settings, openRouterApiKey: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div>
                <div className="rounded-md border p-3 space-y-3">
                    <div className="text-sm font-medium">Local HF (заготовка на будущее)</div>
                    <p className="text-xs text-muted-foreground">Используется только при включении в общих настройках (AI провайдер = local_hf и тумблер localHfEnabled).</p>
                    <div className="space-y-2">
                        <Label htmlFor="localHfBaseUrl">Local HF Base URL</Label>
                        <Input
                            id="localHfBaseUrl"
                            type="url"
                            value={settings.localHfBaseUrl || ''}
                            onChange={(e) => setSettings({ ...settings, localHfBaseUrl: e.target.value })}
                            placeholder="http://127.0.0.1:8000/v1/chat/completions"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="localHfModelId">Local HF Model ID</Label>
                        <Input
                            id="localHfModelId"
                            value={settings.localHfModelId || ''}
                            onChange={(e) => setSettings({ ...settings, localHfModelId: e.target.value })}
                            placeholder="my-org/my-finetuned-model"
                            disabled={isPending}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="localHfApiKey">Local HF API key (опционально)</Label>
                        <PasswordInput
                            id="localHfApiKey"
                            value={settings.localHfApiKey || ''}
                            onChange={(e) => setSettings({ ...settings, localHfApiKey: e.target.value })}
                            placeholder="••••••••••"
                            disabled={isPending}
                        />
                    </div>
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Mail /> Email (SMTP)</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                        <Label htmlFor="smtpEnabled">Сброс пароля по email</Label>
                        <p className="text-xs text-muted-foreground">Включает отправку писем со ссылкой для сброса пароля.</p>
                    </div>
                    <Switch
                        id="smtpEnabled"
                        checked={!!settings.smtpEnabled}
                        onCheckedChange={(checked) => setSettings({ ...settings, smtpEnabled: checked })}
                        disabled={isPending}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="smtpHost">SMTP Host</Label>
                    <Input id="smtpHost" value={settings.smtpHost || ''} onChange={(e) => setSettings({ ...settings, smtpHost: e.target.value })} placeholder="smtp.example.com" disabled={isPending} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="smtpPort">SMTP Port</Label>
                        <Input id="smtpPort" type="number" value={settings.smtpPort ?? 587} onChange={(e) => setSettings({ ...settings, smtpPort: Number(e.target.value) })} disabled={isPending} />
                    </div>
                    <div className="flex items-center gap-3">
                        <Switch id="smtpSecure" checked={!!settings.smtpSecure} onCheckedChange={(checked) => setSettings({ ...settings, smtpSecure: checked })} disabled={isPending} />
                        <Label htmlFor="smtpSecure">SSL/TLS</Label>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="smtpUser">SMTP User</Label>
                    <Input id="smtpUser" value={settings.smtpUser || ''} onChange={(e) => setSettings({ ...settings, smtpUser: e.target.value })} placeholder="user@example.com" disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="smtpPass">SMTP Password</Label>
                    <PasswordInput id="smtpPass" value={settings.smtpPass || ''} onChange={(e) => setSettings({ ...settings, smtpPass: e.target.value })} placeholder="••••••••••" disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="smtpFrom">SMTP From</Label>
                    <Input id="smtpFrom" value={settings.smtpFrom || ''} onChange={(e) => setSettings({ ...settings, smtpFrom: e.target.value })} placeholder="AI Smetchik <noreply@example.com>" disabled={isPending} />
                </div>
            </CardContent>
        </Card>
      </CardContent>
       <CardFooter>
         <Button onClick={handleSave} disabled={isPending || !hasUnsavedChanges}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить переменные
        </Button>
       </CardFooter>
        <Card className="mt-4">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal /> Диагностика подключений</CardTitle>
                <CardDescription>Проверяет Mongo, S3, OpenRouter и Telegram.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <Button variant="outline" onClick={handleTest} disabled={isTesting}>
                    {isTesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Запустить проверку
                </Button>
                {status && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                        <div className="rounded-md border p-3">
                            <div className="font-semibold">MongoDB</div>
                            <div className={status.mongo.ok ? "text-green-600" : "text-destructive"}>{status.mongo.message}</div>
                            <div className="text-xs text-muted-foreground">Источник: {status.mongo.uriSource}</div>
                        </div>
                        <div className="rounded-md border p-3">
                            <div className="font-semibold">S3</div>
                            <div className={status.s3.ok ? "text-green-600" : "text-destructive"}>{status.s3.message}</div>
                        </div>
                        <div className="rounded-md border p-3">
                            <div className="font-semibold">OpenRouter</div>
                            <div className={status.openrouter.ok ? "text-green-600" : "text-destructive"}>{status.openrouter.message}</div>
                        </div>
                        <div className="rounded-md border p-3">
                            <div className="font-semibold">Telegram</div>
                            <div className={status.telegram.ok ? "text-green-600" : "text-destructive"}>{status.telegram.message}</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    </Card>
  );
}
