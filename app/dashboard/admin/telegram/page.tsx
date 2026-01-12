// src/components/admin/TelegramUsersManagement.tsx
"use client";

import { useState, useEffect, useTransition, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Send, ArrowUpDown, Search } from "lucide-react";
import { useToast } from '@/hooks/use-toast';
import { getTelegramUsers, sendTelegramMessageToUser } from '@/actions/adminActions';
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

type SortKey = keyof AppUser | 'credits';

export default function TelegramUsersPage() {
  const { toast } = useToast();
  const { user: adminUser } = useAppContext();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, startSendingTransition] = useTransition();

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
      if (!selectedUser.telegramChatId) {
        toast({ title: "Ошибка", description: "У пользователя отсутствует ID чата.", variant: "destructive" });
        return;
      }
      
      const result = await sendTelegramMessageToUser({
          adminUserId: adminUser.uid,
          targetUserChatId: selectedUser.telegramChatId,
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


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-40">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
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
