// src/app/dashboard/support/page.tsx
"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCcw, Send, CheckCircle } from 'lucide-react';
import {
  listSupportThreadsForManager,
  getSupportThreadMessages,
  sendSupportMessage,
  updateSupportThreadStatus,
  type SupportThread,
  type SupportMessage,
} from '@/actions/supportActions';
import { cn } from '@/lib/utils';

export default function SupportInboxPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [selectedThread, setSelectedThread] = useState<SupportThread | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSending, startSending] = useTransition();

  const canViewInbox = !!user && (user.systemRole !== 'User' || user.isPartner);

  const loadThreads = useCallback(async () => {
    if (!user || !canViewInbox) return;
    setIsLoading(true);
    const result = await listSupportThreadsForManager({ managerId: user.uid, includeClosed: true });
    if (!result.success || !result.threads) {
      toast({ title: 'Ошибка', description: result.message || 'Не удалось загрузить обращения.', variant: 'destructive' });
      setIsLoading(false);
      return;
    }
    setThreads(result.threads);
    setIsLoading(false);
  }, [user, canViewInbox, toast]);

  const refresh = useCallback(async () => {
    if (!user || !canViewInbox) return;
    setIsRefreshing(true);
    await loadThreads();
    setIsRefreshing(false);
  }, [user, canViewInbox, loadThreads]);

  const loadMessages = useCallback(
    async (thread: SupportThread) => {
      if (!user) return;
      const result = await getSupportThreadMessages({ threadId: thread.id, requesterId: user.uid });
      if (!result.success || !result.messages) {
        toast({ title: 'Ошибка', description: result.message || 'Не удалось загрузить сообщения.', variant: 'destructive' });
        return;
      }
      setMessages(result.messages);
    },
    [user, toast],
  );

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  useEffect(() => {
    if (selectedThread) {
      loadMessages(selectedThread);
    } else {
      setMessages([]);
    }
  }, [selectedThread, loadMessages]);

  const handleSend = () => {
    if (!user || !selectedThread) return;
    const text = messageText.trim();
    if (!text) return;
    startSending(async () => {
      const result = await sendSupportMessage({
        threadId: selectedThread.id,
        senderId: user.uid,
        senderRole: 'manager',
        message: text,
      });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message || 'Не удалось отправить сообщение.', variant: 'destructive' });
        return;
      }
      setMessageText('');
      await loadMessages(selectedThread);
      await refresh();
    });
  };

  const handleCloseThread = async () => {
    if (!user || !selectedThread) return;
    const result = await updateSupportThreadStatus({
      threadId: selectedThread.id,
      actorId: user.uid,
      status: 'closed',
    });
    if (!result.success) {
      toast({ title: 'Ошибка', description: result.message || 'Не удалось закрыть обращение.', variant: 'destructive' });
      return;
    }
    await refresh();
  };

  if (!user) return null;

  if (!canViewInbox) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Обращения пользователей</CardTitle>
          <CardDescription>Доступно менеджерам и администраторам.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Обращения</CardTitle>
            <CardDescription>Новые и активные диалоги пользователей.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading || isRefreshing}>
            {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Обновить
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : threads.length === 0 ? (
            <div className="text-sm text-muted-foreground">Пока нет обращений.</div>
          ) : (
            <ScrollArea className="h-[520px] pr-2">
              <div className="space-y-3">
                {threads.map((thread) => (
                  <button
                    key={thread.id}
                    className={cn(
                      'w-full text-left rounded-md border p-3 transition',
                      selectedThread?.id === thread.id ? 'border-primary bg-muted/50' : 'hover:border-primary/60',
                    )}
                    onClick={() => setSelectedThread(thread)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium truncate">{thread.userDisplayName || thread.userEmail || thread.userId}</div>
                      <Badge variant={thread.status === 'closed' ? 'outline' : 'secondary'}>
                        {thread.status === 'closed' ? 'Закрыт' : 'Открыт'}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {thread.lastMessageBy === 'manager' ? 'Ответ менеджера' : thread.lastMessageBy === 'user' ? 'Сообщение пользователя' : 'Нет сообщений'}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Диалог</CardTitle>
          <CardDescription>
            {selectedThread ? `Пользователь: ${selectedThread.userDisplayName || selectedThread.userEmail || selectedThread.userId}` : 'Выберите обращение слева.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ScrollArea className="h-[420px] rounded-md border p-4">
            {selectedThread ? (
              messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">Сообщений пока нет.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                        msg.senderRole === 'manager'
                          ? 'ml-auto bg-primary text-primary-foreground'
                          : 'bg-muted text-foreground',
                      )}
                    >
                      <div className="whitespace-pre-wrap">{msg.message}</div>
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="text-sm text-muted-foreground">Выберите обращение, чтобы посмотреть переписку.</div>
            )}
          </ScrollArea>
          <div className="space-y-2">
            <Textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Ответ менеджера..."
              rows={3}
              disabled={!selectedThread}
            />
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleSend} disabled={!selectedThread || isSending || !messageText.trim()}>
                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                Ответить
              </Button>
              <Button variant="outline" onClick={handleCloseThread} disabled={!selectedThread || selectedThread?.status === 'closed'}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Закрыть обращение
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
