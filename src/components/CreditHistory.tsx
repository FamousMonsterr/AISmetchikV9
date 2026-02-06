// src/components/CreditHistory.tsx
"use client";

import { useEffect, useState, useTransition, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { getCreditHistoryForUser, type CreditHistoryEntry } from '@/actions/creditActions';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type CreditHistoryProps = {
  currentUserId: string;
  targetUserId: string;
  title?: string;
  description?: string;
};

const typeLabels: Record<CreditHistoryEntry['type'], string> = {
  grant: 'Начисление',
  debit: 'Списание',
  refund: 'Возврат',
  expire: 'Сгорание',
};

const typeVariants: Record<CreditHistoryEntry['type'], 'default' | 'secondary' | 'destructive' | 'outline'> = {
  grant: 'secondary',
  debit: 'destructive',
  refund: 'default',
  expire: 'outline',
};

export function CreditHistory({ currentUserId, targetUserId, title = 'История кредитов', description = 'Последние операции по кредитам.' }: CreditHistoryProps) {
  const [entries, setEntries] = useState<CreditHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const result = await getCreditHistoryForUser({ currentUserId, targetUserId, limit: 50 });
    if (!result.success) {
      setError(result.message || 'Не удалось загрузить историю.');
      setEntries([]);
    } else {
      setEntries(result.entries);
    }
    setIsLoading(false);
  }, [currentUserId, targetUserId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleRefresh = () => {
    startTransition(async () => {
      await loadHistory();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
          {isRefreshing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
          Обновить
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-24">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : entries.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">История пуста.</div>
        ) : (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Дата</TableHead>
                  <TableHead>Тип</TableHead>
                  <TableHead>Причина</TableHead>
                  <TableHead className="text-right">Сумма</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => {
                  const date = format(new Date(entry.createdAt), 'dd.MM.yyyy HH:mm', { locale: ru });
                  return (
                    <TableRow key={entry.id}>
                      <TableCell>{date}</TableCell>
                      <TableCell>
                        <Badge variant={typeVariants[entry.type]}>{typeLabels[entry.type]}</Badge>
                      </TableCell>
                      <TableCell>{entry.reason || '—'}</TableCell>
                      <TableCell className="text-right font-semibold">{entry.amount}</TableCell>
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
