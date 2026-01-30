// src/components/admin/TelegramUsersManagement.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Send, ArrowUpDown, Search, CheckCircle, AlertTriangle } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getTelegramUsers, sendTelegramMessageToUser, getEnvSettings, startTelegramBotService, stopTelegramBotService, getTelegramBotStatus, forceUnlockTelegramBotService, testTelegramMongoConnection, testTelegramApiConnection, testTelegramWebhookInfo, pingTelegramBot, registerTelegramWebhookService, clearTelegramWebhookService, pingTelegramWebhookEndpoint } from '@/actions/adminActions';
import type { AppUser } from '@/contexts/AppContext';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppContext } from '@/contexts/AppContext';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

type SortKey = keyof AppUser | 'credits';

export default function TelegramUsersPage() {
  const { toast } = useToast();
  const { user: adminUser } = useAppContext();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, startSendingTransition] = useTransition();
  const [isTesting, setIsTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'run' | 'ok' | 'fail'>>({
    token: 'idle',
    chat: 'idle',
    send: 'idle',
    ping: 'idle',
    mongo: 'idle',
    api: 'idle',
    webhook: 'idle',
    webhook_ping: 'idle',
  });
  const [botStatus, setBotStatus] = useState<any>(null);
  const [isBotActionPending, setIsBotActionPending] = useState(false);
  const [envSettings, setEnvSettings] = useState<any>(null);

  const [isMessageDialogOpen, setIsMessageDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [messageText, setMessageText] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' } | null>({ key: 'createdAt', direction: 'desc' });

  const fetchUsers = useCallback(async () => {
    if (!adminUser || adminUser.systemRole !== 'Super Admin') return;
    setIsLoading(true);
    try {
      const userList = await getTelegramUsers();
      setUsers(userList);
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message || "Не удалось загрузить список пользователей Telegram.",
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [adminUser, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const refreshBotStatus = useCallback(async () => {
    if (!adminUser || adminUser.systemRole !== 'Super Admin') return;
    try {
      const [statusResp, envResp] = await Promise.all([
        getTelegramBotStatus(adminUser.uid),
        getEnvSettings({ requesterId: adminUser.uid, requireAdmin: true }),
      ]);
      if (statusResp.success) {
        setBotStatus(statusResp.status);
      } else {
        toast({ title: "Статус бота", description: statusResp.message || "Не удалось получить статус.", variant: "destructive" });
      }
      setEnvSettings(envResp);
    } catch (e: any) {
      toast({ title: "Статус бота", description: e.message || 'Ошибка', variant: 'destructive' });
    }
  }, [adminUser, toast]);

  useEffect(() => {
    refreshBotStatus();
  }, [refreshBotStatus]);

  useEffect(() => {
    const interval = setInterval(() => {
      refreshBotStatus();
    }, 8000);
    return () => clearInterval(interval);
  }, [refreshBotStatus]);

  const renderStatusIcon = (state: 'idle' | 'run' | 'ok' | 'fail') => {
    if (state === 'ok') return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (state === 'fail') return <AlertTriangle className="h-4 w-4 text-destructive" />;
    if (state === 'run') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <span className="text-muted-foreground">•</span>;
  };

  const runTest = async (key: keyof typeof testStatus, fn: () => Promise<void>) => {
    setIsTesting(true);
    setTestStatus((s) => ({ ...s, [key]: 'run' }));
    try {
      await fn();
      setTestStatus((s) => ({ ...s, [key]: 'ok' }));
    } catch (e: any) {
      setTestStatus((s) => ({ ...s, [key]: 'fail' }));
      toast({ title: "Ошибка теста", description: e.message || 'Неизвестная ошибка', variant: 'destructive' });
    } finally {
      setIsTesting(false);
    }
  };
  
  const sortedAndFilteredUsers = useMemo(() => {
    let sortableUsers = [...users];
    
    // Filtering
    if (searchTerm) {
        sortableUsers = sortableUsers.filter(user => 
            user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }
    
    // Sorting
    if (sortConfig !== null) {
      sortableUsers.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof AppUser];
        const bValue = b[sortConfig.key as keyof AppUser];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (aValue instanceof Date && bValue instanceof Date) {
            comparison = aValue.getTime() - bValue.getTime();
        } else if (aValue?.toDate && bValue?.toDate) { // Firebase Timestamp
            comparison = aValue.toDate().getTime() - bValue.toDate().getTime();
        } else {
            comparison = String(aValue).localeCompare(String(bValue));
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }
    return sortableUsers;
  }, [users, searchTerm, sortConfig]);


  const requestSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortKey) => {
      if (!sortConfig || sortConfig.key !== key) {
          return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
      }
      return sortConfig.direction === 'asc' ? '🔼' : '🔽';
  }


  const handleOpenMessageDialog = (user: AppUser) => {
    setSelectedUser(user);
    setMessageText('');
    setIsMessageDialogOpen(true);
  };

  const handleSendMessage = () => {
    if (!selectedUser || !adminUser || !messageText.trim() || adminUser.systemRole !== 'Super Admin') return;
    
    startSendingTransition(async () => {
      const result = await sendTelegramMessageToUser({
          adminUserId: adminUser.uid,
          targetUserId: selectedUser.uid,
          message: messageText
      });

      if (result.success) {
          toast({ title: "Успех", description: result.message });
          setIsMessageDialogOpen(false);
      } else {
          toast({ title: "Ошибка отправки", description: result.message, variant: "destructive" });
      }
    });
  };

  const handleBotAction = async (action: 'start' | 'stop' | 'status') => {
    if (!adminUser || adminUser.systemRole !== 'Super Admin') {
      toast({ title: "Недостаточно прав", description: "Требуется Super Admin.", variant: "destructive" });
      return;
    }
    setIsBotActionPending(true);
    try {
      if (action === 'start') {
        const res = await startTelegramBotService(adminUser.uid);
        toast({ title: res.success ? "Бот" : "Ошибка", description: res.message, variant: res.success ? "default" : "destructive" });
      } else if (action === 'stop') {
        const res = await stopTelegramBotService(adminUser.uid);
        toast({ title: res.success ? "Бот" : "Ошибка", description: res.message, variant: res.success ? "default" : "destructive" });
      }
      await refreshBotStatus();
    } catch (e: any) {
      toast({ title: "Бот", description: e.message || 'Ошибка', variant: 'destructive' });
    } finally {
      setIsBotActionPending(false);
    }
  };

  const handleForceUnlock = async () => {
    if (!adminUser || adminUser.systemRole !== 'Super Admin') {
      toast({ title: "Недостаточно прав", description: "Требуется Super Admin.", variant: "destructive" });
      return;
    }
    setIsBotActionPending(true);
    try {
      const res = await forceUnlockTelegramBotService(adminUser.uid);
      toast({ title: res.success ? "Бот" : "Ошибка", description: res.message, variant: res.success ? "default" : "destructive" });
      await refreshBotStatus();
    } catch (e: any) {
      toast({ title: "Бот", description: e.message || 'Ошибка', variant: 'destructive' });
    } finally {
      setIsBotActionPending(false);
    }
  };

  const handleWebhookAction = async (action: 'register' | 'clear') => {
    if (!adminUser || adminUser.systemRole !== 'Super Admin') {
      toast({ title: "Недостаточно прав", description: "Требуется Super Admin.", variant: "destructive" });
      return;
    }
    setIsBotActionPending(true);
    try {
      const res = action === 'register'
        ? await registerTelegramWebhookService(adminUser.uid)
        : await clearTelegramWebhookService(adminUser.uid);
      toast({ title: res.success ? "Webhook" : "Ошибка", description: res.message, variant: res.success ? "default" : "destructive" });
      await refreshBotStatus();
    } catch (e: any) {
      toast({ title: "Webhook", description: e.message || 'Ошибка', variant: 'destructive' });
    } finally {
      setIsBotActionPending(false);
    }
  };


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Управление ботом</CardTitle>
          <CardDescription>Запуск/остановка (polling), статус и логи. Для webhook укажите URL/secret в настройках и настройте BotFather.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={isBotActionPending} onClick={() => handleBotAction('start')}>
              {isBotActionPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Старт (polling)
            </Button>
            <Button variant="outline" size="sm" disabled={isBotActionPending} onClick={() => handleBotAction('stop')}>
              Остановить
            </Button>
            <Button variant="outline" size="sm" disabled={isBotActionPending} onClick={() => handleWebhookAction('register')}>
              Зарегистрировать webhook
            </Button>
            <Button variant="outline" size="sm" disabled={isBotActionPending} onClick={() => handleWebhookAction('clear')}>
              Снять webhook
            </Button>
            <Button variant="outline" size="sm" disabled={isBotActionPending} onClick={handleForceUnlock}>
              Сброс lock
            </Button>
            <Button variant="ghost" size="sm" onClick={refreshBotStatus}>
              Обновить статус
            </Button>
          </div>
          <div className="text-sm text-muted-foreground space-y-1">
            <div>
              Статус: <span className="font-medium">{botStatus?.status === 'running' || botStatus?.lockFresh ? 'running' : (botStatus?.status || 'unknown')}</span>
              {botStatus?.lockFresh && botStatus?.status !== 'running' ? ' (remote)' : ''}
            </div>
            {botStatus?.lastStartedAt && <div>Последний старт: {new Date(botStatus.lastStartedAt).toLocaleString()}</div>}
            {botStatus?.lastStoppedAt && <div>Последняя остановка: {new Date(botStatus.lastStoppedAt).toLocaleString()}</div>}
            {botStatus?.lastError && <div className="text-destructive">Ошибка: {botStatus.lastError}</div>}
            {botStatus?.lock?.instanceId && (
              <div>
                Lock: {botStatus.lock.instanceId}
                {botStatus.lockFresh ? ' (активен)' : ' (просрочен)'}
              </div>
            )}
            {botStatus?.lock?.lastHeartbeatAt && <div>Heartbeat: {new Date(botStatus.lock.lastHeartbeatAt).toLocaleString()}</div>}
          </div>
          <div className="rounded-md border p-3 text-xs text-muted-foreground space-y-1">
            <div className="font-semibold text-sm text-foreground">Настройки</div>
            <div>Bot enabled: {envSettings?.telegramBotEnabled ? 'yes' : 'no'}</div>
            <div>Mode: {envSettings?.telegramBotMode || 'polling'}</div>
            <div>Webhook URL: {envSettings?.telegramBotWebhookUrl ? envSettings.telegramBotWebhookUrl : 'не задан'}</div>
            <div>Webhook secret: {envSettings?.telegramBotSecretToken ? 'задан' : 'не задан'}</div>
            <div>Bot token: {envSettings?.telegramBotToken ? 'задан' : 'не задан'}</div>
            <div>Bot URL: {envSettings?.nextPublicTelegramBotUrl || 'не задан'}</div>
          </div>
          {botStatus?.logs?.length ? (
            <div className="max-h-48 overflow-auto rounded-md border text-xs">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Время</TableHead>
                    <TableHead>Уровень</TableHead>
                    <TableHead>Сообщение</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {botStatus.logs.map((l: any, idx: number) => (
                    <TableRow key={idx}>
                      <TableCell className="whitespace-nowrap">{l.ts}</TableCell>
                      <TableCell>{l.level}</TableCell>
                      <TableCell className="max-w-[420px] whitespace-pre-wrap">{l.msg}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Логи отсутствуют.</p>
          )}
          <Alert variant="default">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Webhook режим</AlertTitle>
            <AlertDescription>
              Если выбрана схема webhook, нужен публичный HTTPS endpoint. Укажите URL и secret в админке и в BotFather (`/setwebhook`). Polling работает локально (`npm run bot:local`).
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Тест Telegram</CardTitle>
          <CardDescription>Проверка токена, наличия chat_id у админа и тестового сообщения.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('token', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const env = await getEnvSettings({ requesterId: adminUser.uid, requireAdmin: true });
            if (!env.telegramBotToken) throw new Error('Токен не задан в настройках');
          })}>
            Токен {renderStatusIcon(testStatus.token)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('chat', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            if (!adminUser.telegramChatId) throw new Error('У админа нет chat_id. Привяжите Telegram в профиле.');
          })}>
            Chat ID {renderStatusIcon(testStatus.chat)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('send', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            if (!adminUser.telegramChatId) throw new Error('Нет chat_id для отправки.');
            const result = await sendTelegramMessageToUser({
              adminUserId: adminUser.uid,
              targetUserId: adminUser.uid,
              message: 'Тестовое сообщение от администратора.',
            });
            if (!result.success) throw new Error(result.message);
          })}>
            Тест-сообщение {renderStatusIcon(testStatus.send)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('mongo', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const result = await testTelegramMongoConnection(adminUser.uid);
            if (!result.success) throw new Error(result.message);
          })}>
            MongoDB {renderStatusIcon(testStatus.mongo)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('api', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const result = await testTelegramApiConnection(adminUser.uid);
            if (!result.success) throw new Error(result.message);
          })}>
            Telegram API {renderStatusIcon(testStatus.api)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('webhook', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const result = await testTelegramWebhookInfo(adminUser.uid);
            if (!result.success) throw new Error(result.message);
          })}>
            Webhook {renderStatusIcon(testStatus.webhook)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('ping', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const result = await pingTelegramBot(adminUser.uid);
            if (!result.success) throw new Error(result.message);
          })}>
            Ping bot {renderStatusIcon(testStatus.ping)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTest('webhook_ping', async () => {
            if (!adminUser) throw new Error('Админ не найден.');
            const result = await pingTelegramWebhookEndpoint(adminUser.uid);
            if (!result.success) throw new Error(result.message);
          })}>
            Ping webhook {renderStatusIcon(testStatus.webhook_ping)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Пользователи Telegram</CardTitle>
          <CardDescription>
            Список пользователей, синхронизировавших свой аккаунт с Telegram-ботом. ({sortedAndFilteredUsers.length} / {users.length} всего)
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="mb-4">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                        placeholder="Поиск по email или имени в Telegram..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

          {sortedAndFilteredUsers.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Пользователи с привязанным Telegram не найдены.</p>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIcon('email')}</Button></TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('systemRole')}>Роль {getSortIcon('systemRole')}</Button></TableHead>
                    <TableHead className="text-center"><Button variant="ghost" onClick={() => requestSort('credits')}>Кредиты {getSortIcon('credits')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>Дата рег. {getSortIcon('createdAt')}</Button></TableHead>
                    <TableHead className="text-right">Действия</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedAndFilteredUsers.map((user) => (
                    <TableRow key={user.uid}>
                      <TableCell className="font-medium max-w-[150px] truncate sm:max-w-none">{user.email}</TableCell>
                      <TableCell>@{user.telegramUsername || 'N/A'}</TableCell>
                      <TableCell><Badge variant="secondary">{user.systemRole}</Badge></TableCell>
                      <TableCell className="text-center">{user.credits}</TableCell>
                      <TableCell className="max-w-[100px] truncate sm:max-w-none">{user.createdAt?.toDate ? format(user.createdAt.toDate(), 'dd.MM.yyyy', { locale: ru }) : 'N/A'}</TableCell>
                      <TableCell className="text-right">
                         <Button variant="ghost" size="sm" onClick={() => handleOpenMessageDialog(user)} disabled={isSending}>
                              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Send className="mr-2 h-4 w-4" />}
                              Сообщение
                         </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Message Dialog */}
       <Dialog open={isMessageDialogOpen} onOpenChange={setIsMessageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отправить сообщение</DialogTitle>
            <DialogDescription>
              Сообщение будет отправлено пользователю {selectedUser?.email} в Telegram от имени бота.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="message-text">Текст сообщения</Label>
            <Textarea 
                id="message-text"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder="Введите ваше сообщение..."
                rows={5}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMessageDialogOpen(false)}>Отмена</Button>
            <Button onClick={handleSendMessage} disabled={isSending || !messageText.trim()}>
              {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
              Отправить
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
