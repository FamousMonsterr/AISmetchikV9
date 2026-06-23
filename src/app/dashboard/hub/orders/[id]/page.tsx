'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Loader2, ArrowLeft, MapPin, Calendar, Banknote, Eye, MessageSquare,
  Star, Send, CheckCircle2, XCircle, FileText, Download,
} from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { getHubOrderDetails, acceptHubResponse, rejectHubResponse } from '@/actions/hubActions';
import { HubEstimateView } from '@/components/hub/HubEstimateView';
import { HubResponseDialog } from '@/components/hub/HubResponseDialog';
import { HubReviewDialog } from '@/components/hub/HubReviewDialog';
import { HUB_CATEGORIES } from '@/types/hub';
import type { HubOrder, HubResponse, HubReview } from '@/types/hub';

export default function HubOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAppContext();
  const { toast } = useToast();

  const orderId = params.id as string;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<HubOrder | null>(null);
  const [responses, setResponses] = useState<HubResponse[]>([]);
  const [reviews, setReviews] = useState<HubReview[]>([]);
  const [responseDialogOpen, setResponseDialogOpen] = useState(false);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ userId: string; name: string; role: 'contractor' | 'client' } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getHubOrderDetails(orderId);
      if (data) {
        setOrder(data.order as HubOrder);
        setResponses(data.responses as HubResponse[]);
        setReviews(data.reviews as HubReview[]);
      }
    } catch {
      toast({ title: 'Ошибка загрузки', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [orderId, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isOwner = user?.uid === order?.userId;
  const hasResponded = responses.some(r => r.userId === user?.uid);

  const handleAccept = async (responseId: string) => {
    const result = await acceptHubResponse(responseId);
    if (result.success) {
      toast({ title: result.message });
      loadData();
    } else {
      toast({ title: result.message, variant: 'destructive' });
    }
  };

  const handleReject = async (responseId: string) => {
    const result = await rejectHubResponse(responseId);
    if (result.success) {
      toast({ title: result.message });
      loadData();
    } else {
      toast({ title: result.message, variant: 'destructive' });
    }
  };

  const openReviewDialog = (userId: string, name: string, role: 'contractor' | 'client') => {
    setReviewTarget({ userId, name, role });
    setReviewDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="container max-w-4xl mx-auto px-4 py-6 text-center">
        <p className="text-muted-foreground">Заказ не найден</p>
        <Button variant="link" onClick={() => router.push('/dashboard/hub')}>Вернуться в Хаб</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{order.title}</h1>
            <Badge className={
              order.status === 'open' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' :
              order.status === 'in_progress' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' :
              'bg-gray-100 text-gray-600'
            }>
              {order.status === 'open' ? 'Открыт' : order.status === 'in_progress' ? 'В работе' : order.status === 'completed' ? 'Завершён' : 'Отменён'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground flex items-center gap-3 mt-1">
            <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{order.city}</span>
            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />до {new Date(order.deadline).toLocaleDateString('ru-RU')}</span>
            <span className="flex items-center gap-1"><Eye className="h-3.5 w-3.5" />{order.viewCount}</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Description */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Описание</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm whitespace-pre-wrap">{order.description}</p>
            </CardContent>
          </Card>

          {/* AI Estimate */}
          {order.aiEstimate && <HubEstimateView estimate={order.aiEstimate} />}

          {/* Files */}
          {order.files.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Файлы ({order.files.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {order.files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted/50 text-sm">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} МБ</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Responses */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Отклики ({responses.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {responses.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Пока нет откликов</p>
              ) : (
                <div className="space-y-3">
                  {responses.map((r) => (
                    <div key={r.id} className="p-3 rounded-lg border">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={r.userAvatar} />
                          <AvatarFallback>{r.userName?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.userName || 'Исполнитель'}</span>
                            {r.userRating && r.userRating > 0 && (
                              <span className="flex items-center gap-0.5 text-xs">
                                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                {r.userRating}
                              </span>
                            )}
                            <Badge variant={
                              r.status === 'accepted' ? 'default' :
                              r.status === 'rejected' ? 'destructive' : 'secondary'
                            } className="text-xs">
                              {r.status === 'pending' ? 'Ожидает' : r.status === 'accepted' ? 'Принят' : 'Отклонён'}
                            </Badge>
                          </div>
                          <p className="text-sm mt-1">{r.message}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="font-medium text-foreground">{r.proposedPrice.toLocaleString('ru-RU')} ₽</span>
                            <span>до {new Date(r.proposedDeadline).toLocaleDateString('ru-RU')}</span>
                          </div>
                        </div>
                      </div>

                      {/* Owner actions */}
                      {isOwner && r.status === 'pending' && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <Button size="sm" onClick={() => handleAccept(r.id)}>
                            <CheckCircle2 className="h-4 w-4 mr-1" />Принять
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleReject(r.id)}>
                            <XCircle className="h-4 w-4 mr-1" />Отклонить
                          </Button>
                        </div>
                      )}

                      {/* Review button */}
                      {isOwner && r.status === 'accepted' && order.status === 'completed' && (
                        <Button size="sm" variant="outline" className="mt-3" onClick={() => openReviewDialog(r.userId!, r.userName || 'Исполнитель', 'contractor')}>
                          <Star className="h-4 w-4 mr-1" />Оценить
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Budget */}
          <Card>
            <CardContent className="py-4 space-y-3">
              <div>
                <div className="text-xs text-muted-foreground mb-1">Бюджет</div>
                <div className="text-lg font-bold">
                  {order.budget.min.toLocaleString('ru-RU')} – {order.budget.max.toLocaleString('ru-RU')} ₽
                </div>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Категория</div>
                <Badge variant="outline">{HUB_CATEGORIES[order.category]}</Badge>
              </div>
              <Separator />
              <div>
                <div className="text-xs text-muted-foreground mb-1">Заказчик</div>
                <div className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={order.userAvatar} />
                    <AvatarFallback>{order.userName?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{order.userName || 'Заказчик'}</p>
                    {order.userRating && order.userRating > 0 && (
                      <span className="flex items-center gap-0.5 text-xs">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        {order.userRating}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action buttons */}
          {!isOwner && order.status === 'open' && !hasResponded && (
            <Button className="w-full" onClick={() => setResponseDialogOpen(true)}>
              <Send className="h-4 w-4 mr-2" />
              Откликнуться
            </Button>
          )}

          {!isOwner && hasResponded && (
            <Badge variant="secondary" className="w-full justify-center py-2 text-sm">
              Вы уже откликнулись
            </Badge>
          )}

          {isOwner && order.status === 'open' && (
            <Badge variant="outline" className="w-full justify-center py-2 text-sm">
              Ваш заказ · {responses.length} откликов
            </Badge>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <HubResponseDialog
        open={responseDialogOpen}
        onOpenChange={setResponseDialogOpen}
        orderId={orderId}
        orderTitle={order.title}
        onSuccess={loadData}
      />

      {reviewTarget && (
        <HubReviewDialog
          open={reviewDialogOpen}
          onOpenChange={setReviewDialogOpen}
          orderId={orderId}
          toUserId={reviewTarget.userId}
          toUserName={reviewTarget.name}
          role={reviewTarget.role}
          onSuccess={loadData}
        />
      )}
    </div>
  );
}
