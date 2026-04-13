// src/components/admin/dialogs/AddCreditsDialog.tsx
"use client";

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { addCreditsToUser } from '@/actions/adminActions';
import type { AppUser } from '@/contexts/AppContext';
import { BottomGradient, LabelInputContainer } from '@/components/ui/aceternity-ui';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AddCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  user: AppUser | null;
  currentUserId: string;
}

export function AddCreditsDialog({ isOpen, onClose, onSuccess, user, currentUserId }: AddCreditsDialogProps) {
  const [creditsToAdd, setCreditsToAdd] = useState<number>(10);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleUpdate = () => {
    if (!user || !currentUserId || creditsToAdd <= 0) {
      toast({ title: "Ошибка", description: "Количество кредитов должно быть положительным числом.", variant: "destructive" });
      return;
    }
    startTransition(async () => {
      const result = await addCreditsToUser({ currentUserId, targetUid: user.uid, amount: creditsToAdd });
      if (result.success) {
        toast({ title: "Успех", description: result.message });
        onSuccess();
      } else {
        toast({ title: "Ошибка", description: result.message, variant: "destructive" });
      }
      onClose();
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Начислить кредиты</DialogTitle>
          <DialogDescription>
            Начисление кредитов для {user?.email}.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <LabelInputContainer>
            <Label htmlFor="credits-input">Количество кредитов</Label>
            <Input
              id="credits-input"
              type="number"
              value={creditsToAdd}
              onChange={(e) => setCreditsToAdd(Number(e.target.value))}
              placeholder="Введите количество"
              min="1"
            />
          </LabelInputContainer>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>Отмена</Button>
          <button
              className="group/btn relative inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
              type="button"
              onClick={handleUpdate} 
              disabled={isPending || creditsToAdd <= 0}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Начислить
            <BottomGradient />
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
