// src/components/admin/dialogs/UserCreditHistoryDialog.tsx
"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreditHistory } from '@/components/CreditHistory';
import type { AppUser } from '@/contexts/AppContext';

interface UserCreditHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  user: AppUser | null;
}

export function UserCreditHistoryDialog({ isOpen, onClose, currentUserId, user }: UserCreditHistoryDialogProps) {
  if (!user) return null;
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>История кредитов пользователя</DialogTitle>
        </DialogHeader>
        <CreditHistory
          currentUserId={currentUserId}
          targetUserId={user.uid}
          title={`${user.displayName} (${user.email || 'без email'})`}
          description="Все операции по кредитам пользователя."
        />
      </DialogContent>
    </Dialog>
  );
}
