// src/app/dashboard/admin/server-functions/page.tsx
"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAppContext } from '@/contexts/AppContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShieldAlert, ServerCog, ActivitySquare, Play, RefreshCcw, ListChecks, RotateCcw } from 'lucide-react';
import { getAppSettings } from '@/actions/adminActions';
import type { AppSettings } from '@/actions/adminActions';
import { listServerAnalysisJobs, runServerWorkerOnce, requeueFailedJobs, getServerJobLogs } from '@/server-functions/admin/actions';
import type { ServerAnalysisJob } from '@/server-functions/analysis/types';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';

export default function ServerFunctionsAdminPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [jobs, setJobs] = useState<ServerAnalysisJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [isRunningWorker, setIsRunningWorker] = useState(false);
  const [isRequeuing, setIsRequeuing] = useState(false);
  const [health, setHealth] = useState<any>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, 'idle' | 'run' | 'ok' | 'fail'>>({
    settings: 'idle',
    jobs: 'idle',
    failures: 'idle',
  });
  const [selectedJobLogs, setSelectedJobLogs] = useState<any[] | null>(null);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const isSuperAdmin = user?.systemRole === 'Super Admin';

  useEffect(() => {
    if (!isSuperAdmin) {
      setIsLoading(false);
      return;
    }
    const loadData = async () => {
      setIsLoading(true);
      try {
        const [appSettings, recentJobs, healthRes] = await Promise.all([
          getAppSettings(),
          listServerAnalysisJobs(25),
          fetch('/api/health', { cache: 'no-store' }).then((res) => res.json()).catch(() => null),
        ]);
        setSettings(appSettings);
        setJobs(recentJobs);
        setHealth(healthRes);
        setHealthError(healthRes?.ok === false ? 'Health check failed' : null);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isSuperAdmin]);

  const statusTotals = useMemo(() => {
    return jobs.reduce<Record<string, number>>((acc, job) => {
      acc[job.status] = (acc[job.status] || 0) + 1;
      return acc;
    }, {});
  }, [jobs]);

  const refreshJobs = async () => {
    setIsLoading(true);
    const [appSettings, recentJobs, healthRes] = await Promise.all([
      getAppSettings(),
      listServerAnalysisJobs(25),
      fetch('/api/health', { cache: 'no-store' }).then((res) => res.json()).catch(() => null),
    ]);
    setSettings(appSettings);
    setJobs(recentJobs);
    setHealth(healthRes);
    setHealthError(healthRes?.ok === false ? 'Health check failed' : null);
    setIsLoading(false);
  };

  const handleRunWorker = async () => {
    try {
      setIsRunningWorker(true);
      const res = await runServerWorkerOnce(3);
      toast({ title: "Воркер", description: res.message });
    } catch (e: any) {
      toast({ title: "Ошибка запуска воркера", description: e?.message || "Не удалось запустить.", variant: "destructive" });
    } finally {
      setIsRunningWorker(false);
      refreshJobs();
    }
  };

  const handleRequeue = async () => {
    try {
      setIsRequeuing(true);
      const res = await requeueFailedJobs(20);
      toast({ title: "Перезапуск задач", description: res.message });
    } catch (e: any) {
      toast({ title: "Ошибка перезапуска", description: e?.message || "Не удалось вернуть задачи в очередь.", variant: "destructive" });
    } finally {
      setIsRequeuing(false);
      refreshJobs();
    }
  };

  const handleViewLogs = async (jobId: string) => {
    setSelectedJobId(jobId);
    const logs = await getServerJobLogs(jobId);
    setSelectedJobLogs(logs || []);
  };

  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            Доступ запрещен
          </CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>Только Супер-администратор может управлять серверными функциями.</CardDescription>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (value: any) => {
    if (!value) return '—';
    if (typeof value.toDate === 'function') return value.toDate().toLocaleString('ru-RU');
    return new Date(value).toLocaleString('ru-RU');
  };

  const renderStatusIcon = (state: 'idle' | 'run' | 'ok' | 'fail') => {
    if (state === 'ok') return <span className="text-green-600">✔</span>;
    if (state === 'fail') return <span className="text-destructive">✖</span>;
    if (state === 'run') return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    return <span className="text-muted-foreground">•</span>;
  };

  const runTestStep = async (key: keyof typeof testStatus, action: () => Promise<void>) => {
    setIsTesting(true);
    setTestStatus((s) => ({ ...s, [key]: 'run' }));
    try {
      await action();
      setTestStatus((s) => ({ ...s, [key]: 'ok' }));
    } catch (e) {
      setTestStatus((s) => ({ ...s, [key]: 'fail' }));
      console.error(e);
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivitySquare className="h-5 w-5" />
            Health
          </CardTitle>
          <CardDescription>Сводка статусов воркера и Telegram.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {healthError && <p className="text-destructive">Ошибка: {healthError}</p>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-md border p-3 space-y-1">
              <div className="font-medium">Очередь</div>
              <div>Глубина: {health?.queueDepth ?? '—'}</div>
              <div>Старейшая задача: {health?.queue?.oldestQueuedAt ? new Date(health.queue.oldestQueuedAt).toLocaleString('ru-RU') : '—'}</div>
              <div>Последняя успешная: {health?.queue?.lastSuccessfulAt ? new Date(health.queue.lastSuccessfulAt).toLocaleString('ru-RU') : '—'}</div>
              <div>Job ID: {health?.queue?.lastSuccessfulJobId || '—'}</div>
            </div>
            <div className="rounded-md border p-3 space-y-1">
              <div className="font-medium">Telegram</div>
              <div>Enabled: {health?.telegram?.enabled ? 'yes' : 'no'}</div>
              <div>Mode: {health?.telegram?.mode || '—'}</div>
              <div>Runtime: {health?.telegram?.runtimeStatus || '—'}</div>
              <div>Latency: {typeof health?.telegram?.latencyMs === 'number' ? `${health.telegram.latencyMs} ms` : '—'}</div>
              {health?.telegram?.latencyError && <div className="text-destructive">Latency error: {health.telegram.latencyError}</div>}
              <div>Instance: {health?.telegram?.instanceId || '—'}</div>
            </div>
          </div>
          <Button size="sm" variant="outline" onClick={refreshJobs}>
            <RefreshCcw className="h-4 w-4 mr-2" /> Обновить health
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerCog className="h-5 w-5" />
            Тестирование серверной очереди
          </CardTitle>
          <CardDescription>Мини-диагностика: конфиг → чтение очереди → поиск ошибок.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTestStep('settings', async () => {
            await getAppSettings();
          })}>
            Конфиг {renderStatusIcon(testStatus.settings)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTestStep('jobs', async () => {
            await listServerAnalysisJobs(5);
          })}>
            Последние задачи {renderStatusIcon(testStatus.jobs)}
          </Button>
          <Button variant="outline" size="sm" disabled={isTesting} onClick={() => runTestStep('failures', async () => {
            const recent = await listServerAnalysisJobs(10);
            const hasFailed = recent.some((j) => j.status === 'failed');
            if (hasFailed) throw new Error('Есть задачи со статусом failed — проверьте логи.');
          })}>
            Ошибки {renderStatusIcon(testStatus.failures)}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerCog className="h-5 w-5" />
            Серверные функции
          </CardTitle>
          <CardDescription>Режим фоновой обработки файлов и очереди анализов.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Badge variant={settings?.serverFunctionsEnabled ? 'default' : 'secondary'}>
              {settings?.serverFunctionsEnabled ? 'Включено' : 'Выключено'}
            </Badge>
            <span className="text-muted-foreground text-sm">
              Режим: {settings?.serverFunctionsMode === 'server' ? 'Серверный' : 'Локальный'}
              {settings?.serverFunctionsPaidOnly ? ' • Только платные' : ' • Все пользователи'}
              {settings?.serverFunctionsAllowedPlans?.length ? ` • Тарифы: ${settings.serverFunctionsAllowedPlans.join(', ')}` : ''}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            При серверном режиме задачи создаются в коллекции <code className="font-mono">server_analysis_jobs</code> и обрабатываются без участия пользователя. 
            Эта панель показывает последние задачи и помогает отлаживать VDS-процесс.
          </p>
          <Separator />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={refreshJobs} variant="secondary">
              <RefreshCcw className="h-4 w-4 mr-2" /> Обновить
            </Button>
            <Button size="sm" onClick={handleRunWorker} disabled={isRunningWorker}>
              {isRunningWorker ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />} Запустить воркер
            </Button>
            <Button size="sm" variant="outline" onClick={handleRequeue} disabled={isRequeuing}>
              {isRequeuing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RotateCcw className="h-4 w-4 mr-2" />} Перевести failed/cancelled в очередь
            </Button>
          </div>
          <div className="flex flex-wrap gap-3">
            {(['queued', 'running', 'succeeded', 'failed', 'cancelled'] as const).map((key) => (
              <Badge key={key} variant="outline" className="capitalize">
                {key}: {statusTotals[key] || 0}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ActivitySquare className="h-5 w-5" />
            Последние задачи
          </CardTitle>
          <CardDescription>25 последних запусков серверного анализа.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {jobs.length === 0 && <p className="text-sm text-muted-foreground">Задач пока нет.</p>}
          <div className="space-y-3">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-lg border border-border p-3 space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="font-medium">{job.fileName}</div>
                  <Badge variant={job.status === 'failed' ? 'destructive' : job.status === 'succeeded' ? 'default' : 'secondary'}>
                    {job.status}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Модель: {job.model} • Пользователь: {job.userId}</div>
                <div className="text-xs text-muted-foreground">
                  Создано: {formatDate(job.createdAt)} • Обновлено: {formatDate(job.updatedAt)}
                </div>
                {job.error && <p className="text-xs text-destructive">Ошибка: {job.error}</p>}
                {job.resultRequestId && (
                  <p className="text-xs text-muted-foreground">ID проекта: {job.resultRequestId}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewLogs(job.id)}>
                    <ListChecks className="h-4 w-4 mr-1" /> Логи
                  </Button>
                </div>
              </div>
            ))}
          </div>
          {selectedJobLogs && (
            <div className="rounded-lg border border-dashed border-border/70 p-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold">Логи задачи {selectedJobId}</p>
                <Button size="sm" variant="ghost" onClick={() => setSelectedJobLogs(null)}>Скрыть</Button>
              </div>
              <ScrollArea className="h-64 mt-2 pr-2">
                <div className="space-y-2 text-xs">
                  {selectedJobLogs.length === 0 && <p className="text-muted-foreground">Логи отсутствуют.</p>}
                  {selectedJobLogs.map((log, idx) => (
                    <div key={idx} className="rounded-md border border-border/70 p-2">
                      <div className="flex justify-between">
                        <span className="font-semibold">{log.stage || 'log'}</span>
                        <span className="text-muted-foreground">{formatDate(log.timestamp)}</span>
                      </div>
                      <p className="text-muted-foreground">{log.message}</p>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
