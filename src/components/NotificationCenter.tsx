// src/components/NotificationCenter.tsx
"use client";

import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAppContext, type Notification } from '@/contexts/AppContext';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, arrayUnion, serverTimestamp } from '@/lib/mongoFirestore';
import { Loader2, Info, AlertTriangle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ui/scroll-area';

export function NotificationCenter() {
  const { user } = useAppContext();
  const [unreadNotifications, setUnreadNotifications] = useState<(Notification & { source: 'global' | 'user' })[]>([]);
  const [currentNotification, setCurrentNotification] = useState<(Notification & { source: 'global' | 'user' }) | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [canClose, setCanClose] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
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
        if (combined.length > 0) {
          setCurrentNotification(combined[0]);
        }
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  useEffect(() => {
    if (currentNotification?.type === 'important') {
      setCanClose(false);
    } else {
      setCanClose(true);
    }
  }, [currentNotification]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (currentNotification?.type !== 'important') return;
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 1) { // +1 for pixel-perfect browsers
      setCanClose(true);
    }
  };

  const handleClose = async () => {
    if (!user || !currentNotification) return;

    setIsProcessing(true);
    try {
      if (currentNotification.source === 'global') {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          seenNotifications: arrayUnion(currentNotification.id),
          updatedAt: serverTimestamp()
        });
      } else {
        const notificationRef = doc(db, 'user_notifications', currentNotification.id);
        await updateDoc(notificationRef, {
          status: 'read',
          updatedAt: serverTimestamp(),
        });
      }

      // Move to the next notification
      const nextIndex = unreadNotifications.findIndex(n => n.id === currentNotification.id) + 1;
      if (nextIndex < unreadNotifications.length) {
        setCurrentNotification(unreadNotifications[nextIndex]);
      } else {
        setCurrentNotification(null);
      }
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading || !currentNotification) {
    return null; // Don't render anything if there are no notifications to show
  }

  const isImportant = currentNotification.type === 'important';

  return (
    <Dialog open={!!currentNotification} onOpenChange={() => { if(canClose) handleClose() }}>
      <DialogContent className="max-w-2xl" onInteractOutside={e => { if(!canClose) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isImportant ? <AlertTriangle className="text-destructive"/> : <Info className="text-primary"/>}
            {currentNotification.title}
          </DialogTitle>
          <DialogDescription>
             {unreadNotifications.length > 1 && `(Уведомление ${unreadNotifications.findIndex(n => n.id === currentNotification.id) + 1} из ${unreadNotifications.length})`}
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96" onScroll={handleScroll} ref={scrollAreaRef}>
             <div className="prose prose-sm max-w-none p-1 pr-4">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {currentNotification.content}
                </ReactMarkdown>
            </div>
        </ScrollArea>
        <DialogFooter>
          <Button onClick={handleClose} disabled={isProcessing || !canClose}>
            {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            {isImportant ? "Я прочитал(а) и согласен(на)" : "Закрыть"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
