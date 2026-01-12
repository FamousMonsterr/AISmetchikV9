// src/components/tabs/ProfileTab.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { useAppContext } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Bot, User as UserIcon, Send, Save, Loader2, Mail, Briefcase, KeySquare, Sun, Moon, Monitor } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { updateUserProfile } from '@/actions/userActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { getEnvSettings } from '@/actions/adminActions';
import { useTheme } from 'next-themes';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';


export default function ProfileTab() {
  const { user, setUser, telegramUser } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [telegramUsernameState, setTelegramUsernameState] = useState(user?.telegramUsername || '');

  const [botUrl, setBotUrl] = useState('');
  const { theme, setTheme } = useTheme();

    useEffect(() => {
        const fetchBotUrl = async () => {
            const settings = await getEnvSettings();
            setBotUrl(settings.nextPublicTelegramBotUrl || process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/Estimate_GPT_Bot');
        };
        fetchBotUrl();
    }, []);

  const referralLink = user?.uid ? `${botUrl}?start=ref_${user.uid}` : '';

  useEffect(() => {
    setDisplayName(user?.displayName || '');
    setTelegramUsernameState(user?.telegramUsername || '');
  }, [user]);

  const handleCopy = (textToCopy: string, successMessage: string) => {
    navigator.clipboard.writeText(textToCopy);
    toast({
      title: "Скопировано!",
      description: successMessage,
    });
  };

  const handleProfileUpdate = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateUserProfile({
        userId: user.uid,
        displayName,
        telegramUsername: telegramUsernameState,
      });

      if (result.success) {
        toast({ title: "Успех", description: result.message });
        // Optimistically update context
        setUser({ ...user, displayName, telegramUsername: telegramUsernameState });
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  const isProfileChanged = displayName !== user?.displayName || telegramUsernameState !== user?.telegramUsername;


  return (
    <div className="space-y-6">
       {user?.managerData && (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Briefcase/>Ваш менеджер</CardTitle>
                <CardDescription>Ваш персональный помощник для решения любых вопросов.</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                    <AvatarImage src={`https://avatar.vercel.sh/${user.managerData.email}.png`} alt={user.managerData.displayName} />
                    <AvatarFallback>{user.managerData.displayName?.[0]}</AvatarFallback>
                </Avatar>
                <div>
                    <p className="font-semibold">{user.managerData.displayName}</p>
                    <p className="text-sm text-muted-foreground">{user.managerData.email}</p>
                </div>
            </CardContent>
            <CardFooter>
                 <Button asChild>
                    <a href={`mailto:${user.managerData.email}?subject=Вопрос по AI Сметчик`}>
                        <Mail className="mr-2 h-4 w-4"/>
                        Написать менеджеру
                    </a>
                </Button>
            </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle>Профиль</CardTitle>
              <CardDescription>Ваши данные и настройки аккаунта.</CardDescription>
            </div>
             <Avatar className="h-16 w-16">
                <AvatarImage src={user?.email ? `https://avatar.vercel.sh/${user.email}.png` : undefined} alt={user?.displayName || 'Avatar'} />
                <AvatarFallback>{user?.displayName?.[0]}</AvatarFallback>
            </Avatar>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
           <LabelInputContainer>
            <Label htmlFor="displayName">Никнейм</Label>
            <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Ваш никнейм" disabled={isPending}/>
          </LabelInputContainer>
          <LabelInputContainer>
            <Label htmlFor="telegramUsername">Имя пользователя Telegram</Label>
            <Input id="telegramUsername" value={telegramUsernameState} onChange={(e) => setTelegramUsernameState(e.target.value)} placeholder="@username" disabled={isPending}/>
          </LabelInputContainer>
           <LabelInputContainer>
            <Label>Email</Label>
            <Input value={user?.email || ""} readOnly disabled />
          </LabelInputContainer>
          <div className="space-y-1">
            <Label>Роль</Label>
            <div>
              <Badge variant="secondary">{user?.systemRole}</Badge>
            </div>
          </div>
           <LabelInputContainer>
            <Label>Уникальный ID пользователя</Label>
            <div className="flex items-center gap-2">
              <Input value={user?.uid || ""} readOnly disabled />
              <Button variant="outline" size="icon" onClick={() => handleCopy(user?.uid || '', 'Ваш User ID скопирован в буфер обмена.')} disabled={!user?.uid} aria-label="Скопировать ID пользователя">
                  <Copy className="h-4 w-4" />
              </Button>
            </div>
          </LabelInputContainer>
           <LabelInputContainer>
            <Label>Кредиты</Label>
            <Input value={user?.credits || 0} readOnly disabled />
          </LabelInputContainer>
        </CardContent>
         <CardFooter>
            <button
                className="group/btn relative block h-10 w-full rounded-md bg-gradient-to-br from-black to-neutral-600 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
                type="button"
                onClick={handleProfileUpdate} 
                disabled={isPending || !isProfileChanged}
            >
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline-block" /> : <Save className="mr-2 h-4 w-4 inline-block" />}
              Сохранить изменения
              <BottomGradient />
            </button>
        </CardFooter>
      </Card>
       <Card>
        <CardHeader>
          <CardTitle>Настройки темы</CardTitle>
          <CardDescription>Выберите предпочтительную цветовую схему интерфейса.</CardDescription>
        </CardHeader>
        <CardContent>
            <RadioGroup value={theme} onValueChange={setTheme} className="grid grid-cols-3 gap-4">
                <div>
                    <RadioGroupItem value="light" id="light" className="peer sr-only" />
                    <Label htmlFor="light" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Sun className="mb-3 h-6 w-6" />
                        Светлая
                    </Label>
                </div>
                <div>
                    <RadioGroupItem value="dark" id="dark" className="peer sr-only" />
                    <Label htmlFor="dark" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Moon className="mb-3 h-6 w-6" />
                        Темная
                    </Label>
                </div>
                 <div>
                    <RadioGroupItem value="system" id="system" className="peer sr-only" />
                    <Label htmlFor="system" className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary">
                        <Monitor className="mb-3 h-6 w-6" />
                        Системная
                    </Label>
                </div>
            </RadioGroup>
        </CardContent>
      </Card>
      
       <Card>
        <CardHeader>
          <CardTitle>Интеграция с Telegram</CardTitle>
          <CardDescription>Привяжите ваш аккаунт Telegram для получения уведомлений и файлов прямо в мессенджер.</CardDescription>
        </CardHeader>
        <CardContent>
            {user?.telegramChatId ? (
                <Alert variant="default" className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                    <CheckCircle className="h-4 w-4 text-green-600"/>
                    <AlertTitle className="text-green-800 dark:text-green-300">Аккаунт успешно привязан</AlertTitle>
                    <AlertDescription className="text-green-700 dark:text-green-400">
                        Ваш аккаунт связан с Telegram: <strong>@{user.telegramUsername || telegramUser?.username || 'user'}</strong>. Теперь вы можете получать файлы прямо в чат с ботом.
                    </AlertDescription>
                </Alert>
            ) : (
                <Alert variant="destructive">
                    <Bot className="h-4 w-4"/>
                    <AlertTitle>Аккаунт не привязан</AlertTitle>
                    <AlertDescription>
                        Чтобы получать файлы в Telegram, откройте это приложение через нашего бота. Синхронизация произойдет автоматически.
                    </AlertDescription>
                     <div className="mt-4">
                        <Button asChild>
                            <a href={botUrl} target="_blank" rel="noopener noreferrer">
                                <Bot className="mr-2 h-4 w-4"/>
                                Перейти к боту
                            </a>
                        </Button>
                    </div>
                </Alert>
            )}
        </CardContent>
      </Card>
      
    </div>
  );
}
