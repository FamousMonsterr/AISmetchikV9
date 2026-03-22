// src/app/dashboard/admin/layout.tsx
"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Ticket, Settings, Terminal, FileClock, Send, Library, LayoutDashboard, Bell, Bot, Handshake, Server, Palette, MessageSquareQuote, BarChart2, Palette as TemplateIcon, ServerCog, Activity, Search, ChevronDown, BadgeDollarSign } from "lucide-react";
import { query, collection, getDocs, limit, where } from "@/lib/db-client";
import { db } from "@/lib/db";
import { motion, AnimatePresence } from "@/lib/motion";
import { Input } from "@/components/ui/input";
import { canAccessCrmSurface, canAccessPartnerSurface, resolveLandingUrl, resolveSurfaceUrl } from "@/lib/navigation";


const navGroups = [
    {
        id: "main",
        label: "Главное",
        icon: LayoutDashboard,
        links: [{ href: "/dashboard/admin", label: "Дашборд", icon: LayoutDashboard }],
    },
    {
        id: "users",
        label: "Пользователи",
        icon: Users,
        links: [
            { href: "/dashboard/admin/users", label: "Пользователи", icon: Users },
            { href: "/dashboard/admin/pro-payments", label: "Оплаты PRO", icon: BadgeDollarSign },
            { href: "/dashboard/admin/credit-payments", label: "Оплаты кредитов", icon: BadgeDollarSign },
            { href: "/dashboard/admin/service-requests", label: "Заявки", icon: Handshake },
            { href: "/dashboard/admin/tickets", label: "Тикеты", icon: Ticket },
            { href: "/dashboard/admin/partner-requests", label: "Партнёры", icon: Handshake },
            { href: "/dashboard/admin/feedback-surveys", label: "Опросы", icon: MessageSquareQuote },
        ],
    },
    {
        id: "communication",
        label: "Коммуникации",
        icon: Bell,
        links: [
            { href: "/dashboard/admin/notifications", label: "Уведомления", icon: Bell },
            { href: "/dashboard/admin/marketing", label: "Маркетинг", icon: Palette },
            { href: "/dashboard/admin/telegram", label: "Telegram", icon: Send },
        ],
    },
    {
        id: "ai",
        label: "AI",
        icon: Bot,
        links: [
            { href: "/dashboard/admin/ai-agent", label: "AI Агент", icon: Bot },
            { href: "/dashboard/admin/prompts", label: "Промпты", icon: Terminal },
            { href: "/dashboard/admin/ai-analytics", label: "Аналитика AI", icon: BarChart2 },
        ],
    },
    {
        id: "content",
        label: "Контент",
        icon: Library,
        links: [
            { href: "/dashboard/admin/sections", label: "Разделы", icon: Library },
            { href: "/dashboard/admin/templates", label: "Шаблоны", icon: TemplateIcon },
        ],
    },
    {
        id: "system",
        label: "Инфраструктура",
        icon: ServerCog,
        links: [
            { href: "/dashboard/admin/server-functions", label: "Серверные функции", icon: ServerCog },
            { href: "/dashboard/admin/logs", label: "Логи действий", icon: FileClock },
            { href: "/dashboard/admin/project-logs", label: "Логи проектов", icon: Activity },
            { href: "/dashboard/admin/s3", label: "S3 хранилище", icon: Server },
        ],
    },
    {
        id: "settings",
        label: "Настройки",
        icon: Settings,
        links: [{ href: "/dashboard/admin/settings", label: "Настройки", icon: Settings }],
    },
];

