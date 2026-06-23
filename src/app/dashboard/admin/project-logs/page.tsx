// src/app/dashboard/admin/project-logs/page.tsx
// @ts-nocheck
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  Info,
  Loader2,
  Network,
  RefreshCw,
  Search,
  Server,
  Shield,
  Sparkles,
  TriangleAlert,
  GitBranch,
  Wand2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { cn } from "@/lib/utils";

type ProjectEvent = {
  id?: string;
  projectId: string;
  jobId?: string | null;
  userId?: string | null;
  action: string;
  stage?: string | null;
  status: "debug" | "info" | "success" | "warning" | "error";
  message?: string | null;
  source?: "client" | "server" | "worker" | "api";
  model?: string | null;
  file?: {
    name?: string | null;
    uri?: string | null;
    sha1?: string | null;
    objectKey?: string | null;
  } | null;
  metadata?: Record<string, any>;
  request?: any;
  response?: any;
  error?: any;
  timestamp: any;
  tags?: string[];
  correlationId?: string;
};

const statusPriority: Record<ProjectEvent["status"], number> = {
  error: 5,
  warning: 4,
  success: 3,
  info: 2,
  debug: 1,
};

const statusConfig: Record<ProjectEvent["status"], { label: string; icon: any; variant: "destructive" | "secondary" | "outline" | "default" }> = {
  error: { label: "Критично", icon: AlertCircle, variant: "destructive" },
  warning: { label: "Предупреждение", icon: TriangleAlert, variant: "secondary" },
  success: { label: "Успех", icon: CheckCircle, variant: "default" },
  info: { label: "Инфо", icon: Info, variant: "outline" },
  debug: { label: "Отладка", icon: Sparkles, variant: "outline" },
};

const actionOptions = [
  "PROJECT_PROCESSING_START",
  "PROJECT_PROCESSING_STAGE",
  "PROJECT_PROCESSING_COMPLETE",
  "PROJECT_PROCESSING_FAILED",
  "PROJECT_PROCESSING_CANCELLED",
  "PROJECT_PROCESSING_RESTART",
  "PROJECT_JOB_CREATED",
  "PROJECT_JOB_STATUS",
  "PROJECT_JOB_LINKED",
  "PROJECT_NOTIFICATION",
  "PROJECT_AI_CALL",
  "PROJECT_CACHE",
];

const sourceOptions: Array<ProjectEvent["source"]> = ["client", "server", "worker", "api"];
const roleOptions = ["User", "Admin", "Super Admin"];

const timePresets = [
  { value: "24h", label: "Последние 24 часа" },
  { value: "3d", label: "Последние 3 дня" },
  { value: "7d", label: "Последние 7 дней" },
  { value: "30d", label: "Последние 30 дней" },
  { value: "all", label: "Все время" },
  { value: "custom", label: "Свои даты" },
];

type LogFilters = {
  projectId: string;
  jobId: string;
  userId: string;
  model: string;
  stage: string;
  search: string;
  statuses: ProjectEvent["status"][];
  actions: string[];
  sources: ProjectEvent["source"][];
  roles: string[];
  timeRange: "24h" | "3d" | "7d" | "30d" | "all" | "custom";
  from: string;
  to: string;
  limit: number;
  sort: "newest" | "severity";
  onlyImportant: boolean;
};

const defaultLogFilters: LogFilters = {
  projectId: "",
  jobId: "",
  userId: "",
  model: "",
  stage: "",
  search: "",
  statuses: ["error", "warning", "success", "info", "debug"],
  actions: [],
  sources: [],
  roles: [],
  timeRange: "24h",
  from: "",
  to: "",
  limit: 500,
  sort: "newest",
  onlyImportant: false,
};

type Preset = {
  id: string;
  label: string;
  description: string;
  apply: (currentFilters: LogFilters) => LogFilters;
};

