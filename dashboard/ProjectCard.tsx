// src/components/dashboard/ProjectCard.tsx
"use client";

import { useState } from 'react';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/components/ui/alert-dialog";
import { Eye, Pencil, MessageSquareWarning, Archive, ArchiveRestore, Unlink, Trash2, Loader2, GitCommit } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { HistoryRequest } from "@/contexts/AppContext";
import { Details } from '../Details';
import { Input } from '../ui/input';

const getStatusBadge = (status: HistoryRequest['status']) => {
    switch (status) {
        case 'success': return <Badge variant="secondary" className="text-green-600 border-green-500">Успешно</Badge>;
        case 'draft': return <Badge variant="outline">Версия</Badge>;
        case 'processing': return <Badge variant="outline"><Loader2 className="h-3 w-3 mr-1 animate-spin"/>Обработка</Badge>;
        case 'failed': return <Badge variant="destructive">Ошибка</Badge>;
        case 'reported': return <Badge variant="destructive">Жалоба</Badge>;
        default: return <Badge variant="secondary">{status}</Badge>;
    }
};

const safeFormatDate = (timestamp: any): string => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    if (isNaN(date.getTime())) return 'Invalid Date';
    return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
}

export function ProjectCard({ item, isGrouped, onSelectionChange, selection, isActionPending, onViewResult, onUngroup, onArchive, onUnarchive, onReport, onDelete, onRenameProject, onViewVersions, activeTab }: any) {
    const isActionDisabled = isActionPending;
    const [isRenaming, setIsRenaming] = useState(false);
    const [newName, setNewName] = useState(item.fileName);

    const handleRename = () => {
        if (newName !== item.fileName && newName.trim() !== '') {
            onRenameProject(item.id, newName.trim());
        }
        setIsRenaming(false);
    }
    
    return (
        <Card className={cn("p-3 transition-colors", selection.has(item.id) && "bg-secondary")}>
            <div className="flex items-start gap-3">
               {!isGrouped && (activeTab === 'active' || activeTab === 'archived') && (
                   <Checkbox
                        id={`select-${item.id}`}
                        checked={selection.has(item.id)}
                        onCheckedChange={(checked) => onSelectionChange(item.id, !!checked)}
                        className="mt-1"
                    />
               )}
                <div className="flex-1 min-w-0">
                    {isRenaming ? (
                        <Input 
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            onBlur={handleRename}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            className="text-base font-medium h-8"
                            autoFocus
                        />
                    ) : (
                        <p className="font-medium truncate cursor-pointer" onClick={() => setIsRenaming(true)}>{item.fileName}</p>
                    )}
                    <Details title="Детали">
                        <div className="text-xs text-muted-foreground space-y-1 mt-1">
                            <p className="truncate"><strong>Версия:</strong> {item.version || 1}</p>
                            <p className="truncate"><strong>ID:</strong> {item.id}</p>
                            <p className="truncate"><strong>Дата:</strong> {safeFormatDate(item.timestamp)}</p>
                        </div>
                    </Details>
                    <div className="mt-2 flex gap-2">
                        {getStatusBadge(item.status)}
                    </div>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => onViewResult(item)} disabled={isActionDisabled}>
                        {isActionDisabled ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Eye className="mr-2 h-4 w-4" />}
                        <span className="hidden sm:inline">Просмотр</span>
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-auto px-2 py-1" disabled={isActionDisabled}>
                                <Pencil className="mr-2 h-4 w-4" />
                                <span className="hidden sm:inline">Действия</span>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => onViewVersions(item)}>
                                <GitCommit className="mr-2 h-4 w-4"/>Просмотреть версии
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                             {isGrouped ? (
                                <DropdownMenuItem onSelect={() => onUngroup([item.id])}>
                                    <Unlink className="mr-2 h-4 w-4" />
                                    Открепить от группы
                                </DropdownMenuItem>
                             ) : (
                                <>
                                    {activeTab !== "archived" && (
                                        <DropdownMenuItem onSelect={() => onArchive([item.id])}>
                                            <Archive className="mr-2 h-4 w-4" />
                                            Архивировать
                                        </DropdownMenuItem>
                                     )}
                                     {activeTab === "archived" && (
                                        <DropdownMenuItem onSelect={() => onUnarchive([item.id])}>
                                            <ArchiveRestore className="mr-2 h-4 w-4" />
                                            Восстановить
                                        </DropdownMenuItem>
                                     )}
                                    {item.status === 'success' && (
                                         <DropdownMenuItem onSelect={() => onReport(item)}>
                                            <MessageSquareWarning className="mr-2 h-4 w-4 text-orange-500"/>
                                            Пожаловаться
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <DropdownMenuItem className="text-destructive" onSelect={(e) => e.preventDefault()}>
                                                <Trash2 className="mr-2 h-4 w-4"/>
                                                Удалить навсегда
                                            </DropdownMenuItem>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                <AlertDialogDescription>Это действие нельзя отменить. Проект будет удален навсегда.</AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                <AlertDialogAction className="bg-destructive" onClick={() => onDelete(item.id)}>Удалить</AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </>
                             )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </Card>
    );
};
