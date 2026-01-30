// src/components/InvoiceHistory.tsx
// @ts-nocheck
"use client";

import { useState, useEffect, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Share2, Send, RefreshCcw } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData, Timestamp, getDocs } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from './ui/badge';
import axios from 'axios';
import { sendFileToTelegramUser } from '@/actions/telegramActions';
import { useToast } from '@/hooks/use-toast';

interface InvoiceHistoryItem extends DocumentData {
    id: string;
    invoiceNumber: string;
    invoiceDate: Timestamp;
    buyerName: string;
    totalAmount: number;
    downloadUrl: string;
    status: 'Ожидает оплаты' | 'Оплачен';
}

export function InvoiceHistory() {
    const { user, currentProject } = useAppContext();
    const { toast } = useToast();
    const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionPending, startActionTransition] = useTransition();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const buildQuery = useCallback(() => {
        if (!user) return null;
        return !currentProject
            ? query(
                collection(db, 'invoices'),
                where('userId', '==', user.uid),
                orderBy('invoiceDate', 'desc'),
                limit(10)
            )
            : query(
                collection(db, 'invoices'),
                where('userId', '==', user.uid),
                where('projectId', '==', currentProject.id),
                orderBy('invoiceDate', 'desc'),
                limit(10)
            );
    }, [user, currentProject]);

    const safeFormatDate = (value: any) => {
        if (!value) return 'N/A';
        const date = value.toDate ? value.toDate() : new Date(value);
        if (isNaN(date.getTime())) return 'N/A';
        return format(date, 'dd.MM.yyyy', { locale: ru });
    };

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const q = buildQuery();
        if (!q) {
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceHistoryItem));
            setInvoices(fetchedInvoices);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching invoices:", error);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user, currentProject, buildQuery]);

    const refreshInvoices = useCallback(async () => {
        const q = buildQuery();
        if (!q) return;
        setIsRefreshing(true);
        try {
            const snapshot = await getDocs(q);
            const fetchedInvoices = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InvoiceHistoryItem));
            setInvoices(fetchedInvoices);
            if (fetchedInvoices.length === 0) {
                toast({
                    title: "Данные появятся позже",
                    description: "История обновляется. Попробуйте нажать «Обновить» чуть позже.",
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

    const handleAction = async (invoice: InvoiceHistoryItem, action: 'download' | 'share' | 'telegram') => {
        if (action === 'telegram' && !user?.telegramChatId) {
            toast({
                title: "Telegram не привязан",
                description: "Привяжите аккаунт Telegram в профиле.",
                variant: "destructive",
            });
            return;
        }
        startActionTransition(async () => {
            try {
                const fileResponse = await axios.get(invoice.downloadUrl, { responseType: 'blob' });
                const blob = new Blob([fileResponse.data], { type: 'application/pdf' });
                const fileName = `Счет_${invoice.invoiceNumber}_от_${safeFormatDate(invoice.invoiceDate)}.pdf`;
                const file = new File([blob], fileName, { type: blob.type });

                if (action === 'download') {
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = fileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } else if (action === 'share' && navigator.share) {
                    await navigator.share({
                        title: `Счет №${invoice.invoiceNumber}`,
                        text: `Счет на оплату №${invoice.invoiceNumber}`,
                        files: [file],
                    });
                } else if (action === 'telegram') {
                    const base64Data = await new Promise<string>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(blob);
                        reader.onloadend = () => resolve(reader.result as string);
                        reader.onerror = error => reject(error);
                    });
                    const result = await sendFileToTelegramUser({
                        fileData: base64Data,
                        fileName,
                        fileMime: blob.type,
                        caption: `Счет №${invoice.invoiceNumber} от ${safeFormatDate(invoice.invoiceDate)}`,
                    });
                    if (!result.success) {
                        throw new Error(result.message);
                    }
                    toast({ title: "Отправлено", description: "Счет отправлен в Telegram." });
                }
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Не удалось выполнить действие.';
                toast({ title: "Ошибка", description: message, variant: "destructive" });
            }
        });
    };
    
    if (!user) return null;

    return (
        <Card>
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <CardTitle>История документов</CardTitle>
                    <CardDescription>Последние 10 сгенерированных документов по {currentProject ? 'текущему проекту' : 'всем проектам'}.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={refreshInvoices} disabled={isLoading || isRefreshing}>
                    {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
                    Обновить
                </Button>
            </CardHeader>
            <CardContent>
                 {isLoading ? (
                    <div className="flex justify-center items-center h-24">
                        <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                        <FileText className="mx-auto h-10 w-10 mb-2"/>
                        <p>Документы еще не создавались.</p>
                        <p className="text-xs mt-1">Если документы были созданы только что, нажмите «Обновить» через несколько секунд.</p>
                    </div>
                ) : (
                    <div className="border rounded-md">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Номер</TableHead>
                                    <TableHead>Дата</TableHead>
                                    <TableHead>Сумма</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead className="text-right">Действия</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {invoices.map(invoice => (
                                    <TableRow key={invoice.id}>
                                        <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                                        <TableCell>{safeFormatDate(invoice.invoiceDate)}</TableCell>
                                        <TableCell>{invoice.totalAmount.toLocaleString('ru-RU')} ₽</TableCell>
                                        <TableCell>
                                            <Badge variant={invoice.status === 'Оплачен' ? 'secondary' : 'outline'}>
                                                {invoice.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" onClick={() => handleAction(invoice, 'download')} disabled={isActionPending}>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                             <Button variant="ghost" size="icon" onClick={() => handleAction(invoice, 'share')} disabled={isActionPending || !navigator.share}>
                                                <Share2 className="h-4 w-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => handleAction(invoice, 'telegram')} disabled={isActionPending}>
                                                <Send className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
