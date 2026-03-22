
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { GlassCard } from "../ui/glass-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";

export const PartnershipSection = () => {
    const router = useRouter();
    const { setNavigating } = useAppContext();

    const handleNavigate = () => {
        setNavigating(true);
        router.push('/partnership');
    };

    return (
        <section className="py-20">
            <div className="container mx-auto">
                <GlassCard className="text-center">
                    <h2 className="text-3xl font-bold text-foreground">Станьте партнером и зарабатывайте</h2>
                    <p className="mt-4 text-4xl font-extrabold text-amber-600 dark:text-amber-300 md:text-5xl">
                        до 450 000 ₽ в месяц
                    </p>
                    <p className="text-muted-foreground mt-4 max-w-2xl mx-auto">
                        Присоединяйтесь к нашей партнерской программе. Привлекайте новых пользователей и получайте высокий процент от их платежей. Мы предоставляем все маркетинговые материалы и поддержку.
                    </p>
                    <div className="mt-8">
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button variant="secondary">Узнать больше</Button>
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
                    </div>
                </GlassCard>
            </div>
        </section>
    );
};
