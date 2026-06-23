// src/app/dashboard/admin/page.tsx
"use client";

import { useState, useEffect, useMemo, type ReactElement } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, BadgeDollarSign, AlertTriangle, Loader2, Star, Server, MoveLeft, MoveRight, X, Sparkles, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, PieChart, Pie, Cell } from "recharts";
import { collection, getDocs }from '@/lib/db-client';
import { db } from '@/lib/db';
import { AppUser, HistoryRequest, UserPlan } from '@/contexts/AppContext';
import { format, subDays, eachDayOfInterval, parse } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { getAiApiStats } from '@/actions/adminActions';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type ChartMetric = 'credits' | 'requestsCount' | 'newUsers' | 'activeUsers';
type WidgetSize = '1x1' | '2x1' | '2x2' | '3x1' | '3x2' | '4x2';
type WidgetId = 'pulse' | 'trend' | 'roles' | 'ai' | 'plans' | 'tickets' | 'telegram' | 'pwa' | 'engagement';
type WidgetConfig = { id: WidgetId; size: WidgetSize };

const chartConfig = {
  credits: { label: "Кредиты", color: "hsl(var(--primary))" },
  requestsCount: { label: "Новые проекты", color: "hsl(var(--chart-2))" },
  newUsers: { label: "Регистрации", color: "hsl(var(--chart-3))" },
  activeUsers: { label: "Активные пользователи", color: "hsl(var(--chart-4))" },
  tgEvents: { label: "TG события", color: "hsl(var(--chart-5))" },
  pwaEvents: { label: "PWA события", color: "hsl(var(--chart-1))" },
  'Free': { label: 'Free', color: 'hsl(var(--chart-1))' },
  'PRO': { label: 'PRO', color: 'hsl(var(--chart-2))' },
  'Business': { label: 'Business', color: 'hsl(var(--chart-4))' },
  'Enterprise': { label: 'Enterprise', color: 'hsl(var(--chart-3))' },
  'Admin': { label: 'Admin', color: 'hsl(var(--chart-5))' },
  'Super Admin': { label: 'Super Admin', color: 'hsl(var(--destructive))' },
} satisfies import("@/components/ui/chart").ChartConfig;

const useLocalStorageState = <T,>(key: string, defaultValue: T) => {
    const [state, setState] = useState<T>(() => {
        if (typeof window === 'undefined') return defaultValue;
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn(error);
            return defaultValue;
        }
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(key, JSON.stringify(state));
        }
    }, [key, state]);

    return [state, setState] as const;
};

const sizeToMeta: Record<WidgetSize, { cols: number; rows: number }> = {
    '1x1': { cols: 1, rows: 1 },
    '2x1': { cols: 2, rows: 1 },
    '2x2': { cols: 2, rows: 2 },
    '3x1': { cols: 3, rows: 1 },
    '3x2': { cols: 3, rows: 2 },
    '4x2': { cols: 4, rows: 2 },
};

