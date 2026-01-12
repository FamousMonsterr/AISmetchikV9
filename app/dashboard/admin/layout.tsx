// src/app/dashboard/admin/layout.tsx
"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ShieldAlert } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Users, Ticket, Settings, Terminal, FileClock, Send, Library, LayoutDashboard, Bell, Bot, Handshake, Server, Palette, MessageSquareQuote, BarChart2 } from "lucide-react";
import { query, collection, getDocs, limit, where } from "@/lib/mongoFirestore";
import { db } from "@/lib/firebase";


const adminNavItems = [
    { href: "/dashboard/admin", label: "Дашборд", icon: LayoutDashboard },
    { href: "/dashboard/admin/users", label: "Пользователи", icon: Users },
    { href: "/dashboard/admin/tickets", label: "Тикеты", icon: Ticket },
    { href: "/dashboard/admin/notifications", label: "Уведомления", icon: Bell },
    { href: "/dashboard/admin/partner-requests", label: "Заявки партнеров", icon: Handshake },
    { href: "/dashboard/admin/feedback-surveys", label: "Опросы", icon: MessageSquareQuote },
    { href: "/dashboard/admin/marketing", label: "Маркетинг", icon: Palette },
    { href: "/dashboard/admin/logs", label: "Логи действий", icon: FileClock },
    { href: "/dashboard/admin/ai-analytics", label: "Аналитика AI", icon: BarChart2 },
    { href: "/dashboard/admin/telegram", label: "Telegram", icon: Send },
    { href: "/dashboard/admin/sections", label: "Разделы", icon: Library },
    { href: "/dashboard/admin/prompts", label: "Промпты", icon: Terminal },
    { href: "/dashboard/admin/ai-agent", label: "AI Агент", icon: Bot },
    { href: "/dashboard/admin/s3", label: "S3 Хранилище", icon: Server },
    { href: "/dashboard/admin/settings", label: "Настройки", icon: Settings },
];

// This function will run on first admin layout mount to "warm up" Firestore indexes.
const warmUpIndexes = async () => {
    console.log("Warming up Firestore indexes for admin panel...");
    try {
        // These queries match the complex queries in the admin pages.
        // We only fetch 1 document to minimize data transfer, the goal is just to trigger index creation.
        const queries = [
            query(collection(db, 'user_logs'), limit(1)),
            query(collection(db, 'ai_api_logs'), limit(1)),
            query(collection(db, 'partner_requests'), limit(1)),
            query(collection(db, 'requests'), where('status', '==', 'reported'), limit(1)),
            query(collection(db, 'users'), where('telegramChatId', '!=', null), limit(1))
        ];
        // We run them, but we don't care about the result.
        // The simple act of querying triggers the index creation on the backend if it doesn't exist.
        await Promise.all(queries.map(q => getDocs(q)));
        console.log("Firestore index warm-up queries sent.");
    } catch (error) {
        // We catch errors silently. If an index doesn't exist, Firestore will start creating it.
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

  useEffect(() => {
    // Warm up indexes only once when the admin layout is first mounted.
    if (user?.systemRole === 'Super Admin') {
      warmUpIndexes();
    }
  }, [user]);


  useEffect(() => {
    // If user data is loaded and the user is not a Super Admin, redirect them.
    if (user && user.systemRole !== 'Super Admin') {
      router.replace('/dashboard');
    }
  }, [user, router]);

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      startPageTransition(() => {
        router.push(href);
      });
    }
  };


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
    <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-6">
        <aside className="glass-effect bg-black/10 rounded-xl p-2 hidden md:flex">
            <nav className="flex flex-col gap-1 w-full text-white">
                 {adminNavItems.map((item) => {
                     const isActive = item.href === "/dashboard/admin" ? pathname === item.href : pathname.startsWith(item.href);
                     return (
                        <Button
                            key={item.href}
                            variant={isActive ? "secondary" : "ghost"}
                            className="justify-start text-white hover:text-white hover:bg-white/10"
                            onClick={() => handleNavigation(item.href)}
                        >
                            <item.icon className="mr-2 h-4 w-4" />
                            {item.label}
                        </Button>
                     );
                 })}
            </nav>
        </aside>
        <main className={cn('transition-opacity duration-300', isNavigating ? 'opacity-50' : 'opacity-100')}>
            {children}
        </main>
    </div>
  );
}
