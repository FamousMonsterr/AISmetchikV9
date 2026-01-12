// src/app/dashboard/admin/users/page.tsx
"use client";

import { useState, useEffect, useMemo, useCallback, useTransition } from 'react';
import { type AppUser, useAppContext } from '@/contexts/AppContext';
import { getAllUsers, setUserStatus, archiveUser, updateUsersInBulk } from '@/actions/adminActions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MoreHorizontal, Loader2, Search, ArrowUpDown, Wand, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserPermissionsDialog } from '@/components/admin/dialogs/UserPermissionsDialog';
import { AddCreditsDialog } from '@/components/admin/dialogs/AddCreditsDialog';
import { ConfirmActionDialog, type ActionType } from '@/components/admin/dialogs/ConfirmActionDialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserRow } from '@/components/admin/UserRow';
import { BulkUpdateDialog } from '@/components/admin/dialogs/BulkUpdateDialog';

type SortKey = keyof AppUser | 'credits' | 'createdAt';

export default function AdminUsersPage() {
  const { user: currentUser } = useAppContext();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();
  const [isActionPending, startActionTransition] = useTransition();

  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const [isCreditsModalOpen, setIsCreditsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isBulkUpdateOpen, setIsBulkUpdateOpen] = useState(false);
  const [actionType, setActionType] = useState<ActionType | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });
  
  const managers = useMemo(() => users.filter(u => u.systemRole === 'Admin' || u.systemRole === 'Super Admin' || u.isPartner), [users]);

  const fetchUsers = useCallback(async () => {
    if (!currentUser || currentUser.systemRole !== 'Super Admin') return;
    setIsLoading(true);
    try {
      const userList = await getAllUsers();
      setUsers(userList);
    } catch (error) {
      toast({ title: "Ошибка", description: "Не удалось загрузить список пользователей.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleAction = (user: AppUser, action: ActionType) => {
    if (!currentUser || currentUser.systemRole !== 'Super Admin') {
        toast({ title: 'Ошибка доступа', description: 'У вас нет прав для выполнения этого действия.', variant: 'destructive'});
        return;
    }

    startActionTransition(async () => {
        let result: { success: boolean; message: string };
        switch(action) {
            case 'block':
                result = await setUserStatus({ currentUserId: currentUser.uid, targetUid: user.uid, status: 'blocked' });
                break;
            case 'unblock':
                result = await setUserStatus({ currentUserId: currentUser.uid, targetUid: user.uid, status: 'active' });
                break;
            case 'archive':
                result = await archiveUser({ currentUserId: currentUser.uid, targetUid: user.uid });
                break;
            default:
                result = { success: false, message: 'Неизвестное действие.' };
        }
        
        if (result.success) {
            toast({ title: 'Успех', description: result.message });
            fetchUsers(); // Refresh data
        } else {
            toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        }
    });
  };

  const handleOpenPermissionsModal = (user: AppUser) => {
    setSelectedUser(user);
    setIsPermissionsModalOpen(true);
  };

  const handleOpenCreditsModal = (user: AppUser) => {
    setSelectedUser(user);
    setIsCreditsModalOpen(true);
  };

  const handleOpenConfirmDialog = (user: AppUser, type: ActionType) => {
    setSelectedUser(user);
    setActionType(type);
    setIsConfirmOpen(true);
  };

  const handleBulkUpdate = async (data: { model: string, filterType: 'plan' | 'role', filterValue: string }) => {
      startActionTransition(async () => {
          const result = await updateUsersInBulk(data);
          if (result.success) {
              toast({ title: "Массовое обновление", description: result.message });
              fetchUsers(); // Refresh data to show changes
          } else {
              toast({ title: "Ошибка", description: result.message, variant: 'destructive' });
          }
      });
  }

  const sortedAndFilteredUsers = useMemo(() => {
    let filtered = users.filter(user => 
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.systemRole?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.plan?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return filtered.sort((a, b) => {
        if (!sortConfig.key) return 0;
        const aValue = a[sortConfig.key as keyof AppUser];
        const bValue = b[sortConfig.key as keyof AppUser];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        let comparison = 0;
        if (sortConfig.key === 'createdAt' && a.createdAt?.toDate && b.createdAt?.toDate) {
             comparison = a.createdAt.toDate().getTime() - b.createdAt.toDate().getTime();
        } else if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else {
            comparison = String(aValue).localeCompare(String(bValue), 'ru');
        }
        
        return sortConfig.direction === 'asc' ? comparison : -comparison;
    });
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
        return <ArrowUpDown className="h-4 w-4 opacity-30" />;
      }
      return sortConfig.direction === 'asc' ? '🔼' : '🔽';
  };

  const { activeUsers, archivedUsers } = useMemo(() => {
    return sortedAndFilteredUsers.reduce((acc, user) => {
        if (user.archivedAt) acc.archivedUsers.push(user);
        else acc.activeUsers.push(user);
        return acc;
    }, { activeUsers: [] as AppUser[], archivedUsers: [] as AppUser[] });
  }, [sortedAndFilteredUsers]);
  
  const renderUserTable = (userList: AppUser[]) => {
      if (userList.length === 0) return <p className="p-4 text-center text-muted-foreground">Пользователи не найдены.</p>;
      return (
        <div className="border rounded-md">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[250px]"><Button variant="ghost" onClick={() => requestSort('email')}>Email {getSortIcon('email')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('systemRole')}>Роль {getSortIcon('systemRole')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('plan')}>План {getSortIcon('plan')}</Button></TableHead>
                        <TableHead className="text-right"><Button variant="ghost" onClick={() => requestSort('credits')}>Кредиты {getSortIcon('credits')}</Button></TableHead>
                        <TableHead><Button variant="ghost" onClick={() => requestSort('createdAt')}>Дата рег. {getSortIcon('createdAt')}</Button></TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                   {userList.map((user) => (
                      <UserRow 
                         key={user.uid}
                         user={user}
                         currentUserId={currentUser!.uid}
                         onOpenPermissionsModal={() => handleOpenPermissionsModal(user)}
                         onOpenCreditsModal={() => handleOpenCreditsModal(user)}
                         onOpenConfirmDialog={(action) => handleOpenConfirmDialog(user, action)}
                      />
                   ))}
                </TableBody>
            </Table>
        </div>
      );
  }

  return (
    <>
      <Card>
        <CardHeader className="flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle>Управление пользователями</CardTitle>
            <CardDescription>Просмотр и управление всеми пользователями системы.</CardDescription>
          </div>
          <Button variant="outline" onClick={() => setIsBulkUpdateOpen(true)}>
              <Wand className="mr-2 h-4 w-4"/>
              Массовое обновление
          </Button>
        </CardHeader>
        <CardContent>
           {isLoading ? (
                <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
           ) : (
                <>
                <div className="mb-4">
                    <div className="relative flex-1 min-w-[250px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Поиск по email, имени, роли, плану..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
                    </div>
                </div>
                <Tabs defaultValue="active" className="w-full">
                    <TabsList><TabsTrigger value="active">Активные ({activeUsers.length})</TabsTrigger><TabsTrigger value="archived">Архив ({archivedUsers.length})</TabsTrigger></TabsList>
                    <TabsContent value="active" className="mt-4">{renderUserTable(activeUsers)}</TabsContent>
                    <TabsContent value="archived" className="mt-4">{renderUserTable(archivedUsers)}</TabsContent>
                </Tabs>
                </>
           )}
        </CardContent>
      </Card>
      
      {isPermissionsModalOpen && selectedUser && currentUser && (
          <UserPermissionsDialog isOpen={isPermissionsModalOpen} onClose={() => setIsPermissionsModalOpen(false)} onSuccess={fetchUsers} user={selectedUser} currentUserId={currentUser.uid} managers={managers} />
      )}
      
      {isCreditsModalOpen && selectedUser && currentUser && (
          <AddCreditsDialog isOpen={isCreditsModalOpen} onClose={() => setIsCreditsModalOpen(false)} onSuccess={fetchUsers} user={selectedUser} currentUserId={currentUser.uid} />
      )}
       
      {isConfirmOpen && selectedUser && currentUser && (
          <ConfirmActionDialog isOpen={isConfirmOpen} onClose={() => setIsConfirmOpen(false)} onConfirm={() => actionType && handleAction(selectedUser, actionType)} user={selectedUser} actionType={actionType} isPending={isActionPending} />
      )}

      {isBulkUpdateOpen && (
          <BulkUpdateDialog 
            isOpen={isBulkUpdateOpen}
            onClose={() => setIsBulkUpdateOpen(false)}
            onConfirm={handleBulkUpdate}
          />
      )}
    </>
  );
}

    