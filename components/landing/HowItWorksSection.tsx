// src/components/landing/HowItWorksSection.tsx
"use client";

import { GlassCard } from '@/components/ui/glass-card';
import { FileText, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { LogoIcon } from '../Logo';

export const HowItWorksSection = () => {
    const steps = [
        { icon: FileText, title: "Загружаете проект", description: "PDF файлы, сканы или даже фотографии проектной документации." },
        { icon: LogoIcon, title: "ИИ анализирует", description: "Извлекает спецификацию, подбирает цены и создает структурированную смету." },
        { icon: CheckCircle, title: "Получаете КП", description: "Готовое коммерческое предложение в PDF или Excel с вашими реквизитами." }
    ];
    
    const cardVariants = {
        hidden: { opacity: 0, y: 50 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.1,
                duration: 0.5,
            },
        }),
    };

    return (
        <motion.section 
            id="how-it-works" 
            className="py-20"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            transition={{ staggerChildren: 0.2 }}
        >
            <div className="container mx-auto">
                <motion.div 
                    className="text-center mb-12"
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ duration: 0.5 }}
                >
                    <h2 className="text-3xl font-bold text-foreground">Как это работает</h2>
                    <p className="text-muted-foreground mt-2">Всего 3 простых шага до готовой сметы</p>
                </motion.div>
                <div className="grid md:grid-cols-3 gap-8">
                    {steps.map((step, index) => (
                        <motion.div
                            key={index}
                            custom={index}
                            variants={cardVariants}
                        >
                            <GlassCard className="text-center h-full" gradient="none">
                                <div className="mx-auto bg-primary/10 text-primary p-3 rounded-full w-fit mb-4">
                                    <step.icon className="h-8 w-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                                <p className="text-muted-foreground mt-2">{step.description}</p>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
};
