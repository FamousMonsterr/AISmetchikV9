
"use client";

import { useState } from "react";
import { Button } from "../ui/button";
import { GlassCard } from "../ui/glass-card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";
import { useAppContext } from "@/contexts/AppContext";
import { motion } from '@/lib/motion';
import { Handshake, ArrowRight, TrendingUp, Users, Wallet } from 'lucide-react';

const benefits = [
    { icon: Wallet, text: "До 450 000 ₽/мес" },
    { icon: Users, text: "Маркетинговые материалы" },
    { icon: TrendingUp, text: "Растущий продукт" },
];

export const PartnershipSection = () => {
    const router = useRouter();
    const { setNavigating } = useAppContext();

    const handleNavigate = () => {
        setNavigating(true);
        router.push('/partnership');
    };

    return (
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                >
                    <GlassCard className="text-center p-8 md:p-12 relative overflow-hidden">
                        {/* Decorative */}
                        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-full blur-2xl" />
                        <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-tr from-orange-500/10 to-transparent rounded-full blur-2xl" />

                        <div className="relative">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-600 dark:text-amber-400 text-sm font-medium mb-6">
                                <Handshake className="h-4 w-4" />
                                Партнерская программа
                            </div>

                            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                                Станьте партнером и зарабатывайте
                            </h2>

                            <p className="mt-6 text-5xl md:text-6xl font-extrabold bg-gradient-to-r from-amber-500 via-orange-500 to-amber-500 bg-clip-text text-transparent">
                                до 450 000 ₽
                            </p>
                            <p className="text-xl text-muted-foreground mt-2">в месяц</p>

                            <p className="text-muted-foreground mt-6 max-w-2xl mx-auto text-lg">
                                Присоединяйтесь к нашей партнерской программе. Привлекайте новых пользователей и получайте высокий процент от их платежей.
                            </p>

                            {/* Benefits */}
                            <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                                {benefits.map((benefit, index) => (
                                    <motion.div
                                        key={benefit.text}
                                        initial={{ opacity: 0, y: 10 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.4, delay: 0.2 + index * 0.1 }}
                                        className="flex items-center gap-2 text-sm text-muted-foreground"
                                    >
                                        <benefit.icon className="h-4 w-4 text-amber-500" />
                                        {benefit.text}
                                    </motion.div>
                                ))}
                            </div>

                            <div className="mt-8">
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="secondary" size="lg" className="px-8">
                                            Узнать больше
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
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
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </section>
    );
};
