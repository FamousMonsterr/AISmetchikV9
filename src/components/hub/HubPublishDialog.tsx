'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Globe, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HubPublishDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTitle: string;
  onConfirm: () => Promise<void>;
}

export function HubPublishDialog({ open, onOpenChange, orderId, orderTitle, onConfirm }: HubPublishDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handlePublish = async () => {
    setLoading(true);
    try {
      await onConfirm();
      toast({ title: 'Заказ опубликован!', description: 'Исполнители увидят ваш заказ в ленте' });
      onOpenChange(false);
    } catch {
      toast({ title: 'Ошибка публикации', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Опубликовать в Хабе
          </DialogTitle>
          <DialogDescription>
            Заказ станет доступен всем исполнителям в разделе «Найти работу»
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="p-4 rounded-lg bg-muted/50">
            <p className="font-medium">{orderTitle}</p>
          </div>

          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Размещение заказа — бесплатно</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Исполнители увидят AI-смету и ваш бюджет</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              <span>Вы получите уведомления об откликах</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Позже
          </Button>
          <Button onClick={handlePublish} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Globe className="h-4 w-4 mr-2" />}
            Опубликовать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
