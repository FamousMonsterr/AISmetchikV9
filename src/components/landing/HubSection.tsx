"use client";

import { useState } from 'react';
import { CtaButton } from "./CtaButton";
import { GlassCard } from "../ui/glass-card";
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { Network, Upload, Search, Star, Banknote, ArrowRight } from 'lucide-react';
import { motion } from '@/lib/motion';

const features = [
    { icon: Upload, title: "Разместите заказ", desc: "Загрузите файлы проекта — AI рассчитает смету с рекомендованной ценой" },
    { icon: Search, title: "Найдите работу", desc: "Просматривайте доступные заказы и откликайтесь одним нажатием" },
    { icon: Star, title: "Рейтинги и отзывы", desc: "Прозрачная система оценок для заказчиков и исполнителей" },
    { icon: Banknote, title: "Прозрачная оплата", desc: "500 ₽ за отклик. На PRO — 3 бесплатных отклика в месяц" },
];

export const HubSection = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <>
        <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        <section className="py-20 relative overflow-hidden">
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
            </div>

            <div className="container mx-auto px-4">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                        <Network className="h-4 w-4" />
                        MontageHub
                    </div>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                        Хаб заказов для монтажников
                    </h2>
                    <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
                        Находите подрядчиков и получайте заказы в одном месте.
                        AI помогает рассчитать справедливую цену.
                    </p>
                </motion.div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
                    {features.map((f, i) => (
                        <motion.div
                            key={f.title}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: i * 0.1 }}
                        >
                            <GlassCard className="p-5 h-full">
                                <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10 mb-3">
                                    <f.icon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                                <p className="text-sm text-muted-foreground">{f.desc}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.4 }}
                    className="flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="primary" size="lg">
                        <Network className="mr-2 h-5 w-5" />
                        Зайти в Хаб
                        <ArrowRight className="ml-2 h-5 w-5" />
                    </CtaButton>
                    <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="secondary" size="lg">
                        Разместить заказ
                    </CtaButton>
                </motion.div>
            </div>
        </section>
        </>
    );
};
