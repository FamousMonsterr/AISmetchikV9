// src/components/admin/UserRow.tsx
"use client";

import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { MoreHorizontal, UserCog, CreditCard, Ban, ShieldCheck, Archive, ShieldX, History } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { type AppUser } from "@/contexts/AppContext";
import { type ActionType } from './dialogs/ConfirmActionDialog';

interface UserRowProps {
    user: AppUser;
    currentUserId: string;
    onOpenPermissionsModal: () => void;
    onOpenCreditsModal: () => void;
    onOpenCreditHistory: () => void;
    onOpenConfirmDialog: (type: ActionType) => void;
}

const safeFormatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'dd.MM.yyyy', { locale: ru });
}

export function UserRow({ user, currentUserId, onOpenPermissionsModal, onOpenCreditsModal, onOpenCreditHistory, onOpenConfirmDialog }: UserRowProps) {
    const isCurrentUser = user.uid === currentUserId;
    const superAdminEmail = process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL;
    const isProtectedAdmin = !!superAdminEmail && user.email === superAdminEmail;

    return (
        <TableRow>
            <TableCell className="font-medium min-w-0">
                <div className="font-bold truncate">{user.displayName}</div>
                <div className="text-xs text-muted-foreground truncate">{user.email}</div>
            </TableCell>
            <TableCell>
                <Badge variant={user.systemRole === 'Super Admin' ? 'destructive' : 'secondary'}>
                    {user.systemRole}
                </Badge>
            </TableCell>
            <TableCell>
                <Badge variant={user.plan === 'Free' ? 'outline' : 'default'}>
                    {user.plan}
                </Badge>
            </TableCell>
            <TableCell className="text-right">{user.credits}</TableCell>
            <TableCell>{safeFormatDate(user.createdAt)}</TableCell>
            <TableCell className="text-right">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Открыть меню</span>
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={onOpenPermissionsModal}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Права и доступы
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onOpenCreditsModal}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            Начислить кредиты
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onOpenCreditHistory}>
                            <History className="mr-2 h-4 w-4" />
                            История кредитов
                        </DropdownMenuItem>
                        {!isCurrentUser && !isProtectedAdmin && (
                            <>
                                <DropdownMenuSeparator />
                                {user.status === 'active' ? (
                                    <DropdownMenuItem onClick={() => onOpenConfirmDialog('block')}>
                                        <Ban className="mr-2 h-4 w-4 text-destructive" />
                                        Заблокировать
                                    </DropdownMenuItem>
                                ) : (
                                    <DropdownMenuItem onClick={() => onOpenConfirmDialog('unblock')}>
                                        <ShieldCheck className="mr-2 h-4 w-4 text-green-600" />
                                        Разблокировать
                                    </DropdownMenuItem>
                                )}
                                {!user.archivedAt && (
                                    <DropdownMenuItem className="text-destructive" onClick={() => onOpenConfirmDialog('archive')}>
                                        <ShieldX className="mr-2 h-4 w-4" />
                                        Архивировать
                                    </DropdownMenuItem>
                                )}
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </TableCell>
        </TableRow>
    );
}
