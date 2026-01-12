// src/components/admin/s3/S3Settings.tsx
"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Info, Settings2, Trash2, Eye, EyeOff } from "lucide-react";
import { getBucketCors, putBucketCors, deleteBucketCors } from '@/actions/adminActions';
import type { EnvSettings } from '@/actions/adminActions';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export function S3Settings({ settings, setSettings, isPending }: { settings: EnvSettings | null, setSettings: (settings: EnvSettings) => void, isPending: boolean }) {
  const { toast } = useToast();
  const [corsConfig, setCorsConfig] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [allowedOrigin, setAllowedOrigin] = useState('');
  const [s3Preset, setS3Preset] = useState<'custom' | 'cloudru' | 'beget'>('custom');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAllowedOrigin(window.location.origin);
    }
  }, []);

  const handleCorsAction = async (action: 'get' | 'put' | 'delete') => {
      setIsActionLoading(true);
      try {
          let result;
          if (action === 'get') {
              result = await getBucketCors();
              if (result.success) {
                  setCorsConfig(result.config || 'Правила CORS не установлены.');
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
              toast({ title: "Ошибка CORS", description: result.message, variant: "destructive" });
          }
      } catch (error: any) {
          toast({ title: "Критическая ошибка", description: error.message, variant: "destructive" });
      } finally {
          setIsActionLoading(false);
      }
  };

  const generateCorsRule = () => {
    const origin = allowedOrigin.trim() || '*';
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<CORSConfiguration>
    <CORSRule>
        <AllowedOrigin>${origin}</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
    <CORSRule>
        <AllowedOrigin>*</AllowedOrigin>
        <AllowedMethod>GET</AllowedMethod>
    </CORSRule>
</CORSConfiguration>`;
    setCorsConfig(xml);
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
                 <div className="space-y-2">
                    <Label>Провайдер (шаблон)</Label>
                    <Select value={s3Preset} onValueChange={(value) => setS3Preset(value as typeof s3Preset)} disabled={isPending || !settings.s3StorageEnabled}>
                        <SelectTrigger>
                            <SelectValue placeholder="Выберите провайдера" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="custom">Произвольный (вручную)</SelectItem>
                            <SelectItem value="cloudru">Cloud.ru</SelectItem>
                            <SelectItem value="beget">Beget (заглушка)</SelectItem>
                        </SelectContent>
                    </Select>
                    {s3Preset === 'beget' && (
                      <p className="text-xs text-muted-foreground">
                        Заглушка: параметры Beget S3 будут добавлены позже. Пока заполните Endpoint и регион вручную.
                      </p>
                    )}
                    {s3Preset === 'cloudru' && (
                      <p className="text-xs text-muted-foreground">
                        Подсказка: для Cloud.ru обычно используется endpoint https://s3.cloud.ru и регион ru-central-1.
                      </p>
                    )}
                 </div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>ID тенанта (для Cloud.ru)</Label><Input value={settings.s3TenantId || ''} onChange={(e) => setSettings({...settings, s3TenantId: e.target.value})} placeholder="2e868997-..." disabled={isPending || !settings.s3StorageEnabled} /></div><div className="space-y-2"><Label>Endpoint</Label><Input value={settings.s3Endpoint || ''} onChange={(e) => setSettings({...settings, s3Endpoint: e.target.value})} placeholder="https://s3.cloud.ru" disabled={isPending || !settings.s3StorageEnabled} /></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Access Key ID (логин)</Label><Input id="s3-key-id" value={settings.s3AccessKeyId || ''} onChange={(e) => setSettings({...settings, s3AccessKeyId: e.target.value})} placeholder="Ваш S3 Access Key ID" disabled={isPending || !settings.s3StorageEnabled} /></div><div className="space-y-2"><Label>Secret Access Key (пароль)</Label><PasswordInput id="s3-secret" value={settings.s3SecretAccessKey || ''} onChange={(e) => setSettings({...settings, s3SecretAccessKey: e.target.value})} placeholder="Ваш S3 Secret Access Key" disabled={isPending || !settings.s3StorageEnabled} /></div></div>
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="space-y-2"><Label>Регион</Label><Input value={settings.s3Region || 'ru-central-1'} onChange={(e) => setSettings({...settings, s3Region: e.target.value})} placeholder="ru-central-1" disabled={isPending || !settings.s3StorageEnabled} /></div><div className="space-y-2"><Label>Название бакета</Label><Input value={settings.s3BucketName || ''} onChange={(e) => setSettings({ ...settings, s3BucketName: e.target.value })} placeholder="my-awesome-bucket" disabled={isPending || !settings.s3StorageEnabled}/></div></div>
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
                    <div className="flex items-end gap-2">
                        <div className="flex-grow">
                            <Label htmlFor="allowed-origin">Разрешенный домен (Origin)</Label>
                            <Input id="allowed-origin" value={allowedOrigin} onChange={e => setAllowedOrigin(e.target.value)} placeholder="https://example.com" />
                        </div>
                        <Button onClick={generateCorsRule}>Сгенерировать</Button>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    </div>
  );
}
