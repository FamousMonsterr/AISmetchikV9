"use client";

import { useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import { getServiceRequests, updateServiceRequestStatus, type ServiceRequestStatus, type ServiceRequestType } from '@/actions/serviceRequestActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type RequestRow = {
  id: string;
  userName?: string;
  userEmail?: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  createdAt?: any;
};

const statusLabel: Record<ServiceRequestStatus, string> = {
  new: 'Новая',
  in_progress: 'В работе',
  approved: 'Одобрена',
  rejected: 'Отклонена',
};

const typeLabel: Record<ServiceRequestType, string> = {
  plan_upgrade: 'Апгрейд тарифа',
  estimate_department: 'Сметный отдел',
  crm_connector: 'CRM коннектор',
  s3_storage: 'S3 хранилище',
  partner_status: 'Партнёрский статус',
};

function formatDate(value: any) {
  const date = value?.toDate ? value.toDate() : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export default function CrmPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const canManage = user?.systemRole === 'Admin' || user?.systemRole === 'Super Admin';

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!canManage) {
      router.replace('/dashboard');
      return;
    }

    setIsLoading(true);
    startTransition(async () => {
      const result = await getServiceRequests({ adminUserId: user.uid });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        setRows([]);
        setIsLoading(false);
        return;
      }
      setRows(result.requests as RequestRow[]);
      setIsLoading(false);
    });
  }, [user, canManage, router, toast]);

  const counters = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.total += 1;
        acc[row.status] += 1;
        return acc;
      },
      { total: 0, new: 0, in_progress: 0, approved: 0, rejected: 0 }
    );
  }, [rows]);

  const handleStatusChange = (requestId: string, status: ServiceRequestStatus) => {
    if (!user) return;
    startTransition(async () => {
      const result = await updateServiceRequestStatus({ adminUserId: user.uid, requestId, status });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === requestId ? { ...row, status } : row)));
      toast({ title: 'Сохранено', description: 'Статус заявки обновлён.' });
    });
  };

  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>CRM Workspace</CardTitle>
            <CardDescription>Для входа в CRM авторизуйтесь в системе.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/auth/login">Войти</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canManage) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CRM Workspace</CardTitle>
          <CardDescription>Оперативная обработка пользовательских заявок менеджерами.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">Всего: {counters.total}</Badge>
          <Badge>Новые: {counters.new}</Badge>
          <Badge variant="secondary">В работе: {counters.in_progress}</Badge>
          <Badge variant="default">Одобрено: {counters.approved}</Badge>
          <Badge variant="destructive">Отклонено: {counters.rejected}</Badge>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Заявки</CardTitle>
          <CardDescription>Синхронизируется с внутренней коллекцией `service_requests`.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-40 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : rows.length === 0 ? (
            <div className="text-sm text-muted-foreground">Заявок пока нет.</div>
          ) : (
            <div className="border rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Дата</TableHead>
                    <TableHead>Тип</TableHead>
                    <TableHead>Пользователь</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Статус</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>{formatDate(row.createdAt)}</TableCell>
                      <TableCell>{typeLabel[row.type]}</TableCell>
                      <TableCell>{row.userName || '—'}</TableCell>
                      <TableCell>{row.userEmail || '—'}</TableCell>
                      <TableCell className="min-w-[180px]">
                        <Select
                          value={row.status}
                          onValueChange={(value: ServiceRequestStatus) => handleStatusChange(row.id, value)}
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Статус" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="new">{statusLabel.new}</SelectItem>
                            <SelectItem value="in_progress">{statusLabel.in_progress}</SelectItem>
                            <SelectItem value="approved">{statusLabel.approved}</SelectItem>
                            <SelectItem value="rejected">{statusLabel.rejected}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
