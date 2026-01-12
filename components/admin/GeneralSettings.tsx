// src/components/admin/GeneralSettings.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Save, AlertTriangle, Trash2 } from "lucide-react";
import { getAppSettings, updateAppSettings, wipeAllData } from '@/actions/adminActions';
import type { AppSettings } from '@/actions/adminActions';
import { useAppContext } from '@/contexts/AppContext';
import { BottomGradient, LabelInputContainer, Input } from '@/components/ui/aceternity-ui';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';

function WipeDataDialog({ onConfirm, isPending }: { onConfirm: () => void, isPending: boolean }) {
    const [confirmationText, setConfirmationText] = useState("");
    const CONFIRM_PHRASE = "удалить все данные";

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="destructive">
                    <Trash2 className="mr-2 h-4 w-4" />
                    Стереть все данные
                </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Вы уверены на 100%?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Это действие **необратимо**. Все данные пользователей, проектов, компаний, логов и кеша будут **навсегда удалены** из базы данных. Ваш аккаунт Супер-администратора не будет затронут.
                        <br/><br/>
                        Для подтверждения введите: <strong className="text-destructive">{CONFIRM_PHRASE}</strong>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="py-4">
                     <Input
                        value={confirmationText}
                        onChange={(e) => setConfirmationText(e.target.value)}
                        placeholder="Введите фразу для подтверждения"
                        className="border-destructive"
                    />
                </div>
                <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        disabled={isPending || confirmationText !== CONFIRM_PHRASE}
                        className="bg-destructive hover:bg-destructive/90"
                    >
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Я понимаю последствия, удалить
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}


export function GeneralSettings() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [settings, setSettings] = useState<AppSettings>({ enterpriseEmail: '' });
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [isWipePending, startWipeTransition] = useTransition();

  useEffect(() => {
    if (!user || user.systemRole !== 'Super Admin') {
        setIsLoading(false);
        return;
    }
    const fetchSettings = async () => {
      setIsLoading(true);
      try {
        const currentSettings = await getAppSettings();
        setSettings(currentSettings);
      } catch (error) {
        toast({
          title: "Ошибка",
          description: "Не удалось загрузить текущие настройки.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, [toast, user]);

  const handleSave = () => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startTransition(async () => {
      const result = await updateAppSettings(user.uid, settings);
      if (result.success) {
        toast({
          title: "Успешно",
          description: result.message,
        });
      } else {
        toast({
          title: "Ошибка",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  const handleWipeData = () => {
      if (!user || user.systemRole !== 'Super Admin') return;
      startWipeTransition(async () => {
          const result = await wipeAllData(user.uid);
           if (result.success) {
                toast({
                    title: "Данные удалены",
                    description: result.message,
                    duration: 10000,
                });
            } else {
                toast({
                    title: "Ошибка при удалении данных",
                    description: result.message,
                    variant: "destructive",
                    duration: 10000,
                });
            }
      });
  }
  
  if (isLoading) {
    return (
       <div className="flex justify-center items-center h-40">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Общие настройки</CardTitle>
        <CardDescription>Управление глобальными параметрами приложения.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LabelInputContainer>
            <Label htmlFor="enterpriseEmail" className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground"/>
                Email для тарифа "Сметный отдел"
            </Label>
            <p className="text-sm text-muted-foreground">
                Этот email будет использоваться в кнопке "Обсудить условия" на странице тарифов.
            </p>
            <Input
                id="enterpriseEmail"
                type="email"
                value={settings.enterpriseEmail}
                onChange={(e) => setSettings({ ...settings, enterpriseEmail: e.target.value })}
                placeholder="contact@yourcompany.com"
                disabled={isPending}
            />
        </LabelInputContainer>
      </CardContent>
       <CardFooter>
         <button
            className="group/btn relative inline-flex h-10 items-center justify-center rounded-md bg-gradient-to-br from-black to-neutral-600 px-4 py-2 font-medium text-white shadow-[0px_1px_0px_0px_#ffffff40_inset,0px_-1px_0px_0px_#ffffff40_inset] dark:bg-zinc-800 dark:from-zinc-900 dark:to-zinc-900 dark:shadow-[0px_1px_0px_0px_#27272a_inset,0px_-1px_0px_0px_#27272a_inset] disabled:opacity-50"
            type="button"
            onClick={handleSave} 
            disabled={isPending}
        >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Сохранить настройки
            <BottomGradient />
        </button>
       </CardFooter>
       
       <Separator className="my-6" />

        <CardHeader>
            <CardTitle className="flex items-center text-destructive">
                <AlertTriangle className="mr-2 h-5 w-5" />
                Опасная зона
            </CardTitle>
            <CardDescription className="text-destructive/80">
                Действия в этом разделе необратимы. Используйте с крайней осторожностью.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <WipeDataDialog onConfirm={handleWipeData} isPending={isWipePending}/>
        </CardContent>
    </Card>
  );
}
