// src/components/InvoiceHistory.tsx
"use client";

import { useState, useEffect, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, Download, FileText, Share2 } from 'lucide-react';
import { useAppContext } from '@/contexts/AppContext';
import { collection, query, where, orderBy, limit, onSnapshot, DocumentData, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Badge } from './ui/badge';
import axios from 'axios';

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
    const [invoices, setInvoices] = useState<InvoiceHistoryItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isActionPending, startActionTransition] = useTransition();

    useEffect(() => {
        if (!user) {
            setIsLoading(false);
            return;
        }

        const q = !currentProject
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
    }, [user, currentProject]);

    const handleAction = async (invoice: InvoiceHistoryItem, action: 'download' | 'share') => {
        startActionTransition(async () => {
            try {
                const fileResponse = await axios.get(invoice.downloadUrl, { responseType: 'blob' });
                const blob = new Blob([fileResponse.data], { type: 'application/pdf' });
                const fileName = `Счет_${invoice.invoiceNumber}_от_${format(invoice.invoiceDate.toDate(), 'dd.MM.yyyy')}.pdf`;
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
                }
            } catch (error) {
                console.error("Action error:", error);
            }
        });
    };
    
    if (!user) return null;

    return (
        <Card>
            <CardHeader>
                <CardTitle>История документов</CardTitle>
                <CardDescription>Последние 10 сгенерированных документов по {currentProject ? 'текущему проекту' : 'всем проектам'}.</CardDescription>
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
                                        <TableCell>{format(invoice.invoiceDate.toDate(), 'dd.MM.yyyy', { locale: ru })}</TableCell>
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
