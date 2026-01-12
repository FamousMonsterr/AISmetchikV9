// src/app/dashboard/admin/page.tsx
"use client";

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart as BarChartIcon, Users, FileText, BadgeDollarSign, AlertTriangle, Clock, Loader2, Star, Server } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { collection, getDocs, query, where, Timestamp }from '@/lib/mongoFirestore';
import { db } from '@/lib/firebase';
import { AppUser, HistoryRequest, UserPlan } from '@/contexts/AppContext';
import { format, subDays, eachDayOfInterval, parse, startOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { getAiApiStats } from '@/actions/adminActions';


type ChartMetric = 'credits' | 'requestsCount' | 'newUsers' | 'activeUsers';

const chartConfig = {
  credits: { label: "Кредиты", color: "hsl(var(--primary))" },
  requestsCount: { label: "Новые проекты", color: "hsl(var(--chart-2))" },
  newUsers: { label: "Регистрации", color: "hsl(var(--chart-3))" },
  activeUsers: { label: "Активные пользователи", color: "hsl(var(--chart-4))" },
  'Free': { label: 'Free', color: 'hsl(var(--chart-1))' },
  'PRO': { label: 'PRO', color: 'hsl(var(--chart-2))' },
  'Business': { label: 'Business', color: 'hsl(var(--chart-4))' },
  'Enterprise': { label: 'Enterprise', color: 'hsl(var(--chart-3))' },
  'Admin': { label: 'Admin', color: 'hsl(var(--chart-5))' },
  'Super Admin': { label: 'Super Admin', color: 'hsl(var(--destructive))' },
} satisfies import("@/components/ui/chart").ChartConfig

const StatCard = ({ title, value, icon: Icon, description, href }: { title: string, value: string | number, icon: React.ElementType, description: string, href?: string }) => (
    <Card className="h-full">
         <Link href={href || '#'} className={href ? '' : 'pointer-events-none'}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                <p className="text-xs text-muted-foreground">{description}</p>
            </CardContent>
        </Link>
    </Card>
);

const useLocalStorageState = (key: string, defaultValue: any) => {
    const [state, setState] = useState(() => {
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

    return [state, setState];
};

export default function AdminDashboardPage() {
    const [stats, setStats] = useState<any>({ loading: true });
    const [period, setPeriod] = useState<string>('30');
    const [selectedMetrics, setSelectedMetrics] = useLocalStorageState('adminDashboardMetrics', ['credits']);
    const [aiStats, setAiStats] = useState({ totalCalls: 0, successCalls: 0, errorCalls: 0, totalCost: 0 });

    useEffect(() => {
        const fetchStats = async () => {
            setStats({ loading: true });

            try {
                const [usersSnapshot, requestsSnapshot, logsSnapshot, apiStatsResult] = await Promise.all([
                    getDocs(collection(db, 'users')),
                    getDocs(collection(db, 'requests')),
                    getDocs(collection(db, 'user_logs')),
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


                // --- User Analytics ---
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

                // Process Requests for Credits and Count
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
                
                // Process Users for New Registrations
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

                // Process Logs for Active Users
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
                });

            } catch (error) {
                console.error("Failed to fetch dashboard stats:", error);
                setStats({ loading: false, error: "Failed to load data" });
            }
        };

        fetchStats();
    }, [period]);

    const handleMetricToggle = (metric: ChartMetric) => {
        setSelectedMetrics((prev: string[]) => {
            const newSet = new Set(prev);
            if (newSet.has(metric)) {
                newSet.delete(metric);
            } else {
                newSet.add(metric);
            }
            return Array.from(newSet);
        });
    };


    if (stats.loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold">Дашборд</h1>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                <StatCard title="Всего пользователей" value={stats.totalUsers} icon={Users} description="Общее число регистраций" href="/dashboard/admin/users"/>
                <StatCard title="Платные пользователи" value={stats.paidUsers} icon={Star} description={`PRO: ${stats.usersByPlan?.PRO || 0}, Business: ${stats.usersByPlan?.Business || 0}, Enterprise: ${stats.usersByPlan?.Enterprise || 0}`}/>
                 <StatCard title="Использовано кредитов" value={stats.creditsUsedInPeriod} icon={BadgeDollarSign} description={`за последние ${period} дней`}/>
                <StatCard title="Новые жалобы" value={stats.reportedTickets} icon={AlertTriangle} description="Ожидают решения" href="/dashboard/admin/tickets"/>
                 <StatCard title="AI API (24ч)" value={`${aiStats.totalCost.toFixed(3)}$`} icon={Server} description={`Вызовов: ${aiStats.totalCalls} | Ошибок: ${aiStats.errorCalls}`} href="/dashboard/admin/ai-analytics"/>
            </div>
            
            <div className="grid gap-6 lg:grid-cols-3 min-h-[450px]">
                <Card className="lg:col-span-2 flex flex-col">
                    <CardHeader>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex-1">
                                <CardTitle>Динамика показателей</CardTitle>
                                <CardDescription className="mt-1">Ключевые метрики за выбранный период.</CardDescription>
                            </div>
                             <div className="flex items-center gap-4">
                                <Select value={period} onValueChange={setPeriod}>
                                    <SelectTrigger className="w-[180px]">
                                        <SelectValue placeholder="Выберите период" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="7">За 7 дней</SelectItem>
                                        <SelectItem value="30">За 30 дней</SelectItem>
                                        <SelectItem value="90">За 90 дней</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-4">
                            {Object.entries(chartConfig).filter(([key]) => ['credits', 'requestsCount', 'newUsers', 'activeUsers'].includes(key)).map(([key, config]) => (
                                <div key={key} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`metric-${key}`}
                                        checked={selectedMetrics.includes(key as ChartMetric)}
                                        onCheckedChange={() => handleMetricToggle(key as ChartMetric)}
                                    />
                                    <Label htmlFor={`metric-${key}`} className="flex items-center gap-2 font-normal">
                                         <span className="h-3 w-3 rounded-full" style={{ backgroundColor: config.color }} />
                                         {config.label}
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col">
                         <ChartContainer config={chartConfig} className="flex-1 min-h-[300px]">
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
                    </CardContent>
                </Card>
                 <Card className="flex flex-col">
                    <CardHeader>
                        <CardTitle>Распределение ролей</CardTitle>
                        <CardDescription>Соотношение пользователей по тарифным планам.</CardDescription>
                    </CardHeader>
                    <CardContent className="flex-1 flex items-center justify-center">
                       <ChartContainer config={chartConfig} className="flex-1 min-h-[300px]">
                            {stats.rolesForPieChart ? (
                                <PieChart>
                                    <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                                    <Pie 
                                        data={stats.rolesForPieChart} 
                                        dataKey="value" 
                                        nameKey="name" 
                                        cx="50%" 
                                        cy="50%" 
                                        outerRadius={100} 
                                        label={({ name, value }) => `${name}: ${value}`}
                                    >
                                        {stats.rolesForPieChart.map((entry: any) => (
                                            <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                                        ))}
                                    </Pie>
                                </PieChart>
                            ) : (
                                <div className="flex items-center justify-center h-full text-muted-foreground">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            )}
                        </ChartContainer>
                    </CardContent>
                </Card>

            </div>
        </div>
    );
}
