"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';
import {
  createCrmTask,
  getCrmWorkspaceData,
  runCrmSlaSweep,
  syncServiceRequestsToDeals,
  updateCrmDeal,
  updateCrmTaskStatus,
  upsertCrmAutomationRule,
} from '@/actions/crmActions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RefreshCw, ShieldAlert, Workflow } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

const pipelineColumns = ['new', 'qualified', 'in_progress', 'waiting_client', 'resolved', 'closed_lost'] as const;

function formatDate(value: any) {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ru-RU');
}

export default function CrmPage() {
  const { user } = useAppContext();
  const { toast } = useToast();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [workspace, setWorkspace] = useState<any>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDealId, setNewTaskDealId] = useState('');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [ruleName, setRuleName] = useState('Auto-sync Service Requests');

  const canView = !!user && (user.systemRole === 'Admin' || user.systemRole === 'Super Admin' || (user as any).crmRole);

  const loadWorkspace = useCallback(() => {
    setIsLoading(true);
    startTransition(async () => {
      try {
        const result = await getCrmWorkspaceData();
        if (!result.success) throw new Error(result.message || 'Ошибка загрузки CRM.');
        setWorkspace(result);
      } catch (error: any) {
        toast({ title: 'Ошибка CRM', description: error.message || 'Не удалось загрузить workspace.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    });
  }, [toast]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    if (!canView) {
      router.replace('/dashboard');
      return;
    }
    loadWorkspace();
  }, [user?.uid, canView, router, loadWorkspace]);

  const deals = workspace?.deals || [];
  const tasks = workspace?.tasks || [];
  const activity = workspace?.activity || [];
  const slaEvents = workspace?.slaEvents || [];
  const metrics = workspace?.metrics || {};

  const dealsByStatus = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    pipelineColumns.forEach((col) => { grouped[col] = []; });
    deals.forEach((deal: any) => {
      const key = pipelineColumns.includes(deal.status) ? deal.status : 'new';
      grouped[key].push(deal);
    });
    return grouped;
  }, [deals]);

  const quickUpdateDeal = (dealId: string, status: string) => {
    startTransition(async () => {
      const result = await updateCrmDeal({ dealId, status: status as any });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        return;
      }
      loadWorkspace();
      toast({ title: 'Сделка обновлена', description: result.message });
    });
  };

  const quickUpdateTask = (taskId: string, status: string) => {
    startTransition(async () => {
      const result = await updateCrmTaskStatus({ taskId, status: status as any });
      if (!result.success) {
        toast({ title: 'Ошибка', description: result.message, variant: 'destructive' });
        return;
      }
      loadWorkspace();
    });
  };

  const handleSync = () => {
    startTransition(async () => {
      const result = await syncServiceRequestsToDeals();
      if (!result.success) {
        toast({ title: 'Ошибка sync', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Sync завершен', description: result.message });
      loadWorkspace();
    });
  };

  const handleSlaSweep = () => {
    startTransition(async () => {
      const result = await runCrmSlaSweep();
      if (!result.success) {
        toast({ title: 'Ошибка SLA', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'SLA sweep', description: result.message });
      loadWorkspace();
    });
  };

  const handleCreateTask = () => {
    if (!newTaskTitle || !newTaskDealId || !newTaskAssigneeId) {
      toast({ title: 'Нужно заполнить поля', description: 'deal, assignee и title обязательны.', variant: 'destructive' });
      return;
    }
    startTransition(async () => {
      const result = await createCrmTask({
        dealId: newTaskDealId,
        title: newTaskTitle,
        assigneeId: newTaskAssigneeId,
        priority: 'medium',
      });
      if (!result.success) {
        toast({ title: 'Ошибка задачи', description: result.message, variant: 'destructive' });
        return;
      }
      setNewTaskTitle('');
      loadWorkspace();
    });
  };

  const handleUpsertRule = () => {
    startTransition(async () => {
      const result = await upsertCrmAutomationRule({
        name: ruleName,
        enabled: true,
        trigger: 'service_request_created',
        config: { createDeal: true, defaultPriority: 'medium' },
      });
      if (!result.success) {
        toast({ title: 'Ошибка automation', description: result.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Automation rule', description: result.message });
      loadWorkspace();
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
            <Button asChild><Link href="/auth/login">Войти</Link></Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!canView) return null;

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>CRM Workspace</CardTitle>
          <CardDescription>Сделки, задачи, SLA и automation на базе `crm_*` коллекций.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Badge variant="outline">Всего сделок: {metrics.total || 0}</Badge>
          <Badge>new: {metrics.new || 0}</Badge>
          <Badge variant="secondary">in_progress: {metrics.in_progress || 0}</Badge>
          <Badge variant="default">resolved: {metrics.resolved || 0}</Badge>
          <Badge variant="destructive">closed_lost: {metrics.closed_lost || 0}</Badge>
          <Button variant="outline" size="sm" disabled={isPending} onClick={loadWorkspace}>
            <RefreshCw className="mr-2 h-4 w-4" /> Обновить
          </Button>
          <Button variant="outline" size="sm" disabled={isPending} onClick={handleSync}>
            <Workflow className="mr-2 h-4 w-4" /> Sync service_requests
          </Button>
          <Button variant="outline" size="sm" disabled={isPending} onClick={handleSlaSweep}>
            <ShieldAlert className="mr-2 h-4 w-4" /> SLA sweep
          </Button>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="h-40 flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : (
        <Tabs defaultValue="board" className="space-y-4">
          <TabsList>
            <TabsTrigger value="board">Board</TabsTrigger>
            <TabsTrigger value="table">Table</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="sla">SLA</TabsTrigger>
          </TabsList>

          <TabsContent value="board">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {pipelineColumns.map((status) => (
                <Card key={status}>
                  <CardHeader>
                    <CardTitle className="text-sm">{status}</CardTitle>
                    <CardDescription>{dealsByStatus[status]?.length || 0} сделок</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {(dealsByStatus[status] || []).slice(0, 12).map((deal: any) => (
                      <div key={deal._id} className="rounded-md border p-2 space-y-2">
                        <div className="font-medium text-sm">{deal.title || `Deal ${deal._id}`}</div>
                        <div className="text-xs text-muted-foreground">{deal.userEmail || '—'}</div>
                        <Select value={deal.status} onValueChange={(v) => quickUpdateDeal(deal._id, v)} disabled={isPending}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {pipelineColumns.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardHeader>
                <CardTitle>Сделки</CardTitle>
                <CardDescription>Полная таблица сделок CRM.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Менеджер</TableHead>
                        <TableHead>SLA first response</TableHead>
                        <TableHead>SLA resolution</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deals.map((deal: any) => (
                        <TableRow key={deal._id}>
                          <TableCell className="font-mono text-xs">{deal._id}</TableCell>
                          <TableCell>{deal.userEmail || deal.userName || '—'}</TableCell>
                          <TableCell>{deal.status}</TableCell>
                          <TableCell>{deal.managerId || '—'}</TableCell>
                          <TableCell>{formatDate(deal.firstResponseDueAt)}</TableCell>
                          <TableCell>{formatDate(deal.resolutionDueAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tasks">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle>Новая задача</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <Label>Deal ID</Label>
                    <Input value={newTaskDealId} onChange={(e) => setNewTaskDealId(e.target.value)} placeholder="crm_deal id" />
                  </div>
                  <div className="space-y-1">
                    <Label>Assignee ID</Label>
                    <Input value={newTaskAssigneeId} onChange={(e) => setNewTaskAssigneeId(e.target.value)} placeholder="manager user id" />
                  </div>
                  <div className="space-y-1">
                    <Label>Title</Label>
                    <Input value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} placeholder="Что нужно сделать" />
                  </div>
                  <Button onClick={handleCreateTask} disabled={isPending}>Создать задачу</Button>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle>Список задач</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {tasks.slice(0, 50).map((task: any) => (
                    <div key={task._id} className="rounded-md border p-2 flex items-center justify-between gap-2">
                      <div>
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-muted-foreground">{task.assigneeId} • {task.dealId}</div>
                      </div>
                      <Select value={task.status} onValueChange={(v) => quickUpdateTask(task._id, v)} disabled={isPending}>
                        <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="open">open</SelectItem>
                          <SelectItem value="in_progress">in_progress</SelectItem>
                          <SelectItem value="done">done</SelectItem>
                          <SelectItem value="cancelled">cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle>Timeline</CardTitle>
                <CardDescription>Последние события CRM (activity log).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {activity.slice(0, 100).map((entry: any) => (
                  <div key={entry._id} className="rounded-md border p-2">
                    <div className="text-sm font-medium">{entry.type}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(entry.createdAt)} • actor: {entry.actorId || '—'}</div>
                    {entry.note ? <div className="text-sm mt-1">{entry.note}</div> : null}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="sla">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>SLA события</CardTitle>
                  <CardDescription>Нарушения first response/resolution.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  {slaEvents.slice(0, 100).map((event: any) => (
                    <div key={event._id} className="rounded-md border p-2">
                      <div className="font-medium text-sm">{event.type}</div>
                      <div className="text-xs text-muted-foreground">deal: {event.dealId} • {formatDate(event.createdAt)}</div>
                    </div>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Automation Rules</CardTitle>
                  <CardDescription>Автоматизация обработки заявок.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="space-y-1">
                    <Label>Rule name</Label>
                    <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} />
                  </div>
                  <Button onClick={handleUpsertRule} disabled={isPending}>Создать/обновить rule</Button>
                  <div className="text-xs text-muted-foreground">
                    Текущих правил: {(workspace?.rules || []).length}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
