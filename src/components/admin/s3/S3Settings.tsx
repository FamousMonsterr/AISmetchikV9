// src/components/admin/s3/S3Settings.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Settings2, Trash2, Eye, EyeOff, Shield, Sparkles } from "lucide-react";
import { getBucketCors, putBucketCors, deleteBucketCors } from '@/actions/adminActions';
import type { EnvSettings } from '@/actions/adminActions';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nanoid } from 'nanoid';

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

const providerDefaults: Record<string, Partial<EnvSettings>> = {
  cloudru: { s3Endpoint: 'https://s3.cloud.ru', s3Region: 'ru-central-1' },
  beget: { s3Endpoint: 'https://storage.beget.com', s3Region: 'ru-msk' },
  yandex: { s3Endpoint: 'https://storage.yandexcloud.net', s3Region: 'ru-central1' },
};

export function S3Settings({ settings, setSettings, isPending }: { settings: EnvSettings | null, setSettings: (settings: EnvSettings) => void, isPending: boolean }) {
  const { toast } = useToast();
  const [corsConfig, setCorsConfig] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [allowedOrigin, setAllowedOrigin] = useState('');
  const [s3Preset, setS3Preset] = useState<'custom' | 'cloudru' | 'beget' | 'yandex'>('custom');
  const [newPresetName, setNewPresetName] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAllowedOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    // Try to infer provider from active preset
    if (settings?.s3Presets && settings.s3ActivePresetId) {
        const found = settings.s3Presets.find(p => p.id === settings.s3ActivePresetId);
        if (found?.provider && (['cloudru','beget','yandex','custom'] as const).includes(found.provider as any)) {
            setS3Preset(found.provider as any);
        }
    }
  }, [settings?.s3ActivePresetId, settings?.s3Presets]);

  const presets = settings?.s3Presets || [];

  const applyDefaults = (provider: typeof s3Preset) => {
    if (!settings) return;
    const defaults = providerDefaults[provider] || {};
    setSettings({
      ...settings,
      ...defaults,
    });
  };

  const inferProviderFromEndpoint = (endpoint?: string): typeof s3Preset => {
    if (!endpoint) return 'custom';
    if (endpoint.includes('cloud.ru')) return 'cloudru';
    if (endpoint.includes('beget')) return 'beget';
    if (endpoint.includes('yandexcloud')) return 'yandex';
    return 'custom';
  };

  const buildPresetConfig = (provider: typeof s3Preset) => {
    if (!settings) return {};
    return {
      s3AccessKeyId: settings.s3AccessKeyId,
      s3SecretAccessKey: settings.s3SecretAccessKey,
      s3Endpoint: settings.s3Endpoint,
      s3Region: settings.s3Region,
      s3BucketName: settings.s3BucketName,
      s3TenantId: provider === 'cloudru' ? settings.s3TenantId : undefined,
      s3BucketIsPublic: settings.s3BucketIsPublic,
      s3PresignedUrlExpiration: settings.s3PresignedUrlExpiration,
    };
  };

  const handleApplyPreset = (id: string) => {
    if (!settings) return;
    const preset = presets.find((p) => p.id === id);
    if (!preset) return;
    const inferredProvider = preset.provider
      ? (['cloudru','beget','yandex','custom'] as const).includes(preset.provider as any)
        ? (preset.provider as typeof s3Preset)
        : inferProviderFromEndpoint(preset.config.s3Endpoint)
      : inferProviderFromEndpoint(preset.config.s3Endpoint);
    const nextProvider = inferredProvider || 'custom';
    setSettings({
      ...settings,
      s3ActivePresetId: id,
      s3AccessKeyId: preset.config.s3AccessKeyId || '',
      s3SecretAccessKey: preset.config.s3SecretAccessKey || '',
      s3Endpoint: preset.config.s3Endpoint || '',
      s3Region: preset.config.s3Region || '',
      s3BucketName: preset.config.s3BucketName || '',
      s3TenantId: nextProvider === 'cloudru' ? (preset.config.s3TenantId || '') : '',
      s3BucketIsPublic: preset.config.s3BucketIsPublic ?? settings.s3BucketIsPublic,
      s3PresignedUrlExpiration: preset.config.s3PresignedUrlExpiration ?? settings.s3PresignedUrlExpiration,
      s3Presets: preset.provider ? settings.s3Presets : settings.s3Presets?.map((item) => (
        item.id === preset.id ? { ...item, provider: nextProvider } : item
      )),
    });
    setS3Preset(nextProvider);
    toast({ title: "Шаблон применен", description: `Загружены параметры ${preset.name}` });
  };

  const handleSavePreset = () => {
    if (!settings) return;
    const presetId = `s3-${nanoid(6)}`;
    const preset = {
      id: presetId,
      name: newPresetName.trim() || `Шаблон ${presets.length + 1}`,
      provider: s3Preset,
      config: buildPresetConfig(s3Preset),
    };
    setSettings({
      ...settings,
      s3Presets: [...presets, preset],
      s3ActivePresetId: presetId,
    });
    setNewPresetName('');
    toast({ title: "Шаблон сохранен и применен", description: "Параметры активированы сразу." });
  };

  const handleUpdatePreset = (presetId: string, provider: typeof s3Preset) => {
    if (!settings) return;
    setSettings({
      ...settings,
      s3Presets: presets.map((preset) => (
        preset.id === presetId
          ? {
              ...preset,
              provider,
              config: buildPresetConfig(provider),
            }
          : preset
      )),
    });
    toast({ title: "Шаблон обновлен", description: "Параметры сохранены для выбранного шаблона." });
  };

  const handleRemovePreset = (id: string) => {
    if (!settings) return;
    const filtered = presets.filter((p) => p.id !== id);
    const newActive = settings.s3ActivePresetId === id ? filtered[0]?.id : settings.s3ActivePresetId;
    const newSecondary = settings.s3SecondaryPresetId === id ? undefined : settings.s3SecondaryPresetId;
    setSettings({
      ...settings,
      s3Presets: filtered,
      s3ActivePresetId: newActive,
      s3SecondaryPresetId: newSecondary,
      s3SecondaryEnabled: newSecondary ? settings.s3SecondaryEnabled : false,
    });
  };

  const handleCorsAction = async (action: 'get' | 'put' | 'delete') => {
      setIsActionLoading(true);
      try {
          let result;
          if (action === 'get') {
              result = await getBucketCors();
              if (result.success) {
                  setCorsConfig(result.config || '');
              }
          } else if (action === 'put') {
              result = await putBucketCors({ corsXml: corsConfig });
          } else { // delete
              result = await deleteBucketCors();
              if(result.success) setCorsConfig('');
          }

          if (result.success) {
              toast({ title: "Успех!", description: result.message });
          } else {
              toast({ title: "Ошибка CORS", description: result.message || "Неизвестная ошибка.", variant: "destructive" });
          }
      } catch (error: any) {
          toast({ title: "Критическая ошибка", description: error?.message || "Неизвестная ошибка.", variant: "destructive" });
      } finally {
          setIsActionLoading(false);
      }
  };

  const buildCorsXml = (origin: string, allowAllOrigins: boolean) => {
    const safeOrigin = origin.trim() || '*';
    if (allowAllOrigins) {
      return `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <ExposeHeader>x-amz-request-id</ExposeHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`;
    }

    return `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>${safeOrigin}</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>DELETE</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <ExposeHeader>x-amz-request-id</ExposeHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>HEAD</AllowedMethod>
    </CORSRule>
</CORSConfiguration>`;
  };

  const generateCorsRule = () => {
    setCorsConfig(buildCorsXml(allowedOrigin, false));
  };

  const generateCorsRuleForAll = () => {
    setCorsConfig(buildCorsXml('*', true));
  };
  
  if (!settings) {
    return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-6">
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-base">Настройки подключения</CardTitle>
                    <Switch checked={settings.s3StorageEnabled} onCheckedChange={(checked) => setSettings({...settings, s3StorageEnabled: checked})} disabled={isPending} />
                </div>
                 <CardDescription>Включите, чтобы использовать S3 (например, Cloud.ru) для загрузки и хранения файлов.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-4">
                <Alert><Info className="h-4 w-4" /><AlertTitle>Внимание</AlertTitle><AlertDescription>Рекомендуется использовать приватный бакет и персональные ключи доступа, а не сервисные. Убедитесь, что CORS-политика настроена для вашего домена, чтобы разрешить загрузку из браузера.</AlertDescription></Alert>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label>Активный шаблон</Label>
                        <Select value={settings.s3ActivePresetId || ''} onValueChange={handleApplyPreset} disabled={isPending || presets.length === 0}>
                            <SelectTrigger><SelectValue placeholder="Выберите шаблон" /></SelectTrigger>
                            <SelectContent>
                                {presets.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Резервное S3 (использовать при таймауте)</Label>
                        <div className="flex items-center gap-2">
                            <Switch checked={settings.s3SecondaryEnabled || false} onCheckedChange={(checked) => setSettings({ ...settings, s3SecondaryEnabled: checked })} />
                            <Select
                                value={settings.s3SecondaryPresetId || ''}
                                onValueChange={(val) => setSettings({ ...settings, s3SecondaryPresetId: val })}
                                disabled={!settings.s3SecondaryEnabled || presets.length === 0}
                            >
                                <SelectTrigger className="w-full"><SelectValue placeholder="Выберите запасной шаблон" /></SelectTrigger>
                                <SelectContent>
                                    {presets.filter((p) => p.id !== settings.s3ActivePresetId).map((p) => (
                                        <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <Label>Провайдер (шаблон)</Label>
                    <Select value={s3Preset} onValueChange={(value) => { const v = value as typeof s3Preset; setS3Preset(v); applyDefaults(v);} } disabled={isPending || !settings.s3StorageEnabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Выберите провайдера" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="custom">Произвольный (вручную)</SelectItem>
                            <SelectItem value="cloudru">Cloud.ru</SelectItem>
                            <SelectItem value="beget">Beget</SelectItem>
                            <SelectItem value="yandex">Yandex Cloud</SelectItem>
                        </SelectContent>
                    </Select>
                    {s3Preset === 'beget' && (
                      <p className="text-xs text-muted-foreground">
                        Beget: endpoint по умолчанию https://storage.beget.com, регион ru-msk. Tenant ID не нужен.
                      </p>
                    )}
                    {s3Preset === 'cloudru' && (
                      <p className="text-xs text-muted-foreground">
                        Подсказка: для Cloud.ru обычно используется endpoint https://s3.cloud.ru и регион ru-central-1.
                      </p>
                    )}
                    {s3Preset === 'yandex' && (
                      <p className="text-xs text-muted-foreground">
                        Yandex Cloud: endpoint https://storage.yandexcloud.net, регион ru-central1. Tenant ID не нужен.
                      </p>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {s3Preset === 'cloudru' && (
                      <div className="space-y-2">
                        <Label>ID тенанта (только для Cloud.ru)</Label>
                        <Input value={settings.s3TenantId || ''} onChange={(e) => setSettings({...settings, s3TenantId: e.target.value})} placeholder="2e868997-..." disabled={isPending || !settings.s3StorageEnabled} />
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label>Endpoint</Label>
                      <Input value={settings.s3Endpoint || ''} onChange={(e) => setSettings({...settings, s3Endpoint: e.target.value})} placeholder={providerDefaults[s3Preset]?.s3Endpoint || "https://s3.example.com"} disabled={isPending || !settings.s3StorageEnabled} />
                    </div>
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Access Key ID (логин)</Label><Input id="s3-key-id" value={settings.s3AccessKeyId || ''} onChange={(e) => setSettings({...settings, s3AccessKeyId: e.target.value})} placeholder="Ваш S3 Access Key ID" disabled={isPending || !settings.s3StorageEnabled} /></div><div className="space-y-2"><Label>Secret Access Key (пароль)</Label><PasswordInput id="s3-secret" value={settings.s3SecretAccessKey || ''} onChange={(e) => setSettings({...settings, s3SecretAccessKey: e.target.value})} placeholder="Ваш S3 Secret Access Key" disabled={isPending || !settings.s3StorageEnabled} /></div></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2"><Label>Регион</Label><Input value={settings.s3Region || providerDefaults[s3Preset]?.s3Region || ''} onChange={(e) => setSettings({...settings, s3Region: e.target.value})} placeholder={providerDefaults[s3Preset]?.s3Region || "ru-central-1"} disabled={isPending || !settings.s3StorageEnabled} /></div>
                    <div className="space-y-2"><Label>Название бакета</Label><Input value={settings.s3BucketName || ''} onChange={(e) => setSettings({ ...settings, s3BucketName: e.target.value })} placeholder="my-awesome-bucket" disabled={isPending || !settings.s3StorageEnabled}/></div>
                 </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label>Персональный бакет (аватары и файлы пользователя)</Label>
                      <Input value={settings.s3PersonalBucketName || ''} onChange={(e) => setSettings({ ...settings, s3PersonalBucketName: e.target.value })} placeholder="my-personal-bucket" disabled={isPending || !settings.s3StorageEnabled}/>
                   </div>
                   <div className="flex items-center space-x-2 pt-6">
                      <Switch id="personal-public-bucket-toggle" checked={settings.s3PersonalBucketIsPublic} onCheckedChange={(checked) => setSettings({...settings, s3PersonalBucketIsPublic: checked})} disabled={isPending}/>
                      <Label htmlFor="personal-public-bucket-toggle">Публичный персональный бакет</Label>
                   </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                   <div className="space-y-2">
                       <Label>Время жизни presigned URL (сек)</Label>
                       <Input type="number" value={settings.s3PresignedUrlExpiration || 900} onChange={(e) => setSettings({...settings, s3PresignedUrlExpiration: Number(e.target.value)})} placeholder="900" disabled={isPending || !settings.s3StorageEnabled}/>
                   </div>
                   <div className="flex items-center space-x-2 pt-6">
                       <Switch id="public-bucket-toggle" checked={settings.s3BucketIsPublic} onCheckedChange={(checked) => setSettings({...settings, s3BucketIsPublic: checked})} disabled={isPending}/>
                       <Label htmlFor="public-bucket-toggle">Публичный бакет</Label>
                   </div>
                </div>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                          <Label>Сохранить как шаблон</Label>
                          <Input placeholder="Название шаблона" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} disabled={isPending} />
                      </div>
                      <div className="flex items-end justify-end">
                        <Button onClick={handleSavePreset} disabled={isPending || !settings.s3StorageEnabled}>Сохранить</Button>
                      </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Сохраненные шаблоны</Label>
                    {presets.length === 0 && <p className="text-sm text-muted-foreground">Шаблонов пока нет.</p>}
                    <div className="grid gap-2 md:grid-cols-2">
                      {presets.map((p) => {
                        const isActive = settings.s3ActivePresetId === p.id;
                        const isSecondary = settings.s3SecondaryPresetId === p.id && settings.s3SecondaryEnabled;
                        const presetProvider = (['cloudru','beget','yandex','custom'] as const).includes(p.provider as any)
                          ? (p.provider as typeof s3Preset)
                          : inferProviderFromEndpoint(p.config.s3Endpoint);
                        return (
                          <div key={p.id} className={`rounded-md border p-3 flex flex-col gap-2 ${isActive ? 'border-primary' : 'border-muted'}`}>
                            <div className="flex items-center justify-between">
                              <input
                                className="font-semibold bg-transparent border-b border-dashed border-transparent focus:border-primary focus:outline-none"
                                value={p.name}
                                onChange={(e) => {
                                  const nextName = e.target.value;
                                  setSettings({
                                    ...settings,
                                    s3Presets: presets.map((item) => item.id === p.id ? { ...item, name: nextName } : item),
                                  });
                                }}
                              />
                              <div className="flex gap-1 text-xs uppercase">
                                {isActive && <span className="text-primary">★</span>}
                                {isSecondary && <span className="text-amber-600">☆</span>}
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {p.config.s3Endpoint} · {p.config.s3BucketName || 'bucket не задан'}
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={presetProvider}
                                onValueChange={(value) => {
                                  const nextProvider = value as typeof s3Preset;
                                  setSettings({
                                    ...settings,
                                    s3Presets: presets.map((item) => (
                                      item.id === p.id
                                        ? {
                                            ...item,
                                            provider: nextProvider,
                                            config: {
                                              ...item.config,
                                              s3TenantId: nextProvider === 'cloudru' ? item.config.s3TenantId : undefined,
                                            },
                                          }
                                        : item
                                    )),
                                  });
                                }}
                              >
                                <SelectTrigger className="h-8 w-[170px] text-xs">
                                  <SelectValue placeholder="Провайдер" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="custom">Произвольный</SelectItem>
                                  <SelectItem value="cloudru">Cloud.ru</SelectItem>
                                  <SelectItem value="beget">Beget</SelectItem>
                                  <SelectItem value="yandex">Yandex Cloud</SelectItem>
                                </SelectContent>
                              </Select>
                              {presetProvider === 'cloudru' && (
                                <span className="text-xs text-muted-foreground">Tenant сохранится</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant={isActive ? "default" : "outline"} onClick={() => handleApplyPreset(p.id)} title="Сделать активным">
                                Активный
                              </Button>
                              <Button size="sm" variant={isSecondary ? "secondary" : "outline"} onClick={() => setSettings({ ...settings, s3SecondaryEnabled: true, s3SecondaryPresetId: p.id })} title="Сделать резервным">
                                Резерв
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => handleUpdatePreset(p.id, presetProvider)} title="Обновить параметры шаблона">
                                Обновить
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => handleRemovePreset(p.id)} title="Удалить">
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
            </CardContent>
        </Card>
        <Accordion type="multiple" className="w-full space-y-4">
            <AccordionItem value="cors" className="border rounded-lg">
                <AccordionTrigger className="p-4"><h4 className="font-semibold flex items-center gap-2"><Settings2/>Управление CORS</h4></AccordionTrigger>
                <AccordionContent className="p-4 pt-0 space-y-4">
                     <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handleCorsAction('get')} disabled={isActionLoading} variant="outline">Получить текущие</Button>
                        <Button onClick={() => handleCorsAction('put')} disabled={isActionLoading || !corsConfig}>Установить/Обновить</Button>
                        <Button onClick={() => handleCorsAction('delete')} disabled={isActionLoading} variant="destructive">Удалить</Button>
                    </div>
                    <Textarea
                        value={corsConfig}
                        onChange={(e) => setCorsConfig(e.target.value)}
                        placeholder="XML конфигурация CORS..."
                        className="font-mono h-48"
                    />
                    <div className="flex flex-wrap items-end gap-2">
                        <div className="flex-grow min-w-[220px]">
                            <Label htmlFor="allowed-origin">Разрешенный домен (Origin)</Label>
                            <Input id="allowed-origin" value={allowedOrigin} onChange={e => setAllowedOrigin(e.target.value)} placeholder="https://example.com" />
                        </div>
                        <Button onClick={generateCorsRule}>Сгенерировать для домена</Button>
                        <Button variant="outline" onClick={generateCorsRuleForAll}>Сгенерировать для всех</Button>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}
