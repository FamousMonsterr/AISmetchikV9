'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Send, Calendar, Banknote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getMyHubResponses } from '@/actions/hubActions';
import type { HubResponse } from '@/types/hub';

export default function MyHubResponsesPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<(HubResponse & { orderTitle?: string })[]>([]);

  useEffect(() => {
    getMyHubResponses()
      .then(setResponses)
      .catch(() => toast({ title: 'Ошибка загрузки', variant: 'destructive' }))
      .finally(() => setLoading(false));
  }, [toast]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Send className="h-5 w-5" />
            Мои отклики
          </h1>
          <p className="text-sm text-muted-foreground">Все ваши отклики на заказы в Хабе</p>
        </div>
      </div>

      {responses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Send className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-lg font-medium">У вас пока нет откликов</p>
            <Button className="mt-3" onClick={() => router.push('/dashboard/hub?tab=work')}>
              Найти работу
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {responses.map((r) => (
            <Card
              key={r.id}
              className="cursor-pointer hover:shadow-sm transition-shadow"
              onClick={() => router.push(`/dashboard/hub/orders/${r.orderId}`)}
            >
              <CardContent className="py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{r.orderTitle || 'Заказ'}</p>
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">{r.message}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1 font-medium text-foreground">
                        <Banknote className="h-3.5 w-3.5" />
                        {r.proposedPrice.toLocaleString('ru-RU')} ₽
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        до {new Date(r.proposedDeadline).toLocaleDateString('ru-RU')}
                      </span>
                      {r.creditsSpent > 0 && (
                        <span className="text-xs text-muted-foreground">
                          Списано: {r.creditsSpent} ₽
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge variant={
                    r.status === 'accepted' ? 'default' :
                    r.status === 'rejected' ? 'destructive' : 'secondary'
                  } className="shrink-0">
                    {r.status === 'pending' && 'Ожидает'}
                    {r.status === 'accepted' && 'Принят'}
                    {r.status === 'rejected' && 'Отклонён'}
                    {r.status === 'withdrawn' && 'Отозван'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