// This function runs on first admin layout mount to warm up database indexes.
const warmUpIndexes = async () => {
    console.log("Warming up database indexes for admin panel...");
    try {
        // These queries match the complex queries in the admin pages.
        // We only fetch 1 document to minimize data transfer, the goal is just to trigger index creation.
        const queries = [
            query(collection(db, 'user_logs'), limit(1)),
            query(collection(db, 'ai_api_logs'), limit(1)),
            query(collection(db, 'partner_requests'), limit(1)),
            query(collection(db, 'requests'), where('status', '==', 'reported'), limit(1)),
            query(collection(db, 'users'), where('telegramChatId', '!=', null), limit(1)),
            query(collection(db, 'project_event_logs'), limit(1)),
            query(collection(db, 'credit_purchase_orders'), limit(1)),
            query(collection(db, 'pro_subscription_orders'), limit(1)),
            query(collection(db, 'service_requests'), limit(1)),
        ];
        // We run them, but we don't care about the result.
        // The simple act of querying triggers the index creation on the backend if it doesn't exist.
        await Promise.all(queries.map(q => getDocs(q)));
        console.log("Database index warm-up queries sent.");
    } catch (error) {
        // We catch errors silently. If an index doesn't exist, the backend will start creating it.
        // The user will see the error on the specific page, which is the expected behavior.
        console.warn("An error occurred during index warm-up (this is often expected if indexes are being created):", error);
    }
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isNavigating: isAppNavigating } = useAppContext();
  const router = useRouter();
  const pathname = usePathname();
  const [isPageTransitioning, startPageTransition] = useTransition();
  const isNavigating = isAppNavigating || isPageTransitioning;
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const lkProjectsUrl = resolveSurfaceUrl('lk', '/dashboard');
  const lkProfileUrl = resolveSurfaceUrl('lk', '/dashboard/profile');
  const crmUrl = resolveSurfaceUrl('crm', '/crm');
  const partnerUrl = resolveSurfaceUrl('partner', '/partner');

  useEffect(() => {
    // Warm up indexes only once when the admin layout is first mounted.
    if (user?.systemRole === 'Super Admin') {
      warmUpIndexes();
    }
  }, [user]);


  useEffect(() => {
    // If user data is loaded and the user is not a Super Admin, redirect them.
    if (user && user.systemRole !== 'Super Admin') {
      window.location.replace(resolveLandingUrl());
    }
  }, [user, router]);

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      startPageTransition(() => {
        router.push(href);
      });
    }
    setSearchOpen(false);
  };

  const flatLinks = useMemo(() => navGroups.flatMap(g => g.links), []);
  useEffect(() => {
    const matchedGroup = navGroups.find(g => g.links.some(l => pathname.startsWith(l.href)));
    if (matchedGroup) setActiveGroup(matchedGroup.id);
  }, [pathname]);

  const filteredLinks = searchTerm
    ? flatLinks.filter(l => l.label.toLowerCase().includes(searchTerm.toLowerCase()))
    : flatLinks;


  // While user data is loading, show a loader.
  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is not Super Admin after loading, show an access denied message before redirecting.
  if (user.systemRole !== 'Super Admin') {
    return (
       <div className="flex h-full items-center justify-center p-4">
        <Alert variant="destructive" className="max-w-md">
          <ShieldAlert className="h-4 w-4" />
          <AlertTitle>Доступ запрещен</AlertTitle>
          <AlertDescription>
            У вас нет прав для просмотра этого раздела. Вы будете перенаправлены.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  // If user is a Super Admin, render the children pages.
  return (
    <div className="w-full">
        <main className={cn(
            'transition-opacity duration-300 rounded-xl border border-border bg-card/70 dark:bg-secondary/50 shadow-sm p-3 sm:p-5 flex flex-col gap-3 overflow-hidden',
            isNavigating ? 'opacity-50' : 'opacity-100'
        )}>
            <div className="sticky top-0 z-20 mb-0 pb-3 border-b border-border/60 bg-card/95 dark:bg-secondary/80 backdrop-blur-sm px-2 sm:px-4 pt-3 rounded-t-xl shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                    {navGroups.map((group) => {
                        const isActive = activeGroup === group.id;
                        return (
                            <motion.button
                                key={group.id}
                                onMouseEnter={() => setActiveGroup(group.id)}
                                onClick={() => setActiveGroup(group.id)}
                                className={cn(
                                    "px-3 py-2 rounded-full text-sm flex items-center gap-2 transition-colors border",
                                    isActive ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/60 border-border text-foreground hover:bg-secondary"
                                )}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <group.icon className="h-4 w-4" />
                                {group.label}
                                <ChevronDown className="h-4 w-4" />
                            </motion.button>
                        );
                    })}
                    <div className="flex-1" />
                    <Button variant="outline" size="sm" asChild>
                        <a href={lkProjectsUrl}>LK</a>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <a href={lkProfileUrl}>Профиль</a>
                    </Button>
                    {canAccessCrmSurface(user) ? (
                        <Button variant="outline" size="sm" asChild>
                            <a href={crmUrl}>CRM</a>
                        </Button>
                    ) : null}
                    {canAccessPartnerSurface(user) ? (
                        <Button variant="outline" size="sm" asChild>
                            <a href={partnerUrl}>Партнёры</a>
                        </Button>
                    ) : null}
                    <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setSearchOpen(true)}>
                        <Search className="h-4 w-4" />
                    </Button>
                </div>
                <AnimatePresence mode="wait">
                    {activeGroup && (
                        <motion.div
                            key={activeGroup}
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2"
                        >
                            {navGroups.find(g => g.id === activeGroup)?.links.map(link => {
                                const isActive = pathname.startsWith(link.href);
                                return (
                                    <Button
                                        key={link.href}
                                        variant={isActive ? "secondary" : "ghost"}
                                        className="justify-start rounded-lg"
                                        onClick={() => handleNavigation(link.href)}
                                    >
                                        <link.icon className="mr-2 h-4 w-4" />
                                        {link.label}
                                    </Button>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
            <AnimatePresence>
                {searchOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute inset-x-0 top-2 mx-4 z-30"
                    >
                        <div className="rounded-xl border border-border bg-card/95 dark:bg-secondary/80 shadow-lg p-4 space-y-3">
                            <div className="flex items-center gap-2">
                                <Search className="h-4 w-4 text-muted-foreground" />
                                <Input
                                    autoFocus
                                    placeholder="Поиск по разделам..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <Button variant="ghost" size="sm" onClick={() => { setSearchOpen(false); setSearchTerm(""); }}>Закрыть</Button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                                {filteredLinks.map(link => {
                                    const isActive = pathname.startsWith(link.href);
                                    return (
                                        <Button
                                            key={link.href}
                                            variant={isActive ? "secondary" : "ghost"}
                                            className="justify-start rounded-lg"
                                            onClick={() => handleNavigation(link.href)}
                                        >
                                            <link.icon className="mr-2 h-4 w-4" />
                                            {link.label}
                                        </Button>
                                    );
                                })}
                                {filteredLinks.length === 0 && <div className="text-sm text-muted-foreground px-2">Ничего не найдено</div>}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            <div className="min-h-0 overflow-auto pt-2">
                {children}
            </div>
        </main>
    </div>
  );
}

