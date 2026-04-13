// src/components/HighTierPartnerDialog.tsx
"use client";

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { createServiceRequest } from '@/actions/serviceRequestActions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';

interface HighTierPartnerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  tier: 'Silver' | 'Gold' | 'Platinum';
}

const tierDetails = {
    Silver: {
        title: "Серебряный партнер",
        description: "Повышение статуса после прохождения обучения и подтверждения активности.",
        conditions: [
            "Пройти базовое обучение.",
            "Подтвердить активность в привлечении клиентов.",
        ],
    },
    Gold: {
        title: "Золотой партнер",
        description: "Этот статус предназначен для серьезных партнеров, готовых работать как юридическое лицо и вкладываться в развитие. Вы получите значительно более высокий процент от платежей ваших клиентов.",
        conditions: [
            "Заключение договора франшизы.",
            "Работа через ИП или ООО.",
            "Оплата паушального взноса в размере 500,000 руб.",
        ],
    },
    Platinum: {
        title: "Платиновый партнер",
        description: "Максимальный уровень партнерства с возможностью работы по модели White Label (под вашим брендом).",
        conditions: [
            "Все условия Золотого статуса.",
            "Оплата паушального взноса в размере 1,000,000 руб.",
            "Возможность использовать ПО под собственным брендом.",
        ],
    }
}

export function HighTierPartnerDialog({ isOpen, onClose, tier }: HighTierPartnerDialogProps) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const details = tierDetails[tier];

  const handleSubmit = () => {
    if (!user) return;

    startTransition(async () => {
      const result = await createServiceRequest({
        userId: user.uid,
        userName: user.displayName,
        userEmail: user.email || 'N/A',
        type: 'partner_status',
        payload: { desiredTier: tier },
      });

      if (result.success) {
        toast({
          title: "Заявка отправлена!",
          description: result.message,
        });
        onClose();
      } else {
        toast({
          title: "Ошибка",
          description: result.message,
          variant: "destructive",
        });
      }
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Заявка на статус "{details.title}"</DialogTitle>
          <DialogDescription>{details.description}</DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <h4 className="font-semibold">Основные условия:</h4>
             <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
                {details.conditions.map((cond, i) => <li key={i}>{cond}</li>)}
             </ul>
             <Alert>
                <AlertTitle>Следующий шаг</AlertTitle>
                <AlertDescription>
                    После отправки заявки наш менеджер свяжется с вами для обсуждения деталей и назначения встречи.
                </AlertDescription>
            </Alert>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Закрыть
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Оставить заявку
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
