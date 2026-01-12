// src/app/dashboard/layout.tsx
"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Script from 'next/script';
import { useRouter, usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Sidebar,
  SidebarBody,
  SidebarLink,
} from "@/components/ui/sidebar";

import {
  Home,
  User,
  LogOut,
  Loader2,
  Shield,
  FileText,
  Wrench,
  Gift,
  Megaphone,
  Calculator,
  Menu,
  ArrowLeft,
  BookOpen,
  Sun, Moon, Monitor, Handshake, Bell, Waypoints, MessageCircle
} from "lucide-react";
import { useAppContext } from "@/contexts/AppContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link";
import { UpgradeAccountDialog } from "@/components/UpgradeAccountDialog";
import { NotificationCenter } from '@/components/NotificationCenter';
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Logo, LogoIcon } from "@/components/Logo";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { StickyBanner } from "@/components/ui/sticky-banner";
import { useIsMobile } from "@/hooks/use-mobile";


function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
    const { user, isLoading: isUserLoading, telegram, setNavigating, currentProject, resetAppContextState } = useAppContext();
    const [isNavigating, startNavigation] = useTransition();
    const router = useRouter();
    const pathname = usePathname();
    const { toast } = useToast();
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [upgradeTargetRole, setUpgradeTargetRole] = useState<'PRO' | 'Business' | 'Enterprise'>('PRO');
    const [open, setOpen] = useState(false);
    const { theme, setTheme } = useTheme();

    const previousPathnameRef = useRef(pathname);
    const isMobile = useIsMobile();


    useEffect(() => {
        if (previousPathnameRef.current.startsWith('/dashboard/calculator') && !pathname.startsWith('/dashboard/calculator')) {
            resetAppContextState();
        }
        previousPathnameRef.current = pathname;
    }, [pathname, resetAppContextState]);


    useEffect(() => {
        // This effect ensures that if a user tries to access the page directly
        // without a project selected, they are redirected.
        // It waits for the context to finish loading before making a decision.
        // It also checks if the user is on mobile to avoid redirecting on the mobile panel.
        if (!isUserLoading && pathname.startsWith('/dashboard/calculator') && !currentProject && !isMobile) {
            router.replace('/dashboard');
        }
    }, [currentProject, isUserLoading, router, pathname, isMobile]);


    useEffect(() => {
        if (telegram) {
        telegram.ready();
        telegram.expand();
        }
    }, [telegram]);

    useEffect(() => {
        if (!isUserLoading && !user) {
        router.replace("/auth/login");
        }
    }, [user, isUserLoading, router]);

    const handleLogout = async () => {
        await signOut();
        router.push('/');
    };

    const handleNavigation = (href: string) => {
        if (pathname !== href) {
            startNavigation(() => {
            setNavigating(true); // Context update for global state
            router.push(href);
            });
        }
        if (window.innerWidth < 768) {
            setOpen(false);
        }
    };

    const menuItems = [
        { href: "/dashboard", label: "Проекты", icon: <Home className="h-5 w-5 shrink-0" /> },
        { href: "/dashboard/mobile-panel", label: "Пульт", icon: <Waypoints className="h-5 w-5 shrink-0" />, mobileOnly: true },
        { href: "/dashboard/calculator", label: "Калькулятор", icon: <Calculator className="h-5 w-5 shrink-0" />, mobileOnly: false },
        { href: "/dashboard/profile", label: "Профиль", icon: <User className="h-5 w-5 shrink-0" /> },
        { href: "/dashboard/bonus", label: "Партнерам", icon: <Handshake className="h-5 w-5 shrink-0" /> },
        { href: "/dashboard/training", label: "База знаний", icon: <BookOpen className="h-5 w-5 shrink-0" /> }
    ];
    
    const adminMenuItem = { href: "/dashboard/admin", label: "Админ-панель", icon: <Shield className="h-5 w-5 shrink-0" /> };
    const supportMenuItem = { href: "/dashboard/support", label: "Обращения", icon: <MessageCircle className="h-5 w-5 shrink-0" /> };
    const canViewSupport = !!user && (user.systemRole !== 'User' || user.isPartner);
    if (user?.systemRole === 'Super Admin') {
        menuItems.push(adminMenuItem);
    }
    if (canViewSupport) {
        menuItems.push(supportMenuItem);
    }

    if (isUserLoading || !user) { 
        return (
        <div className="flex h-screen items-center justify-center bg-background">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="ml-4 text-muted-foreground">Загрузка данных пользователя...</p>
        </div>
        );
    }
    
     return (
        <div className="grid min-h-screen w-full md:grid-cols-[auto_1fr] bg-background">
            <Sidebar open={open} setOpen={setOpen} className="bg-card/80">
                <SidebarBody className="justify-between gap-10 !p-2 sm:!p-4">
                    <div className="flex flex-col flex-1 overflow-y-auto">
                         <div className={cn("flex items-center p-2 mb-4", open ? "justify-between" : "justify-center")}>
                            {open ? <Logo href="/dashboard" variant={user.isPartner ? 'partnerDashboard' : 'default'} /> : <LogoIcon />}
                         </div>
                        
                        <div className="flex flex-col gap-2">
                            {menuItems.map((link, idx) => {
                                if (link.mobileOnly && !isMobile) return null;
                                if (!link.mobileOnly && isMobile) return null;
                                return (
                                <SidebarLink 
                                    key={idx} 
                                    link={{ ...link, active: pathname.startsWith(link.href) && (link.href !== '/dashboard' || pathname === '/dashboard') }} 
                                    onNavigate={() => handleNavigation(link.href)} 
                                />
                                )
                            })}
                        </div>
                    </div>
                    <div className="flex flex-col gap-2">
                         <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="justify-start gap-2 w-full hover:bg-secondary/80 px-3">
                                   {theme === 'light' ? <Sun className="h-5 w-5 shrink-0"/> : theme === 'dark' ? <Moon className="h-5 w-5 shrink-0"/> : <Monitor className="h-5 w-5 shrink-0"/>}
                                   {open && <span className="text-sm font-medium">Тема</span>}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="right" align="start">
                                <DropdownMenuItem onClick={() => setTheme('light')}>Светлая</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('dark')}>Темная</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setTheme('system')}>Системная</DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                         <SidebarLink
                            link={{
                                label: user.displayName,
                                href: "/dashboard/profile",
                                icon: (
                                <Avatar className="h-7 w-7 shrink-0">
                                    <AvatarImage src={`https://avatar.vercel.sh/${user.email}.png`} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName?.[0].toUpperCase()}</AvatarFallback>
                                </Avatar>
                                ),
                                active: pathname.startsWith('/dashboard/profile'),
                            }}
                            onNavigate={() => handleNavigation("/dashboard/profile")}
                        />
                        <SidebarLink
                            link={{ href: "#", label: "Выйти", icon: <LogOut className="h-5 w-5 shrink-0" /> }}
                            onNavigate={handleLogout}
                        />
                    </div>
                </SidebarBody>
            </Sidebar>
            <div className="flex flex-col">
                 <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:hidden">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="rounded-full md:hidden"
                        onClick={() => setOpen(true)}
                    >
                        <Menu className="h-5 w-5" />
                        <span className="sr-only">Toggle navigation menu</span>
                    </Button>
                    <div className="flex-1">
                        <Logo href="/dashboard" variant={user.isPartner ? 'partnerDashboard' : 'default'} />
                    </div>
                </header>
                <main className="flex flex-1 flex-col p-2 md:p-6 overflow-auto">
                    {isNavigating ? (
                         <div className="flex h-full items-center justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    ) : children}
                </main>
            </div>
             <Script src="https://telegram.org/js/telegram-web-app.js" strategy="afterInteractive" />
            <UpgradeAccountDialog 
                isOpen={isUpgradeModalOpen} 
                onClose={() => setIsUpgradeModalOpen(false)}
                targetRole={upgradeTargetRole}
            />
        </div>
    );
}


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
    return (
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
    );
}
