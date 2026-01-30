// src/app/dashboard/admin/notifications/page.tsx
// @ts-nocheck
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, PlusCircle, Bell, AlertTriangle, Info, Edit, Trash2, Save, Copy, Pause, Play, LayoutPanelLeft } from "lucide-react";
import { type Notification as NotificationType, useAppContext } from '@/contexts/AppContext'; // Renamed to avoid conflict
import { getNotifications, createOrUpdateNotification, deleteNotification, updateBannerConfig, getBannerConfig } from '@/actions/adminActions';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Switch } from '@/components/ui/switch';


const welcomeTemplate = {
    title: 'Добро пожаловать в AI Сметчик!',
    content: `
1.  **Загрузите документ:** Перетащите PDF-файл, скан или фото со спецификацией в поле "Анализ файла".
2.  **Дождитесь анализа:** Наш AI проанализирует документ и создаст таблицу с позициями.
3.  **Отредактируйте и оцените:** Вы будете перенаправлены на страницу спецификации, где сможете внести правки, указать цены и сформировать коммерческое предложение.
    `,
    type: 'informational',
    status: 'published'
};

const referralTemplate = {
    title: '✨ Пригласите друга и получите 100 кредитов!',
    content: 'Расскажите о нас коллегам и получите бонус за каждого зарегистрированного пользователя.',
    type: 'informational',
    status: 'published'
}


