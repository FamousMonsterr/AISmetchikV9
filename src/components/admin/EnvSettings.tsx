// src/components/admin/EnvSettings.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, Bot, Database, Eye, EyeOff, SlidersHorizontal, Mail, Power } from "lucide-react";
import {
  getEnvSettings,
  updateEnvSettings,
  type EnvSettings,
  testConnectivity,
  type ConnectivityStatus,
  syncOzonBank,
  getOzonBankSyncStatus,
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
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><KeyRound /> Auth providers</CardTitle>
            <CardDescription>Telegram, VK и passkey. После изменения OAuth/passkey env нужен restart процесса.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="telegramAuthEmailDomain">TELEGRAM_AUTH_EMAIL_DOMAIN</Label>
                <Input
                  id="telegramAuthEmailDomain"
                  value={settings.telegramAuthEmailDomain || ''}
                  onChange={(e) => setSettings({ ...settings, telegramAuthEmailDomain: e.target.value })}
                  placeholder="telegram.local"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Используется для synthetic email при Telegram sign-in.
                </p>
              </div>
              <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
                <div>Telegram login: `TELEGRAM_BOT_TOKEN_USER`, затем fallback на `TELEGRAM_BOT_TOKEN`.</div>
                <div>VK login использует `VK_ID_CLIENT_ID`, `VK_ID_CLIENT_SECRET`, `VK_ID_REDIRECT_URI`.</div>
                <div>Operational runtime для Telegram/VK вынесен в Admin {'>'} Bots.</div>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="passkeyOrigin">PASSKEY_ORIGIN</Label>
                <Input
                  id="passkeyOrigin"
                  type="url"
                  value={settings.passkeyOrigin || ''}
                  onChange={(e) => setSettings({ ...settings, passkeyOrigin: e.target.value })}
                  placeholder="https://lk.aismetchik.ru"
                  disabled={isPending}
                />
                <p className="text-xs text-muted-foreground">
                  Указывайте origin той страницы, где реально открывается passkey-логин.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passkeyRpId">PASSKEY_RP_ID</Label>
                <Input
                  id="passkeyRpId"
                  value={settings.passkeyRpId || ''}
                  onChange={(e) => setSettings({ ...settings, passkeyRpId: e.target.value })}
                  placeholder="aismetchik.ru"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passkeyRpName">PASSKEY_RP_NAME</Label>
                <Input
                  id="passkeyRpName"
                  value={settings.passkeyRpName || ''}
                  onChange={(e) => setSettings({ ...settings, passkeyRpName: e.target.value })}
                  placeholder="AI Smetchik"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label>PASSKEY_USER_VERIFICATION</Label>
                <Select
                  value={settings.passkeyUserVerification || 'preferred'}
                  onValueChange={(value) => setSettings({ ...settings, passkeyUserVerification: value as EnvSettings['passkeyUserVerification'] })}
                  disabled={isPending}
                >
                  <SelectTrigger><SelectValue placeholder="Выберите режим" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="required">required</SelectItem>
                    <SelectItem value="preferred">preferred</SelectItem>
                    <SelectItem value="discouraged">discouraged</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>PASSKEY_ATTESTATION</Label>
                <Select
                  value={settings.passkeyAttestation || 'none'}
                  onValueChange={(value) => setSettings({ ...settings, passkeyAttestation: value as EnvSettings['passkeyAttestation'] })}
                  disabled={isPending}
                >
                  <SelectTrigger><SelectValue placeholder="Выберите attestation" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">none</SelectItem>
                    <SelectItem value="direct">direct</SelectItem>
                    <SelectItem value="indirect">indirect</SelectItem>
                    <SelectItem value="enterprise">enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="passkeyTimeoutMs">PASSKEY_TIMEOUT_MS</Label>
                <Input
                  id="passkeyTimeoutMs"
                  type="number"
                  value={settings.passkeyTimeoutMs ?? ''}
                  onChange={(e) => setSettings({ ...settings, passkeyTimeoutMs: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="60000"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="passkeyChallengeTtlMs">PASSKEY_CHALLENGE_TTL_MS</Label>
                <Input
                  id="passkeyChallengeTtlMs"
                  type="number"
                  value={settings.passkeyChallengeTtlMs ?? ''}
                  onChange={(e) => setSettings({ ...settings, passkeyChallengeTtlMs: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="300000"
                  disabled={isPending}
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot /> Telegram</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="telegramBotUrl">Публичный URL бота (для ссылок)</Label>
                    <Input id="telegramBotUrl" type="url" value={settings.nextPublicTelegramBotUrl || ''} onChange={(e) => setSettings({ ...settings, nextPublicTelegramBotUrl: e.target.value })} placeholder="https://t.me/YourBot" disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegramBotUsername">Публичный username бота</Label>
                    <Input id="telegramBotUsername" value={settings.nextPublicTelegramBotUsername || ''} onChange={(e) => setSettings({ ...settings, nextPublicTelegramBotUsername: e.target.value })} placeholder="AI_Smetchik_Bot" disabled={isPending} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="telegramWebappUrl">Telegram WebApp URL</Label>
                    <Input id="telegramWebappUrl" type="url" value={settings.nextPublicTelegramWebappUrl || ''} onChange={(e) => setSettings({ ...settings, nextPublicTelegramWebappUrl: e.target.value })} placeholder="https://lk.aismetchik.ru" disabled={isPending} />
                    <p className="text-xs text-muted-foreground">Используется кнопкой «Открыть приложение» внутри Telegram-бота.</p>
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
            <CardTitle className="flex items-center gap-2 text-base"><Bot /> VK</CardTitle>
            <CardDescription>OAuth и Callback API для VK входа и бота. Runtime-операции вынесены в Admin &gt; Bots.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="vkIdClientId">VK_ID_CLIENT_ID</Label>
                <Input
                  id="vkIdClientId"
                  value={settings.vkIdClientId || ''}
                  onChange={(e) => setSettings({ ...settings, vkIdClientId: e.target.value })}
                  placeholder="vk client id"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkIdClientSecret">VK_ID_CLIENT_SECRET</Label>
                <PasswordInput
                  id="vkIdClientSecret"
                  value={settings.vkIdClientSecret || ''}
                  onChange={(e) => setSettings({ ...settings, vkIdClientSecret: e.target.value })}
                  placeholder="••••••••••"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkIdRedirectUri">VK_ID_REDIRECT_URI</Label>
                <Input
                  id="vkIdRedirectUri"
                  type="url"
                  value={settings.vkIdRedirectUri || ''}
                  onChange={(e) => setSettings({ ...settings, vkIdRedirectUri: e.target.value })}
                  placeholder="https://aismetchik.ru/api/auth/callback/vk"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkGroupId">VK_GROUP_ID</Label>
                <Input
                  id="vkGroupId"
                  value={settings.vkGroupId || ''}
                  onChange={(e) => setSettings({ ...settings, vkGroupId: e.target.value })}
                  placeholder="group id"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkAccessToken">VK_ACCESS_TOKEN</Label>
                <PasswordInput
                  id="vkAccessToken"
                  value={settings.vkAccessToken || ''}
                  onChange={(e) => setSettings({ ...settings, vkAccessToken: e.target.value })}
                  placeholder="••••••••••"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkCallbackSecret">VK_CALLBACK_SECRET</Label>
                <PasswordInput
                  id="vkCallbackSecret"
                  value={settings.vkCallbackSecret || ''}
                  onChange={(e) => setSettings({ ...settings, vkCallbackSecret: e.target.value })}
                  placeholder="••••••••••"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkConfirmationToken">VK_CONFIRMATION_TOKEN</Label>
                <PasswordInput
                  id="vkConfirmationToken"
                  value={settings.vkConfirmationToken || ''}
                  onChange={(e) => setSettings({ ...settings, vkConfirmationToken: e.target.value })}
                  placeholder="••••••••••"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkWebhookUrl">VK_WEBHOOK_URL</Label>
                <Input
                  id="vkWebhookUrl"
                  type="url"
                  value={settings.vkWebhookUrl || ''}
                  onChange={(e) => setSettings({ ...settings, vkWebhookUrl: e.target.value })}
                  placeholder="https://aismetchik.ru/api/vk/webhook"
                  disabled={isPending}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="vkAuthEmailDomain">VK_AUTH_EMAIL_DOMAIN</Label>
                <Input
                  id="vkAuthEmailDomain"
                  value={settings.vkAuthEmailDomain || ''}
                  onChange={(e) => setSettings({ ...settings, vkAuthEmailDomain: e.target.value })}
                  placeholder="vk.local"
                  disabled={isPending}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3 lg:col-span-2">
                <div>
                  <Label htmlFor="vkBotEnabled">VK_BOT_ENABLED</Label>
                  <p className="text-xs text-muted-foreground">Operational кнопки и runtime доступны на странице Admin {'>'} Bots.</p>
                </div>
                <Switch
                  id="vkBotEnabled"
                  checked={!!settings.vkBotEnabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, vkBotEnabled: checked })}
                  disabled={isPending}
                />
              </div>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Database /> MongoDB</CardTitle>
            <CardDescription>Основная база для бизнес-данных и отдельная база под user/activity/API logs.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mongoUri">MONGODB_URI</Label>
                <PasswordInput id="mongoUri" value={settings.mongoUri || ''} onChange={(e) => setSettings({ ...settings, mongoUri: e.target.value })} placeholder="mongodb+srv://user:pass@main-host" disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mongoDbName">MONGODB_DB</Label>
                <Input id="mongoDbName" value={settings.mongoDbName || ''} onChange={(e) => setSettings({ ...settings, mongoDbName: e.target.value })} placeholder="aismetchik" disabled={isPending} />
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mongoLogsUri">MONGODB_LOGS_URI</Label>
                <PasswordInput id="mongoLogsUri" value={settings.mongoLogsUri || ''} onChange={(e) => setSettings({ ...settings, mongoLogsUri: e.target.value })} placeholder="mongodb+srv://user:pass@logs-host" disabled={isPending} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mongoLogsDbName">MONGODB_LOGS_DB</Label>
                <Input id="mongoLogsDbName" value={settings.mongoLogsDbName || ''} onChange={(e) => setSettings({ ...settings, mongoLogsDbName: e.target.value })} placeholder="aismetchik_logs" disabled={isPending} />
              </div>
            </div>
            <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
              <div>Если `MONGODB_LOGS_*` не заданы, логовые коллекции будут использовать основную MongoDB.</div>
              <div>После изменения Mongo переменных перезапустите сервер и заново создайте индексы.</div>
            </div>
          </CardContent>
        </Card>
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
                <CardDescription>Проверяет Mongo, S3, OpenRouter, Telegram и VK.</CardDescription>
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
                            <div className="font-semibold">MongoDB logs</div>
                            <div className={status.mongoLogs.ok ? "text-green-600" : "text-destructive"}>{status.mongoLogs.message}</div>
                            <div className="text-xs text-muted-foreground">Источник: {status.mongoLogs.uriSource}</div>
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
                        <div className="rounded-md border p-3">
                            <div className="font-semibold">VK</div>
                            <div className={status.vk.ok ? "text-green-600" : "text-destructive"}>{status.vk.message}</div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    </Card>
  );
}
