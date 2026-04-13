// src/app/dashboard/admin/credit-payments/page.tsx
// @ts-nocheck
"use client";

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCcw, BadgeDollarSign, Check, X } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { getCreditPurchaseOrders, approveCreditPurchaseOrder, rejectCreditPurchaseOrder } from '@/actions/creditPurchaseActions';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const statusLabels: Record<string, string> = {
  pending: 'Ожидает проверки',
  approved: 'Подтверждено',
  auto_approved: 'Авто-подтверждено',
  rejected: 'Отклонено',
  invoice_issued: 'Счет выставлен',
};

export default function CreditPaymentsAdminPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'invoice_issued' | 'approved' | 'rejected' | 'auto_approved'>('pending');
  const [isActionPending, startTransition] = useTransition();

  const loadOrders = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    const result = await getCreditPurchaseOrders({
      adminUserId: user.uid,
      status: statusFilter === 'all' ? undefined : statusFilter,
    });
    if (!result.success) {
      toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      setOrders([]);
    } else {
      setOrders(result.orders || []);
    }
    setIsLoading(false);
  }, [user, statusFilter, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleApprove = (orderId: string) => {
    if (!user) return;
    startTransition(async () => {
      const result = await approveCreditPurchaseOrder({ adminUserId: user.uid, orderId });
      if (result.success) {
        toast({ title: 'Подтверждено', description: result.message });
        loadOrders();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const handleReject = (orderId: string) => {
    if (!user) return;
    const reason = window.prompt('Причина отклонения (опционально):') || undefined;
    startTransition(async () => {
      const result = await rejectCreditPurchaseOrder({ adminUserId: user.uid, orderId, reason });
      if (result.success) {
        toast({ title: 'Отклонено', description: result.message });
        loadOrders();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  const filters = [
    { value: 'pending', label: 'Ожидает' },
    { value: 'invoice_issued', label: 'Счета' },
    { value: 'approved', label: 'Подтверждено' },
    { value: 'auto_approved', label: 'Авто' },
    { value: 'rejected', label: 'Отклонено' },
    { value: 'all', label: 'Все' },
  ];

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><BadgeDollarSign className="h-5 w-5" /> Оплаты кредитов</CardTitle>
          <CardDescription>Проверяйте оплаты пакетов и начисляйте кредиты.</CardDescription>
        </div>
        <div className="flex flex-wrap gap-2">
          {filters.map((filter) => (
            <Button
              key={filter.value}
              variant={statusFilter === filter.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter(filter.value as any)}
            >
              {filter.label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={loadOrders} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            Обновить
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center text-muted-foreground py-12">Запросы не найдены.</div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Пользователь</TableHead>
                  <TableHead>Способ</TableHead>
                  <TableHead>Пакет</TableHead>
                  <TableHead>Кредиты</TableHead>
                  <TableHead>Сумма</TableHead>
                  <TableHead>Статус</TableHead>
                  <TableHead>Документ</TableHead>
                  <TableHead>Дата</TableHead>
                  <TableHead className="text-right">Действия</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => {
                  const createdAt = order.createdAt ? new Date(order.createdAt) : null;
                  const dateLabel = createdAt ? format(createdAt, 'dd.MM.yyyy HH:mm', { locale: ru }) : '—';
                  const docUrl = order.receiptUrl || order.invoiceUrl;
                  const methodLabel = order.paymentMethod === 'legal' ? 'Юр. лицо' : 'СБП';
                  const statusLabel = statusLabels[order.status] || order.status;
                  return (
                    <TableRow key={order._id}>
                      <TableCell>
                        <div className="font-medium">{order.userEmail || order.userDisplayName || order.userId}</div>
                      </TableCell>
                      <TableCell>{methodLabel}</TableCell>
                      <TableCell>{order.packageName || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span>{order.credits}</span>
                          {order.grantedLotId && <Badge variant="secondary">выданы</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>{order.amount?.toLocaleString('ru-RU')} ₽</TableCell>
                      <TableCell><Badge variant="outline">{statusLabel}</Badge></TableCell>
                      <TableCell>
                        {docUrl ? (
                          <a href={docUrl} target="_blank" rel="noreferrer" className="text-primary underline">
                            Открыть
                          </a>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{dateLabel}</TableCell>
                      <TableCell className="text-right">
                        {(order.status === 'pending' || order.status === 'invoice_issued') ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" onClick={() => handleApprove(order._id)} disabled={isActionPending}>
                              <Check className="mr-1 h-4 w-4" />
                              Подтвердить
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => handleReject(order._id)} disabled={isActionPending}>
                              <X className="mr-1 h-4 w-4" />
                              Отклонить
                            </Button>
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
