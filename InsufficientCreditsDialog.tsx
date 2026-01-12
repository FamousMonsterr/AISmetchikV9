// src/components/InsufficientCreditsDialog.tsx
"use client";

import { useMemo, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CreditCard, Gift, Users, CalendarClock, AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import promoConfig from '@/lib/promo-config.json';

interface InsufficientCreditsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InsufficientCreditsDialog({ isOpen, onClose }: InsufficientCreditsDialogProps) {
  const router = useRouter();
  const [isNavigating, startNavigation] = useTransition();

  const daysUntilNextMonth = useMemo(() => {
    const now = new Date();
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const diffTime = Math.abs(startOfNextMonth.getTime() - now.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, []);

  const handleNavigation = (path: string) => {
    startNavigation(() => {
        router.push(path);
        onClose();
    });
  };

  const referralBonus = promoConfig.referralProgram.referrerBonus;


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-destructive"/>
            Недостаточно кредитов
          </DialogTitle>
          <DialogDescription>
            Для анализа файла требуется 1 кредит. Вы можете получить больше кредитов несколькими способами.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4 space-y-4">
            <Alert>
                <CalendarClock className="h-4 w-4" />
                <AlertTitle>Дождитесь пополнения</AlertTitle>
                <AlertDescription>
                    Кредиты будут автоматически пополнены в начале следующего месяца. Осталось дней: {daysUntilNextMonth}.
                </AlertDescription>
            </Alert>
           <div className="space-y-2">
                 <Button className="w-full justify-start h-auto p-3" variant="outline" onClick={() => handleNavigation('/dashboard/billing')} disabled={isNavigating}>
                    {isNavigating ? <Loader2 className="mr-3 h-5 w-5 animate-spin"/> : <CreditCard className="mr-3 h-5 w-5"/>}
                    <div className="text-left">
                        <p className="font-semibold">Пополнить баланс</p>
                        <p className="text-xs text-muted-foreground">Купите пакет кредитов, чтобы продолжить работу.</p>
                    </div>
                </Button>
                 <Button className="w-full justify-start h-auto p-3" variant="outline" onClick={() => handleNavigation('/dashboard/bonus')} disabled={isNavigating}>
                    {isNavigating ? <Loader2 className="mr-3 h-5 w-5 animate-spin"/> : <Gift className="mr-3 h-5 w-5"/>}
                     <div className="text-left">
                        <p className="font-semibold">Пригласить друга</p>
                        <p className="text-xs text-muted-foreground">Получите {referralBonus.credits} кредитов за каждого друга.</p>
                    </div>
                </Button>
           </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={onClose}>
            Закрыть
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
