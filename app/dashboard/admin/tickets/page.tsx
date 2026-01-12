// src/app/dashboard/admin/tickets/page.tsx
"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, Ticket, FileSearch, Undo2 } from "lucide-react";
import { type HistoryRequest, useAppContext } from '@/contexts/AppContext';
import { getReportedTickets, returnCreditAndResolveTicket } from '@/actions/adminActions';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';


export default function AdminTicketsPage() {
  const { toast } = useToast();
  const { user, setCurrentProject } = useAppContext();
  const [tickets, setTickets] = useState<HistoryRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, startProcessing] = useTransition();
  const router = useRouter();


  const fetchTickets = useCallback(async () => {
    if (!user || user.systemRole !== 'Super Admin') return;
    setIsLoading(true);
    try {
      const ticketList = await getReportedTickets();
      setTickets(ticketList);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки тикетов",
        description: error.message || "Не удалось получить данные о жалобах.",
        variant: "destructive",
        duration: 10000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const handleResolve = async (ticketId: string, userId: string, cost: number) => {
    if (!user || user.systemRole !== 'Super Admin') {
        toast({ title: "Ошибка доступа", description: "У вас нет прав для выполнения этого действия.", variant: "destructive" });
        return;
    }
    startProcessing(async () => {
        try {
            const result = await returnCreditAndResolveTicket({ currentUserId: user.uid, ticketId, userId, creditAmount: cost });
            if(result.success) {
                toast({
                    title: "Успех",
                    description: `Кредит в размере ${cost} возвращен пользователю и тикет закрыт.`
                });
                await fetchTickets(); // Refresh list
            } else {
                 toast({
                    title: "Ошибка",
                    description: result.message,
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Серверная ошибка",
                description: "Не удалось обработать тикет.",
                variant: "destructive"
            });
        }
    });
  }
  
  const handleViewResult = (ticket: HistoryRequest) => {
      setCurrentProject(ticket);
      router.push('/dashboard/calculator');
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Тикеты пользователей</CardTitle>
            <CardDescription>Жалобы на некорректную обработку файлов.</CardDescription>
        </div>
        <Button onClick={fetchTickets} variant="ghost" size="icon" disabled={isLoading}>
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <Loader2 className="h-12 w-12 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold">Загрузка тикетов...</h3>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <Ticket className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Тикетов нет</h3>
            <p className="text-sm">Все запросы обработаны корректно.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {tickets.map((ticket) => (
                <AccordionItem value={ticket.id} key={ticket.id}>
                    <AccordionTrigger>
                        <div className='flex justify-between items-center w-full pr-4'>
                            <div className='text-left min-w-0'>
                                <p className="font-semibold truncate max-w-[150px] sm:max-w-none">{ticket.fileName}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-none">
                                    {ticket.timestamp?.toDate ? format(ticket.timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: ru }) : 'N/A'} | User: {ticket.userId}
                                </p>
                            </div>
                            <Badge variant="destructive" className="flex-shrink-0">Жалоба</Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent>
                        <div className="p-4 bg-muted/50 rounded-md">
                            <h4 className='font-semibold mb-2'>Детали запроса:</h4>
                            <p className="text-sm"><strong>ID Запроса:</strong> {ticket.id}</p>
                            <p className="text-sm"><strong>Комментарий AI:</strong> {ticket.aiComment || 'Нет'}</p>
                            <p className="text-sm"><strong>Стоимость:</strong> {ticket.cost} кредит(а)</p>
                            <div className='mt-4 flex gap-2'>
                                <Button size="sm" variant="outline" onClick={() => handleViewResult(ticket)} disabled={isProcessing}>
                                    <FileSearch className="mr-2 h-4 w-4" />
                                    Посмотреть результат
                                </Button>
                                <Button size="sm" onClick={() => handleResolve(ticket.id, ticket.userId, ticket.cost)} disabled={isProcessing}>
                                    {isProcessing ? 
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/> :
                                        <Undo2 className="mr-2 h-4 w-4" />
                                    }
                                    Вернуть кредит и закрыть
                                </Button>
                            </div>
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
