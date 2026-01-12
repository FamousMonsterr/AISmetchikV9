// src/components/admin/dialogs/ConfirmActionDialog.tsx
"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { AppUser } from '@/contexts/AppContext';

export type ActionType = 'block' | 'unblock' | 'archive';

interface ConfirmActionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: AppUser | null;
  actionType: ActionType | null;
  isPending: boolean;
}

export function ConfirmActionDialog({ isOpen, onClose, onConfirm, user, actionType, isPending }: ConfirmActionDialogProps) {
  const descriptions: Record<ActionType, string> = {
    block: `Вы действительно хотите заблокировать пользователя ${user?.email}? Он не сможет войти в систему.`,
    unblock: `Вы действительно хотите разблокировать пользователя ${user?.email}?`,
    archive: `Вы действительно хотите архивировать пользователя ${user?.email}? Это действие необратимо.`
  };

  const titles: Record<ActionType, string> = {
    block: 'Заблокировать пользователя?',
    unblock: 'Разблокировать пользователя?',
    archive: 'Архивировать пользователя?'
  }

  const buttonLabels: Record<ActionType, string> = {
    block: 'Заблокировать',
    unblock: 'Разблокировать',
    archive: 'Да, архивировать'
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="truncate">{actionType ? titles[actionType] : 'Вы уверены?'}</AlertDialogTitle>
          <AlertDialogDescription>
            {actionType ? descriptions[actionType] : ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={isPending}>Отмена</Button>
          <AlertDialogAction 
            onClick={onConfirm} 
            className={cn(actionType === 'archive' && "bg-destructive hover:bg-destructive/90")}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {actionType ? buttonLabels[actionType] : 'Подтвердить'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
