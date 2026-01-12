// src/app/dashboard/admin/ai-analytics/page.tsx
"use client";

import { useState, useEffect, useCallback, useTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, RefreshCw, FileClock, User, FileText, CheckCircle, AlertTriangle, Search, ChevronDown, ChevronUp } from "lucide-react";
import { onSnapshot, collection, query, orderBy, limit, DocumentData, updateDoc, doc } from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useAppContext } from '@/contexts/AppContext';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';

const StatusBadge = ({ status }: { status: 'success' | 'error' }) => {
    const isSuccess = status === 'success';
    return (
        <Badge variant={isSuccess ? "secondary" : "destructive"} className={cn(isSuccess ? "text-green-600 border-green-500" : "", "flex items-center gap-1 text-xs")}>
            {isSuccess ? <CheckCircle className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {isSuccess ? 'Успешно' : 'Ошибка'}
        </Badge>
    );
};

export default function AiAnalyticsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DocumentData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [isUpdating, startUpdating] = useTransition();

  const fetchLogs = useCallback(() => {
    if (!user) return;
    setIsLoading(true);
    try {
        const logsQuery = query(collection(db, 'ai_api_logs'), orderBy('timestamp', 'desc'), limit(100));
        const unsubscribe = onSnapshot(logsQuery, (snapshot) => {
            const logList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setLogs(logList);
            setIsLoading(false);
        }, (error) => {
            console.error("Error fetching logs:", error);
            setIsLoading(false);
        });
        return unsubscribe;
    } catch (error: any) {
        toast({ title: "Ошибка", description: error.message || "Не удалось выполнить запрос к базе данных.", variant: "destructive" });
        setIsLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    const unsubscribe = fetchLogs();
    return () => unsubscribe && unsubscribe();
  }, [fetchLogs]);
  
  const handleStatusUpdate = (logId: string, newStatus: 'success' | 'error') => {
      startUpdating(async () => {
          try {
            await updateDoc(doc(db, 'ai_api_logs', logId), { status: newStatus });
            toast({ description: "Статус обновлен." });
          } catch(e) {
            toast({ title: "Ошибка обновления", variant: "destructive" });
          }
      });
  };

  const filteredLogs = logs.filter(log => {
    if (!searchTerm) return true;
    const lowerSearch = searchTerm.toLowerCase();
    return (
        log.userId?.toLowerCase().includes(lowerSearch) ||
        log.model?.toLowerCase().includes(lowerSearch) ||
        log.provider?.toLowerCase().includes(lowerSearch) ||
        log.id?.toLowerCase().includes(lowerSearch)
    );
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
            <CardTitle>Аналитика вызовов AI</CardTitle>
            <CardDescription>Последние 100 запросов к AI-моделям.</CardDescription>
        </div>
        <Button onClick={fetchLogs} variant="ghost" size="icon" disabled={isLoading}>
            <RefreshCw className={cn("h-5 w-5", isLoading && "animate-spin")} />
        </Button>
      </CardHeader>
      <CardContent>
         <div className="mb-4">
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Поиск по ID пользователя, модели, провайдеру..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
        </div>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <Loader2 className="h-12 w-12 mb-4 animate-spin" />
            <h3 className="text-lg font-semibold">Загрузка логов AI...</h3>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg p-12">
            <FileClock className="h-12 w-12 mb-4" />
            <h3 className="text-lg font-semibold">Логов пока нет</h3>
            <p className="text-sm">Здесь будут отображаться все вызовы AI.</p>
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {filteredLogs.map((log) => (
                <AccordionItem value={log.id} key={log.id}>
                    <AccordionTrigger className="group">
                        <div className='flex justify-between items-center w-full pr-4'>
                            <div className='text-left flex items-center gap-3 min-w-0'>
                                <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0"/>
                                <div className="min-w-0">
                                    <p className="font-semibold truncate max-w-[150px] sm:max-w-xs">{log.model}</p>
                                    <p className="text-xs text-muted-foreground truncate">
                                        {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'd MMM yyyy, HH:mm:ss', { locale: ru }) : 'N/A'}
                                    </p>
                                </div>
                            </div>
                            <StatusBadge status={log.status} />
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-3">
                        <div className="overflow-x-auto bg-muted/40 p-3 rounded-md space-y-2">
                           <p className="text-xs"><strong>User ID:</strong> {log.userId}</p>
                           <p className="text-xs"><strong>Log ID:</strong> {log.id}</p>
                           <p className="text-xs"><strong>Provider:</strong> {log.provider}</p>
                           <p className="text-xs"><strong>Cost:</strong> ${log.totalCost?.toFixed(6) || 0}</p>
                           <p className="text-xs"><strong>Tokens:</strong> {log.totalTokens || 0}</p>
                           {log.errorMessage && <p className="text-xs text-destructive"><strong>Error:</strong> {log.errorMessage}</p>}
                        </div>
                         <div className="p-3 border rounded-lg space-y-2">
                            <Label className="text-xs">Изменить статус</Label>
                             <Select defaultValue={log.status} onValueChange={(value: 'success' | 'error') => handleStatusUpdate(log.id, value)}>
                                <SelectTrigger className="w-[180px]">
                                    <SelectValue placeholder="Изменить статус" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="success">Успешно</SelectItem>
                                    <SelectItem value="error">Ошибка</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Accordion type="multiple" className="w-full">
                            <AccordionItem value="prompt">
                                <AccordionTrigger className="text-xs">Показать промпт</AccordionTrigger>
                                <AccordionContent><Textarea readOnly value={log.details?.rawPrompt || 'Промпт не сохранен.'} className="h-64 font-mono text-xs" /></AccordionContent>
                            </AccordionItem>
                             <AccordionItem value="response">
                                <AccordionTrigger className="text-xs">Показать ответ (raw)</AccordionTrigger>
                                <AccordionContent><Textarea readOnly value={log.rawResponse ? JSON.stringify(log.rawResponse, null, 2) : 'Ответ не сохранен.'} className="h-64 font-mono text-xs" /></AccordionContent>
                            </AccordionItem>
                        </Accordion>
                    </AccordionContent>
                </AccordionItem>
            ))}
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}
