// src/components/support/SupportChat.tsx
"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, RefreshCcw, Send, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import {
  getOrCreateSupportThread,
  getSupportThreadMessages,
  sendSupportMessage,
  updateSupportThreadStatus,
  type SupportMessage,
  type SupportThread,
} from '@/actions/supportActions';
import { cn } from '@/lib/utils';

export function SupportChat({ className }: { className?: string } = {}) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [manager, setManager] = useState<{ id: string; displayName: string; email: string | null } | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, startSending] = useTransition();

  const loadThread = useCallback(async () => {
    if (!user) return;
    const result = await getOrCreateSupportThread({ userId: user.uid });
    if (!result.success || !result.thread) {
      toast({ title: 'Ошибка', description: result.message || 'Не удалось открыть диалог.', variant: 'destructive' });
      return;
    }
    setThread(result.thread);
    setManager(result.manager || null);
    return result.thread.id;
  }, [user, toast]);

  const loadMessages = useCallback(
    async (threadId: string) => {
      if (!user) return;
      const result = await getSupportThreadMessages({ threadId, requesterId: user.uid });
      if (!result.success || !result.messages) {
        toast({ title: 'Ошибка', description: result.message || 'Не удалось загрузить сообщения.', variant: 'destructive' });
        return;
      }
      setMessages(result.messages);
    },
    [user, toast],
  );

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsRefreshing(true);
    const threadId = thread?.id || (await loadThread());
    if (threadId) {
      await loadMessages(threadId);
      if (messages.length === 0) {
        toast({
          title: 'Данные появятся позже',
          description: 'Сообщения обновляются. Попробуйте нажать «Обновить» чуть позже.',
        });
      }
    }
    setIsRefreshing(false);
  }, [user, loadThread, loadMessages, thread?.id, messages.length, toast]);

  useEffect(() => {
    const init = async () => {
      if (!user) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const threadId = await loadThread();
      if (threadId) {
        await loadMessages(threadId);
      }
      setIsLoading(false);
    };
    init();
  }, [user, loadThread, loadMessages]);

  const handleSend = () => {
    if (!user || !thread) return;
    const text = messageText.trim();
    if (!text) return;

    startSending(async () => {
      const result = await sendSupportMessage({
        threadId: thread.id,
        senderId: user.uid,
        senderRole: 'user',
        message: text,
      });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message || 'Не удалось отправить сообщение.', variant: 'destructive' });
        return;
      }
      setMessageText('');
      await loadMessages(thread.id);
      const updated = await getOrCreateSupportThread({ userId: user.uid });
      if (updated.thread) {
        setThread(updated.thread);
      }
    });
  };

  const handleSatisfaction = async (status: 'satisfied' | 'unsatisfied') => {
    if (!user || !thread) return;
    const result = await updateSupportThreadStatus({
      threadId: thread.id,
      actorId: user.uid,
      satisfaction: status,
      status: status === 'satisfied' ? 'closed' : 'open',
    });
    if (!result.success) {
      toast({ title: 'Ошибка', description: result.message || 'Не удалось обновить статус.', variant: 'destructive' });
      return;
    }
    const updated = await getOrCreateSupportThread({ userId: user.uid });
    if (updated.thread) {
      setThread(updated.thread);
    }
  };

  const formatResponseTime = (ms?: number | null) => {
    if (!ms && ms !== 0) return '—';
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин`;
    const hours = Math.floor(minutes / 60);
    return `${hours} ч ${minutes % 60} мин`;
  };

  if (!user) return null;

  return (
    <Card className={cn(className)}>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Связь с менеджером</CardTitle>
          <CardDescription>
            {manager
              ? `Ваш менеджер: ${manager.displayName}${manager.email ? ` (${manager.email})` : ''}`
              : 'Менеджер будет назначен автоматически.'}
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading || isRefreshing}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Обновить
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {thread && (
          <div className="text-xs text-muted-foreground flex flex-wrap gap-4">
            <span>Статус: {thread.status === 'closed' ? 'Закрыт' : 'Открыт'}</span>
            <span>Время первого ответа: {formatResponseTime(thread.firstResponseMs)}</span>
            <span>Оценка: {thread.satisfaction === 'pending' ? 'нет' : thread.satisfaction === 'satisfied' ? 'доволен' : 'не доволен'}</span>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-64 rounded-md border p-4">
            {messages.length === 0 ? (
              <div className="text-sm text-muted-foreground">Сообщений пока нет. Напишите менеджеру ниже.</div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                      msg.senderRole === 'user'
                        ? 'ml-auto bg-primary text-primary-foreground'
                        : 'bg-muted text-foreground',
                    )}
                  >
                    <div className="whitespace-pre-wrap">{msg.message}</div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        <div className="space-y-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Опишите ваш вопрос менеджеру..."
            rows={3}
          />
          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSend} disabled={isSending || !messageText.trim()}>
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Отправить
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSatisfaction('satisfied')}
              disabled={!thread || thread.status === 'closed'}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Ответ помог
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSatisfaction('unsatisfied')}
              disabled={!thread}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Ответ не помог
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
