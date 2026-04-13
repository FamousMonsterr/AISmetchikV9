// src/app/dashboard/admin/service-requests/page.tsx
"use client";

import { useCallback, useEffect, useState, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, ClipboardList } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';
import { getServiceRequests, updateServiceRequestStatus, type ServiceRequestStatus, type ServiceRequestType } from '@/actions/serviceRequestActions';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type ServiceRequest = {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  type: ServiceRequestType;
  status: ServiceRequestStatus;
  payload?: Record<string, any>;
  createdAt?: any;
};

const statusMap: Record<ServiceRequestStatus, { label: string; color: string }> = {
  new: { label: 'Новая', color: 'bg-blue-500' },
  in_progress: { label: 'В работе', color: 'bg-yellow-500' },
  approved: { label: 'Одобрена', color: 'bg-green-500' },
  rejected: { label: 'Отклонена', color: 'bg-red-500' },
};

const typeLabels: Record<ServiceRequestType, string> = {
  plan_upgrade: 'Апгрейд тарифа',
  estimate_department: 'Сметный отдел',
  crm_connector: 'CRM коннектор',
  s3_storage: 'S3 хранилище',
  partner_status: 'Партнерский статус',
};

export default function AdminServiceRequestsPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdating] = useTransition();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const fetchRequests = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const result = await getServiceRequests({
        adminUserId: user.uid,
        status: statusFilter === 'all' ? undefined : (statusFilter as ServiceRequestStatus),
        type: typeFilter === 'all' ? undefined : (typeFilter as ServiceRequestType),
      });
      if (!result.success) {
        throw new Error(result.message || 'Не удалось загрузить заявки.');
      }
      setRequests(result.requests as ServiceRequest[]);
    } catch (error: any) {
      toast({
        title: 'Ошибка загрузки',
        description: error.message || 'Не удалось получить заявки.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, typeFilter, toast, user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = (requestId: string, status: ServiceRequestStatus) => {
    if (!user) return;
    startUpdating(async () => {
      const result = await updateServiceRequestStatus({ adminUserId: user.uid, requestId, status });
      if (result.success) {
        toast({ title: 'Статус обновлен' });
        fetchRequests();
      } else {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
      }
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2"><ClipboardList className="h-5 w-5" />Заявки пользователей</CardTitle>
          <CardDescription>Апгрейды, S3, CRM, партнерские статусы и другие запросы.</CardDescription>
        </div>
        <Button onClick={fetchRequests} variant="ghost" size="icon" disabled={isLoading}>
          <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Фильтр по статусу</div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                <SelectItem value="new">Новые</SelectItem>
                <SelectItem value="in_progress">В работе</SelectItem>
                <SelectItem value="approved">Одобрены</SelectItem>
                <SelectItem value="rejected">Отклонены</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">Фильтр по типу</div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все</SelectItem>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            <ClipboardList className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Заявок пока нет</h3>
            <p className="mt-1 text-sm">Новые заявки будут появляться здесь.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {requests.map((req) => (
              <AccordionItem key={req.id} value={req.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="flex items-center gap-3 text-left min-w-0">
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{typeLabels[req.type] || req.type}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {req.userName || req.userEmail || req.userId}
                        </p>
                      </div>
                    </div>
                    <Badge className={cn("flex-shrink-0", statusMap[req.status]?.color)}>
                      {statusMap[req.status]?.label || req.status}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-3 p-4 bg-muted/40">
                  <p className="text-sm"><strong>Пользователь:</strong> {req.userName || '—'} ({req.userEmail || '—'})</p>
                  <p className="text-sm"><strong>Тип:</strong> {typeLabels[req.type] || req.type}</p>
                  {req.payload && Object.keys(req.payload).length > 0 && (
                    <div className="text-xs text-muted-foreground space-y-1">
                      {Object.entries(req.payload).map(([key, value]) => (
                        <div key={key}>
                          <strong>{key}:</strong> {String(value)}
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Дата заявки: {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: ru }) : '—'}
                  </p>
                  <div className="flex items-center gap-3">
                    <Select
                      defaultValue={req.status}
                      onValueChange={(value) => handleStatusChange(req.id, value as ServiceRequestStatus)}
                      disabled={isUpdating}
                    >
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="new">Новая</SelectItem>
                        <SelectItem value="in_progress">В работе</SelectItem>
                        <SelectItem value="approved">Одобрена</SelectItem>
                        <SelectItem value="rejected">Отклонена</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
