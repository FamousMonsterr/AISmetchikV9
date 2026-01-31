// src/components/NotificationCenter.tsx
"use client";

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAppContext, type Notification } from '@/contexts/AppContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from '@/lib/mongoFirestore';
import { Loader2, Bell, Info, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type NotificationCenterProps = {
  className?: string;
  showLabel?: boolean;
};

type NotificationWithSource = Notification & { source: 'global' | 'user' };

export function NotificationCenter({ className, showLabel = false }: NotificationCenterProps) {
  const { user } = useAppContext();
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationWithSource[]>([]);
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      setUnreadNotifications([]);
      setHiddenIds([]);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      try {
        const globalQuery = query(
          collection(db, "notifications"),
          where("status", "==", "published")
        );
        const globalSnapshot = await getDocs(globalQuery);
        const allPublished = globalSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'global' })) as (Notification & { source: 'global' })[];
        
        const seenIds = user.seenNotifications || [];
        const globalNotifications = allPublished
          .filter(n => !seenIds.includes(n.id))
          .sort((a, b) => (a.publishedAt?.toDate() || 0) - (b.publishedAt?.toDate() || 0));

        const userQuery = query(
          collection(db, "user_notifications"),
          where("userId", "==", user.uid),
          where("status", "==", "unread")
        );
        const userSnapshot = await getDocs(userQuery);
        const userNotifications = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), source: 'user' })) as (Notification & { source: 'user' })[];

        const combined = [...globalNotifications, ...userNotifications]
          .sort((a, b) => {
            const aDate = (a.publishedAt?.toDate ? a.publishedAt.toDate() : a.createdAt?.toDate ? a.createdAt.toDate() : a.createdAt) || 0;
            const bDate = (b.publishedAt?.toDate ? b.publishedAt.toDate() : b.createdAt?.toDate ? b.createdAt.toDate() : b.createdAt) || 0;
            return Number(aDate) - Number(bDate);
          });

        setUnreadNotifications(combined);
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  const markAsRead = async (notification: NotificationWithSource) => {
    if (!user) return;
    setProcessingId(notification.id);
    try {
      if (notification.source === 'global') {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          seenNotifications: arrayUnion(notification.id),
          updatedAt: serverTimestamp()
        });
      } else {
        const notificationRef = doc(db, 'user_notifications', notification.id);
        await updateDoc(notificationRef, {
          status: 'read',
          updatedAt: serverTimestamp(),
        });
      }
      setUnreadNotifications((prev) => prev.filter((n) => n.id !== notification.id));
      setHiddenIds((prev) => prev.filter((id) => id !== notification.id));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setProcessingId(null);
    }
  };

  const hideNotification = (id: string) => {
    setHiddenIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  };

  const getNotificationDate = (notification: NotificationWithSource) => {
    const rawDate =
      (notification.publishedAt?.toDate ? notification.publishedAt.toDate() : notification.publishedAt) ||
      (notification.createdAt?.toDate ? notification.createdAt.toDate() : notification.createdAt);
    if (!rawDate) return '';
    const date = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const visibleNotifications = unreadNotifications.filter((n) => !hiddenIds.includes(n.id));
  const unreadCount = visibleNotifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size={showLabel ? "default" : "icon"}
          className={cn("relative", showLabel && "justify-start gap-2", className)}
          aria-label="Открыть уведомления"
        >
          <Bell className="h-5 w-5" />
          {showLabel && <span className="text-sm font-medium">Уведомления</span>}
          {unreadCount > 0 && (
            <span className={cn("absolute flex h-5 min-w-[20px] items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground", showLabel ? "top-2 right-2" : "-top-1 -right-1")}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[calc(100vw-2rem)] max-w-[420px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div className="text-sm font-semibold">Уведомления</div>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">{unreadCount} новых</span>
          )}
        </div>

        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Загрузка уведомлений...
          </div>
        )}

        {!isLoading && visibleNotifications.length === 0 && (
          <div className="px-4 py-6 text-sm text-muted-foreground">
            Новых уведомлений нет.
          </div>
        )}

        {!isLoading && visibleNotifications.length > 0 && (
          <ScrollArea className="max-h-[60vh]">
            <div className="divide-y">
              {visibleNotifications.map((notification) => {
                const dateLabel = getNotificationDate(notification);
                return (
                  <div key={notification.id} className="px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          {notification.type === 'important' ? (
                            <AlertTriangle className="h-4 w-4 text-destructive" />
                          ) : (
                            <Info className="h-4 w-4 text-primary" />
                          )}
                          <div className="font-medium leading-snug">{notification.title}</div>
                          {notification.type === 'important' && (
                            <Badge variant="destructive">Важно</Badge>
                          )}
                        </div>
                        {dateLabel && (
                          <div className="text-xs text-muted-foreground">
                            {dateLabel}
                          </div>
                        )}
                      </div>
                    </div>

                  <div className="prose prose-sm max-w-none pt-2">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {notification.content}
                    </ReactMarkdown>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => markAsRead(notification)}
                      disabled={processingId === notification.id}
                    >
                      {processingId === notification.id && (
                        <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                      )}
                      Прочитано
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => hideNotification(notification.id)}
                    >
                      Скрыть
                    </Button>
                  </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
}
