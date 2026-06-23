'use client';

import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Star } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { submitHubReview } from '@/actions/hubActions';

interface HubReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  toUserId: string;
  toUserName: string;
  role: 'contractor' | 'client';
  onSuccess?: () => void;
}

export function HubReviewDialog({ open, onOpenChange, orderId, toUserId, toUserName, role, onSuccess }: HubReviewDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: 'Поставьте оценку', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const result = await submitHubReview({ orderId, toUserId, rating, comment, role });
      if (result.success) {
        toast({ title: result.message });
        onOpenChange(false);
        setRating(0);
        setComment('');
        onSuccess?.();
      } else {
        toast({ title: result.message, variant: 'destructive' });
      }
    } catch {
      toast({ title: 'Ошибка отправки отзыва', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Оставить отзыв</DialogTitle>
          <DialogDescription>
            Оцените {role === 'contractor' ? 'исполнителя' : 'заказчика'} {toUserName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Star rating */}
          <div>
            <Label>Оценка</Label>
            <div className="flex items-center gap-1 mt-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hoverRating || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-muted-foreground">
                  {rating === 1 && 'Ужасно'}
                  {rating === 2 && 'Плохо'}
                  {rating === 3 && 'Нормально'}
                  {rating === 4 && 'Хорошо'}
                  {rating === 5 && 'Отлично'}
                </span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="review-comment">Комментарий</Label>
            <Textarea
              id="review-comment"
              placeholder="Расскажите о сотрудничестве..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Отправить отзыв
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
