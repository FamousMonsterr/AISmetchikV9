"use client";

import { useState } from 'react';
import { CtaButton } from "./CtaButton";
import { GlassCard } from "../ui/glass-card";
import { RegistrationDialog } from '@/components/RegistrationDialog';
import { Sparkles, ArrowRight, Clock, Shield, Zap } from 'lucide-react';
import { motion } from '@/lib/motion';

const benefits = [
    { icon: Clock, text: "30 секунд до начала" },
    { icon: Shield, text: "Без привязки карты" },
    { icon: Zap, text: "10 кредитов бесплатно" },
];

export const CtaSection = () => {
    const [isRegisterOpen, setIsRegisterOpen] = useState(false);

    return (
        <>
        <RegistrationDialog isOpen={isRegisterOpen} onClose={() => setIsRegisterOpen(false)} />
        <section className="py-20 relative overflow-hidden">
            {/* Background gradient */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-blue-500/10 via-primary/10 to-purple-500/10 rounded-full blur-3xl" />
            </div>

            <div className="container mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.6 }}
                >
                    <GlassCard className="text-center p-8 md:p-12 relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl" />
                        <div className="absolute bottom-0 right-0 w-32 h-32 bg-gradient-to-tl from-purple-500/10 to-transparent rounded-full blur-2xl" />

                        <div className="relative">
                            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-6">
                                <Sparkles className="h-4 w-4" />
                                Бесплатная регистрация
                            </div>

                            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                                Начните экономить время
                                <br />
                                <span className="bg-gradient-to-r from-primary via-blue-500 to-purple-500 bg-clip-text text-transparent">
                                    уже сегодня!
                                </span>
                            </h2>

                            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
                                Присоединяйтесь к тысячам сметчиков, которые уже автоматизировали свою работу
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                                <CtaButton href="#" onClick={() => setIsRegisterOpen(true)} variant="primary" size="lg">
                                    <Sparkles className="mr-2 h-5 w-5" />
                                    Зарегистрироваться бесплатно
                                    <ArrowRight className="ml-2 h-5 w-5" />
                                </CtaButton>
                            </div>

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
                                        <benefit.icon className="h-4 w-4 text-primary" />
                                        {benefit.text}
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                </motion.div>
            </div>
        </section>
        </>
    );
};