const NotificationDialog = ({
  isOpen,
  onClose,
  onSuccess,
  notification
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  notification: Partial<NotificationType> | null;
}) => {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  
  const [title, setTitle] = useState(notification?.title || '');
  const [content, setContent] = useState(notification?.content || '');
  const [type, setType] = useState<'informational' | 'important'>(notification?.type || 'informational');
  const [status, setStatus] = useState<'draft' | 'published'>(notification?.status || 'draft');
  
  useEffect(() => {
    if (isOpen) {
      setTitle(notification?.title || '');
      setContent(notification?.content || '');
      setType(notification?.type || 'informational');
      setStatus(notification?.status || 'draft');
    }
  }, [isOpen, notification]);


  const handleSave = () => {
    if (!user || user.systemRole !== 'Super Admin') {
        toast({ title: "Ошибка доступа", description: "У вас нет прав для выполнения этого действия.", variant: "destructive" });
        return;
    };
    startTransition(async () => {
      const result = await createOrUpdateNotification(
        user.uid,
        { title, content, type, status },
        notification?.id
      );
      if (result.success) {
        toast({ title: "Успех", description: result.message });
        onSuccess();
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{notification?.id ? 'Редактировать уведомление' : 'Создать уведомление'}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Заголовок</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="content">Содержимое (поддерживает Markdown)</Label>
            <Textarea id="content" value={content} onChange={(e) => setContent(e.target.value)} rows={10} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
                <Label>Тип</Label>
                <RadioGroup value={type} onValueChange={(v) => setType(v as any)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="informational" id="type-info" /><Label htmlFor="type-info">Информационное</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="important" id="type-imp" /><Label htmlFor="type-imp">Важное</Label></div>
                </RadioGroup>
            </div>
            <div className="space-y-2">
                <Label>Статус</Label>
                <RadioGroup value={status} onValueChange={(v) => setStatus(v as any)}>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="draft" id="status-draft" /><Label htmlFor="status-draft">Черновик</Label></div>
                    <div className="flex items-center space-x-2"><RadioGroupItem value="published" id="status-pub" /><Label htmlFor="status-pub">Опубликовать</Label></div>
                </RadioGroup>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <Button onClick={handleSave} disabled={isPending || !title || !content}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            Сохранить
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export default function AdminNotificationsPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionPending, startActionTransition] = useTransition();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<Partial<NotificationType> | null>(null);
  
  // State for sticky banner
  const [bannerConfig, setBannerConfig] = useState({ enabled: false, text: '', buttonText: '', buttonLink: '' });
  const [isSavingBanner, startSavingBanner] = useTransition();

  const fetchNotifications = useCallback(async () => {
    if (!user || user.systemRole !== 'Super Admin') return;
    setIsLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (error: any) {
      toast({ title: "Ошибка", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);
  
  const fetchBannerConfig = useCallback(async () => {
      if (!user) return;
      try {
          const config = await getBannerConfig();
          setBannerConfig(config);
      } catch (e) {
          console.error(e);
      }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
    fetchBannerConfig();
  }, [fetchNotifications, fetchBannerConfig]);

  const handleEdit = (notification: NotificationType) => {
    setSelectedNotification(notification);
    setIsDialogOpen(true);
  };
  
  const handleClone = (notification: NotificationType) => {
    setSelectedNotification({ ...notification, id: undefined, status: 'draft', title: `${notification.title} (копия)` });
    setIsDialogOpen(true);
  };
  
  const handleCreate = (template?: Partial<NotificationType>) => {
    setSelectedNotification(template || null);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startActionTransition(async () => {
      const result = await deleteNotification(id);
      if (result.success) {
        toast({ title: 'Удалено', description: result.message });
        await fetchNotifications();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  }
  
  const handleToggleStatus = async (notification: NotificationType) => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startActionTransition(async () => {
      const newStatus = notification.status === 'published' ? 'draft' : 'published';
      const result = await createOrUpdateNotification(user.uid, { ...notification, status: newStatus }, notification.id);
      if (result.success) {
        toast({ title: "Обновлено", description: `Статус: ${newStatus === 'published' ? 'Опубликовано' : 'Черновик'}` });
        await fetchNotifications();
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
    });
  };
  
  const handleSaveBanner = () => {
      if (!user) return;
      startSavingBanner(async () => {
          const result = await updateBannerConfig(user.uid, bannerConfig);
          if (result.success) {
              toast({ title: "Успех", description: "Настройки баннера обновлены." });
          } else {
              toast({ title: "Ошибка", description: result.message, variant: "destructive" });
          }
      });
  }

  const getStatusBadge = (status: 'draft' | 'published') => {
      return status === 'published' 
        ? <Badge variant="secondary" className="text-green-600 border-green-500">Опубликовано</Badge>
        : <Badge variant="outline">Черновик</Badge>;
  };
  
   const getTypeIcon = (type: 'informational' | 'important') => {
      return type === 'important'
        ? <AlertTriangle className="h-5 w-5 text-destructive" />
        : <Info className="h-5 w-5 text-blue-500" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
            <CardTitle>Управление липким баннером</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
                <Switch id="banner-enabled" checked={bannerConfig.enabled} onCheckedChange={(c) => setBannerConfig(p => ({...p, enabled: c}))} />
                <Label htmlFor="banner-enabled">Включить баннер</Label>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="banner-text">Текст баннера</Label>
                    <Input id="banner-text" value={bannerConfig.text} onChange={e => setBannerConfig(p => ({...p, text: e.target.value}))} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="banner-btn-text">Текст кнопки</Label>
                    <Input id="banner-btn-text" value={bannerConfig.buttonText} onChange={e => setBannerConfig(p => ({...p, buttonText: e.target.value}))} />
                </div>
                 <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="banner-btn-link">Ссылка кнопки</Label>
                    <Input id="banner-btn-link" value={bannerConfig.buttonLink} onChange={e => setBannerConfig(p => ({...p, buttonLink: e.target.value}))} />
                </div>
            </div>
        </CardContent>
        <CardFooter>
            <Button onClick={handleSaveBanner} disabled={isSavingBanner}>
                {isSavingBanner && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                Сохранить настройки баннера
            </Button>
        </CardFooter>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between">
          <div>
            <CardTitle>Центр уведомлений</CardTitle>
            <CardDescription>Создавайте, копируйте, публикуйте/останавливайте уведомления. Шаблоны — ниже.</CardDescription>
          </div>
           <Button onClick={() => handleCreate()} disabled={isLoading}>
            <PlusCircle className="mr-2 h-4 w-4" /> Создать уведомление
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
            {[welcomeTemplate, referralTemplate].map((tpl) => (
              <Card key={tpl.title} className="border border-border/80">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><LayoutPanelLeft className="h-4 w-4 text-primary"/>{tpl.title}</CardTitle>
                  <CardDescription>Быстрое создание по готовому шаблону</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground line-clamp-3">{tpl.content.replace(/\n/g,' ').slice(0,120)}...</p>
                  <Button variant="outline" size="sm" onClick={() => handleCreate(tpl)}>Создать из шаблона</Button>
                </CardContent>
              </Card>
            ))}
          </div>
          {isLoading ? (
            <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : notifications.length === 0 ? (
            <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
                <Bell className="mx-auto h-12 w-12" />
                <h3 className="mt-4 text-lg font-semibold">Уведомлений пока нет</h3>
                <p className="mt-1 text-sm">Используйте шаблоны или создайте первое уведомление.</p>
                <div className="mt-4 flex justify-center gap-2">
                    <Button variant="outline" onClick={() => handleCreate(welcomeTemplate)}>Создать из шаблона "Welcome"</Button>
                    <Button variant="outline" onClick={() => handleCreate(referralTemplate)}>Создать из шаблона "Referral"</Button>
                </div>
            </div>
          ) : (
            <Accordion type="multiple" className="w-full">
              {notifications.map((notif) => (
                <AccordionItem value={notif.id} key={notif.id}>
                  <AccordionTrigger>
                    <div className='flex justify-between items-center w-full pr-4'>
                        <div className='flex items-center gap-3 text-left min-w-0'>
                            {getTypeIcon(notif.type)}
                            <div className="min-w-0">
                                <p className="font-semibold truncate">{notif.title}</p>
                                <p className="text-xs text-muted-foreground">
                                    Создано: {notif.createdAt?.toDate ? format(notif.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: ru }) : 'N/A'}
                                </p>
                            </div>
                        </div>
                        {getStatusBadge(notif.status)}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="space-y-4">
                     <div className="prose prose-sm max-w-none p-4 bg-muted/50 rounded-md max-h-60 overflow-y-auto">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{notif.content}</ReactMarkdown>
                    </div>
                     <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(notif)} disabled={isActionPending}>
                            <Edit className="mr-2 h-4 w-4" /> Редактировать
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleClone(notif)} disabled={isActionPending}>
                            <Copy className="mr-2 h-4 w-4" /> Копировать
                        </Button>
                        <Button
                            size="sm"
                            variant={notif.status === 'published' ? "secondary" : "outline"}
                            onClick={() => handleToggleStatus(notif)}
                            disabled={isActionPending}
                        >
                            {notif.status === 'published' ? <Pause className="mr-2 h-4 w-4"/> : <Play className="mr-2 h-4 w-4" />}
                            {notif.status === 'published' ? 'Остановить' : 'Опубликовать'}
                        </Button>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                 <Button size="sm" variant="destructive" disabled={isActionPending}>
                                    <Trash2 className="mr-2 h-4 w-4" /> Удалить
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                <AlertDialogDescription>Это действие нельзя отменить. Уведомление будет удалено навсегда.</AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(notif.id)} className="bg-destructive">Удалить</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                     </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
      {isDialogOpen && (
        <NotificationDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          onSuccess={() => {
            setIsDialogOpen(false);
            fetchNotifications();
          }}
          notification={selectedNotification}
        />
      )}
    </div>
  );
}