const presets: Preset[] = [
  {
    id: "critical-24h",
    label: "Критичные 24ч",
    description: "Error + Warning, последние 24 часа, приоритет по важности",
    apply: () => ({
      ...defaultLogFilters,
      statuses: ["error", "warning"],
      timeRange: "24h",
      sort: "severity",
      onlyImportant: true,
    }),
  },
  {
    id: "ai-worker",
    label: "AI/worker ошибки",
    description: "Ошибки worker AI вызовов за 24ч",
    apply: () => ({
      ...defaultLogFilters,
      statuses: ["error", "warning"],
      actions: ["PROJECT_AI_CALL", "PROJECT_PROCESSING_FAILED"],
      sources: ["worker"],
      timeRange: "24h",
      sort: "severity",
      onlyImportant: true,
    }),
  },
  {
    id: "jobs-3d",
    label: "Серверные задачи 3д",
    description: "Статусы задач (running/failed/cancelled) за 3 дня",
    apply: () => ({
      ...defaultLogFilters,
      actions: ["PROJECT_JOB_STATUS", "PROJECT_PROCESSING_FAILED", "PROJECT_PROCESSING_CANCELLED"],
      timeRange: "3d",
      sort: "severity",
      onlyImportant: false,
    }),
  },
  {
    id: "success-24h",
    label: "Успешные за сутки",
    description: "PROJECT_PROCESSING_COMPLETE, только success, 24 часа",
    apply: () => ({
      ...defaultLogFilters,
      actions: ["PROJECT_PROCESSING_COMPLETE"],
      statuses: ["success"],
      timeRange: "24h",
      sort: "newest",
      onlyImportant: false,
    }),
  },
];

