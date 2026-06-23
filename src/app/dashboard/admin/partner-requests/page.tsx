// src/app/dashboard/admin/partner-requests/page.tsx
"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Handshake, Crown, Gem } from "lucide-react";
import { getPartnerRequests, updatePartnerRequestStatus } from '@/actions/partnerActions';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppContext } from '@/contexts/AppContext';

type PartnerRequest = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  desiredTier: 'Gold' | 'Platinum';
  status: 'new' | 'contacted' | 'approved' | 'rejected';
  createdAt: any;
};

const statusMap = {
    new: { label: 'Новая', color: 'bg-blue-500' },
    contacted: { label: 'В работе', color: 'bg-yellow-500' },
    approved: { label: 'Одобрена', color: 'bg-green-500' },
    rejected: { label: 'Отклонена', color: 'bg-red-500' },
};

export default function AdminPartnerRequestsPage() {
  const { toast } = useToast();
  const { user } = useAppContext();
  const [requests, setRequests] = useState<PartnerRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, startUpdating] = useTransition();

  const fetchRequests = useCallback(async () => {
    if (!user || user.systemRole !== 'Super Admin') {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
      const data = await getPartnerRequests();
      setRequests(data as PartnerRequest[]);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки заявок",
        description: error.message || "Не удалось получить данные.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast, user]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleStatusChange = (requestId: string, status: PartnerRequest['status']) => {
    if (!user || user.systemRole !== 'Super Admin') return;
    startUpdating(async () => {
        const result = await updatePartnerRequestStatus({ requestId, status });
        if (result.success) {
            toast({ title: "Статус обновлен" });
            fetchRequests(); // Refresh list
        } else {
            toast({ title: "Ошибка", description: result.message, variant: 'destructive' });
        }
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Заявки на партнерство</CardTitle>
          <CardDescription>Заявки на получение "Золотого" и "Платинового" статуса.</CardDescription>
        </div>
        <Button onClick={fetchRequests} variant="ghost" size="icon" disabled={isLoading}>
          <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : requests.length === 0 ? (
          <div className="text-center text-muted-foreground py-12 border-2 border-dashed rounded-lg">
            <Handshake className="mx-auto h-12 w-12" />
            <h3 className="mt-4 text-lg font-semibold">Заявок пока нет</h3>
            <p className="mt-1 text-sm">Здесь будут отображаться новые заявки от партнеров.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {requests.map((req) => (
              <AccordionItem value={req.id} key={req.id}>
                <AccordionTrigger>
                  <div className="flex justify-between items-center w-full pr-4">
                    <div className="flex items-center gap-3 text-left min-w-0">
                      {req.desiredTier === 'Gold' ? <Crown className="h-5 w-5 text-yellow-500" /> : <Gem className="h-5 w-5 text-sky-500" />}
                      <div className="min-w-0">
                        <p className="font-semibold truncate">{req.userName}</p>
                        <p className="text-xs text-muted-foreground">{req.userEmail}</p>
                      </div>
                    </div>
                    <Badge className={cn("flex-shrink-0", statusMap[req.status].color)}>{statusMap[req.status].label}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="space-y-4 p-4 bg-muted/50">
                  <p className="text-sm"><strong>Заявка на статус:</strong> {req.desiredTier}</p>
                  <p className="text-sm"><strong>Дата заявки:</strong> {req.createdAt?.toDate ? format(req.createdAt.toDate(), 'd MMM yyyy, HH:mm', { locale: ru }) : 'N/A'}</p>
                   <div className="flex items-center gap-4">
                     <Select defaultValue={req.status} onValueChange={(value) => handleStatusChange(req.id, value as PartnerRequest['status'])} disabled={isUpdating}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Изменить статус..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">Новая</SelectItem>
                            <SelectItem value="contacted">В работе</SelectItem>
                            <SelectItem value="approved">Одобрена</SelectItem>
                            <SelectItem value="rejected">Отклонена</SelectItem>
                        </SelectContent>
                    </Select>
                     <Button asChild variant="outline" size="sm">
                        <a href={`mailto:${req.userEmail}?subject=Ваша заявка на партнерство Montage HUB`}>
                            Написать
                        </a>
                     </Button>
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
