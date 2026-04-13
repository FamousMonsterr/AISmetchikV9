// src/hooks/use-service-request.ts
"use client";

import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAppContext } from '@/contexts/AppContext';
import { createServiceRequest, type ServiceRequestType } from '@/actions/serviceRequestActions';

type SubmitParams = {
  type: ServiceRequestType;
  payload?: Record<string, any>;
  successTitle?: string;
  errorTitle?: string;
};

export function useServiceRequest(defaultPayload: Record<string, any> = {}) {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  const submit = ({ type, payload, successTitle, errorTitle }: SubmitParams) => {
    if (!user) {
      toast({ title: 'Требуется вход', description: 'Авторизуйтесь, чтобы отправить заявку.', variant: 'destructive' });
      return;
    }
    startTransition(async () => {
      const result = await createServiceRequest({
        userId: user.uid,
        userName: user.displayName || '',
        userEmail: user.email || '',
        type,
        payload: { ...defaultPayload, ...(payload || {}) },
      });
      if (result.success) {
        toast({ title: successTitle || 'Заявка отправлена', description: result.message });
      } else {
        toast({ title: errorTitle || 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  return { isPending, submit };
}