const formatNumber = (value: number | undefined) => {
    if (value === undefined || value === null) return '—';
    if (value >= 1000) return Intl.NumberFormat('ru-RU').format(value);
    return value.toString();
};

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>({ loading: true });
    const [period, setPeriod] = useState<string>('30');
    const [selectedMetrics, setSelectedMetrics] = useLocalStorageState<ChartMetric[]>('adminDashboardMetrics', ['credits']);
    const [aiStats, setAiStats] = useState({ totalCalls: 0, successCalls: 0, errorCalls: 0, totalCost: 0 });
    const [widgets, setWidgets] = useLocalStorageState<WidgetConfig[]>('adminDashboardWidgets', [
        { id: 'pulse', size: '2x1' },
        { id: 'trend', size: '2x2' },
        { id: 'roles', size: '1x1' },
        { id: 'ai', size: '1x1' },
        { id: 'plans', size: '1x1' },
        { id: 'engagement', size: '2x1' },
    ]);
    const [pendingWidget, setPendingWidget] = useState<string>("");
    const [draggingId, setDraggingId] = useState<WidgetId | null>(null);
    const [dragOverId, setDragOverId] = useState<WidgetId | null>(null);
    const [dragSizePreview, setDragSizePreview] = useState<WidgetSize | null>(null);

    useEffect(() => {
        const fetchStats = async () => {
            setStats({ loading: true });

            try {
                const [usersSnapshot, requestsSnapshot, logsSnapshot, eventsSnapshot, apiStatsResult] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'requests')),
                    getDocs(collection(db, 'user_logs')),
                    getDocs(collection(db, 'engagement_events')),
                    getAiApiStats(24),
                ]);

                if (apiStatsResult.success) {
                    setAiStats({
                        totalCalls: apiStatsResult.totalCalls || 0,
                        successCalls: apiStatsResult.successCalls || 0,
                        errorCalls: apiStatsResult.errorCalls || 0,
                        totalCost: apiStatsResult.totalCost || 0,
                    });
                }

                const users = usersSnapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
                const requests = requestsSnapshot.docs.map(doc => doc.data() as HistoryRequest);
                const logs = logsSnapshot.docs.map(doc => doc.data());
                const events = eventsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
                const telegramUsersFromEvents = new Set(events.filter(e => e.type === 'tg_open').map(e => e.userId)).size;
                const pwaUsersFromEvents = new Set(events.filter(e => e.type === 'pwa_install').map(e => e.userId)).size;
                const telegramUsers = telegramUsersFromEvents || users.filter(u => (u as any).telegramChatId).length;
                const pwaUsers = pwaUsersFromEvents || users.filter(u => (u as any).pwaInstalledAt || (u as any).isPwaInstalled || (u as any).isPwaUser).length;

                const totalUsers = users.length;
                const usersByPlan = users.reduce((acc, user) => {
                    const plan = user.plan || 'Free';
                    acc[plan] = (acc[plan] || 0) + 1;
                    return acc;
                }, {} as Record<UserPlan, number>);
                
                const paidUsers = (usersByPlan['PRO'] || 0) + (usersByPlan['Business'] || 0) + (usersByPlan['Enterprise'] || 0);
                const trialUsers = users.filter(u => u.hasUsedTrial).length;
                const reportedTickets = requests.filter(r => r.status === 'reported').length;

                const now = new Date();
                const periodStart = subDays(now, parseInt(period));
                const days = eachDayOfInterval({ start: periodStart, end: now });
                
                const chartDataMap = new Map(days.map(day => [
                    format(day, 'yyyy-MM-dd'),
                    { date: format(day, 'yyyy-MM-dd'), credits: 0, requestsCount: 0, newUsers: 0, activeUsersSet: new Set() }
                ]));

                requests.forEach(req => {
                    if (req.timestamp?.toDate) {
                        const reqDate = req.timestamp.toDate();
                        if (reqDate >= periodStart) {
                            const reqDateStr = format(reqDate, 'yyyy-MM-dd');
                            const dayData = chartDataMap.get(reqDateStr);
                            if (dayData) {
                                dayData.credits += (req.cost || 0);
                                dayData.requestsCount += 1;
                            }
                        }
                    }
                });
                
                users.forEach(user => {
                    if (user.createdAt?.toDate) {
                        const regDate = user.createdAt.toDate();
                        if (regDate >= periodStart) {
                            const regDateStr = format(regDate, 'yyyy-MM-dd');
                            const dayData = chartDataMap.get(regDateStr);
                            if (dayData) {
                                dayData.newUsers += 1;
                            }
                        }
                    }
                });

                logs.forEach(log => {
                    if (log.timestamp?.toDate && log.userId) {
                         const logDate = log.timestamp.toDate();
                         if(logDate >= periodStart) {
                            const logDateStr = format(logDate, 'yyyy-MM-dd');
                            const dayData = chartDataMap.get(logDateStr);
                            if (dayData) {
                                dayData.activeUsersSet.add(log.userId);
                            }
                         }
                    }
                });

                const chartData = Array.from(chartDataMap.values()).map(d => ({
                    date: d.date,
                    credits: d.credits,
                    requestsCount: d.requestsCount,
                    newUsers: d.newUsers,
                    activeUsers: d.activeUsersSet.size,
                }));

                const engagementMap = new Map<string, { date: string; tgEvents: number; pwaEvents: number }>();
                events.forEach(e => {
                    const dt = e.createdAt ? new Date(e.createdAt) : new Date();
                    const key = format(dt, 'yyyy-MM-dd');
                    if (!engagementMap.has(key)) {
                        engagementMap.set(key, { date: key, tgEvents: 0, pwaEvents: 0 });
                    }
                    const item = engagementMap.get(key)!;
                    if (e.type === 'tg_open') item.tgEvents += 1;
                    if (e.type === 'pwa_install') item.pwaEvents += 1;
                });
                const engagementChart = Array.from(engagementMap.values()).sort((a, b) => a.date.localeCompare(b.date));
                
                const creditsUsedInPeriod = chartData.reduce((acc, d) => acc + d.credits, 0);

                 const rolesForPieChart = Object.entries(usersByPlan).map(([name, value]) => ({
                    name,
                    value,
                    fill: chartConfig[name as keyof typeof chartConfig]?.color || 'hsl(var(--muted))'
                }));

                setStats({
                    loading: false,
                    totalUsers,
                    paidUsers,
                    trialUsers,
                    usersByPlan,
                    rolesForPieChart,
                    totalRequests: requests.length,
                    reportedTickets,
                    creditsUsedInPeriod,
                    chartData,
                    telegramUsers,
                    pwaUsers,
                    engagementEvents: events.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 50),
                    engagementChart,
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                setStats({ loading: false, error: "Failed to load data" });
            }
        };

        fetchStats();
    }, [period]);

    const handleMetricToggle = (metric: ChartMetric) => {
        setSelectedMetrics((prev: ChartMetric[]) => {
            const newSet = new Set<ChartMetric>(prev);
            if (newSet.has(metric)) {
                newSet.delete(metric);
            } else {
                newSet.add(metric);
            }
            return Array.from(newSet) as ChartMetric[];
        });
    };

    const availableWidgets = useMemo(() => {
        const activeIds = new Set(widgets.map(w => w.id));
        return ['pulse','trend','roles','ai','plans','tickets','telegram','pwa','engagement'].filter(id => !activeIds.has(id as WidgetId)) as WidgetId[];
    }, [widgets]);

    const updateSize = (id: WidgetId, size: WidgetSize) => {
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, size } : w));
    };

    const moveWidget = (id: WidgetId, direction: 'left' | 'right') => {
        setWidgets(prev => {
            const idx = prev.findIndex(w => w.id === id);
            if (idx === -1) return prev;
            const newOrder = [...prev];
            const swapWith = direction === 'left' ? idx - 1 : idx + 1;
            if (swapWith < 0 || swapWith >= newOrder.length) return prev;
            [newOrder[idx], newOrder[swapWith]] = [newOrder[swapWith], newOrder[idx]];
            return newOrder;
        });
    };

    const removeWidget = (id: WidgetId) => {
        setWidgets(prev => prev.filter(w => w.id !== id));
    };

    const addWidget = (id: WidgetId) => {
        setWidgets(prev => [...prev, { id, size: id === 'trend' ? '2x2' : '1x1' }]);
        setPendingWidget("");
    };

    if (stats.loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

const widgetContent: Record<WidgetId, { title: string; description: string; render: () => ReactElement; }> = {
        pulse: {
            title: "Пульс продукта",
            description: "Ключевые цифры за период",
            render: () => (
                <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={Users} label="Пользователи" value={formatNumber(stats.totalUsers)} href="/dashboard/admin/users" />
                    <MiniStat icon={Star} label="Платные" value={formatNumber(stats.paidUsers)} />
                    <MiniStat icon={BadgeDollarSign} label="Кредиты" value={formatNumber(stats.creditsUsedInPeriod)} hint={`за ${period} дней`} />
                    <MiniStat icon={AlertTriangle} label="Жалобы" value={formatNumber(stats.reportedTickets)} href="/dashboard/admin/tickets" />
                    <MiniStat icon={Server} label="AI $/24h" value={`${aiStats.totalCost.toFixed(3)}$`} hint={`Ошибок: ${aiStats.errorCalls}`} href="/dashboard/admin/ai-analytics" />
                    <MiniStat icon={FileText} label="Запросы" value={formatNumber(stats.totalRequests)} />
                </div>
            ),
        },
        trend: {
            title: "Динамика показателей",
            description: "Линия времени за выбранный период",
            render: () => (
                <div className="flex flex-col gap-3 h-full">
                    <div className="flex flex-wrap items-center gap-2">
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger className="w-[140px] h-9 text-sm">
                                <SelectValue placeholder="Период" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">7 дней</SelectItem>
                                <SelectItem value="30">30 дней</SelectItem>
                                <SelectItem value="90">90 дней</SelectItem>
                            </SelectContent>
                        </Select>
                        {Object.entries(chartConfig)
                            .filter(([key]) => ['credits', 'requestsCount', 'newUsers', 'activeUsers'].includes(key))
                            .map(([key, config]) => (
                                <label key={key} className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <Checkbox
                                        id={`metric-${key}`}
                                        checked={selectedMetrics.includes(key as ChartMetric)}
                                        onCheckedChange={() => handleMetricToggle(key as ChartMetric)}
                                    />
                                    <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                                    {config.label}
                                </label>
                        ))}
                    </div>
                    <div className="flex-1 min-h-[260px]">
                        <ChartContainer config={chartConfig} className="h-full">
                            <BarChart data={stats.chartData}>
                                <CartesianGrid vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={8}
                                    tickFormatter={(value) => format(parse(value, 'yyyy-MM-dd', new Date()), 'd MMM', { locale: ru })}
                                />
                                <YAxis />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        labelFormatter={(value) => format(parse(value, 'yyyy-MM-dd', new Date()), "d MMMM yyyy", { locale: ru })}
                                    />} 
                                />
                                {selectedMetrics.map((metric: ChartMetric) => (
                                     <Bar key={metric} dataKey={metric} fill={`var(--color-${metric})`} radius={4} />
                                ))}
                            </BarChart>
                        </ChartContainer>
                    </div>
                </div>
            ),
        },
        roles: {
            title: "Роли и тарифы",
            description: "Распределение пользователей",
            render: () => (
                <div className="grid grid-cols-2 gap-3 h-full">
                    <div className="flex flex-col gap-2">
                        {stats.rolesForPieChart?.map((role: any) => (
                            <div key={role.name} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 bg-secondary">
                                <div className="flex items-center gap-2">
                                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: role.fill }} />
                                    <span className="text-sm">{role.name}</span>
                                </div>
                                <span className="font-semibold text-sm">{role.value}</span>
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center justify-center">
                        <ChartContainer config={chartConfig} className="w-full h-[200px]">
                            <PieChart>
                                <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                <Pie 
                                    data={stats.rolesForPieChart} 
                                    dataKey="value" 
                                    nameKey="name" 
                                    cx="50%" 
                                    cy="50%" 
                                    outerRadius={80}
                                >
                                    {stats.rolesForPieChart?.map((entry: any) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                    ))}
                                </Pie>
                            </PieChart>
                        </ChartContainer>
                    </div>
                </div>
            ),
        },
        ai: {
            title: "AI API (24ч)",
            description: "Затраты и стабильность",
            render: () => (
                <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={Server} label="Вызовы" value={formatNumber(aiStats.totalCalls)} />
                    <MiniStat icon={Sparkles} label="Успех" value={formatNumber(aiStats.successCalls)} />
                    <MiniStat icon={AlertTriangle} label="Ошибки" value={formatNumber(aiStats.errorCalls)} />
                    <MiniStat icon={BadgeDollarSign} label="Стоимость" value={`${aiStats.totalCost.toFixed(3)} $`} />
                </div>
            ),
        },
        plans: {
            title: "Платёжные воронки",
            description: "Платные / пробные / free",
            render: () => (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                        <MiniStat icon={Star} label="Платные" value={formatNumber(stats.paidUsers)} />
                        <MiniStat icon={FileText} label="Триал" value={formatNumber(stats.trialUsers)} />
                    </div>
                    <div className="space-y-2">
                        {['PRO','Business','Enterprise','Free'].map(plan => (
                            <div key={plan} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 bg-secondary">
                                <span className="text-sm">{plan}</span>
                                <span className="font-semibold text-sm">{formatNumber(stats.usersByPlan?.[plan] || 0)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            ),
        },
        tickets: {
            title: "Обращения и риски",
            description: "Контроль жалоб и тикетов",
            render: () => (
                <div className="flex flex-col gap-3">
                    <MiniStat icon={AlertTriangle} label="Жалобы" value={formatNumber(stats.reportedTickets)} href="/dashboard/admin/tickets" />
                    <div className="flex items-center justify-between rounded-xl border border-border/70 px-3 py-2 bg-secondary">
                        <div className="text-sm text-muted-foreground">Новые тикеты →</div>
                        <Link href="/dashboard/admin/tickets" className="text-sm font-semibold text-primary hover:underline">Открыть</Link>
                    </div>
                </div>
            ),
        },
        telegram: {
            title: "Telegram mini-app",
            description: "Подключения и активность",
            render: () => (
                <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={Sparkles} label="Связанные TG" value={formatNumber(stats.telegramUsers)} />
                    <MiniStat icon={Users} label="Доля" value={`${Math.round((stats.telegramUsers || 0) / Math.max(stats.totalUsers || 1,1) * 100)}%`} />
                    <div className="col-span-2 rounded-lg border border-border/70 bg-secondary p-3 text-sm text-muted-foreground">
                        Советуем отправить пуш в мини-приложение, чтобы вернуть пользователей к анализу.
                    </div>
                    {stats.engagementEvents?.length ? (
                        <div className="col-span-2 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border/70 bg-secondary p-2">
                            {stats.engagementEvents.map((e: any) => (
                                <div key={`${e.userId}-${e.createdAt}-${e.type}`} className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground truncate">{e.type === 'tg_open' ? 'Открытие TG' : 'PWA'}</span>
                                    <span className="font-semibold">{new Date(e.createdAt).toLocaleString('ru-RU')}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            ),
        },
        pwa: {
            title: "PWA установки",
            description: "Сколько пользователей установили",
            render: () => (
                <div className="grid grid-cols-2 gap-3">
                    <MiniStat icon={Star} label="Установки PWA" value={formatNumber(stats.pwaUsers)} />
                    <MiniStat icon={FileText} label="Конверсия" value={`${Math.round((stats.pwaUsers || 0) / Math.max(stats.totalUsers || 1,1) * 100)}%`} />
                    <div className="col-span-2 rounded-lg border border-border/70 bg-secondary p-3 text-sm text-muted-foreground">
                        Подсказка: добавьте баннер «Установите приложение» для новых пользователей.
                    </div>
                    {stats.engagementEvents?.length ? (
                        <div className="col-span-2 space-y-2 max-h-40 overflow-y-auto rounded-lg border border-border/70 bg-secondary p-2">
                            {stats.engagementEvents
                                .filter((e: any) => e.type === 'pwa_install')
                                .map((e: any) => (
                                    <div key={`${e.userId}-${e.createdAt}-${e.type}`} className="flex items-center justify-between text-xs">
                                        <span className="text-muted-foreground truncate">PWA install</span>
                                        <span className="font-semibold">{new Date(e.createdAt).toLocaleString('ru-RU')}</span>
                                    </div>
                                ))}
                        </div>
                    ) : null}
                </div>
            ),
        },
        engagement: {
            title: "События каналов",
            description: "TG и PWA таймлайн (последние)",
            render: () => (
                <div className="flex flex-col gap-3">
                    <div className="min-h-[180px]">
                        <ChartContainer config={chartConfig} className="h-full">
                            <BarChart data={stats.engagementChart || []}>
                                <CartesianGrid vertical={false} />
                                <XAxis 
                                    dataKey="date" 
                                    tickLine={false} 
                                    axisLine={false} 
                                    tickMargin={8}
                                    tickFormatter={(value) => format(parse(value, 'yyyy-MM-dd', new Date()), 'd MMM', { locale: ru })}
                                />
                                <YAxis />
                                <ChartTooltip 
                                    cursor={false}
                                    content={<ChartTooltipContent 
                                        labelFormatter={(value) => format(parse(value, 'yyyy-MM-dd', new Date()), "d MMMM yyyy", { locale: ru })}
                                    />} 
                                />
                                <Bar dataKey="tgEvents" fill="var(--color-tgEvents)" radius={4} />
                                <Bar dataKey="pwaEvents" fill="var(--color-pwaEvents)" radius={4} />
                            </BarChart>
                        </ChartContainer>
                    </div>
                    <div className="flex flex-col gap-2 max-h-44 overflow-y-auto">
                        {(stats.engagementEvents || []).slice(0, 30).map((e: any) => (
                            <div key={e.id || `${e.userId}-${e.createdAt}`} className="flex items-center justify-between rounded-lg border border-border/70 px-3 py-2 bg-secondary text-xs">
                                <div className="flex items-center gap-2">
                                    <span className={cn("h-2 w-2 rounded-full", e.type === 'tg_open' ? "bg-blue-500" : "bg-emerald-500")} />
                                    <span className="truncate">{e.type === 'tg_open' ? 'Telegram' : 'PWA'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{new Date(e.createdAt).toLocaleString('ru-RU')}</span>
                                </div>
                            </div>
                        ))}
                        {(!stats.engagementEvents || stats.engagementEvents.length === 0) && (
                            <div className="text-muted-foreground text-sm">Нет событий</div>
                        )}
                    </div>
                </div>
            ),
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="text-3xl font-bold">Дашборд</h1>
                    <p className="text-sm text-muted-foreground">Кастомизируйте админ-виджеты под ваши задачи.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Select value={pendingWidget} onValueChange={(val) => addWidget(val as WidgetId)}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Добавить виджет" />
                        </SelectTrigger>
                        <SelectContent>
                            {availableWidgets.length === 0 ? (
                                <SelectItem value="none" disabled>Все виджеты на доске</SelectItem>
                            ) : availableWidgets.map(id => (
                                <SelectItem key={id} value={id}>{widgetContent[id].title}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 auto-rows-[minmax(220px,auto)] gap-4">
                {widgets.map((widget, idx) => {
                    const def = widgetContent[widget.id];
                    if (!def) return null;
                    const meta = sizeToMeta[widget.size] || sizeToMeta['1x1'];
                    const colSpan = Math.min(meta.cols, 4);
                    const colClass = colSpan === 4 ? "col-span-4" : colSpan === 3 ? "col-span-3" : colSpan === 2 ? "col-span-2" : "col-span-1";
                    return (
                        <Card
                            key={widget.id}
                            draggable
                            onDragStart={(e) => { e.dataTransfer.setData('text/plain', widget.id); setDraggingId(widget.id); }}
                            onDragEnter={(e) => {
                                e.preventDefault();
                                if (!draggingId || draggingId === widget.id) return;
                                setDragOverId(widget.id);
                                setWidgets(prev => {
                                    const current = [...prev];
                                    const from = current.findIndex(w => w.id === draggingId);
                                    const to = current.findIndex(w => w.id === widget.id);
                                    if (from === -1 || to === -1 || from === to) return prev;
                                    const [moved] = current.splice(from, 1);
                                    current.splice(to, 0, moved);
                                    return current;
                                });
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                                e.preventDefault();
                                setDraggingId(null);
                                setDragOverId(null);
                            }}
                            onDragEnd={() => { setDraggingId(null); setDragOverId(null); setDragSizePreview(null); }}
                            className={cn(
                                "relative overflow-hidden group border-border/80 bg-card transition-shadow cursor-grab active:cursor-grabbing",
                                colClass,
                                draggingId === widget.id ? "opacity-60 ring-2 ring-primary/40" : "",
                                draggingId && dragOverId === widget.id ? "ring-2 ring-primary/60 shadow-lg" : ""
                            )}
                            style={{ gridRow: `span ${meta.rows}` }}
                        >
                            {draggingId && dragOverId === widget.id && (
                                <div className="absolute inset-1 border-2 border-dashed border-primary/50 rounded-xl pointer-events-none" />
                            )}
                            {draggingId === widget.id && dragSizePreview && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="px-2 py-1 rounded-md bg-primary/20 text-xs text-primary font-semibold">
                                        {dragSizePreview}
                                    </div>
                                </div>
                            )}
                            <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 bg-white/5 dark:bg-white/5 transition-opacity" />
                            <CardHeader className="flex flex-row items-start justify-between gap-2">
                                <div className="min-w-0">
                                    <CardTitle className="truncate">{def.title}</CardTitle>
                                    <CardDescription className="truncate">{def.description}</CardDescription>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Select value={widget.size} onValueChange={(val) => { setDragSizePreview(val as WidgetSize); updateSize(widget.id, val as WidgetSize); }}>
                                        <SelectTrigger className="h-8 w-20 text-xs">
                                            <SelectValue placeholder="Размер" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="1x1">1×1</SelectItem>
                                            <SelectItem value="2x1">2×1</SelectItem>
                                            <SelectItem value="2x2">2×2</SelectItem>
                                            <SelectItem value="3x1">3×1</SelectItem>
                                            <SelectItem value="3x2">3×2</SelectItem>
                                            <SelectItem value="4x2">4×2</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWidget(widget.id, 'left')} disabled={idx === 0}>
                                        <MoveLeft className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => moveWidget(widget.id, 'right')} disabled={idx === widgets.length - 1}>
                                        <MoveRight className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => removeWidget(widget.id)}>
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent className="min-h-[220px]">
                                {def.render()}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}

const MiniStat = ({ icon: Icon, label, value, href, hint }: { icon: any, label: string, value: string | number, href?: string, hint?: string }) => {
    const content = (
        <div className="flex items-center gap-3 rounded-lg border border-border/70 bg-secondary px-3 py-2">
            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <Icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-sm font-semibold truncate">{value}</p>
                {hint && <p className="text-[10px] text-muted-foreground truncate">{hint}</p>}
            </div>
        </div>
    );
    if (href) {
        return <Link href={href} className="block">{content}</Link>;
    }
    return content;
};
