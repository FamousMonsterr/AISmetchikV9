"use client";

import { Logo } from '@/components/Logo';
import Link from 'next/link';
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from '../ui/alert-dialog';
import { usePathname, useRouter } from 'next/navigation';
import { useAppContext } from '@/contexts/AppContext';


const FooterLink = ({ href, children }: { href: string, children: React.ReactNode }) => {
    const router = useRouter();
    const pathname = usePathname();
    const isPartnershipPage = pathname === '/partnership';
    const { setNavigating } = useAppContext();
    const shouldShowLoader = href.startsWith('/') && !href.includes('#');

    const handleNavigate = () => {
        setNavigating(true);
        router.push(href);
    };

    if (isPartnershipPage && href.startsWith('/#')) {
         return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors text-left">{children}</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Переход на основной портал</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите перейти на основной портал для клиентов?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleNavigate}>Перейти</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    if (pathname !== '/partnership' && href === '/partnership') {
        return (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors text-left">{children}</button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Переход на портал для партнеров</AlertDialogTitle>
                        <AlertDialogDescription>
                            Вы уверены, что хотите перейти на страницу партнерской программы?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction onClick={handleNavigate}>Перейти</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        );
    }
    
    return (
        <Link href={href} onClick={() => shouldShowLoader && setNavigating(true)} className="text-muted-foreground hover:text-foreground transition-colors">
            {children}
        </Link>
    );
};


export const Footer = () => {
    const pathname = usePathname();
    const isPartnershipPage = pathname === '/partnership';

    const logoVariant = isPartnershipPage ? 'partnership' : 'default';
    const logoHref = isPartnershipPage ? '/partnership' : '/';

    return (
        <footer className="py-12 border-t border-border/10 mt-20">
            <div className="container mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
                    <div className="col-span-full lg:col-span-1">
                        <Logo variant={logoVariant} href={logoHref} />
                        <p className="text-muted-foreground text-sm mt-4">
                            №1 в создании смет слаботочных систем.
                        </p>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Продукт</h4>
                        <ul className="space-y-2">
                            <li><FooterLink href="/#features">Функции</FooterLink></li>
                            <li><FooterLink href="/#how-it-works">Как это работает</FooterLink></li>
                            <li><FooterLink href="/#pricing">Тарифы</FooterLink></li>
                            <li><FooterLink href="/#faq">FAQ</FooterLink></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Компания</h4>
                        <ul className="space-y-2">
                            <li><FooterLink href="#">О нас (скоро)</FooterLink></li>
                            <li><FooterLink href="/partnership">Партнерам</FooterLink></li>
                            <li><FooterLink href="#">Контакты</FooterLink></li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Ресурсы</h4>
                        <ul className="space-y-2">
                            <li><FooterLink href="#">Блог (скоро)</FooterLink></li>
                            <li className="text-muted-foreground">База знаний (скоро)</li>
                        </ul>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Правовая информация</h4>
                        <ul className="space-y-2">
                            <li><FooterLink href="/legal/privacy-policy">Политика конфиденциальности</FooterLink></li>
                            <li><FooterLink href="/legal/license">Лицензионное соглашение</FooterLink></li>
                            <li><FooterLink href="/legal/consent">Обработка ПДн</FooterLink></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-12 pt-8 border-t border-border/10 flex flex-col sm:flex-row justify-between items-center">
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <span>© {new Date().getFullYear()}</span>
                        <Logo variant={logoVariant} href={logoHref} />
                        <span>. Все права защищены.</span>
                    </p>
                    <div className="flex items-center gap-4 mt-4 sm:mt-0">
                        
                    </div>
                </div>
            </div>
        </footer>
    );
};