export default function ProjectLogsPage() {
  const { toast } = useToast();
  const [rawProjectLogs, setRawProjectLogs] = useState<ProjectEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingUsers, setIsFetchingUsers] = useState(false);
  const [usersMap, setUsersMap] = useState<Record<string, any>>({});
  const [logFilters, setLogFilters] = useState<LogFilters>(defaultLogFilters);

  const parseTimestamp = (ts: any) => {
    if (!ts) return null;
    if (ts.toDate) return ts.toDate();
    if (ts instanceof Date) return ts;
    if (typeof ts === "string" || typeof ts === "number") return new Date(ts);
    if (ts?._seconds) return new Date(ts._seconds * 1000);
    return null;
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    if (logFilters.timeRange === "custom") {
      return {
        from: logFilters.from ? new Date(logFilters.from) : null,
        to: logFilters.to ? new Date(logFilters.to) : null,
      };
    }
    if (logFilters.timeRange === "all") {
      return { from: null, to: null };
    }
    const mapping: Record<string, number> = { "24h": 24, "3d": 72, "7d": 168, "30d": 720 };
    const hours = mapping[logFilters.timeRange] || 24;
    const from = new Date(now.getTime() - hours * 60 * 60 * 1000);
    return { from, to: now };
  }, [logFilters.timeRange, logFilters.from, logFilters.to]);

  const buildLogQueryFilters = () => {
    const list: any[] = [];
    if (logFilters.projectId) list.push({ field: "projectId", op: "==", value: logFilters.projectId.trim() });
    if (logFilters.jobId) list.push({ field: "jobId", op: "==", value: logFilters.jobId.trim() });
    if (logFilters.userId) list.push({ field: "userId", op: "==", value: logFilters.userId.trim() });
    if (logFilters.model) list.push({ field: "model", op: "==", value: logFilters.model.trim() });
    if (logFilters.stage) list.push({ field: "stage", op: "==", value: logFilters.stage.trim() });
    if (logFilters.statuses.length && logFilters.statuses.length < Object.keys(statusPriority).length) {
      list.push({ field: "status", op: "in", value: logFilters.statuses });
    }
    if (logFilters.actions.length) list.push({ field: "action", op: "in", value: logFilters.actions });
    if (logFilters.sources.length) list.push({ field: "source", op: "in", value: logFilters.sources });
    if (dateRange.from) list.push({ field: "timestamp", op: ">=", value: dateRange.from });
    if (dateRange.to) list.push({ field: "timestamp", op: "<=", value: dateRange.to });
    return list;
  };

  const fetchUsersForLogs = useCallback(async (logs: ProjectEvent[]) => {
    const missingIds = Array.from(
      new Set(
        logs
          .map((log) => log.userId)
          .filter(Boolean)
          .filter((uid) => !usersMap[uid as string])
      )
    ) as string[];
    if (!missingIds.length) return;
    setIsFetchingUsers(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "collection",
          collection: "users",
          filters: [{ field: "_id", op: "in", value: missingIds }],
          limit: missingIds.length,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Не удалось загрузить пользователей");
      const map: Record<string, any> = {};
      (json.docs || []).forEach((u: any) => {
        if (u._id) map[u._id] = u;
      });
      setUsersMap((prev) => ({ ...prev, ...map }));
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки пользователей",
        description: error?.message || "Не удалось подтянуть роли.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingUsers(false);
    }
  }, [usersMap, toast]);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "collection",
          collection: "project_event_logs",
          filters: buildLogQueryFilters(),
          orderBy: [{ field: "timestamp", direction: "desc" }],
          limit: logFilters.limit,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message || "Не удалось загрузить логи");
      const logs = (json.docs || []).map((doc: any) => ({ id: doc._id || doc.id, ...doc })) as ProjectEvent[];
      setRawProjectLogs(logs);
      fetchUsersForLogs(logs);
    } catch (error: any) {
      toast({
        title: "Ошибка загрузки логов",
        description: error?.message || "Не удалось получить project_event_logs.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [logFilters, dateRange, fetchUsersForLogs, toast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const toggleFromList = (field: "actions" | "sources" | "statuses" | "roles", value: string) => {
    setLogFilters((prev) => {
      const exists = prev[field].includes(value as any);
      const next = exists ? prev[field].filter((item: any) => item !== value) : [...prev[field], value];
      return { ...prev, [field]: next };
    });
  };

  const resetFilters = () => {
    setLogFilters(defaultLogFilters);
  };

  const logsWithUserMeta = useMemo(() => {
    return rawProjectLogs.map((log) => {
      const ts = parseTimestamp(log.timestamp);
      const user = log.userId ? usersMap[log.userId] : null;
      const role = user?.systemRole || null;
      return { ...log, _ts: ts, _role: role };
    });
  }, [rawProjectLogs, usersMap]);

  const visibleLogs = useMemo(() => {
    let logs = logsWithUserMeta.filter((log) => !!log._ts);
    if (logFilters.roles.length) {
      logs = logs.filter((log) => logFilters.roles.includes(log._role || "Unknown"));
    }
    if (logFilters.search.trim()) {
      const needle = logFilters.search.toLowerCase();
      logs = logs.filter((log) => {
        return (
          (log.message || "").toLowerCase().includes(needle) ||
          (log.stage || "").toLowerCase().includes(needle) ||
          (log.action || "").toLowerCase().includes(needle) ||
          (log.error?.message || "").toLowerCase().includes(needle) ||
          (log.metadata && JSON.stringify(log.metadata).toLowerCase().includes(needle))
        );
      });
    }
    if (logFilters.onlyImportant) {
      logs = logs.filter((log) => statusPriority[log.status] >= 4);
    }
    if (logFilters.sort === "severity") {
      logs = [...logs].sort((a, b) => {
        const sevDiff = statusPriority[b.status] - statusPriority[a.status];
        if (sevDiff !== 0) return sevDiff;
        return (b._ts?.getTime() || 0) - (a._ts?.getTime() || 0);
      });
    } else {
      logs = [...logs].sort((a, b) => (b._ts?.getTime() || 0) - (a._ts?.getTime() || 0));
    }
    return logs;
  }, [logsWithUserMeta, logFilters.roles, logFilters.search, logFilters.onlyImportant, logFilters.sort]);

  const stats = useMemo(() => {
    const base = { total: visibleLogs.length, byStatus: {} as Record<string, number> };
    visibleLogs.forEach((log) => {
      base.byStatus[log.status] = (base.byStatus[log.status] || 0) + 1;
    });
    return base;
  }, [visibleLogs]);

  const recommendations = (log: ProjectEvent) => {
    const recs: string[] = [];
    if (log.status === "error") {
      recs.push("Зафиксируйте контекст (projectId, jobId) и перепроверьте сеть до провайдера (AI/S3) и Mongo.");
      recs.push("Повторите запрос после валидации доступа; если ошибка повторяется, создайте тикет с логом и timestamp.");
    }
    if (log.stage?.includes("ai_")) {
      recs.push("Проверьте ключи и лимиты AI-провайдера, а также корректность промпта mainAnalysis.");
    }
    if (log.action === "PROJECT_PROCESSING_FAILED") {
      recs.push("Убедитесь, что серверная задача не была отменена пользователем и что server-functions включены.");
      recs.push("Проверьте доступность входного файла (S3/objectKey) и кеша анализа.");
    }
    if (log.action === "PROJECT_AI_CALL" && log.status === "error") {
      recs.push("Повторите вызов с более низкой температурой и проверьте формат входных данных (mime, fileUri).");
    }
    if (log.action === "PROJECT_CACHE") {
      recs.push("Отметьте проект как проверенный, чтобы избежать лишних AI-вызовов, или принудительно сбросьте кеш при несовпадении файла.");
    }
    if (log.status === "warning" && log.stage?.includes("cancel")) {
      recs.push("Подтвердите, что отмена намеренная. Иначе запретите повторные отмены и перезапустите задачу.");
    }
    if (log.status === "success" && log.action === "PROJECT_PROCESSING_COMPLETE") {
      recs.push("Сверьте списание кредитов и наличие initialAiResponse в кешах.");
    }
    if (log.error?.message?.toLowerCase?.().includes("network")) {
      recs.push("Проверьте локальный прокси/файрволл, резолв хоста и перезапустите worker с тестом сетевого доступа.");
    }
    if (!recs.length) {
      recs.push("Сверьте входные данные (fileUri, sha1, model), повторите сценарий и при необходимости включите DEBUG уровень.");
    }
    return recs;
  };

  const renderBadge = (log: ProjectEvent) => {
    const cfg = statusConfig[log.status];
    const Icon = cfg.icon;
    return (
      <Badge variant={cfg.variant} className="flex items-center gap-1">
        <Icon className="h-3.5 w-3.5" />
        {cfg.label}
      </Badge>
    );
  };

  const StageIcon = ({ source }: { source?: string }) => {
    if (source === "worker") return <Server className="h-4 w-4 text-muted-foreground" />;
    if (source === "api") return <Network className="h-4 w-4 text-muted-foreground" />;
    if (source === "client") return <Search className="h-4 w-4 text-muted-foreground" />;
    return <GitBranch className="h-4 w-4 text-muted-foreground" />;
  };

  const applyPreset = (preset: Preset) => {
    setLogFilters(preset.apply(logFilters));
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Логи проекта (project_event_logs)</CardTitle>
            <CardDescription>Глубокая трассировка pipeline: projectId, jobId, этапы, статус, AI и кеш.</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={resetFilters}>Сбросить</Button>
            <Button size="sm" onClick={fetchLogs} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">Обновить</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant="outline"
                size="sm"
                onClick={() => applyPreset(preset)}
                className="flex items-center gap-2"
              >
                <Wand2 className="h-4 w-4" />
                <span>{preset.label}</span>
              </Button>
            ))}
          </div>
          <div className="text-xs text-muted-foreground leading-relaxed">
            {presets.map((preset) => (
              <div key={preset.id} className="flex items-center gap-2">
                <Badge variant="outline" className="h-5">{preset.label}</Badge>
                <span>{preset.description}</span>
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-4">
            <div className="space-y-2">
              <Label>Project ID</Label>
              <div className="flex gap-2">
                <Input value={logFilters.projectId} onChange={(e) => setLogFilters((p) => ({ ...p, projectId: e.target.value }))} placeholder="Поиск по projectId" />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Job ID</Label>
              <div className="flex gap-2">
                <Input value={logFilters.jobId} onChange={(e) => setLogFilters((p) => ({ ...p, jobId: e.target.value }))} placeholder="Поиск по jobId" />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <div className="flex gap-2">
                <Input value={logFilters.userId} onChange={(e) => setLogFilters((p) => ({ ...p, userId: e.target.value }))} placeholder="Поиск по userId" />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Модель</Label>
              <div className="flex gap-2">
                <Input value={logFilters.model} onChange={(e) => setLogFilters((p) => ({ ...p, model: e.target.value }))} placeholder="gpt-4, etc." />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Этап</Label>
              <div className="flex gap-2">
                <Input value={logFilters.stage} onChange={(e) => setLogFilters((p) => ({ ...p, stage: e.target.value }))} placeholder="ai_request, cache_result..." />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Полнотекстовый фильтр</Label>
              <div className="flex gap-2">
                <Input value={logFilters.search} onChange={(e) => setLogFilters((p) => ({ ...p, search: e.target.value }))} placeholder="message, metadata, error" />
                <Button size="icon" variant="outline" onClick={fetchLogs}><Search className="h-4 w-4" /></Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Диапазон времени</Label>
              <Select value={logFilters.timeRange} onValueChange={(value) => setLogFilters((p) => ({ ...p, timeRange: value }))}>
                <SelectTrigger><SelectValue placeholder="Выбрать диапазон" /></SelectTrigger>
              <SelectContent>
                {timePresets.map((preset) => (
                  <SelectItem key={preset.value} value={preset.value}>{preset.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {logFilters.timeRange === "custom" && (
              <div className="grid grid-cols-2 gap-2">
                <Input type="datetime-local" value={logFilters.from} onChange={(e) => setLogFilters((p) => ({ ...p, from: e.target.value }))} />
                <Input type="datetime-local" value={logFilters.to} onChange={(e) => setLogFilters((p) => ({ ...p, to: e.target.value }))} />
              </div>
            )}
          </div>
          <div className="space-y-2">
              <Label>Лимит</Label>
              <Input type="number" min={50} max={2000} value={logFilters.limit} onChange={(e) => setLogFilters((p) => ({ ...p, limit: Number(e.target.value) || 500 }))} />
              <div className="flex items-center gap-2">
                <Switch checked={logFilters.onlyImportant} onCheckedChange={(checked) => setLogFilters((p) => ({ ...p, onlyImportant: checked }))} />
                <span className="text-sm text-muted-foreground">Только важные (warning/error)</span>
            </div>
          </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Статусы</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(statusConfig) as ProjectEvent["status"][]).map((status) => (
                <Button
                  key={status}
                  size="sm"
                  variant={logFilters.statuses.includes(status) ? "secondary" : "outline"}
                  onClick={() => toggleFromList("statuses", status)}
                >
                  {statusConfig[status].label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Действия (action)</Label>
            <ScrollArea className="h-28 border rounded-md p-2">
              <div className="grid grid-cols-2 gap-2">
                {actionOptions.map((action) => (
                  <Button
                    key={action}
                    size="sm"
                    variant={logFilters.actions.includes(action) ? "secondary" : "outline"}
                    onClick={() => toggleFromList("actions", action)}
                    className="justify-start"
                  >
                    {action}
                  </Button>
                ))}
              </div>
            </ScrollArea>
          </div>
          <div className="space-y-2">
            <Label>Источник</Label>
            <div className="flex flex-wrap gap-2">
              {sourceOptions.map((source) => (
                <Button
                  key={source}
                  size="sm"
                  variant={logFilters.sources.includes(source) ? "secondary" : "outline"}
                  onClick={() => toggleFromList("sources", source)}
                >
                  {source}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Роль пользователя</Label>
            <div className="flex flex-wrap gap-2">
              {roleOptions.map((role) => (
                <Button
                  key={role}
                  size="sm"
                  variant={logFilters.roles.includes(role) ? "secondary" : "outline"}
                  onClick={() => toggleFromList("roles", role)}
                >
                  {role}
                </Button>
              ))}
              {isFetchingUsers && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Сортировка</Label>
            <Select value={logFilters.sort} onValueChange={(value) => setLogFilters((p) => ({ ...p, sort: value as "newest" | "severity" }))}>
              <SelectTrigger><SelectValue placeholder="Сортировка" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Сначала новые</SelectItem>
                <SelectItem value="severity">Критичные выше</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Сводка</CardTitle>
            <CardDescription>Всего: {stats.total}. Ошибки: {stats.byStatus.error || 0}, Предупреждения: {stats.byStatus.warning || 0}</CardDescription>
          </div>
          <div className="flex gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1"><AlertCircle className="h-4 w-4 text-destructive" />{stats.byStatus.error || 0}</div>
            <div className="flex items-center gap-1"><TriangleAlert className="h-4 w-4 text-yellow-500" />{stats.byStatus.warning || 0}</div>
            <div className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-success" />{stats.byStatus.success || 0}</div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Загрузка логов...
            </div>
          ) : visibleLogs.length === 0 ? (
            <div className="border border-dashed rounded-lg p-6 text-center text-muted-foreground">
              Нет логов по текущим фильтрам.
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {visibleLogs.map((log) => {
                const date = log._ts ? format(log._ts, "d MMM yyyy, HH:mm:ss", { locale: ru }) : "N/A";
                const recs = recommendations(log);
                const user = log.userId ? usersMap[log.userId] : null;
                const role = log._role || "Неизвестно";
                return (
                  <Card key={log.id || `${log.projectId}-${log.timestamp}-${log.stage}`} className={cn(
                    "border",
                    log.status === "error" ? "border-destructive/70" : "",
                    log.status === "warning" ? "border-yellow-500/40" : ""
                  )}>
                    <CardHeader className="flex flex-row items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {renderBadge(log)}
                          <Badge variant="outline">{log.action}</Badge>
                          {log.stage && <Badge variant="outline">{log.stage}</Badge>}
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <StageIcon source={log.source} />
                            {log.source || "n/a"}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-3">
                          <span>Project: {log.projectId}</span>
                          {log.jobId && <span>Job: {log.jobId}</span>}
                          {log.model && <span>Model: {log.model}</span>}
                          <span>Время: {date}</span>
                        </div>
                        {log.message && <p className="text-sm font-medium">{log.message}</p>}
                      </div>
                      <div className="text-right text-sm text-muted-foreground">
                        <div className="flex items-center justify-end gap-1">
                          <Shield className="h-4 w-4" />
                          <span>{role}</span>
                        </div>
                        {log.userId && <div className="text-xs">User: {log.userId}</div>}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Файл</Label>
                          <div className="rounded-md border bg-muted/50 p-2 text-xs space-y-1">
                            <div>name: {log.file?.name || "—"}</div>
                            <div>uri: {log.file?.uri || "—"}</div>
                            <div>sha1: {log.file?.sha1 || "—"}</div>
                            <div>objectKey: {log.file?.objectKey || "—"}</div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Метаданные</Label>
                          <pre className="rounded-md border bg-muted/50 p-2 text-xs max-h-44 overflow-auto">{JSON.stringify(log.metadata || {}, null, 2)}</pre>
                        </div>
                        <div className="space-y-2">
                          <Label>Ошибка / ответ</Label>
                          <ScrollArea className="rounded-md border bg-muted/50 p-2 text-xs h-44">
                            {log.error ? (
                              <pre className="whitespace-pre-wrap">{JSON.stringify(log.error, null, 2)}</pre>
                            ) : log.response ? (
                              <pre className="whitespace-pre-wrap">{JSON.stringify(log.response, null, 2)}</pre>
                            ) : (
                              <span className="text-muted-foreground">Нет ошибки</span>
                            )}
                          </ScrollArea>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Рекомендации</Label>
                        <ul className="list-disc list-inside text-sm space-y-1">
                          {recs.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
