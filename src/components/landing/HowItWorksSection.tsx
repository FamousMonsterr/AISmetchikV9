// src/components/landing/HowItWorksSection.tsx
"use client";

import { GlassCard } from '@/components/ui/glass-card';
import { FileText, CheckCircle, ArrowRight } from 'lucide-react';
import { motion } from '@/lib/motion';
import { LogoIcon } from '../Logo';

export const HowItWorksSection = () => {
    const steps = [
        {
            icon: FileText,
            title: "Загружаете проект",
            description: "PDF файлы, сканы или даже фотографии проектной документации.",
            color: "text-blue-500 bg-blue-500/10",
            number: "01"
        },
        {
            icon: LogoIcon,
            title: "ИИ анализирует",
            description: "Извлекает спецификацию, подбирает цены и создает структурированную смету.",
            color: "text-primary bg-primary/10",
            number: "02"
        },
        {
            icon: CheckCircle,
            title: "Получаете КП",
            description: "Готовое коммерческое предложение в PDF или Excel с вашими реквизитами.",
            color: "text-success bg-success/10",
            number: "03"
        }
    ];

    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.15,
                duration: 0.5,
            },
        }),
    };

    return (
        <motion.section
            id="how-it-works"
            className="py-20 relative"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ staggerChildren: 0.2 }}
        >
            {/* Background accent */}
            <div className="absolute inset-0 -z-10">
                <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gradient-to-l from-blue-500/5 to-transparent rounded-full blur-3xl -translate-y-1/2" />
            </div>

            <div className="container mx-auto">
                <motion.div
                    className="text-center mb-16"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 text-primary text-sm font-medium mb-4">
                        Процесс
                    </span>
                    <h2 className="text-3xl md:text-4xl font-bold text-foreground">Как это работает</h2>
                    <p className="text-muted-foreground mt-3 max-w-2xl mx-auto">Всего 3 простых шага до готовой сметы</p>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8 relative">
                    {/* Connection line for desktop */}
                    <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/20 via-primary/20 to-success/20 -translate-y-1/2 z-0" />

                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            custom={index}
                            variants={cardVariants}
                            className="relative z-10"
                        >
                            <GlassCard className="text-center h-full relative">
                                {/* Step number */}
                                <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground">
                                    {step.number}
                                </div>

                                <div className={`mx-auto w-16 h-16 rounded-2xl ${step.color} flex items-center justify-center mb-6`}>
                                    <step.icon className="h-8 w-8" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                                <p className="text-muted-foreground mt-3">{step.description}</p>

                                {/* Arrow for desktop */}
                                {index < steps.length - 1 && (
                                    <div className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 z-20">
                                        <ArrowRight className="h-6 w-6 text-muted-foreground/50" />
                                    </div>
                                )}
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>

                {/* Bottom CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    className="text-center mt-12"
                >
                    <p className="text-muted-foreground">
                        Среднее время создания сметы — <span className="font-semibold text-foreground">2-5 минут</span>
                    </p>
                </motion.div>
            </div>
        </motion.section>
    );
};
