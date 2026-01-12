
// src/components/landing/Header.tsx
"use client";

import { useState, useEffect } from 'react';
import { Logo, LogoIcon } from '@/components/Logo';
import { Menu, X, Sun, Moon, Monitor } from 'lucide-react';
import { GlassButton } from '../ui/glass-button';
import { GlassNavbar } from '../ui/glass-navbar';
import Link from 'next/link';
import { useTheme } from "next-themes";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuItem, DropdownMenuContent } from '../ui/dropdown-menu';
import { Button } from '../ui/button';
import { CtaButton } from './CtaButton';
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { LegalEntityRegistrationDialog } from '@/components/LegalEntityRegistrationDialog';
import { usePathname, useRouter } from 'next/navigation';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { motion } from "framer-motion";


const NavItemWithAlert = ({ href, children, onNavigate, isMobile = false }: { href: string; children: React.ReactNode; onNavigate: () => void; isMobile?: boolean; }) => {
    const title = href === '/partnership' ? "Переход на портал для партнеров" : "Переход на основной сайт";
    const description = href === '/partnership' ? "Вы уверены, что хотите перейти на страницу партнерской программы?" : "Вы уверены, что хотите покинуть партнерский портал и перейти на основной сайт?";

    const triggerClass = isMobile
        ? "w-full text-center text-muted-foreground transition-colors hover:text-foreground"
        : "px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 text-muted-foreground hover:text-foreground hover:bg-secondary";

    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                 <motion.a href="#" className={triggerClass} whileHover={!isMobile ? { scale: 1.05 } : {}} whileTap={!isMobile ? { scale: 0.95 } : {}}>
                    {children}
                </motion.a>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{title}</AlertDialogTitle>
                    <AlertDialogDescription>{description}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={onNavigate}>Перейти</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const NavLink = ({ href, children, onClick }: { href: string, children: React.ReactNode, onClick?: (e: React.MouseEvent) => void }) => {
    return (
        <Link href={href} onClick={onClick} className="text-muted-foreground transition-colors hover:text-foreground">
            {children}
        </Link>
    );
};


const ThemeSwitcher = () => {
    const { theme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const renderIcon = () => {
        if (!mounted) return <div className="h-5 w-5 shrink-0" />; // Placeholder
        switch (theme) {
            case 'light': return <Sun className="h-5 w-5 shrink-0"/>;
            case 'dark': return <Moon className="h-5 w-5 shrink-0"/>;
            default: return <Monitor className="h-5 w-5 shrink-0"/>;
        }
    };

    return (
         <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="justify-start gap-2 w-full md:w-auto hover:bg-black/5 dark:hover:bg-white/10 text-foreground px-3">
                   {renderIcon()}
                   <span className="md:hidden">Тема</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem onClick={() => setTheme('light')}>Светлая</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Темная</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>Системная</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};


export const Header = () => {
    const pathname = usePathname();
    const router = useRouter();
    const isPartnershipPage = pathname === '/partnership';

    const [isOpen, setIsOpen] = useState(false);
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);
    const [isPartnerRegisterOpen, setIsPartnerRegisterOpen] = useState(false);
    
    const navItems = isPartnershipPage ? [
        { label: 'Возможности', href: '#how-it-works'},
        { label: 'Уровни', href: '#apply'},
        { label: 'Доход', href: '#income-calculator'},
        { label: 'Кейсы', href: '#use-cases'},
        { label: 'Стать пользователем', href: '/'},
    ] : [
        { label: 'Функции', href: '#features'},
        { label: 'Как работает', href: '#how-it-works'},
        { label: 'Тарифы', href: '#pricing'},
        { label: 'FAQ', href: '#faq'},
        { label: 'Стать партнером', href: '/partnership'},
    ];

    const ctaButton = isPartnershipPage ? (
        <CtaButton href="#" onClick={() => setIsPartnerRegisterOpen(true)} variant="primary" size="sm">Стать партнером</CtaButton>
    ) : (
        <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="primary" size="sm">Попробовать бесплатно</CtaButton>
    );

    const secondaryAction = (
        <CtaButton href="/auth/login" variant="secondary" size="sm">Войти</CtaButton>
    );
    
    return (
        <>
        <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        <LegalEntityRegistrationDialog isOpen={isPartnerRegisterOpen} onClose={() => setIsPartnerRegisterOpen(false)} isPartnerRegistration={true} />

        <GlassNavbar 
            logo={<Logo href={isPartnershipPage ? "/partnership" : "/"} variant={isPartnershipPage ? 'partnership' : 'default'} />}
            items={[]}
            actions={
                <div className="flex items-center gap-2">
                    <ThemeSwitcher />
                    {secondaryAction}
                    {ctaButton}
                </div>
            }
            className="hidden md:flex"
        >
            <div className="hidden md:flex flex-grow items-center justify-center gap-1">
                {navItems.map((item) => {
                    const isAlertLink = item.href === '/partnership' || item.href === '/';
                    if (isAlertLink) {
                        return <NavItemWithAlert key={item.href} href={item.href} onNavigate={() => router.push(item.href)}>{item.label}</NavItemWithAlert>;
                    }
                    return (
                        <motion.a key={item.href} href={item.href} className='px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-300 text-muted-foreground hover:text-foreground hover:bg-secondary' whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                            {item.label}
                        </motion.a>
                    );
                })}
            </div>
        </GlassNavbar>
         <header className="sticky top-0 z-50 p-4 md:hidden">
             <div className="flex items-center justify-between">
                <Logo href={isPartnershipPage ? "/partnership" : "/"} variant={isPartnershipPage ? 'partnership' : 'default'} />
                <GlassButton size="sm" onClick={() => setIsOpen(!isOpen)}>
                    {isOpen ? <X /> : <Menu />}
                </GlassButton>
             </div>
              {isOpen && (
                <div className="md:hidden mt-4">
                    <div className="glass-effect bg-card/80 backdrop-blur-lg rounded-xl p-4">
                        <nav className="flex flex-col items-center gap-4">
                            {navItems.map(item => {
                                const isAlertLink = item.href === '/partnership' || item.href === '/';
                                return (
                                     <div key={item.href}>
                                        {isAlertLink ? (
                                            <NavItemWithAlert href={item.href} onNavigate={() => router.push(item.href)} isMobile={true}>{item.label}</NavItemWithAlert>
                                        ) : (
                                            <NavLink href={item.href}>{item.label}</NavLink>
                                        )}
                                    </div>
                                )
                            })}
                             <div className="w-full mt-2">
                                <ThemeSwitcher />
                             </div>
                            <div className="flex flex-col gap-2 w-full mt-2">
                                 {secondaryAction}
                                 {ctaButton}
                            </div>
                        </nav>
                    </div>
                </div>
            )}
         </header>
        </>
    );
};
