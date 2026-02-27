// src/components/admin/EnvSettings.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, Bot, Database, Power, Link, Eye, EyeOff, SlidersHorizontal, Mail } from "lucide-react";
import { getEnvSettings, updateEnvSettings, type EnvSettings, testConnectivity, type ConnectivityStatus, syncOzonBank, getOzonBankSyncStatus } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { isEqual } from 'lodash';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Switch } from '@/components/ui/switch';
import aiConfig from '@/lib/ai-config.json';


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

  const handleSave = () => {
    if (!user || !settings) return;
    startTransition(async () => {
      const result = await updateEnvSettings(user.uid, settings);
      if (result.success) {
        toast({ title: "Успешно", description: result.message });
        setInitialSettings(settings);
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
                <div className="flex items-center justify-between rounded-md border p-3">
                    <div>
                        <Label htmlFor="telegramBotEnabled">Включить бота</Label>
                        <p className="text-xs text-muted-foreground">Управляет запуском в polling-режиме (или webhook при внешнем сервере).</p>
                    </div>
                    <Switch id="telegramBotEnabled" checked={!!settings.telegramBotEnabled} onCheckedChange={(checked) => setSettings({ ...settings, telegramBotEnabled: checked })} disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegramBotToken">Токен Telegram бота</Label>
                    <PasswordInput id="telegramBotToken" value={settings.telegramBotToken || ''} onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })} placeholder="••••••••••" disabled={isPending} />
                </div>
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
                    <p className="text-xs text-muted-foreground">Для webhook укажите URL и секрет, настройте тот же URL в BotFather.</p>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegramBotWebhookUrl">Webhook URL</Label>
                    <Input id="telegramBotWebhookUrl" type="url" value={settings.telegramBotWebhookUrl || ''} onChange={(e) => setSettings({ ...settings, telegramBotWebhookUrl: e.target.value })} placeholder="https://example.com/api/telegram/webhook" disabled={isPending || (settings.telegramBotMode || 'polling') !== 'webhook'} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegramBotSecretToken">Webhook secret (X-Telegram-Bot-Api-Secret-Token)</Label>
                    <PasswordInput id="telegramBotSecretToken" value={settings.telegramBotSecretToken || ''} onChange={(e) => setSettings({ ...settings, telegramBotSecretToken: e.target.value })} placeholder="••••••••••" disabled={isPending || (settings.telegramBotMode || 'polling') !== 'webhook'} />
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
