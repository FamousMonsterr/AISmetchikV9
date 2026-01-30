// src/app/dashboard/admin/logs/page.tsx
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, FileClock, User, FileText, BadgeDollarSign, Shield, Star, GitMerge, FileUp, KeySquare, Cog, Archive, Send, Library } from "lucide-react";
import { onSnapshot, collection, query, orderBy, limit, DocumentData, FirebaseError } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppContext } from '@/contexts/AppContext';


export default function AdminLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppContext();

  const fetchLogs = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const logsQuery = query(collection(db, 'user_logs'), orderBy('timestamp', 'desc'), limit(100));
        const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
            const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(logList);
            setIsLoading(false);
        }, (error: FirebaseError) => {
            console.error("Error fetching logs:", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                toast({
                    title: "База данных подготавливается",
                    description: "Для просмотра логов создается специальный индекс. Это может занять несколько минут. Пожалуйста, обновите страницу позже.",
                    variant: "destructive",
                    duration: 20000
                });
            } else {
                 toast({ title: "Ошибка загрузки логов", description: error.message, variant: "destructive"});
            }
            setIsLoading(false);
        });
        return unsubscribe;
    } catch (error: any) {
        toast({ title: "Ошибка", description: error.message || "Не удалось выполнить запрос к базе данных.", variant: "destructive" });
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    const unsubscribe = fetchLogs();
    return () => unsubscribe && unsubscribe();
  }, [fetchLogs]);

  const getActionInfo = (log: DocumentData) => {
    const defaultInfo = { icon: FileClock, text: log.action };
    switch (log.action) {
        case 'USER_LOGIN': return { icon: User, text: `Вход: ${log.userId.slice(0,8)}...` };
        case 'PROFILE_UPDATE': return { icon: User, text: 'Обновление профиля' };
        case 'PROJECT_DRAFT_CREATE': return { icon: FileText, text: 'Создание проекта/версии' };
        case 'PROJECT_DRAFT_UPDATE': return { icon: FileText, text: 'Обновление черновика' };
        case 'PROJECT_VERSION_PROMOTE': return { icon: FileText, text: 'Версия сделана основной' };
        case 'PROJECT_REPORT': return { icon: BadgeDollarSign, text: `Жалоба на проект`};
        case 'PROJECT_ARCHIVE': return { icon: Archive, text: 'Архивация проекта' };
        case 'PROJECT_UNARCHIVE': return { icon: Archive, text: 'Восстановление проекта' };
        case 'PROJECT_DELETE': return { icon: Archive, text: 'Удаление проекта' };
        case 'PROJECT_GROUP_INTO_OBJECT': return { icon: GitMerge, text: `Группировка в объект` };
        case 'PROJECT_UNGROUP_FROM_OBJECT': return { icon: GitMerge, text: `Разгруппировка` };
        case 'PRICE_BASE_TOGGLE_PROJECT': return { icon: KeySquare, text: `Проект в базе цен` };
        case 'PRICE_BASE_IMPORT': return { icon: FileUp, text: `Импорт в базу цен` };
        case 'PRICE_BASE_ITEM_UPDATE': return { icon: KeySquare, text: `Обновление базы цен` };
        case 'CREDIT_DEDUCTION': return { icon: BadgeDollarSign, text: `Списание: ${log.details.amount} кредит(ов)`};
        case 'ADMIN_UPDATE_USER': return { icon: Shield, text: `Админ: изменены права` };
        case 'ADMIN_ADD_CREDITS': return { icon: Shield, text: `Админ: начислены кредиты` };
        case 'ADMIN_SET_USER_STATUS': return { icon: Shield, text: `Админ: изменен статус` };
        case 'ADMIN_ARCHIVE_USER': return { icon: Shield, text: `Админ: архивирован пользователь` };
        case 'ADMIN_RESOLVE_TICKET': return { icon: Shield, text: `Админ: решен тикет` };
        case 'ADMIN_UPDATE_SETTINGS': return { icon: Cog, text: `Админ: обновлены настройки` };
        case 'ADMIN_UPDATE_PROMPTS': return { icon: Cog, text: `Админ: обновлены промпты` };
        case 'TRIAL_ACTIVATED': return { icon: Star, text: `Активирован триал` };
        case 'ADMIN_SEND_TELEGRAM_MESSAGE': return { icon: Send, text: 'Админ: сообщение в Telegram' };
        case 'ADMIN_UPDATE_SECTIONS': return { icon: Library, text: 'Админ: обновлены разделы' };
        case 'ADMIN_UPDATE_LEGAL_ENTITY': return { icon: Shield, text: 'Админ: обновлены юр. данные' };
        case 'PARTNER_TERMS_AGREED': return { icon: Star, text: 'Пользователь стал партнером' };
        default: return defaultInfo;
    }
  }


  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Логи действий</CardTitle>
            <CardDescription>Последние 100 действий пользователей в системе.</CardDescription>
        </div>
        <Button onClick={fetchLogs} variant="ghost" size="icon" disabled={isLoading}>
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <Loader2 className="h-12 w-12 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold">Загрузка логов...</h3>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <FileClock className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Логов пока нет</h3>
            <p className="text-sm">Здесь будут отображаться все действия пользователей.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {logs.map((log) => {
                const actionInfo = getActionInfo(log);
                return (
                    <AccordionItem value={log.id} key={log.id}>
                        <AccordionTrigger>
                            <div className='flex justify-between items-center w-full pr-4'>
                                <div className='text-left flex items-center gap-3 min-w-0'>
                                    <actionInfo.icon className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                                    <div className="min-w-0">
                                        <p className="font-semibold truncate max-w-[150px] sm:max-w-none">{actionInfo.text}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm:ss', { locale: ru }) : 'N/A'}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="outline" className="flex-shrink-0">{log.userId === user?.uid ? "Вы" : log.userId.slice(0, 8) + '...'}</Badge>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent>
                            <div className="overflow-x-auto">
                                <pre className="p-4 bg-muted/50 rounded-md text-xs">
                                    {JSON.stringify(log.details, null, 2)}
                                </pre>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                );
            })}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
