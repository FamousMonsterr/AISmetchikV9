// src/app/dashboard/tickets/page.tsx
"use client";

import { useState, useEffect, useCallback } from 'react';
import { onSnapshot, query, collection, where, orderBy, FirebaseError, getDocs } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { useAppContext, type HistoryRequest } from '@/contexts/AppContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Loader2, Ticket, MessageSquare, RefreshCcw } from "lucide-react";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

export default function UserTicketsPage() {
    const { user } = useAppContext();
    const { toast } = useToast();
    const [tickets, setTickets] = useState<HistoryRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const buildQuery = useCallback(() => {
        if (!user) return null;
        return query(
            collection(db, 'requests'),
            where('userId', '==', user.uid),
            where('status', 'in', ['reported', 'success']),
            orderBy('timestamp', 'desc')
        );
    }, [user]);

    useEffect(() => {
        if (!user) return; // Wait for user context
        
        setIsLoading(true);
        // This composite query requires an index.
        const ticketsQuery = buildQuery();
        if (!ticketsQuery) {
            setIsLoading(false);
            return;
        }

        const unsubscribe = onSnapshot(ticketsQuery, (snapshot) => {
            const userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HistoryRequest);
            setTickets(userTickets);
            setIsLoading(false);
        }, (error: FirebaseError) => {
            console.error("Error fetching user tickets:", error);
            if (error.code === 'failed-precondition' && error.message.includes('index')) {
                 toast({
                    title: "Требуется подготовка базы данных",
                    description: "Для работы этого раздела создается специальный индекс. Это может занять несколько минут. Пожалуйста, обновите страницу позже.",
                    variant: "destructive",
                    duration: 10000,
                });
            } else {
                toast({
                    title: "Ошибка",
                    description: "Не удалось загрузить ваши обращения.",
                    variant: "destructive"
                });
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, toast, buildQuery]);

    const refreshTickets = useCallback(async () => {
        const ticketsQuery = buildQuery();
        if (!ticketsQuery) return;
        setIsRefreshing(true);
        try {
            const snapshot = await getDocs(ticketsQuery);
            const userTickets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as HistoryRequest);
            setTickets(userTickets);
            if (userTickets.length === 0) {
                toast({
                    title: "Данные появятся позже",
                    description: "История обращений обновляется. Попробуйте нажать «Обновить» чуть позже.",
                });
            }
        } catch (error: any) {
            toast({
                title: "Ошибка обновления",
                description: error.message || "Не удалось обновить историю.",
                variant: "destructive",
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [buildQuery, toast]);

    const safeFormatDateTime = (value: any) => {
        if (!value) return 'N/A';
        const date = value.toDate ? value.toDate() : new Date(value);
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, 'd MMM yyyy, HH:mm', { locale: ru });
    };

    const getStatusBadge = (ticket: HistoryRequest) => {
        if (ticket.status === 'success' && ticket.resolvedAt) {
             return <Badge variant="secondary" className="text-green-600 border-green-500">Решен</Badge>;
        }
         if (ticket.status === 'reported') {
            return <Badge variant="destructive">На рассмотрении</Badge>;
        }
        return <Badge variant="outline">{ticket.status}</Badge>;
    };

    return (
        <div className="w-full">
            <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <CardTitle>Мои тикеты</CardTitle>
                        <CardDescription>Здесь отображается история ваших обращений в поддержку по поводу некорректного анализа.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={refreshTickets} disabled={isLoading || isRefreshing}>
                        {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                        Обновить
                    </Button>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                            <Loader2 className="h-12 w-12 mb-4 animate-spin" />
                            <h3 className="text-lg font-semibold">Загрузка обращений...</h3>
                        </div>
                    ) : tickets.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
                            <Ticket className="h-12 w-12 mb-4" />
                            <h3 className="text-lg font-semibold">У вас нет обращений</h3>
                            <p className="text-sm">Если вы считаете, что анализ прошел некорректно, вы можете подать жалобу на странице истории.</p>
                            <p className="text-xs mt-2">Если обращение было создано только что, нажмите «Обновить» через несколько секунд.</p>
                        </div>
                    ) : (
                        <Accordion type="multiple" className="w-full">
                            {tickets.map((ticket) => (
                                <AccordionItem value={ticket.id} key={ticket.id}>
                                    <AccordionTrigger>
                                        <div className='flex justify-between items-center w-full pr-4'>
                                            <div className='text-left min-w-0'>
                                                <p className="font-semibold truncate max-w-[150px] sm:max-w-none">{ticket.fileName}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    Обращение от {safeFormatDateTime(ticket.reportedAt)}
                                                </p>
                                            </div>
                                            {getStatusBadge(ticket)}
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent>
                                        <div className="p-4 bg-muted/50 rounded-md space-y-3">
                                            <h4 className='font-semibold'>Детали тикета:</h4>
                                            <p className="text-sm"><strong>ID Запроса:</strong> {ticket.id}</p>
                                            {ticket.resolvedAt?.toDate && (
                                                <p className="text-sm">
                                                    <strong>Решен:</strong> {safeFormatDateTime(ticket.resolvedAt)}
                                                </p>
                                            )}
                                            {ticket.cost > 0 && ticket.resolvedAt && (
                                                 <p className="text-sm text-green-600">
                                                    Вам был возвращен {ticket.cost} кредит.
                                                </p>
                                            )}
                                            <div className="pt-2">
                                                <button className="text-sm text-primary underline-offset-4 hover:underline flex items-center gap-1" disabled>
                                                    <MessageSquare className="h-4 w-4"/> Чат с поддержкой (скоро)
                                                </button>
                                            </div>
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
