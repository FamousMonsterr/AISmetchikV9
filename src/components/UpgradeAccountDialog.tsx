// src/components/UpgradeAccountDialog.tsx
"use client";

import { useState, useTransition, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Star, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext, UserPlan, UserRole } from '@/contexts/AppContext';
import { activateTrial, getAppSettings } from '@/actions/adminActions';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import Link from 'next/link';

interface UpgradeAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  targetRole: 'PRO' | 'Business' | 'Enterprise';
  featureName?: string;
}

export function UpgradeAccountDialog({ isOpen, onClose, targetRole, featureName }: UpgradeAccountDialogProps) {
  const { user, effectivePlan } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [enterpriseEmail, setEnterpriseEmail] = useState('support@example.com');
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);

  const handleActivateTrial = () => {
    if (!user) return;
    startTransition(async () => {
      const result = await activateTrial({ userId: user.uid, plan: targetRole });
      if (result.success) {
        toast({
          title: "Пробный период активирован!",
          description: result.message,
          variant: "default",
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

  const hasUsedTrial = user?.hasUsedTrial || false;
  
  const roleHierarchy: UserPlan[] = ['Free', 'PRO', 'Business', 'Enterprise'];
  const currentRoleIndex = roleHierarchy.indexOf(effectivePlan as UserPlan);
  const targetRoleIndex = roleHierarchy.indexOf(targetRole);

  const isAlreadyOnHigherPlan = currentRoleIndex >= targetRoleIndex;
  const isRequestOnly = targetRole === 'Business' || targetRole === 'Enterprise';
  const isTrialAvailable = targetRole === 'PRO';
  const planExpiresAt = user?.planExpiresAt instanceof Date
    ? user.planExpiresAt
    : (user?.planExpiresAt as any)?.toDate?.();
  const expiresText = planExpiresAt ? new Date(planExpiresAt).toLocaleDateString('ru-RU') : null;

  const descriptionText = featureName 
    ? `Функция "${featureName}" доступна только на тарифах ${targetRole} и выше.`
    : `Эта функция доступна только на тарифах ${targetRole} и выше.`;

  useEffect(() => {
    if (!isOpen || !isRequestOnly) return;
    setIsLoadingEmail(true);
    getAppSettings()
      .then(settings => setEnterpriseEmail(settings.enterpriseEmail || 'support@example.com'))
      .catch(() => setEnterpriseEmail('support@example.com'))
      .finally(() => setIsLoadingEmail(false));
  }, [isOpen, isRequestOnly]);

  const mailtoHref = `mailto:${enterpriseEmail}?subject=${encodeURIComponent(`Запрос на тариф ${targetRole}`)}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-6 w-6 text-amber-500" />
            Перейти на тариф {targetRole}?
          </DialogTitle>
          <DialogDescription>
            {descriptionText} Разблокируйте полный потенциал EstimateAI.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          {isAlreadyOnHigherPlan ? (
             <Alert className="bg-green-50 border-green-200 text-green-800">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertTitle className="text-green-800">Функция уже доступна</AlertTitle>
                <AlertDescription className="text-green-700">
                   Ваш тариф "{effectivePlan}" уже выше или равен {targetRole}. {expiresText ? `Оплачено до ${expiresText}.` : 'Подписка активна.'}
                </AlertDescription>
            </Alert>
          ) : isRequestOnly ? (
            <Alert className="bg-blue-50 border-blue-200 text-blue-900">
              <CheckCircle className="h-4 w-4 text-blue-700" />
              <AlertTitle className="text-blue-900">Подключение по запросу</AlertTitle>
              <AlertDescription className="text-blue-800">
                Тариф {targetRole} подключается только по заявке. Пробный период для Business/Enterprise не предусмотрен.
              </AlertDescription>
            </Alert>
          ) : hasUsedTrial ? (
            <Alert>
               <CheckCircle className="h-4 w-4" />
                <AlertTitle>Покупка тарифа</AlertTitle>
                <AlertDescription>
                   Вы уже использовали пробный период. Для доступа к этой функции необходимо приобрести подписку на странице "Баланс".
                </AlertDescription>
            </Alert>
          ) : (
             <Alert variant="default" className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600"/>
                <AlertTitle className="text-green-800">Активируйте бесплатный пробный период!</AlertTitle>
                <AlertDescription className="text-green-700">
                  Получите полный доступ ко всем функциям тарифа **{targetRole} на 3 дня** абсолютно бесплатно.
                </AlertDescription>
            </Alert>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Закрыть</Button>
          {!isAlreadyOnHigherPlan && (
              isRequestOnly ? (
                <Button asChild variant="secondary" disabled={isLoadingEmail}>
                  <a href={mailtoHref}>
                    {isLoadingEmail ? "Загрузка..." : `Запросить ${targetRole}`}
                  </a>
                </Button>
              ) : hasUsedTrial ? (
                <Button asChild>
                  <Link href="/dashboard/billing">Перейти к оплате</Link>
                </Button>
              ) : (
                <Button onClick={handleActivateTrial} disabled={isPending || !isTrialAvailable}>
                  {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Попробовать {targetRole} бесплатно
                </Button>
              )
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
