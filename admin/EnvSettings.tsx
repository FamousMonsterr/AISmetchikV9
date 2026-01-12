// src/components/admin/EnvSettings.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, KeyRound, Bot, Database, Power, Link, Eye, EyeOff, SlidersHorizontal } from "lucide-react";
import { getEnvSettings, updateEnvSettings, type EnvSettings } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { isEqual } from 'lodash';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
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
  
  const hasUnsavedChanges = !isEqual(initialSettings, settings);


  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const currentSettings = await getEnvSettings();
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
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Bot /> Telegram</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="telegramBotToken">Токен Telegram бота</Label><PasswordInput id="telegramBotToken" value={settings.telegramBotToken || ''} onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div><div className="space-y-2"><Label htmlFor="telegramBotUrl">Публичный URL бота (для ссылок)</Label><Input id="telegramBotUrl" type="url" value={settings.nextPublicTelegramBotUrl || ''} onChange={(e) => setSettings({ ...settings, nextPublicTelegramBotUrl: e.target.value })} placeholder="https://t.me/YourBot" disabled={isPending} /></div></CardContent></Card>
        <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Database /> DaData API</CardTitle></CardHeader><CardContent className="space-y-4"><div className="space-y-2"><Label htmlFor="dadataApiKey">Ключ API DaData</Label><PasswordInput id="dadataApiKey" value={settings.dadataApiKey || ''} onChange={(e) => setSettings({ ...settings, dadataApiKey: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div><div className="space-y-2"><Label htmlFor="dadataApiSecret">Секретный ключ DaData</Label><PasswordInput id="dadataApiSecret" value={settings.dadataApiSecret || ''} onChange={(e) => setSettings({ ...settings, dadataApiSecret: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div></CardContent></Card>
        <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Power /> Ключи AI</CardTitle></CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="openRouterApiKey">Ключ API OpenRouter</Label><PasswordInput id="openRouterApiKey" value={settings.openRouterApiKey || ''} onChange={(e) => setSettings({ ...settings, openRouterApiKey: e.target.value })} placeholder="••••••••••" disabled={isPending} /></div>
            </CardContent>
        </Card>
      </CardContent>
       <CardFooter>
         <Button onClick={handleSave} disabled={isPending || !hasUnsavedChanges}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить переменные
        </Button>
       </CardFooter>
    </Card>
  );
}
