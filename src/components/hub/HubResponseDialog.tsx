'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Send } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitHubResponse } from '@/actions/hubActions';

interface HubResponseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderTitle: string;
  onSuccess?: () => void;
}

export function HubResponseDialog({ open, onOpenChange, orderId, orderTitle, onSuccess }: HubResponseDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [proposedDeadline, setProposedDeadline] = useState('');

  const handleSubmit = async () => {
    if (!message || !proposedPrice || !proposedDeadline) {
      toast({ title: 'Заполните все поля', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await submitHubResponse({
        orderId,
        message,
        proposedPrice: Number(proposedPrice),
        proposedDeadline,
      });

      if (result.success) {
        toast({ title: result.message });
        onOpenChange(false);
        setMessage('');
        setProposedPrice('');
        setProposedDeadline('');
        onSuccess?.();
      } else {
        toast({ title: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка отправки отклика', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Отклик на заказ</DialogTitle>
          <DialogDescription className="line-clamp-1">{orderTitle}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="response-message">Сопроводительное сообщение</Label>
            <Textarea
              id="response-message"
              placeholder="Опишите ваш опыт и почему вы подходите для этого заказа..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="response-price">Ваша цена (₽)</Label>
              <Input
                id="response-price"
                type="number"
                placeholder="100 000"
                value={proposedPrice}
                onChange={(e) => setProposedPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="response-deadline">Срок выполнения</Label>
              <Input
                id="response-deadline"
                type="date"
                value={proposedDeadline}
                onChange={(e) => setProposedDeadline(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="p-3 rounded-lg bg-muted/50 text-sm text-muted-foreground">
            Стоимость отклика: <span className="font-semibold text-foreground">500 ₽</span>.
            На тарифе PRO — 3 отклика/мес бесплатно.
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Откликнуться
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
